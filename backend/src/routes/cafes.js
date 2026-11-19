// 스터디카페 탐색 / 룸 시간대 현황 / 인기 순위  (/api/cafes, /api/rooms/:id/slots, /api/popular)
const router = require("express").Router();
const pool = require("../db");
const { wrap, fail } = require("../utils/http");
const t = require("../utils/time");

const BLOCKING = "('CONFIRMED','COMPLETED')"; // 시간을 점유하는 예약 상태
const ADDR = "COALESCE(NULLIF(c.road_address, ''), c.address)";

// GET /api/cafes  — 지도용 목록 + 필터
router.get(
  "/cafes",
  wrap(async (req, res) => {
    const { lat, lng, q, date, hour, people, available } = req.query;
    const radius = Number(req.query.radius) || 3000;
    const peopleN = Number(people) || 0;

    if (date && !t.isDate(date))
      return fail(res, 400, "INVALID_DATE", "날짜 형식이 올바르지 않아요.");
    if (
      hour !== undefined &&
      !(
        Number.isInteger(Number(hour)) &&
        Number(hour) >= 0 &&
        Number(hour) <= 23
      )
    ) {
      return fail(res, 400, "INVALID_HOUR", "시간은 0~23 사이 정수여야 해요.");
    }

    // 예약 가능 여부 기준 시각: date+hour가 모두 있으면 그 시각, 아니면 다음 정각
    const target =
      date && hour !== undefined ? { date, hour: Number(hour) } : t.nextHour();
    const slotStart = t.slot(target.date, target.hour);
    const slotEnd = t.slotEnd(target.date, target.hour);
    const notPast = slotStart > t.now() ? 1 : 0;

    const cap = peopleN > 0 ? " AND r2.capacity >= ?" : "";
    const selParams = [
      ...(peopleN > 0 ? [peopleN] : []),
      notPast,
      target.hour,
      target.hour,
      slotEnd,
      slotStart,
    ];
    const joinParams = peopleN > 0 ? [peopleN] : [];
    const where = [];
    const whereParams = [];
    const having = [];

    if (q) {
      where.push("c.cafe_name LIKE ?");
      whereParams.push(`%${q}%`);
    }
    if (
      lat !== undefined &&
      lng !== undefined &&
      !isNaN(Number(lat)) &&
      !isNaN(Number(lng))
    ) {
      where.push(
        `(6371000 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(c.latitude)) * COS(RADIANS(c.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(c.latitude))))) <= ?`,
      );
      whereParams.push(Number(lat), Number(lng), Number(lat), radius);
    }
    if (peopleN > 0) having.push("roomCount > 0");
    if (available === "1") having.push("availableNow = 1");

    const sql = `
    SELECT c.cafe_id AS id, c.cafe_name AS name, ${ADDR} AS address,
           c.latitude AS lat, c.longitude AS lng,
           COUNT(r.room_id) AS roomCount, MIN(r.points_per_hour) AS minPrice,
           EXISTS (
             SELECT 1 FROM study_rooms r2
             WHERE r2.cafe_id = c.cafe_id AND r2.is_active = TRUE${cap}
               AND ? = 1
               AND ? >= TIME_TO_SEC(c.opening_time) / 3600
               AND ? + 1 <= IF(c.closing_time <= c.opening_time, 24, TIME_TO_SEC(c.closing_time) / 3600)
               AND NOT EXISTS (
                 SELECT 1 FROM reservations rv
                 WHERE rv.room_id = r2.room_id AND rv.status IN ${BLOCKING}
                   AND rv.start_at < ? AND rv.end_at > ?)
           ) AS availableNow
    FROM study_cafes c
    LEFT JOIN study_rooms r ON r.cafe_id = c.cafe_id AND r.is_active = TRUE${peopleN > 0 ? " AND r.capacity >= ?" : ""}
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    GROUP BY c.cafe_id
    ${having.length ? "HAVING " + having.join(" AND ") : ""}
    ORDER BY c.cafe_id`;

    const [rows] = await pool.query(sql, [
      ...selParams,
      ...joinParams,
      ...whereParams,
    ]);
    res.json({
      cafes: rows.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        lat: Number(c.lat),
        lng: Number(c.lng),
        imageUrl: null, // DB에 이미지 컬럼 없음
        minPrice: c.minPrice,
        roomCount: Number(c.roomCount),
        availableNow: !!c.availableNow,
      })),
    });
  }),
);

// GET /api/cafes/:id  — 카페 상세 + 룸 목록(+룸별 시설)
router.get(
  "/cafes/:id",
  wrap(async (req, res) => {
    const [[c]] = await pool.query(
      "SELECT * FROM study_cafes WHERE cafe_id = ?",
      [req.params.id],
    );
    if (!c)
      return fail(res, 404, "CAFE_NOT_FOUND", "스터디카페를 찾을 수 없어요.");

    const [rooms] = await pool.query(
      `SELECT room_id AS id, room_name AS name, capacity, points_per_hour AS pricePerHour, description
     FROM study_rooms WHERE cafe_id = ? AND is_active = TRUE ORDER BY room_id`,
      [c.cafe_id],
    );

    const facMap = {};
    if (rooms.length) {
      const [fac] = await pool.query(
        `SELECT rf.room_id, f.facility_name FROM room_facilities rf
       JOIN facilities f ON f.facility_id = rf.facility_id WHERE rf.room_id IN (?)`,
        [rooms.map((r) => r.id)],
      );
      fac.forEach((f) => {
        (facMap[f.room_id] = facMap[f.room_id] || []).push(f.facility_name);
      });
    }
    rooms.forEach((r) => {
      r.facilities = facMap[r.id] || [];
    });

    res.json({
      id: c.cafe_id,
      name: c.cafe_name,
      address: c.road_address || c.address,
      phone: c.phone || null,
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      openHour: t.openHour(c.opening_time),
      closeHour: t.closeHour(c.closing_time, c.opening_time),
      facilities: [...new Set(rooms.flatMap((r) => r.facilities))], // 룸 시설의 합집합
      imageUrl: null,
      rooms,
    });
  }),
);

// GET /api/rooms/:id/slots?date=YYYY-MM-DD  — 시간대 현황
router.get(
  "/rooms/:id/slots",
  wrap(async (req, res) => {
    const { date } = req.query;
    if (!t.isDate(date))
      return fail(res, 400, "INVALID_DATE", "날짜 형식이 올바르지 않아요.");
    const [[room]] = await pool.query(
      `SELECT r.room_id, c.opening_time, c.closing_time FROM study_rooms r
     JOIN study_cafes c ON c.cafe_id = r.cafe_id WHERE r.room_id = ? AND r.is_active = TRUE`,
      [req.params.id],
    );
    if (!room)
      return fail(res, 404, "ROOM_NOT_FOUND", "스터디룸을 찾을 수 없어요.");

    const open = t.openHour(room.opening_time);
    const close = t.closeHour(room.closing_time, room.opening_time);

    // 그날과 겹치는 예약들
    const [rvs] = await pool.query(
      `SELECT start_at, end_at FROM reservations
     WHERE room_id = ? AND status IN ${BLOCKING} AND start_at < ? AND end_at > ?`,
      [room.room_id, t.slotEnd(date, 23), t.slot(date, 0)],
    );
    const now = t.now();

    const slots = [];
    for (let h = open; h < close; h++) {
      const s = t.slot(date, h);
      const e = t.slotEnd(date, h);
      let status = "AVAILABLE";
      if (s <= now) status = "PAST";
      else if (rvs.some((r) => r.start_at < e && r.end_at > s))
        status = "RESERVED";
      slots.push({ hour: h, status });
    }
    res.json({ roomId: room.room_id, date, slots });
  }),
);

// GET /api/popular?sort=popular|rising|rating&limit=10  — 인기 순위
router.get(
  "/popular",
  wrap(async (req, res) => {
    const sort = req.query.sort || "popular";
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const now = t.now();
    const from7 = t.fmtDateTime(new Date(Date.now() - 7 * 86400000));
    const from3 = t.fmtDateTime(new Date(Date.now() - 3 * 86400000));

    const [rows] = await pool.query(
      `
    SELECT c.cafe_id, c.cafe_name, ${ADDR} AS address, c.opening_time, c.closing_time,
           COUNT(DISTINCT r.room_id) AS roomCount, MIN(r.points_per_hour) AS minPrice,
           COALESCE(SUM(TIMESTAMPDIFF(HOUR, rv.start_at, rv.end_at)), 0) AS h7,
           COALESCE(SUM(CASE WHEN rv.start_at >= ? THEN TIMESTAMPDIFF(HOUR, rv.start_at, rv.end_at) END), 0) AS h3,
           (SELECT COUNT(*) FROM reservations x JOIN study_rooms r3 ON r3.room_id = x.room_id
             WHERE r3.cafe_id = c.cafe_id AND x.status IN ${BLOCKING}) AS total
    FROM study_cafes c
    JOIN study_rooms r ON r.cafe_id = c.cafe_id AND r.is_active = TRUE
    LEFT JOIN reservations rv ON rv.room_id = r.room_id AND rv.status IN ${BLOCKING}
         AND rv.start_at >= ? AND rv.start_at < ?
    GROUP BY c.cafe_id`,
      [from3, from7, now],
    );

    // 예약률 = 최근 7일 예약된 시간 ÷ 운영 가능 시간(룸 수 × 일일 운영시간 × 7일)
    const list = rows.map((c) => {
      const perDay =
        t.closeHour(c.closing_time, c.opening_time) -
        t.openHour(c.opening_time);
      const cap7 = c.roomCount * perDay * 7;
      const h3 = Number(c.h3);
      const h7 = Number(c.h7);
      const rate = cap7 ? h7 / cap7 : 0;
      const recent = cap7 ? h3 / ((cap7 * 3) / 7) : 0; // 최근 3일 예약률
      const prev = cap7 ? (h7 - h3) / ((cap7 * 4) / 7) : 0; // 직전 4일 예약률
      return { ...c, rate, rising: recent - prev };
    });
    const averageRate = list.length
      ? list.reduce((a, c) => a + c.rate, 0) / list.length
      : 0;

    // sort=rating 은 리뷰 테이블 도입 전까지 popular과 동일하게 동작
    const key = sort === "rising" ? "rising" : "rate";
    const items = list
      .filter((c) => c.rate > averageRate) // 전체 평균 이하는 제외
      .sort((a, b) => b[key] - a[key])
      .slice(0, limit)
      .map((c, i) => ({
        rank: i + 1,
        cafeId: c.cafe_id,
        name: c.cafe_name,
        address: c.address,
        imageUrl: null,
        minPrice: c.minPrice,
        reservationRate: Number(c.rate.toFixed(2)),
        totalReservations: Number(c.total),
      }));

    res.json({ averageRate: Number(averageRate.toFixed(2)), items });
  }),
);

module.exports = router;
