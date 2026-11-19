import { useState } from "react";
import Field from "./Field";
import { login, signup } from "./api/auth";

export default function AuthScreen({
  mode,
  onMode,
  onClose,
  onSuccess,
  needLogin,
}) {
  const isSignup = mode === "signup";
  const [v, setV] = useState({
    nickname: "",
    email: "",
    pw: "",
    pw2: "",
    agree: false,
  });
  const [e, setE] = useState({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) =>
    setV({
      ...v,
      [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value,
    });

  const submit = async () => {
    const er = {};
    if (isSignup && !v.nickname.trim()) er.nickname = "닉네임을 입력해 주세요.";
    if (!/^\S+@\S+\.\S+$/.test(v.email))
      er.email = "올바른 이메일 형식이 아니에요.";
    if (v.pw.length < 8) er.pw = "비밀번호는 8자 이상이어야 해요.";
    if (isSignup && v.pw2 !== v.pw) er.pw2 = "비밀번호가 일치하지 않아요.";
    if (isSignup && !v.agree) er.agree = "이용약관에 동의해 주세요.";
    setE(er);
    setFormErr("");
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      const res = isSignup
        ? await signup({
            nickname: v.nickname.trim(),
            email: v.email,
            password: v.pw,
          })
        : await login({ email: v.email, password: v.pw });
      onSuccess(res.user, isSignup);
    } catch (err) {
      if (err.code === "EMAIL_EXISTS") setE({ email: err.message });
      else setFormErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="body" style={{ background: "#fff" }}>
      <div className="hd">
        <button onClick={onClose} aria-label="닫기" style={{ fontSize: 22 }}>
          ‹
        </button>
        <span />
      </div>
      <div style={{ padding: "8px 24px 32px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "var(--p)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          몰
        </div>
        <h1 style={{ fontSize: 24, margin: "18px 0 6px", lineHeight: 1.3 }}>
          {isSignup ? "회원가입" : "로그인"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--sub)", marginBottom: 28 }}>
          {needLogin
            ? "예약하려면 로그인이 필요해요."
            : isSignup
              ? "가입하고 스터디룸을 바로 예약해 보세요."
              : "공간과 몰입에 오신 것을 환영해요."}
        </p>

        {isSignup && (
          <Field
            label="닉네임"
            value={v.nickname}
            onChange={set("nickname")}
            error={e.nickname}
            placeholder="몰입러"
            autoComplete="nickname"
          />
        )}
        <Field
          label="이메일"
          type="email"
          value={v.email}
          onChange={set("email")}
          error={e.email}
          placeholder="molip@example.com"
          autoComplete="email"
        />
        <Field
          label="비밀번호"
          type="password"
          value={v.pw}
          onChange={set("pw")}
          error={e.pw}
          placeholder="8자 이상"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
        {isSignup && (
          <Field
            label="비밀번호 확인"
            type="password"
            value={v.pw2}
            onChange={set("pw2")}
            error={e.pw2}
            placeholder="비밀번호를 다시 입력"
            autoComplete="new-password"
          />
        )}

        {isSignup && (
          <div style={{ marginBottom: 16 }}>
            <label
              className="row"
              style={{ fontSize: 13, gap: 8, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={v.agree}
                onChange={set("agree")}
                style={{ width: 18, height: 18, accentColor: "var(--p)" }}
              />
              이용약관 및 개인정보 처리에 동의합니다
            </label>
            {e.agree && (
              <p className="err" role="alert">
                {e.agree}
              </p>
            )}
          </div>
        )}

        {formErr && (
          <p className="err" role="alert" style={{ marginBottom: 10 }}>
            {formErr}
          </p>
        )}
        <button
          className="cta"
          disabled={busy}
          style={{ width: "100%", marginTop: 8, opacity: busy ? 0.6 : 1 }}
          onClick={submit}
        >
          {busy ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--sub)",
            marginTop: 20,
          }}
        >
          {isSignup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}{" "}
          <button
            onClick={() => {
              setE({});
              setFormErr("");
              onMode(isSignup ? "login" : "signup");
            }}
            style={{ color: "var(--p)", fontWeight: 700 }}
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </p>
        {!needLogin && (
          <button
            onClick={onClose}
            style={{
              display: "block",
              margin: "14px auto 0",
              fontSize: 12,
              color: "var(--sub)",
              textDecoration: "underline",
            }}
          >
            로그인 없이 둘러보기
          </button>
        )}
      </div>
    </div>
  );
}
