import { useState } from "react";
import { cancelReservation } from "./api/reservations";
import { getMyReservations } from "./api/me";
import useFetch from "./hooks/useFetch";
import { fmtRange } from "./utils/format";

const TABS = [
  ["전체", "all"],
  ["진행중", "upcoming"],
  ["취소/환불", "canceled"],
];
const LABEL = {
  CONFIRMED: "예약 완료",
  COMPLETED: "이용 완료",
  CANCELLED: "취소됨",
};

export default function ReservationScreen({ onMap, onRebook, onPoints }) {
  const [status, setStatus] = useState("all");
  const { data, loading, error, reload } = useFetch(
    () => getMyReservations(status),
    [status],
  );
  const items = data ? data.items : [];

  const cancel = async (id) => {
    if (!window.confirm("예약을 취소할까요? 사용한 포인트는 전액 환불돼요."))
      return;
    try {
      const r = await cancelReservation(id);
      onPoints && onPoints(r.remainingPoints);
      reload();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div className="body" style={{ background: "var(--bg)" }}>
      <div className="hd" style={{ background: "#fff" }}>
        내 예약 내역
      </div>
      <div
        className="row"
        style={{ padding: "6px 16px 12px", background: "#fff", gap: 8 }}
      >
        {TABS.map(([label, key]) => (
          <button
            key={key}
            className={"chip" + (status === key ? " on" : "")}
            style={{ boxShadow: "none", border: "1px solid var(--line)" }}
            onClick={() => setStatus(key)}
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
            해당하는 예약이 없어요.
          </p>
        )}

        {items.map((x) => {
          const active = x.status === "CONFIRMED";
          const cancelable = active && new Date(x.startAt) > new Date();
          return (
            <div
              key={x.id}
              className="card"
              style={{ opacity: x.status === "CONFIRMED" ? 1 : 0.65 }}
            >
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--sub)",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    background: active ? "var(--p2)" : "var(--bg)",
                    color: active ? "var(--p)" : "var(--sub)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  {LABEL[x.status]}
                </span>
                <span>예약번호: {x.reservationNo}</span>
              </div>
              <div className="row">
                <div
                  className="thumb"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                  }}
                >
                  📚
                </div>
                <div>
                  <b>{x.cafeName}</b>
                  <p style={{ fontSize: 12, color: "var(--sub)" }}>
                    {x.roomName}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--p)", marginTop: 4 }}>
                    🕐 {fmtRange(x.startAt, x.endAt)}
                  </p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                {active ? (
                  <>
                    {cancelable && (
                      <button className="ghost" onClick={() => cancel(x.id)}>
                        예약 취소
                      </button>
                    )}
                    <button className="pri" onClick={onMap}>
                      지도 보기
                    </button>
                  </>
                ) : (
                  <button className="ghost" onClick={() => onRebook(x.cafeId)}>
                    다시 예약
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
