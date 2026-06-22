const mysql = require('mysql2/promise');

const HOST = process.env.HOST;
const USER = process.env.USER;
const PASSWORD = process.env.PASSWORD;
const DATABASE = process.env.DATABASE;

const dbConfig = {
  host: HOST,
  user: USER,
  password: PASSWORD,
  database: DATABASE
};

async function getConnection() {
  return mysql.createConnection(dbConfig);
}

module.exports = getConnection;
