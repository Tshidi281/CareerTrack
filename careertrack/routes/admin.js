const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const stats = {
    users: (await db.prepare('SELECT COUNT(*) c FROM users').get()).c,
    jobseekers: (await db.prepare("SELECT COUNT(*) c FROM users WHERE role='jobseeker'").get()).c,
    employers: (await db.prepare("SELECT COUNT(*) c FROM users WHERE role='employer'").get()).c,
    jobs: (await db.prepare('SELECT COUNT(*) c FROM jobs').get()).c,
    publishedJobs: (await db.prepare("SELECT COUNT(*) c FROM jobs WHERE status='published'").get()).c,
    applications: (await db.prepare('SELECT COUNT(*) c FROM applications').get()).c,
    skills: (await db.prepare('SELECT COUNT(*) c FROM skills').get()).c,
    categories: (await db.prepare('SELECT COUNT(*) c FROM job_categories').get()).c
  };
  const recentUsers = await db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 6').all();
  const recentJobs = await db.prepare(`SELECT j.*, e.company_name FROM jobs j JOIN employers e ON e.id = j.employer_id ORDER BY j.created_at DESC LIMIT 6`).all();

  res.render('admin/dashboard', { title: 'Admin Dashboard', stats, recentUsers, recentJobs });
});

// ===== SKILLS =====
router.get('/skills', async (req, res) => {
  const skills = await db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = s.id) AS user_count,
    (SELECT COUNT(*) FROM job_skills js WHERE js.skill_id = s.id) AS job_count
    FROM skills s ORDER BY s.name
  `).all();
  res.render('admin/skills', { title: 'Manage Skills', skills });
});

router.post('/skills', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) { req.session.flashError = 'Skill name is required.'; return res.redirect('/admin/skills'); }
  try {
    await db.prepare('INSERT INTO skills (name) VALUES (?)').run(name);
    req.session.flashSuccess = `Skill "${name}" added.`;
  } catch (e) {
    req.session.flashError = 'That skill already exists.';
  }
  res.redirect('/admin/skills');
});

router.post('/skills/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  req.session.flashSuccess = 'Skill deleted.';
  res.redirect('/admin/skills');
});

// ===== CATEGORIES =====
router.get('/categories', async (req, res) => {
  const categories = await db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.category_id = c.id) AS job_count
    FROM job_categories c ORDER BY c.name
  `).all();
  res.render('admin/categories', { title: 'Manage Job Categories', categories });
});

router.post('/categories', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) { req.session.flashError = 'Category name is required.'; return res.redirect('/admin/categories'); }
  try {
    await db.prepare('INSERT INTO job_categories (name) VALUES (?)').run(name);
    req.session.flashSuccess = `Category "${name}" added.`;
  } catch (e) {
    req.session.flashError = 'That category already exists.';
  }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM job_categories WHERE id = ?').run(req.params.id);
  req.session.flashSuccess = 'Category deleted.';
  res.redirect('/admin/categories');
});

// ===== USERS OVERVIEW =====
router.get('/users', async (req, res) => {
  const roleFilter = req.query.role;
  let sql = 'SELECT * FROM users';
  const params = [];
  if (roleFilter && ['jobseeker','employer','admin'].includes(roleFilter)) {
    sql += ' WHERE role = ?';
    params.push(roleFilter);
  }
  sql += ' ORDER BY created_at DESC';
  const users = await db.prepare(sql).all(...params);
  res.render('admin/users', { title: 'Platform Users', users, roleFilter: roleFilter || '' });
});

module.exports = router;
