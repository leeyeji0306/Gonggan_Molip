import { request } from "./client";

export const signup = ({ nickname, email, password }) =>
  request("/auth/signup", {
    method: "POST",
    body: { nickname, email, password },
  });

export const login = ({ email, password }) =>
  request("/auth/login", { method: "POST", body: { email, password } });

export const logout = () => request("/auth/logout", { method: "POST" });
