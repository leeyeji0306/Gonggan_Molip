import { useEffect, useRef, useState } from "react";
import AuthScreen from "./AuthScreen";
import DetailScreen from "./DetailScreen";
import LoginPrompt from "./LoginPrompt";
import MapScreen from "./MapScreen";
import MyScreen from "./MyScreen";
import PopularScreen from "./PopularScreen";
import ReservationScreen from "./ReservationScreen";
import { getMe } from "./api/me";
import { won } from "./utils/format";

const TABS = [
  ["map", "🗺️", "지도"],
  ["pop", "🔥", "인기"],
  ["res", "📅", "내 예약"],
  ["my", "👤", "마이"],
];

export default function App() {
  const [tab, setTab] = useState("map");
  const [cafe, setCafe] = useState(null); // 상세로 열 카페 ({ id, ... })
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null); // 비로그인 = null
  const [auth, setAuth] = useState(null); // null | 'login' | 'signup'
  const [booting, setBooting] = useState(true);
  const userRef = useRef(null);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 앱 시작 시: 쿠키가 살아 있으면 로그인 상태 복구
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  // 로그인 만료(401 UNAUTHORIZED) 감지
  useEffect(() => {
    const onExpired = () => {
      if (!userRef.current) return;
      setUser(null);
      flash("로그인이 만료되었어요. 다시 로그인해 주세요.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const onReserved = ({ reservation, remainingPoints }) => {
    setCafe(null);
    setTab("res");
    setUser((u) => (u ? { ...u, points: remainingPoints } : u));
    flash(
      `${reservation.roomName} 예약 완료 · ${won(reservation.totalPrice)} 차감`,
    );
  };

  const onAuthed = (u, isSignup) => {
    setUser(u);
    setAuth(null);
    if (cafe)
      flash("로그인되었어요. 예약하기를 다시 눌러주세요."); // 상세 화면(선택한 시간)은 그대로 유지됨
    else flash(isSignup ? "가입이 완료되었어요." : "로그인되었어요.");
  };

  const onLoggedOut = () => {
    setUser(null);
    setTab("map");
    flash("로그아웃되었어요.");
  };
  const setPoints = (points) => setUser((u) => (u ? { ...u, points } : u));

  const loginPrompt = (title) => (
    <LoginPrompt
      title={title}
      onLogin={() => setAuth("login")}
      onSignup={() => setAuth("signup")}
    />
  );

  return (
    <div className="gm">
      <div className="phone">
        {booting ? (
          <div
            className="body"
            style={{
              display: "grid",
              placeItems: "center",
              color: "var(--sub)",
            }}
          >
            불러오는 중…
          </div>
        ) : cafe ? (
          <DetailScreen
            cafeId={cafe.id}
            user={user}
            onBack={() => setCafe(null)}
            onNeedLogin={() => setAuth("login")}
            onDone={onReserved}
          />
        ) : (
          <div
            className="body"
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {tab === "map" && <MapScreen onOpen={setCafe} />}
            {tab === "pop" && <PopularScreen onOpen={setCafe} />}
            {tab === "res" &&
              (user ? (
                <ReservationScreen
                  onMap={() => setTab("map")}
                  onRebook={(cafeId) => setCafe({ id: cafeId })}
                  onPoints={setPoints}
                />
              ) : (
                loginPrompt("내 예약 내역")
              ))}
            {tab === "my" &&
              (user ? (
                <MyScreen
                  user={user}
                  onUserChange={setUser}
                  onLogout={onLoggedOut}
                />
              ) : (
                loginPrompt("마이페이지")
              ))}
          </div>
        )}

        {!booting && !cafe && (
          <nav className="tabs">
            {TABS.map(([k, i, l]) => (
              <button
                key={k}
                className={"tab" + (tab === k ? " on" : "")}
                onClick={() => setTab(k)}
              >
                <i>{i}</i>
                {l}
              </button>
            ))}
          </nav>
        )}

        {/* 로그인/회원가입은 위에 덮어서 보여줌 → 아래 상세 화면의 선택 상태가 유지됨 */}
        {auth && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AuthScreen
              mode={auth}
              onMode={setAuth}
              needLogin={!!cafe}
              onClose={() => setAuth(null)}
              onSuccess={onAuthed}
            />
          </div>
        )}

        {toast && (
          <div className="toast" role="status" style={{ zIndex: 40 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
