// async 라우트의 에러를 공통 에러 핸들러로 넘김
exports.wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 에러 응답: { code, message }
exports.fail = (res, status, code, message) =>
  res.status(status).json({ code, message });
