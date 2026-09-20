const { Store } = require('express-session');
const db = require('../db/connection');

class MysqlSessionStore extends Store {
  constructor(options = {}) {
    super(options);
    this.ttlMs = options.ttlMs || 1000 * 60 * 60 * 8;

    this.sweepExpiredSessions = async () => {
      try {
        const now = Date.now();
        await db.query('DELETE FROM sessions WHERE expires_at < ?', [now]);
      } catch (err) {
        console.error('Session cleanup failed:', err.message);
      }
    };

    this._sweepInterval = setInterval(() => this.sweepExpiredSessions().catch(() => {}), 15 * 60 * 1000);
    this._sweepInterval.unref?.();
  }

  _expiryFor(session) {
    if (session && session.cookie && session.cookie.expires) {
      const t = new Date(session.cookie.expires).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return Date.now() + this.ttlMs;
  }

  get(sid, callback) {
    db.query('SELECT session_json, expires_at FROM sessions WHERE sid = ?', [sid])
      .then(([rows]) => {
        const row = rows[0];
        if (!row) return callback(null, null);
        if (Number(row.expires_at) < Date.now()) {
          return db.query('DELETE FROM sessions WHERE sid = ?', [sid]).then(() => callback(null, null));
        }
        try {
          callback(null, JSON.parse(row.session_json));
        } catch (err) {
          callback(err);
        }
      })
      .catch(callback);
  }

  set(sid, session, callback) {
    const expiresAt = this._expiryFor(session);
    const payload = JSON.stringify(session);
    db.query(
      `INSERT INTO sessions (sid, session_json, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE session_json = VALUES(session_json), expires_at = VALUES(expires_at)`,
      [sid, payload, expiresAt]
    )
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  destroy(sid, callback) {
    db.query('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  touch(sid, session, callback) {
    const expiresAt = this._expiryFor(session);
    db.query('UPDATE sessions SET expires_at = ? WHERE sid = ?', [expiresAt, sid])
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  all(callback) {
    db.query('SELECT sid, session_json FROM sessions WHERE expires_at >= ?', [Date.now()])
      .then(([rows]) => {
        const sessions = {};
        rows.forEach((row) => {
          sessions[row.sid] = JSON.parse(row.session_json);
        });
        callback(null, sessions);
      })
      .catch((err) => callback(err));
  }

  length(callback) {
    db.query('SELECT COUNT(*) AS count FROM sessions WHERE expires_at >= ?', [Date.now()])
      .then(([rows]) => callback(null, rows[0].count))
      .catch((err) => callback(err));
  }

  clear(callback) {
    db.query('DELETE FROM sessions')
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }
}

module.exports = MysqlSessionStore;
