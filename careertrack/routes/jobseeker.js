const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { getRecommendationsForUser } = require('../services/matching');
const { notify, getForUser } = require('../services/notifications');
const { upload } = require('../services/upload');

router.use(requireRole('jobseeker'));

async function profileCompletion(userId) {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const eduCount = (await db.prepare('SELECT COUNT(*) c FROM education WHERE user_id = ?').get(userId)).c;
  const expCount = (await db.prepare('SELECT COUNT(*) c FROM work_experience WHERE user_id = ?').get(userId)).c;
  const skillCount = (await db.prepare('SELECT COUNT(*) c FROM user_skills WHERE user_id = ?').get(userId)).c;
  const cvCount = (await db.prepare("SELECT COUNT(*) c FROM documents WHERE user_id = ? AND doc_type = 'CV'").get(userId)).c;

  let score = 0;
  const checks = [
    !!user.phone, !!user.location, !!user.bio, eduCount > 0, expCount > 0 || eduCount > 0,
    skillCount > 0, cvCount > 0
  ];
  score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return { score, eduCount, expCount, skillCount, cvCount };
}

// ===== DASHBOARD =====
router.get('/dashboard', async (req, res) => {
  const uid = req.currentUser.id;
  const completion = await profileCompletion(uid);
  const recommendations = await getRecommendationsForUser(uid, 4);
  const applications = await db.prepare(`
    SELECT a.*, j.title, j.location, e.company_name FROM applications a
    JOIN jobs j ON j.id = a.job_id JOIN employers e ON e.id = j.employer_id
    WHERE a.jobseeker_id = ? ORDER BY a.applied_at DESC LIMIT 5
  `).all(uid);
  const statusCounts = await db.prepare(`SELECT status, COUNT(*) c FROM applications WHERE jobseeker_id = ? GROUP BY status`).all(uid);
  const notifications = await getForUser(uid, 5);
  const totalApplications = (await db.prepare('SELECT COUNT(*) c FROM applications WHERE jobseeker_id = ?').get(uid)).c;

  res.render('jobseeker/dashboard', {
    title: 'Dashboard', completion, recommendations, applications, statusCounts, notifications, totalApplications
  });
});

// ===== PROFILE =====
router.get('/profile', async (req, res) => {
  const uid = req.currentUser.id;
  const education = await db.prepare('SELECT * FROM education WHERE user_id = ? ORDER BY start_date DESC').all(uid);
  const experience = await db.prepare('SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC').all(uid);
  const mySkills = await db.prepare(`SELECT s.id, s.name, us.proficiency FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? ORDER BY s.name`).all(uid);
  const allSkills = await db.prepare('SELECT * FROM skills ORDER BY name').all();
  const documents = await db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC').all(uid);
  const completion = await profileCompletion(uid);

  res.render('jobseeker/profile', { title: 'My Profile', education, experience, mySkills, allSkills, documents, completion });
});

router.post('/profile', async (req, res) => {
  const { full_name, phone, location, bio } = req.body;
  await db.prepare(`UPDATE users SET full_name = ?, phone = ?, location = ?, bio = ?, updated_at = NOW() WHERE id = ?`)
    .run(full_name.trim(), phone || null, location || null, bio || null, req.currentUser.id);
  req.session.flashSuccess = 'Profile updated successfully.';
  res.redirect('/jobseeker/profile');
});

// ---- Education CRUD ----
router.post('/education', async (req, res) => {
  const { institution, qualification, field_of_study, start_date, end_date, currently_studying } = req.body;
  if (!institution || !qualification) {
    req.session.flashError = 'Institution and qualification are required.';
    return res.redirect('/jobseeker/profile');
  }
  await db.prepare(`INSERT INTO education (user_id, institution, qualification, field_of_study, start_date, end_date, currently_studying)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, institution.trim(), qualification.trim(), field_of_study || null, start_date || null, currently_studying ? null : (end_date || null), currently_studying ? 1 : 0);
  req.session.flashSuccess = 'Education record added.';
  res.redirect('/jobseeker/profile');
});

router.post('/education/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM education WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
  req.session.flashSuccess = 'Education record removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Work Experience CRUD ----
router.post('/experience', async (req, res) => {
  const { job_title, employer_name, location, start_date, end_date, currently_working, description } = req.body;
  if (!job_title || !employer_name) {
    req.session.flashError = 'Job title and employer name are required.';
    return res.redirect('/jobseeker/profile');
  }
  await db.prepare(`INSERT INTO work_experience (user_id, job_title, employer_name, location, start_date, end_date, currently_working, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, job_title.trim(), employer_name.trim(), location || null, start_date || null, currently_working ? null : (end_date || null), currently_working ? 1 : 0, description || null);
  req.session.flashSuccess = 'Work experience added.';
  res.redirect('/jobseeker/profile');
});

router.post('/experience/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM work_experience WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
  req.session.flashSuccess = 'Work experience removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Skills ----
router.post('/skills', async (req, res) => {
  const { skill_id, new_skill_name, proficiency } = req.body;
  let finalSkillId = skill_id;

  if (!finalSkillId && new_skill_name && new_skill_name.trim()) {
    const name = new_skill_name.trim();
    const existing = await db.prepare('SELECT id FROM skills WHERE LOWER(name) = LOWER(?)').get(name);
    finalSkillId = existing ? existing.id : (await db.prepare('INSERT INTO skills (name) VALUES (?)').run(name)).lastInsertRowid;
  }

  if (!finalSkillId) {
    req.session.flashError = 'Please select or enter a skill.';
    return res.redirect('/jobseeker/profile');
  }

  try {
    await db.prepare('INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)')
      .run(req.currentUser.id, finalSkillId, proficiency || 'Intermediate');
    req.session.flashSuccess = 'Skill added to your profile.';
  } catch (e) {
    req.session.flashError = 'That skill is already on your profile.';
  }
  res.redirect('/jobseeker/profile');
});

router.post('/skills/:skillId/delete', async (req, res) => {
  await db.prepare('DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?').run(req.currentUser.id, req.params.skillId);
  req.session.flashSuccess = 'Skill removed.';
  res.redirect('/jobseeker/profile');
});

// ---- Documents ----
router.post('/documents', upload.single('document'), async (req, res) => {
  if (!req.file) {
    req.session.flashError = 'Please choose a file to upload.';
    return res.redirect('/jobseeker/profile');
  }
  const doc_type = ['CV', 'ID', 'Certificate', 'Cover Letter', 'Other'].includes(req.body.doc_type) ? req.body.doc_type : 'Other';
  await db.prepare(`INSERT INTO documents (user_id, doc_type, original_name, stored_name, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)`).run(req.currentUser.id, doc_type, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size);
  req.session.flashSuccess = `${doc_type} uploaded successfully.`;
  res.redirect('/jobseeker/profile');
});

router.post('/documents/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id, req.currentUser.id);
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
router.get('/applications', async (req, res) => {
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
  const applications = await db.prepare(sql).all(...params);
  const counts = await db.prepare('SELECT status, COUNT(*) c FROM applications WHERE jobseeker_id = ? GROUP BY status').all(uid);

  res.render('jobseeker/applications', { title: 'My Applications', applications, counts, activeStatus: status || '' });
});

// ===== RECOMMENDATIONS (full list) =====
router.get('/recommendations', async (req, res) => {
  const recommendations = await getRecommendationsForUser(req.currentUser.id, 25);
  res.render('jobseeker/recommendations', { title: 'Recommended Jobs', recommendations });
});

module.exports = router;
