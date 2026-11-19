import { cancelReservation } from "./api/reservations";
import { logout } from "./api/auth";
import { chargePoints, getMe, getMyReservations, getMyStats } from "./api/me";
import useFetch from "./hooks/useFetch";
import { fmtRange, won } from "./utils/format";

const DAYS = "월화수목금토일".split("");

export default function MyScreen({ user, onUserChange, onLogout }) {
  const me = useFetch(getMe, []);
  const up = useFetch(() => getMyReservations("upcoming"), []);
  const st = useFetch(getMyStats, []);

  const profile = me.data || user;
  const next =
    up.data && up.data.items.length
      ? [...up.data.items].sort((a, b) => a.startAt.localeCompare(b.startAt))[0]
      : null;
  const stats = st.data;
  const max = stats ? Math.max(...stats.weekly, 1) : 1;

  const refresh = async () => {
    const m = await getMe();
    onUserChange({ ...user, ...m }); // 상단 앱 상태의 포인트도 같이 갱신
    me.reload();
    up.reload();
    st.reload();
  };

  const charge = async () => {
    if (!window.confirm("10,000p를 충전할까요? (임시 충전)")) return;
    try {
      await chargePoints(10000);
      await refresh();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const cancel = async () => {
    if (!window.confirm("예약을 취소할까요? 사용한 포인트는 전액 환불돼요."))
      return;
    try {
      await cancelReservation(next.id);
      await refresh();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const doLogout = async () => {
    try {
      await logout();
    } catch {
      /* 쿠키 삭제 실패해도 화면은 로그아웃 처리 */
    }
    onLogout();
  };

  return (
    <div className="body">
      <div className="hd">
        마이페이지<span>⚙️</span>
      </div>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            background: "var(--p2)",
            margin: "0 auto 10px",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
          }}
        >
          🙂
        </div>
        <b style={{ fontSize: 18 }}>{profile.nickname} 님</b>
        <p style={{ fontSize: 11, color: "var(--sub)" }}>{profile.email}</p>
      </div>

      <div
        className="row"
        style={{
          margin: "0 20px",
          padding: 20,
          borderRadius: 18,
          background: "linear-gradient(135deg,#4a7bff,#3b6cf5)",
          color: "#fff",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>나의 잔여 포인트</div>
          <b style={{ fontSize: 30 }}>
            {Number(profile.points).toLocaleString()}
          </b>{" "}
          p
        </div>
        <button
          onClick={charge}
          style={{
            background: "#fff",
            color: "var(--p)",
            borderRadius: 10,
            padding: "9px 16px",
            fontWeight: 700,
          }}
        >
          충전하기
        </button>
      </div>

      <div className="sec">다가오는 예약</div>
      <div className="card" style={{ margin: "0 20px" }}>
        {up.loading ? (
          <p style={{ fontSize: 13, color: "var(--sub)" }}>불러오는 중…</p>
        ) : next ? (
          <>
            <b style={{ fontSize: 14 }}>{next.cafeName}</b>
            <p style={{ fontSize: 12, color: "var(--sub)" }}>
              {next.roomName} · {fmtRange(next.startAt, next.endAt)}
            </p>
            {new Date(next.startAt) > new Date() && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="ghost" onClick={cancel}>
                  예약 취소
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--sub)" }}>
            예정된 예약이 없어요.
          </p>
        )}
      </div>

      <div className="sec">이용 통계</div>
      {st.error ? (
        <p style={{ margin: "0 20px", fontSize: 13, color: "#e5484d" }}>
          {st.error.message}
        </p>
      ) : (
        <>
          <div className="row" style={{ margin: "0 20px", gap: 12 }}>
            <div className="card" style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "var(--sub)" }}>이번 달 이용</p>
              <b style={{ fontSize: 24 }}>
                {stats ? stats.monthHours : "-"}
              </b>{" "}
              시간
            </div>
            <div className="card" style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "var(--sub)" }}>몰입 리포트</p>
              <b style={{ fontSize: 24, color: "var(--p)" }}>
                {stats
                  ? `${stats.vsAveragePercent > 0 ? "+" : ""}${stats.vsAveragePercent}%`
                  : "-"}
              </b>
              <p style={{ fontSize: 10, color: "var(--sub)" }}>
                전체 평균 대비
              </p>
            </div>
          </div>
          <div className="card" style={{ margin: "12px 20px 0" }}>
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 10 }}
            >
              <p style={{ fontSize: 11, color: "var(--sub)" }}>
                주간 이용 패턴
              </p>
              <p style={{ fontSize: 11, color: "var(--p)" }}>
                {stats ? stats.weekLabel : ""}
              </p>
            </div>
            <div
              className="row"
              style={{ alignItems: "flex-end", height: 80, gap: 8 }}
            >
              {(stats ? stats.weekly : [0, 0, 0, 0, 0, 0, 0]).map((h, i) => (
                <div
                  key={i}
                  title={`${h}시간`}
                  style={{
                    flex: 1,
                    height: Math.max((h / max) * 100, 4) + "%",
                    background: h === max && h > 0 ? "var(--p)" : "var(--p2)",
                    borderRadius: 6,
                  }}
                />
              ))}
            </div>
            <div className="row" style={{ marginTop: 6, gap: 8 }}>
              {DAYS.map((d) => (
                <span
                  key={d}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 10,
                    color: "var(--sub)",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {["공지사항", "고객센터", "로그아웃"].map((t) => (
        <button
          key={t}
          onClick={t === "로그아웃" ? doLogout : undefined}
          className="row"
          style={{
            width: "100%",
            justifyContent: "space-between",
            padding: "16px 24px",
            fontSize: 14,
            borderBottom: "1px solid var(--line)",
            textAlign: "left",
          }}
        >
          <span>{t}</span>
          <span style={{ color: "#b8bfcc" }}>›</span>
        </button>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
