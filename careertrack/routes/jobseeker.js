const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { getRecommendationsForUser } = require('../services/matching');
const { notify, getForUser } = require('../services/notifications');
const { upload } = require('../services/upload');

router.use(requireRole('jobseeker'));

function profileCompletion(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const eduCount = db.prepare('SELECT COUNT(*) c FROM education WHERE user_id = ?').get(userId).c;
  const expCount = db.prepare('SELECT COUNT(*) c FROM work_experience WHERE user_id = ?').get(userId).c;
  const skillCount = db.prepare('SELECT COUNT(*) c FROM user_skills WHERE user_id = ?').get(userId).c;
  const cvCount = db.prepare("SELECT COUNT(*) c FROM documents WHERE user_id = ? AND doc_type = 'CV'").get(userId).c;

  let score = 0;
  const checks = [
    !!user.phone, !!user.location, !!user.bio, eduCount > 0, expCount > 0 || eduCount > 0,
    skillCount > 0, cvCount > 0
  ];
  score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return { score, eduCount, expCount, skillCount, cvCount };
}

// ===== DASHBOARD =====
router.get('/dashboard', (req, res) => {
  const uid = req.currentUser.id;
  const completion = profileCompletion(uid);
  const recommendations = getRecommendationsForUser(uid, 4);
  const applications = db.prepare(`
    SELECT a.*, j.title, j.location, e.company_name FROM applications a
    JOIN jobs j ON j.id = a.job_id JOIN employers e ON e.id = j.employer_id
    WHERE a.jobseeker_id = ? ORDER BY a.applied_at DESC LIMIT 5
  `).all(uid);
  const statusCounts = db.prepare(`SELECT status, COUNT(*) c FROM applications WHERE jobseeker_id = ? GROUP BY status`).all(uid);
  const notifications = getForUser(uid, 5);
  const totalApplications = db.prepare('SELECT COUNT(*) c FROM applications WHERE jobseeker_id = ?').get(uid).c;

  res.render('jobseeker/dashboard', {
    title: 'Dashboard', completion, recommendations, applications, statusCounts, notifications, totalApplications
  });
});

// ===== PROFILE =====
router.get('/profile', (req, res) => {
  const uid = req.currentUser.id;
  const education = db.prepare('SELECT * FROM education WHERE user_id = ? ORDER BY start_date DESC').all(uid);
  const experience = db.prepare('SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC').all(uid);
  const mySkills = db.prepare(`SELECT s.id, s.name, us.proficiency FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? ORDER BY s.name`).all(uid);
  const allSkills = db.prepare('SELECT * FROM skills ORDER BY name').all();
  const documents = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC').all(uid);
  const completion = profileCompletion(uid);

  res.render('jobseeker/profile', { title: 'My Profile', education, experience, mySkills, allSkills, documents, completion });
});

router.post('/profile', (req, res) => {
  const { full_name, phone, location, bio } = req.body;
  db.prepare(`UPDATE users SET full_name = ?, phone = ?, location = ?, bio = ?, updated_at = NOW() WHERE id = ?`)
    .run(full_name.trim(), phone || null, location || null, bio || null, req.currentUser.id);
  req.session.flashSuccess = 'Profile updated successfully.';
  res.redirect('/jobseeker/profile');
});

// ---- Education CRUD ----
router.post('/education', (req, res) => {
  const { institution, qualification, field_of_study, start_date, end_date, currently_studying } = req.body;
  if (!institution || !qualification) {
    req.session.flashError = 'Institution and qualification are required.';
    return res.redirect('/jobseeker/profile');
  }
  db.prepare(`INSERT INTO education (user_id, institution, qualification, field_of_study, start_date, end_date, currently_studying)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, institution.trim(), qualification.trim(), field_of_study || null, start_date || null, currently_studying ? null : (end_date || null), currently_studying ? 1 : 0);
  req.session.flashSuccess = 'Education record added.';
  res.redirect('/jobseeker/profile');
});

router.post('/education/:id/delete', (req, res) => {
  db.prepare('DELETE FROM education WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
  req.session.flashSuccess = 'Education record removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Work Experience CRUD ----
router.post('/experience', (req, res) => {
  const { job_title, employer_name, location, start_date, end_date, currently_working, description } = req.body;
  if (!job_title || !employer_name) {
    req.session.flashError = 'Job title and employer name are required.';
    return res.redirect('/jobseeker/profile');
  }
  db.prepare(`INSERT INTO work_experience (user_id, job_title, employer_name, location, start_date, end_date, currently_working, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, job_title.trim(), employer_name.trim(), location || null, start_date || null, currently_working ? null : (end_date || null), currently_working ? 1 : 0, description || null);
  req.session.flashSuccess = 'Work experience added.';
  res.redirect('/jobseeker/profile');
});

router.post('/experience/:id/delete', (req, res) => {
  db.prepare('DELETE FROM work_experience WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
  req.session.flashSuccess = 'Work experience removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Skills ----
router.post('/skills', (req, res) => {
  const { skill_id, new_skill_name, proficiency } = req.body;
  let finalSkillId = skill_id;

  if (!finalSkillId && new_skill_name && new_skill_name.trim()) {
    const name = new_skill_name.trim();
    const existing = db.prepare('SELECT id FROM skills WHERE LOWER(name) = LOWER(?)').get(name);
    finalSkillId = existing ? existing.id : db.prepare('INSERT INTO skills (name) VALUES (?)').run(name).lastInsertRowid;
  }

  if (!finalSkillId) {
    req.session.flashError = 'Please select or enter a skill.';
    return res.redirect('/jobseeker/profile');
  }

  try {
    db.prepare('INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)')
      .run(req.currentUser.id, finalSkillId, proficiency || 'Intermediate');
    req.session.flashSuccess = 'Skill added to your profile.';
  } catch (e) {
    req.session.flashError = 'That skill is already on your profile.';
  }
  res.redirect('/jobseeker/profile');
});

router.post('/skills/:skillId/delete', (req, res) => {
  db.prepare('DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?').run(req.currentUser.id, req.params.skillId);
  req.session.flashSuccess = 'Skill removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Documents ----
router.post('/documents', upload.single('document'), (req, res) => {
  if (!req.file) {
    req.session.flashError = 'Please choose a file to upload.';
    return res.redirect('/jobseeker/profile');
  }
  const doc_type = ['CV', 'ID', 'Certificate', 'Cover Letter', 'Other'].includes(req.body.doc_type) ? req.body.doc_type : 'Other';
  db.prepare(`INSERT INTO documents (user_id, doc_type, original_name, stored_name, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, doc_type, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size);
  req.session.flashSuccess = `${doc_type} uploaded successfully.`;
  res.redirect('/jobseeker/profile');
});

router.post('/documents/:id/delete', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
  req.session.flashSuccess = 'Document removed.';
  res.redirect('/jobseeker/profile');
});

// (Multer file-type errors surface as generic errors — handled centrally)
router.use((err, req, res, next) => {
  if (err) {
    req.session.flashError = err.message || 'File upload failed. Please check the file type and size.';
    return res.redirect('/jobseeker/profile');
  }
  next();
});

// ===== APPLICATIONS TRACKING =====
router.get('/applications', (req, res) => {
  const uid = req.currentUser.id;
  const status = req.query.status;
  let sql = `SELECT a.*, j.title, j.location, j.job_type, j.closing_date, e.company_name FROM applications a
    JOIN jobs j ON j.id = a.job_id JOIN employers e ON e.id = j.employer_id WHERE a.jobseeker_id = ?`;
  const params = [uid];
  if (status && ['Pending','Reviewed','Shortlisted','Accepted','Rejected'].includes(status)) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY a.applied_at DESC';
  const applications = db.prepare(sql).all(...params);
  const counts = db.prepare('SELECT status, COUNT(*) c FROM applications WHERE jobseeker_id = ? GROUP BY status').all(uid);

  res.render('jobseeker/applications', { title: 'My Applications', applications, counts, activeStatus: status || '' });
});

// ===== RECOMMENDATIONS (full list) =====
router.get('/recommendations', (req, res) => {
  const recommendations = getRecommendationsForUser(req.currentUser.id, 25);
  res.render('jobseeker/recommendations', { title: 'Recommended Jobs', recommendations });
});

module.exports = router;
