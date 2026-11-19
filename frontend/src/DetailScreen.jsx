import { useEffect, useState } from "react";
import { getCafe, getSlots } from "./api/cafes";
import { createReservation } from "./api/reservations";
import useFetch from "./hooks/useFetch";
import { hh, todayStr, won } from "./utils/format";

export default function DetailScreen({
  cafeId,
  user,
  onBack,
  onNeedLogin,
  onDone,
}) {
  const {
    data: cafe,
    loading,
    error,
  } = useFetch(() => getCafe(cafeId), [cafeId]);
  const [roomId, setRoomId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [picked, setPicked] = useState([]); // 선택한 시간(숫자) 배열
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const room = cafe
    ? cafe.rooms.find((r) => r.id === roomId) || cafe.rooms[0]
    : null;
  const roomKey = room ? room.id : null;

  const {
    data: slotData,
    loading: slotLoading,
    reload: reloadSlots,
  } = useFetch(
    () => (roomKey ? getSlots(roomKey, date) : Promise.resolve(null)),
    [roomKey, date],
  );

  // 룸/날짜가 바뀌면 선택 초기화
  useEffect(() => {
    setPicked([]);
    setErr("");
  }, [roomKey, date]);

  // 연속된 시간만 선택 가능 (양 끝에 추가/해제)
  const toggle = (h) => {
    if (!picked.length) return setPicked([h]);
    const lo = Math.min(...picked);
    const hi = Math.max(...picked);
    if (picked.includes(h) && (h === lo || h === hi))
      return setPicked(picked.filter((p) => p !== h));
    if (h === hi + 1 || h === lo - 1)
      return setPicked([...picked, h].sort((a, b) => a - b));
    setPicked([h]);
  };

  const reserve = async () => {
    if (!user) return onNeedLogin();
    setBusy(true);
    setErr("");
    try {
      const res = await createReservation({
        roomId: room.id,
        date,
        hours: picked,
      });
      onDone(res);
    } catch (e) {
      if (e.code === "UNAUTHORIZED") return onNeedLogin();
      setErr(e.message);
      if (e.code === "SLOT_TAKEN") {
        setPicked([]);
        reloadSlots();
      } // 그 사이 마감됐다면 시간표 갱신
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button
      onClick={onBack}
      aria-label="뒤로"
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        width: 36,
        height: 36,
        borderRadius: 99,
        background: "#fffd",
        fontSize: 18,
        zIndex: 2,
      }}
    >
      ‹
    </button>
  );

  if (loading || error || !cafe) {
    return (
      <div
        className="body"
        style={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          color: "var(--sub)",
          fontSize: 14,
        }}
      >
        {back}
        {loading
          ? "불러오는 중…"
          : error
            ? error.message
            : "카페를 찾을 수 없어요."}
      </div>
    );
  }

  const total = room ? picked.length * room.pricePerHour : 0;

  return (
    <div className="body" style={{ background: "#fff" }}>
      <div
        style={{
          position: "relative",
          height: 200,
          background: "linear-gradient(135deg,#cfd9ff,#eaf0ff)",
        }}
      >
        {cafe.imageUrl && (
          <img
            src={cafe.imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {back}
      </div>

      <div
        style={{
          padding: 20,
          marginTop: -20,
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          position: "relative",
        }}
      >
        <h2 style={{ fontSize: 20 }}>{cafe.name}</h2>
        <p style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>
          📍 {cafe.address} · 운영 {String(cafe.openHour).padStart(2, "0")}:00 ~{" "}
          {String(cafe.closeHour % 24).padStart(2, "0")}:00
        </p>
        {cafe.facilities.length > 0 && (
          <div
            className="row"
            style={{ marginTop: 14, gap: 6, flexWrap: "wrap" }}
          >
            {cafe.facilities.map((f) => (
              <span
                key={f}
                style={{
                  background: "var(--p2)",
                  color: "var(--p)",
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sec" style={{ marginTop: 6 }}>
        스터디룸 선택
      </div>
      {cafe.rooms.length === 0 && (
        <p style={{ padding: "0 20px", fontSize: 13, color: "var(--sub)" }}>
          이용 가능한 스터디룸이 없어요.
        </p>
      )}
      <div style={{ padding: "0 20px", display: "grid", gap: 10 }}>
        {cafe.rooms.map((r) => (
          <button
            key={r.id}
            className="card row"
            onClick={() => setRoomId(r.id)}
            style={{
              textAlign: "left",
              borderColor:
                room && room.id === r.id ? "var(--p)" : "var(--line)",
              borderWidth: room && room.id === r.id ? 2 : 1,
            }}
          >
            <div
              className="thumb"
              style={{
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                color: "var(--p)",
                fontWeight: 700,
                background: "var(--p2)",
              }}
            >
              {r.capacity}인
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {r.name} ({r.capacity}인실)
              </div>
              <div style={{ fontSize: 11, color: "var(--sub)" }}>
                {r.description || r.facilities.join(" · ")}
              </div>
              <div style={{ fontWeight: 700, color: "var(--p)", marginTop: 4 }}>
                {won(r.pricePerHour)}{" "}
                <span
                  style={{ fontSize: 11, color: "var(--sub)", fontWeight: 400 }}
                >
                  / 시간
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {room && (
        <>
          <div
            className="row"
            style={{ justifyContent: "space-between", padding: "0 20px" }}
          >
            <div className="sec" style={{ marginLeft: 0 }}>
              예약 시간 선택
            </div>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              style={{
                border: 0,
                color: "var(--p)",
                fontSize: 12,
                background: "none",
              }}
            />
          </div>
          <div
            style={{
              padding: "0 20px",
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
            }}
          >
            {slotLoading && (
              <p
                style={{
                  gridColumn: "1/-1",
                  fontSize: 13,
                  color: "var(--sub)",
                }}
              >
                시간표 불러오는 중…
              </p>
            )}
            {!slotLoading &&
              slotData &&
              slotData.slots.map(({ hour, status }) => {
                const off = status !== "AVAILABLE";
                return (
                  <button
                    key={hour}
                    disabled={off}
                    onClick={() => toggle(hour)}
                    className={
                      "slot" +
                      (off ? " off" : "") +
                      (picked.includes(hour) ? " sel" : "")
                    }
                  >
                    {hh(hour)}
                  </button>
                );
              })}
          </div>
        </>
      )}

      <div style={{ height: 110 }} />
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid var(--line)",
          padding: "12px 20px",
        }}
      >
        {err && (
          <p className="err" role="alert" style={{ marginBottom: 8 }}>
            {err}
          </p>
        )}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--sub)" }}>
              {picked.length
                ? `${picked.length}시간 · ${hh(picked[0])}${user ? ` · 보유 ${won(user.points)}` : ""}`
                : "시간을 선택하세요"}
            </div>
            <b style={{ fontSize: 22 }}>{won(total)}</b>
          </div>
          <button
            className="cta"
            disabled={!picked.length || busy}
            style={{ opacity: picked.length && !busy ? 1 : 0.4 }}
            onClick={reserve}
          >
            {busy ? "예약 중…" : user ? "지금 예약하기" : "로그인하고 예약"}
          </button>
        </div>
      </div>
    </div>
  );
}
