require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MysqlSessionStore = require('./services/mysql-session-store');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');

require('./db/connection');
const { loadUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  store: new MysqlSessionStore({ ttlMs: 1000 * 60 * 60 * 8 }),
  secret: process.env.SESSION_SECRET || 'careertrack-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: 'lax' }
}));

app.use(async (req, res, next) => {
  await loadUser(req, res, next);
});

// Flash-style messages (simple, session based)
app.use((req, res, next) => {
  res.locals.flashSuccess = req.session.flashSuccess || null;
  res.locals.flashError = req.session.flashError || null;
  delete req.session.flashSuccess;
  delete req.session.flashError;
  next();
});

// Routes
app.use('/', require('./routes/public'));
app.use('/', require('./routes/auth'));
app.use('/jobs', require('./routes/jobs'));
app.use('/jobseeker', require('./routes/jobseeker'));
app.use('/employer', require('./routes/employer'));
app.use('/admin', require('./routes/admin'));
app.use('/notifications', require('./routes/notifications'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Page Not Found', message: 'The page you are looking for does not exist.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something Went Wrong', message: 'An unexpected server error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`CareerTrack running at http://localhost:${PORT}`);
});
