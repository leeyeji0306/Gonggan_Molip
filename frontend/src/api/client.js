// 모든 API 요청이 거치는 공통 fetch 함수
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function request(path, { method = "GET", body, query } = {}) {
  let qs = "";
  if (query) {
    const p = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") p.append(k, v);
    });
    qs = p.toString() ? `?${p}` : "";
  }

  let res;
  try {
    res = await fetch(BASE + path + qs, {
      method,
      credentials: "include", // 로그인 쿠키(token)를 주고받기 위해 필수
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "서버에 연결할 수 없어요.");
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new ApiError(
      res.status,
      data.code || "ERROR",
      data.message || "요청에 실패했어요.",
    );
    // 로그인 만료 → App이 이 이벤트를 받아 로그아웃 처리
    if (err.code === "UNAUTHORIZED")
      window.dispatchEvent(new Event("auth:expired"));
    throw err;
  }
  return data;
}
