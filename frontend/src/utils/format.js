const p = (n) => String(n).padStart(2, "0");

export const won = (n) => `${Number(n || 0).toLocaleString()}p`;

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// '2026-10-27T11:00:00' ~ '2026-10-27T13:00:00' → '오늘 11:00 - 13:00 (2시간)'
export function fmtRange(startAt, endAt) {
  const hours = Math.round((new Date(endAt) - new Date(startAt)) / 3600000);
  const day =
    startAt.slice(0, 10) === todayStr()
      ? "오늘"
      : `${startAt.slice(5, 7)}/${startAt.slice(8, 10)}`;
  return `${day} ${startAt.slice(11, 16)} - ${endAt.slice(11, 16)} (${hours}시간)`;
}

export const hh = (h) => `${p(h)}:00`;
