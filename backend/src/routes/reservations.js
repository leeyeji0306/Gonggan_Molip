// 예약 / 예약 취소  (/api/reservations)
const router = require("express").Router();
const pool = require("../db");
const { required } = require("../middleware/auth");
const { wrap, fail } = require("../utils/http");
const { getBalance } = require("../utils/points");
const t = require("../utils/time");

// POST /api/reservations  — 예약 확정 + 포인트 차감 (트랜잭션)
router.post(
  "/",
  required,
  wrap(async (req, res) => {
    const { roomId, date, hours } = req.body || {};
    const rid = Number(roomId);

    if (
      !Number.isInteger(rid) ||
      !t.isDate(date) ||
      !Array.isArray(hours) ||
      !hours.length
    ) {
      return fail(res, 400, "INVALID_INPUT", "요청 값을 확인해 주세요.");
    }
    const hs = [...new Set(hours.map(Number))].sort((a, b) => a - b);
    const consecutive = hs.every(
      (h, i) =>
        Number.isInteger(h) &&
        h >= 0 &&
        h <= 23 &&
        (i === 0 || h === hs[i - 1] + 1),
    );
    if (hs.length !== hours.length || !consecutive) {
      return fail(
        res,
        400,
        "INVALID_HOURS",
        "연속된 정각 시간을 선택해 주세요.",
      );
    }

    const conn = await pool.getConnection();
    try {
      const [[room]] = await conn.query(
        `SELECT r.room_id, r.room_name, r.points_per_hour, c.cafe_name, c.opening_time, c.closing_time
       FROM study_rooms r JOIN study_cafes c ON c.cafe_id = r.cafe_id
       WHERE r.room_id = ? AND r.is_active = TRUE`,
        [rid],
      );
      if (!room)
        return fail(res, 404, "ROOM_NOT_FOUND", "스터디룸을 찾을 수 없어요.");

      const first = hs[0];
      const last = hs[hs.length - 1];
      const open = t.openHour(room.opening_time);
      const close = t.closeHour(room.closing_time, room.opening_time);
      if (first < open || last + 1 > close)
        return fail(res, 400, "INVALID_HOURS", "운영시간 밖의 시간이에요.");
      if (t.slot(date, first) <= t.now())
        return fail(res, 400, "INVALID_HOURS", "지난 시간은 예약할 수 없어요.");

      const total = room.points_per_hour * hs.length;
      const startAt = t.slot(date, first);
      const endAt = t.slotEnd(date, last);

      await conn.beginTransaction();

      // 같은 룸 동시 예약을 한 줄로 세움 → 겹침 검사가 안전해짐 (룸 행 잠금)
      await conn.query(
        "SELECT room_id FROM study_rooms WHERE room_id = ? FOR UPDATE",
        [rid],
      );
      // 같은 유저의 동시 결제 방지 (유저 행 잠금)
      await conn.query(
        "SELECT user_id FROM users WHERE user_id = ? FOR UPDATE",
        [req.user.id],
      );

      // 시간대 겹침 검사
      const [overlap] = await conn.query(
        `SELECT reservation_id FROM reservations
       WHERE room_id = ? AND status IN ('CONFIRMED','COMPLETED') AND start_at < ? AND end_at > ? LIMIT 1`,
        [rid, endAt, startAt],
      );
      if (overlap.length) {
        await conn.rollback();
        return fail(res, 409, "SLOT_TAKEN", "이미 예약된 시간이에요.");
      }

      // 포인트 잔액 확인
      const balance = await getBalance(conn, req.user.id);
      if (balance < total) {
        await conn.rollback();
        return fail(res, 400, "INSUFFICIENT_POINTS", "포인트가 부족해요.");
      }

      const [r] = await conn.query(
        "INSERT INTO reservations (user_id, room_id, start_at, end_at, points_used, status) VALUES (?,?,?,?,?,?)",
        [req.user.id, rid, startAt, endAt, total, "CONFIRMED"],
      );

      if (total > 0) {
        // USE 거래는 amount < 0 이어야 함 (CHECK 제약)
        await conn.query(
          `INSERT INTO point_transactions (user_id, reservation_id, transaction_type, amount, description)
         VALUES (?,?,?,?,?)`,
          [
            req.user.id,
            r.insertId,
            "USE",
            -total,
            `${room.room_name} 예약 포인트 차감`,
          ],
        );
      }

      await conn.commit();
      res.status(201).json({
        reservation: {
          id: r.insertId,
          cafeName: room.cafe_name,
          roomName: room.room_name,
          startAt: t.iso(startAt),
          endAt: t.iso(endAt),
          totalPrice: total,
          status: "CONFIRMED",
        },
        remainingPoints: balance - total,
      });
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  }),
);

// PATCH /api/reservations/:id/cancel  — 취소 + 포인트 환불 (시작 전 전액 환불)
router.patch(
  "/:id/cancel",
  required,
  wrap(async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[rv]] = await conn.query(
        "SELECT * FROM reservations WHERE reservation_id = ? FOR UPDATE",
        [req.params.id],
      );
      if (!rv) {
        await conn.rollback();
        return fail(
          res,
          404,
          "RESERVATION_NOT_FOUND",
          "예약을 찾을 수 없어요.",
        );
      }
      if (rv.user_id !== req.user.id) {
        await conn.rollback();
        return fail(res, 403, "FORBIDDEN", "본인의 예약만 취소할 수 있어요.");
      }
      if (rv.status !== "CONFIRMED" || rv.start_at <= t.now()) {
        await conn.rollback();
        return fail(res, 400, "NOT_CANCELABLE", "취소할 수 없는 예약이에요.");
      }

      await conn.query(
        "UPDATE reservations SET status = 'CANCELLED', cancelled_at = ? WHERE reservation_id = ?",
        [t.now(), rv.reservation_id],
      );
      if (rv.points_used > 0) {
        // REFUND 거래는 amount > 0 이어야 함 (CHECK 제약)
        await conn.query(
          `INSERT INTO point_transactions (user_id, reservation_id, transaction_type, amount, description)
         VALUES (?,?,?,?,?)`,
          [
            rv.user_id,
            rv.reservation_id,
            "REFUND",
            rv.points_used,
            "예약 취소 포인트 환불",
          ],
        );
      }
      const remaining = await getBalance(conn, rv.user_id);

      await conn.commit();
      res.json({ refundedPoints: rv.points_used, remainingPoints: remaining });
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  }),
);

module.exports = router;
