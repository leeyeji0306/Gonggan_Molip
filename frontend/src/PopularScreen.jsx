import { useState } from "react";
import { getPopular } from "./api/cafes";
import useFetch from "./hooks/useFetch";
import { won } from "./utils/format";

const TABS = [
  ["전체 인기", "popular"],
  ["예약 급상승", "rising"],
  ["만족도 순", "rating"],
];

export default function PopularScreen({ onOpen }) {
  const [sort, setSort] = useState("popular");
  const { data, loading, error } = useFetch(() => getPopular(sort), [sort]);
  const items = data ? data.items : [];

  return (
    <div className="body" style={{ background: "var(--bg)" }}>
      <div className="hd" style={{ background: "#fff" }}>
        실시간 인기 순위
      </div>
      <div
        className="row"
        style={{
          background: "#fff",
          padding: "0 20px",
          gap: 18,
          fontSize: 13,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {TABS.map(([label, key]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            style={{
              padding: "10px 0",
              color: sort === key ? "var(--p)" : "var(--sub)",
              fontWeight: sort === key ? 700 : 400,
              borderBottom:
                sort === key ? "2px solid var(--p)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {loading && (
          <p style={{ textAlign: "center", color: "var(--sub)", padding: 40 }}>
            불러오는 중…
          </p>
        )}
        {error && (
          <p style={{ textAlign: "center", color: "#e5484d", padding: 40 }}>
            {error.message}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--sub)", padding: 40 }}>
            아직 인기 순위가 없어요.
            <br />
            예약이 쌓이면 여기에 표시돼요.
          </p>
        )}

        {items.map((c) => (
          <button
            key={c.cafeId}
            className="card"
            onClick={() => onOpen({ id: c.cafeId, name: c.name })}
            style={{ textAlign: "left", padding: 14 }}
          >
            <div className="row">
              <div style={{ position: "relative" }}>
                <div
                  className="thumb"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                    background: "var(--p2)",
                  }}
                >
                  📚
                </div>
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    background: c.rank === 1 ? "#f5a623" : "var(--ink)",
                    color: "#fff",
                    width: 20,
                    height: 20,
                    borderRadius: 99,
                    fontSize: 11,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {c.rank}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>{c.name}</b>
                <p style={{ fontSize: 11, color: "var(--sub)" }}>{c.address}</p>
                <p style={{ fontSize: 12, marginTop: 2 }}>
                  <span style={{ color: "var(--p)", fontWeight: 700 }}>
                    예약률 {Math.round(c.reservationRate * 100)}%
                  </span>
                  <span style={{ color: "var(--sub)" }}>
                    {" "}
                    · 누적 {c.totalReservations.toLocaleString()}건
                  </span>
                </p>
              </div>
              <b style={{ fontSize: 13, alignSelf: "flex-end" }}>
                {won(c.minPrice)}~
              </b>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
