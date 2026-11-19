import { request } from "./client";

// params: { q, people, available, date, hour, lat, lng, radius }
export const getCafes = (params) => request("/cafes", { query: params });
export const getCafe = (id) => request(`/cafes/${id}`);
export const getSlots = (roomId, date) =>
  request(`/rooms/${roomId}/slots`, { query: { date } });
// sort: popular | rising | rating
export const getPopular = (sort = "popular") =>
  request("/popular", { query: { sort } });
