// 로그인 / 회원가입 / 로그아웃  (/api/auth)
const router = require("express").Router();
const bcrypt = require("bcrypt");
const pool = require("../db");
const { sign, setCookie } = require("../middleware/auth");
const { wrap, fail } = require("../utils/http");
const { getBalance } = require("../utils/points");

// POST /api/auth/signup   body: { nickname, email, password }  (nickname 대신 name 도 허용)
router.post(
  "/signup",
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const nickname = (
      (req.body && (req.body.nickname || req.body.name)) ||
      ""
    ).trim();
    if (
      !nickname ||
      !/^\S+@\S+\.\S+$/.test(email || "") ||
      (password || "").length < 8
    ) {
      return fail(
        res,
        400,
        "INVALID_INPUT",
        "입력값을 확인해 주세요. (비밀번호는 8자 이상)",
      );
    }
    const hash = await bcrypt.hash(password, 10);
    const mail = email.toLowerCase();
    try {
      const [r] = await pool.query(
        "INSERT INTO users (email, password_hash, nickname) VALUES (?,?,?)",
        [mail, hash, nickname],
      );
      setCookie(res, sign(r.insertId)); // 가입 후 바로 로그인 상태
      res
        .status(201)
        .json({ user: { id: r.insertId, nickname, email: mail, points: 0 } });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY")
        return fail(res, 409, "EMAIL_EXISTS", "이미 가입된 이메일이에요.");
      throw e;
    }
  }),
);

// POST /api/auth/login
router.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password)
      return fail(
        res,
        400,
        "INVALID_INPUT",
        "이메일과 비밀번호를 입력해 주세요.",
      );
    const [[user]] = await pool.query(
      "SELECT user_id, nickname, email, password_hash FROM users WHERE email = ?",
      [email.toLowerCase()],
    );
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok)
      return fail(
        res,
        401,
        "INVALID_CREDENTIALS",
        "이메일 또는 비밀번호가 올바르지 않아요.",
      );
    setCookie(res, sign(user.user_id));
    res.json({
      user: {
        id: user.user_id,
        nickname: user.nickname,
        email: user.email,
        points: await getBalance(pool, user.user_id),
      },
    });
  }),
);

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(204).end();
});

module.exports = router;
