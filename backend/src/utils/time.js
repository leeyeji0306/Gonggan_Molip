// 서버 로컬 시간(한국 서버 기준) 'YYYY-MM-DD HH:mm:ss' 문자열로 다룸
const pad = (n, l = 2) => String(n).padStart(l, "0");
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDateTime = (d) =>
  `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

exports.pad = pad;
exports.fmtDate = fmtDate;
exports.fmtDateTime = fmtDateTime;
exports.now = () => fmtDateTime(new Date());
exports.isDate = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s));

// 해당 날짜 h시 정각
exports.slot = (date, h) => `${date} ${pad(h)}:00:00`;

// h시 슬롯의 종료 시각 (23시 슬롯은 다음날 00:00)
exports.slotEnd = (date, h) => {
  if (h + 1 < 24) return `${date} ${pad(h + 1)}:00:00`;
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${fmtDate(d)} 00:00:00`;
};

// 다음 정각 (예약 가능 여부의 기본 기준 시각)
exports.nextHour = () => {
  const d = new Date(Date.now() + 3600 * 1000);
  return { date: fmtDate(d), hour: d.getHours() };
};

// 'YYYY-MM-DD HH:mm:ss' → 'YYYY-MM-DDTHH:mm:ss'
exports.iso = (s) => s.replace(" ", "T");

// 예약번호: 생성일 MMDD-id(4자리)
exports.reservationNo = (createdAt, id) =>
  `${createdAt.slice(5, 7)}${createdAt.slice(8, 10)}-${pad(id, 4)}`;

// MySQL TIME('HH:MM:SS') → 시(소수) 변환 후 정수 시로 맞춤
const toH = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return h + (m || 0) / 60;
};
// opening_time 이 08:30 이면 9시부터 예약 가능
exports.openHour = (open) => Math.ceil(toH(open));
// closing_time 이 00:00(자정)이거나 opening 이하이면 24시로 간주
exports.closeHour = (close, open) =>
  toH(close) <= toH(open) ? 24 : Math.floor(toH(close));
