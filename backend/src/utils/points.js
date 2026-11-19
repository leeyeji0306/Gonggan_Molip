// 잔액은 users에 저장하지 않고 point_transactions 의 SUM(amount)로 계산
// db: pool 또는 트랜잭션 중인 conn
exports.getBalance = async (db, userId) => {
  const [[row]] = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?",
    [userId],
  );
  return Number(row.balance);
};
