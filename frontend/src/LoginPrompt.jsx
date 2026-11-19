import { useState } from "react";

/* ───────── 로그인 / 회원가입 ───────── */
export default function LoginPrompt({ title, onLogin, onSignup }) {
  return (
    <div className="body" style={{ background: "var(--bg)" }}>
      <div className="hd" style={{ background: "#fff" }}>
        {title}
      </div>
      <div style={{ textAlign: "center", padding: "90px 32px" }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <b style={{ display: "block", fontSize: 17, margin: "14px 0 6px" }}>
          로그인이 필요해요
        </b>
        <p style={{ fontSize: 13, color: "var(--sub)", marginBottom: 24 }}>
          로그인하면 예약 내역과 포인트를 확인할 수 있어요.
        </p>
        <button className="cta" style={{ width: "100%" }} onClick={onLogin}>
          로그인
        </button>
        <button
          className="ghost"
          style={{ width: "100%", marginTop: 10, padding: 14 }}
          onClick={onSignup}
        >
          회원가입
        </button>
      </div>
    </div>
  );
}
