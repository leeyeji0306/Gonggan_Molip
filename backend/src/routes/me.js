// 마이페이지: 내 정보 / 예약 내역 / 이용 통계 / 포인트 충전  (/api/me ...)
const router = require("express").Router();
const pool = require("../db");
const { required } = require("../middleware/auth");
const { wrap, fail } = require("../utils/http");
const { getBalance } = require("../utils/points");
const t = require("../utils/time");

router.use("/me", required); // /me 이하는 모두 로그인 필요

// GET /api/me
router.get(
  "/me",
  wrap(async (req, res) => {
    const [[u]] = await pool.query(
      "SELECT user_id AS id, nickname, email FROM users WHERE user_id = ?",
      [req.user.id],
    );
    if (!u) return fail(res, 401, "UNAUTHORIZED", "로그인이 필요해요.");
    res.json({ ...u, points: await getBalance(pool, u.id) });
  }),
);

// GET /api/me/reservations?status=all|upcoming|done|canceled
router.get(
  "/me/reservations",
  wrap(async (req, res) => {
    const status = req.query.status || "all";
    const now = t.now();
    const params = [req.user.id];
    let cond = "";
    if (status === "upcoming") {
      cond = "AND rv.status = 'CONFIRMED' AND rv.end_at >= ?";
      params.push(now);
    } else if (status === "done") {
      cond =
        "AND (rv.status = 'COMPLETED' OR (rv.status = 'CONFIRMED' AND rv.end_at < ?))";
      params.push(now);
    } else if (status === "canceled") {
      cond = "AND rv.status = 'CANCELLED'";
    }

    const [rows] = await pool.query(
      `
    SELECT rv.reservation_id AS id, rv.status, rv.start_at, rv.end_at, rv.points_used, rv.created_at,
           r.room_id AS roomId, r.room_name AS roomName,
           c.cafe_id AS cafeId, c.cafe_name AS cafeName, c.latitude AS lat, c.longitude AS lng
    FROM reservations rv
    JOIN study_rooms r ON r.room_id = rv.room_id
    JOIN study_cafes c ON c.cafe_id = r.cafe_id
    WHERE rv.user_id = ? ${cond}
    ORDER BY rv.start_at DESC`,
      params,
    );

    res.json({
      items: rows.map((x) => ({
        id: x.id,
        reservationNo: t.reservationNo(x.created_at, x.id),
        // 끝난 예약은 자동으로 COMPLETED 처리
        status:
          x.status === "CONFIRMED" && x.end_at < now ? "COMPLETED" : x.status,
        cafeId: x.cafeId,
        cafeName: x.cafeName,
        roomId: x.roomId,
        roomName: x.roomName,
        lat: Number(x.lat),
        lng: Number(x.lng),
        startAt: t.iso(x.start_at),
        endAt: t.iso(x.end_at),
        totalPrice: x.points_used,
      })),
    });
  }),
);

// GET /api/me/stats
router.get(
  "/me/stats",
  wrap(async (req, res) => {
    const d = new Date();
    const now = t.now();
    const monthStart = `${d.getFullYear()}-${t.pad(d.getMonth() + 1)}-01 00:00:00`;
    const monthEnd = `${t.fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 1))} 00:00:00`;

    // 이번 달 이용 시간 (이미 시작한 예약만, 취소 제외)
    const [[mine]] = await pool.query(
      `
    SELECT COALESCE(SUM(TIMESTAMPDIFF(HOUR, start_at, end_at)), 0) AS h FROM reservations
    WHERE user_id = ? AND status <> 'CANCELLED' AND start_at >= ? AND start_at < ? AND start_at <= ?`,
      [req.user.id, monthStart, monthEnd, now],
    );

    // 이번 달 전체 이용자 평균
    const [[avg]] = await pool.query(
      `
    SELECT AVG(x.h) AS a FROM (
      SELECT SUM(TIMESTAMPDIFF(HOUR, start_at, end_at)) AS h FROM reservations
      WHERE status <> 'CANCELLED' AND start_at >= ? AND start_at < ? AND start_at <= ? GROUP BY user_id) x`,
      [monthStart, monthEnd, now],
    );

    const monthHours = Number(mine.h);
    const average = Number(avg.a) || 0;
    const vsAveragePercent = average
      ? Math.round((monthHours / average - 1) * 100)
      : 0;

    // 이번 주(월~일) 요일별 이용 시간
    const monday = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() - ((d.getDay() + 6) % 7),
    );
    const nextMonday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 7,
    );
    const [wk] = await pool.query(
      `
    SELECT WEEKDAY(start_at) AS wd, SUM(TIMESTAMPDIFF(HOUR, start_at, end_at)) AS h FROM reservations
    WHERE user_id = ? AND status <> 'CANCELLED' AND start_at >= ? AND start_at < ? AND start_at <= ?
    GROUP BY wd`,
      [
        req.user.id,
        `${t.fmtDate(monday)} 00:00:00`,
        `${t.fmtDate(nextMonday)} 00:00:00`,
        now,
      ],
    );
    const weekly = [0, 0, 0, 0, 0, 0, 0];
    wk.forEach((r) => {
      weekly[r.wd] = Number(r.h);
    });

    res.json({
      monthHours,
      vsAveragePercent,
      weekly,
      weekLabel: `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주차`,
    });
  }),
);

// POST /api/me/points/charge  — 임시 충전 (결제 연동 전)
router.post(
  "/me/points/charge",
  wrap(async (req, res) => {
    const amount = Number(req.body && req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1000000) {
      return fail(res, 400, "INVALID_AMOUNT", "충전 금액을 확인해 주세요.");
    }
    await pool.query(
      "INSERT INTO point_transactions (user_id, transaction_type, amount, description) VALUES (?, 'CHARGE', ?, '포인트 충전')",
      [req.user.id, amount],
    );
    res.json({ points: await getBalance(pool, req.user.id) });
  }),
);

module.exports = router;
