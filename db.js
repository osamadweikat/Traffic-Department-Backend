require('dotenv').config();

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'software',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0
});

const promisePool = pool.promise();

function query(sql, values, callback) {
  if (typeof values === 'function') {
    return pool.query(sql, values);
  }

  if (typeof callback === 'function') {
    return pool.query(sql, values, callback);
  }

  return promisePool.query(sql, values);
}

function execute(sql, values, callback) {
  if (typeof values === 'function') {
    return pool.execute(sql, values);
  }

  if (typeof callback === 'function') {
    return pool.execute(sql, values, callback);
  }

  return promisePool.execute(sql, values);
}

module.exports = {
  query,
  execute,
  promise: () => promisePool,
  getConnection: (...args) => pool.getConnection(...args),
  end: (...args) => pool.end(...args)
};
