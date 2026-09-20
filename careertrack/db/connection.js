const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'careertrack',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  multipleStatements: true
});

const originalExecute = pool.execute.bind(pool);
const originalQuery = pool.query.bind(pool);

const db = pool;

const sanitizeParam = (value) => (value === undefined ? null : value);

const sanitizeParams = (params) => {
  if (Array.isArray(params)) {
    return params.map(sanitizeParam);
  }

  if (params && typeof params === 'object') {
    const normalized = {};
    Object.keys(params).forEach((key) => {
      normalized[key] = sanitizeParam(params[key]);
    });
    return normalized;
  }

  return sanitizeParam(params);
};

db.execute = async function execute(sql, params = []) {
  const safeParams = sanitizeParams(params);
  if (safeParams === undefined || safeParams === null || safeParams === '' || (Array.isArray(safeParams) && safeParams.length === 0)) {
    return originalQuery(sql);
  }

  return originalExecute(sql, safeParams);
};

db.query = async function query(sql, params = []) {
  const safeParams = sanitizeParams(params);
  if (safeParams === undefined || safeParams === null || safeParams === '' || (Array.isArray(safeParams) && safeParams.length === 0)) {
    return originalQuery(sql);
  }

  if (Array.isArray(safeParams)) {
    return originalExecute(sql, safeParams);
  }

  return originalExecute(sql, [safeParams]);
};

db.prepare = function prepare(sql) {
  const normalizeParams = (params) => {
    if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const values = sanitizeParams(params[0]);
      const order = [];
      const normalizedSql = sql.replace(/@([A-Za-z0-9_]+)|:([A-Za-z0-9_]+)/g, (_, atName, colonName) => {
        const name = atName || colonName;
        order.push(name);
        return '?';
      });
      return { sql: normalizedSql, params: order.map((name) => values[name]) };
    }

    return { sql, params: sanitizeParams(params) };
  };

  return {
    async get(...params) {
      const { sql: normalizedSql, params: values } = normalizeParams(params);
      const [rows] = await originalExecute(normalizedSql, values);
      return rows[0] || null;
    },
    async all(...params) {
      const { sql: normalizedSql, params: values } = normalizeParams(params);
      const [rows] = await originalExecute(normalizedSql, values);
      return rows;
    },
    async run(...params) {
      const { sql: normalizedSql, params: values } = normalizeParams(params);
      const [result] = await originalExecute(normalizedSql, values);
      return {
        lastInsertRowid: result.insertId,
        changes: result.affectedRows,
        warningStatus: result.warningStatus || 0
      };
    }
  };
};

db.transaction = function transaction(fn) {
  return function wrapped(...args) {
    return fn(...args);
  };
};

module.exports = db;
