const jwt = require("jsonwebtoken");

exports.sign = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.setCookie = (res, token) =>
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600 * 1000,
  });

// 로그인 필수 API에 붙이는 미들웨어 → req.user.id 사용 가능
exports.required = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (!token)
    return res
      .status(401)
      .json({ code: "UNAUTHORIZED", message: "로그인이 필요해요." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res
      .status(401)
      .json({
        code: "UNAUTHORIZED",
        message: "로그인이 만료되었어요. 다시 로그인해 주세요.",
      });
  }
};
