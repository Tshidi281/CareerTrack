const db = require('../db/connection');

// Attach current user (if logged in) to res.locals for use in all views
async function loadUser(req, res, next) {
  res.locals.currentUser = null;
  res.locals.unreadCount = 0;
  if (req.session && req.session.userId) {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      req.currentUser = user;
      res.locals.currentUser = user;
      const row = await db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id);
      res.locals.unreadCount = row ? row.c : 0;
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    req.session.flashError = 'Please log in to continue.';
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      req.session.flashError = 'Please log in to continue.';
      return res.redirect('/login');
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: `Your account role ("${req.currentUser.role}") does not have permission to access this page.`
      });
    }
    next();
  };
}

module.exports = { loadUser, requireAuth, requireRole };
