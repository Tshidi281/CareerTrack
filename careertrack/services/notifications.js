const db = require('../db/connection');

async function notify(userId, title, message, type = 'general') {
  await db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, title, message, type, 0);
  return true;
}

async function getForUser(userId, limit = 50) {
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, Number(limit));
}

async function markAllRead(userId) {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return true;
}

async function markRead(userId, notifId) {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?').run(userId, notifId);
  return true;
}

module.exports = { notify, getForUser, markAllRead, markRead };
