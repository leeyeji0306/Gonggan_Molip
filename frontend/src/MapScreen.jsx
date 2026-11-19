import { useEffect, useState } from "react";
import { getCafes } from "./api/cafes";
import useFetch from "./hooks/useFetch";
import { todayStr, won } from "./utils/format";

// Mapbox 연결 전 임시 배치: 조회된 카페들의 위/경도를 화면 비율(%)로 환산
function place(cafes) {
  if (!cafes.length) return {};
  const lats = cafes.map((c) => c.lat);
  const lngs = cafes.map((c) => c.lng);
  const [minLat, maxLat, minLng, maxLng] = [
    Math.min(...lats),
    Math.max(...lats),
    Math.min(...lngs),
    Math.max(...lngs),
  ];
  const r = (v, min, max) => (max === min ? 0.5 : (v - min) / (max - min));
  return Object.fromEntries(
    cafes.map((c) => [
      c.id,
      {
        x: 12 + r(c.lng, minLng, maxLng) * 76,
        y: 24 + (1 - r(c.lat, minLat, maxLat)) * 46,
      },
    ]),
  );
}

const sel$ = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 13,
  background: "#fff",
};

export default function MapScreen({ onOpen }) {
  const [q, setQ] = useState("");
  const [qd, setQd] = useState(""); // 디바운스된 검색어
  const [panel, setPanel] = useState(null); // null | 'time' | 'people'
  const [date, setDate] = useState(todayStr());
  const [hour, setHour] = useState("");
  const [people, setPeople] = useState("");
  const [avail, setAvail] = useState(false);
  const [selId, setSelId] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setQd(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data, loading, error } = useFetch(
    () =>
      getCafes({
        q: qd,
        people,
        available: avail ? 1 : undefined,
        date: hour !== "" ? date : undefined,
        hour: hour !== "" ? hour : undefined,
      }),
    [qd, people, avail, date, hour],
  );

  const cafes = data ? data.cafes : [];
  const pos = place(cafes);
  const cur = cafes.find((c) => c.id === selId) || cafes[0];
  const noFilter = !people && hour === "" && !avail;
  const reset = () => {
    setPeople("");
    setHour("");
    setAvail(false);
    setPanel(null);
  };

  const chip = (label, on, onClick) => (
    <button
      key={label}
      className={"chip" + (on ? " on" : "")}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* TODO: Mapbox GL JS 연결 시 이 div에 map을 마운트하고, cafes의 lat/lng로 마커를 만드세요 */}
      <div className="mapbg">
        {cafes.map((c) => (
          <button
            key={c.id}
            className={"pin" + (cur && cur.id === c.id ? " on" : "")}
            style={{ left: pos[c.id].x + "%", top: pos[c.id].y + "%" }}
            onClick={() => setSelId(c.id)}
          >
            {won(c.minPrice)}
          </button>
        ))}
      </div>

      <div style={{ position: "absolute", top: 16, left: 16, right: 16 }}>
        <div
          className="row card"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            boxShadow: "0 4px 14px #0002",
          }}
        >
          <span>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="스터디카페 이름 검색"
            style={{ border: 0, outline: 0, flex: 1, fontSize: 14 }}
          />
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          {chip("전체", noFilter, reset)}
          {chip("날짜·시간", hour !== "" || panel === "time", () =>
            setPanel(panel === "time" ? null : "time"),
          )}
          {chip(
            people ? `${people}인 이상` : "인원",
            !!people || panel === "people",
            () => setPanel(panel === "people" ? null : "people"),
          )}
          {chip("예약가능", avail, () => setAvail(!avail))}
        </div>
        {panel && (
          <div
            className="card row"
            style={{
              marginTop: 8,
              padding: 10,
              gap: 8,
              boxShadow: "0 4px 14px #0002",
            }}
          >
            {panel === "time" ? (
              <>
                <input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  style={sel$}
                />
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  style={sel$}
                >
                  <option value="">시간 선택 안 함</option>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                style={sel$}
              >
                <option value="">인원 선택 안 함</option>
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}인 이상 수용
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {(loading || error || !cur) && (
        <div
          className="card"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            textAlign: "center",
            color: "var(--sub)",
            fontSize: 13,
          }}
        >
          {loading
            ? "불러오는 중…"
            : error
              ? error.message
              : "조건에 맞는 스터디카페가 없어요."}
        </div>
      )}

      {cur && !error && (
        <button
          className="card"
          onClick={() => onOpen(cur)}
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            textAlign: "left",
            boxShadow: "0 6px 20px #0003",
          }}
        >
          <div className="row">
            <div
              className="thumb"
              style={{
                width: 72,
                height: 72,
                display: "grid",
                placeItems: "center",
                fontSize: 28,
              }}
            >
              📚
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{cur.name}</div>
              <div style={{ fontSize: 12, color: "var(--sub)" }}>
                {cur.address} · 룸 {cur.roomCount}개
              </div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {won(cur.minPrice)}{" "}
                <span
                  style={{ color: "var(--sub)", fontSize: 11, fontWeight: 400 }}
                >
                  / 시간~
                </span>
              </div>
            </div>
            {cur.availableNow && (
              <span
                style={{
                  background: "var(--p2)",
                  color: "var(--p)",
                  fontSize: 11,
                  padding: "5px 8px",
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                예약가능
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
