import { request } from "./client";

export const getMe = () => request("/me");
// status: all | upcoming | done | canceled
export const getMyReservations = (status = "all") =>
  request("/me/reservations", { query: { status } });
export const getMyStats = () => request("/me/stats");
export const chargePoints = (amount) =>
  request("/me/points/charge", { method: "POST", body: { amount } });
