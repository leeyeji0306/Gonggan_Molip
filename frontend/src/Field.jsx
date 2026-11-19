import { useState } from "react";

export default function Field({ label, error, ...p }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="lbl">{label}</label>
      <input className={"inp" + (error ? " bad" : "")} {...p} />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
