import { request } from "./client";

// { roomId, date: 'YYYY-MM-DD', hours: [11, 12] }
export const createReservation = (body) =>
  request("/reservations", { method: "POST", body });
export const cancelReservation = (id) =>
  request(`/reservations/${id}/cancel`, { method: "PATCH" });
