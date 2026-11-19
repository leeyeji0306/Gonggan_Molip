require("dotenv").config();
const mysql = require("mysql2/promise");

// DATETIME을 'YYYY-MM-DD HH:mm:ss' 문자열 그대로 받도록 dateStrings 사용 (타임존 꼬임 방지)
module.exports = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "gonggan_molip",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});
