require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// 카테고리별 라우터
app.use("/api/auth", require("./routes/auth")); // 로그인/회원가입
app.use("/api", require("./routes/cafes")); // 스터디카페 (/cafes, /rooms/:id/slots, /popular)
app.use("/api/reservations", require("./routes/reservations")); // 예약
app.use("/api", require("./routes/me")); // 마이페이지 (/me ...)

app.get("/api/health", (req, res) => res.json({ ok: true }));

// 404
app.use((req, res) =>
  res
    .status(404)
    .json({ code: "NOT_FOUND", message: "존재하지 않는 경로예요." }),
);

// 공통 에러 처리
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ code: "SERVER_ERROR", message: "서버 오류가 발생했어요." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`server running on http://localhost:${PORT}`),
);
