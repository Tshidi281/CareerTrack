const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { notify } = require('../services/notifications');

router.use(requireRole('employer'));

function getEmployerRecord(userId) {
  return db.prepare('SELECT * FROM employers WHERE user_id = ?').get(userId);
}

// ===== DASHBOARD =====
router.get('/dashboard', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  if (!employer) return res.redirect('/employer/profile');

  const jobs = db.prepare('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC').all(employer.id);
  const activeJobs = jobs.filter(j => j.status === 'published');
  const jobIds = jobs.map(j => j.id);

  let applicants = [];
  let recentApplications = [];
  if (jobIds.length) {
    const placeholders = jobIds.map(() => '?').join(',');
    applicants = db.prepare(`SELECT COUNT(*) c FROM applications WHERE job_id IN (${placeholders})`).get(...jobIds);
    recentApplications = db.prepare(`
      SELECT a.*, j.title, u.full_name FROM applications a
      JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.jobseeker_id
      WHERE a.job_id IN (${placeholders}) ORDER BY a.applied_at DESC LIMIT 6
    `).all(...jobIds);
  }

  const statusCounts = jobIds.length
    ? db.prepare(`SELECT status, COUNT(*) c FROM applications WHERE job_id IN (${jobIds.map(() => '?').join(',')}) GROUP BY status`).all(...jobIds)
    : [];

  res.render('employer/dashboard', {
    title: 'Employer Dashboard', employer, jobs, activeJobs,
    totalApplicants: applicants.c || 0, recentApplications, statusCounts
  });
});

// ===== COMPANY PROFILE =====
router.get('/profile', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  res.render('employer/profile', { title: 'Company Profile', employer });
});

router.post('/profile', (req, res) => {
  const { company_name, industry, description, website, company_size, location, contact_email, contact_phone } = req.body;
  if (!company_name || !company_name.trim()) {
    req.session.flashError = 'Company name is required.';
    return res.redirect('/employer/profile');
  }

  const existing = getEmployerRecord(req.currentUser.id);
  if (existing) {
    db.prepare(`UPDATE employers SET company_name=?, industry=?, description=?, website=?, company_size=?, location=?, contact_email=?, contact_phone=?, updated_at=NOW() WHERE id=?`)
      .run(company_name.trim(), industry || null, description || null, website || null, company_size || null, location || null, contact_email || null, contact_phone || null, existing.id);
  } else {
    db.prepare(`INSERT INTO employers (user_id, company_name, industry, description, website, company_size, location, contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.currentUser.id, company_name.trim(), industry || null, description || null, website || null, company_size || null, location || null, contact_email || null, contact_phone || null);
  }
  req.session.flashSuccess = 'Company profile updated successfully.';
  res.redirect('/employer/profile');
});

// ===== JOB MANAGEMENT =====
router.get('/jobs', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  if (!employer) { req.session.flashError = 'Please complete your company profile first.'; return res.redirect('/employer/profile'); }
  const jobs = db.prepare(`
    SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
    FROM jobs j WHERE j.employer_id = ? ORDER BY j.created_at DESC
  `).all(employer.id);
  res.render('employer/jobs', { title: 'Manage Jobs', jobs });
});

router.get('/jobs/new', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  if (!employer) { req.session.flashError = 'Please complete your company profile first.'; return res.redirect('/employer/profile'); }
  const skills = db.prepare('SELECT * FROM skills ORDER BY name').all();
  const categories = db.prepare('SELECT * FROM job_categories ORDER BY name').all();
  res.render('employer/job-form', { title: 'Post a Job', job: null, skills, categories, selectedSkills: [], errors: [] });
});

router.post('/jobs', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const { title, description, location, job_type, min_qualification, experience_level, salary_range, closing_date, category_id, skill_ids, action } = req.body;

  const errors = [];
  if (!title || !title.trim()) errors.push('Job title is required.');
  if (!description || !description.trim()) errors.push('Job description is required.');
  if (!location || !location.trim()) errors.push('Location is required.');
  if (!job_type) errors.push('Job type is required.');
  if (!closing_date) errors.push('Closing date is required.');
  else if (new Date(closing_date) < new Date(new Date().toDateString())) errors.push('Closing date cannot be in the past.');

  if (errors.length) {
    const skills = db.prepare('SELECT * FROM skills ORDER BY name').all();
    const categories = db.prepare('SELECT * FROM job_categories ORDER BY name').all();
    return res.status(400).render('employer/job-form', { title: 'Post a Job', job: req.body, skills, categories, selectedSkills: [].concat(skill_ids || []).map(id => ({ skill_id: id })), errors });
  }

  const status = action === 'publish' ? 'published' : 'draft';

  const jobId = db.prepare(`INSERT INTO jobs (employer_id, category_id, title, description, location, job_type, min_qualification, experience_level, salary_range, closing_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      employer.id, category_id || null, title.trim(), description.trim(), location.trim(), job_type,
      min_qualification || null, experience_level || null, salary_range || null, closing_date, status
    ).lastInsertRowid;

  const ids = [].concat(skill_ids || []).filter(Boolean);
  ids.forEach((sid) => {
    const level = req.body['skill_level_' + sid] || 'Intermediate';
    db.prepare('INSERT INTO job_skills (job_id, skill_id, required_level) VALUES (?, ?, ?)').run(jobId, sid, level);
  });

  req.session.flashSuccess = status === 'published' ? 'Job posted and published successfully.' : 'Job saved as a draft.';
  res.redirect('/employer/jobs');
});

router.get('/jobs/:id/edit', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, employer.id);
  if (!job) return res.status(404).render('error', { title: 'Not Found', message: 'This job could not be found.' });
  const skills = db.prepare('SELECT * FROM skills ORDER BY name').all();
  const categories = db.prepare('SELECT * FROM job_categories ORDER BY name').all();
  const selectedSkills = db.prepare('SELECT skill_id, required_level FROM job_skills WHERE job_id = ?').all(job.id);
  res.render('employer/job-form', { title: 'Edit Job', job, skills, categories, selectedSkills, errors: [] });
});

router.post('/jobs/:id', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, employer.id);
  if (!job) return res.status(404).render('error', { title: 'Not Found', message: 'This job could not be found.' });

  const { title, description, location, job_type, min_qualification, experience_level, salary_range, closing_date, category_id, skill_ids, action } = req.body;

  const errors = [];
  if (!title || !title.trim()) errors.push('Job title is required.');
  if (!description || !description.trim()) errors.push('Job description is required.');
  if (!location || !location.trim()) errors.push('Location is required.');
  if (!closing_date) errors.push('Closing date is required.');

  if (errors.length) {
    const skills = db.prepare('SELECT * FROM skills ORDER BY name').all();
    const categories = db.prepare('SELECT * FROM job_categories ORDER BY name').all();
    return res.status(400).render('employer/job-form', { title: 'Edit Job', job: { ...job, ...req.body }, skills, categories, selectedSkills: [].concat(skill_ids || []).map(id => ({ skill_id: id })), errors });
  }

  let status = job.status;
  if (action === 'publish') status = 'published';
  if (action === 'close') status = 'closed';
  if (action === 'draft') status = 'draft';

  db.prepare(`UPDATE jobs SET category_id=?, title=?, description=?, location=?, job_type=?, min_qualification=?, experience_level=?, salary_range=?, closing_date=?, status=?, updated_at=NOW() WHERE id=?`)
    .run(category_id || null, title.trim(), description.trim(), location.trim(), job_type, min_qualification || null, experience_level || null, salary_range || null, closing_date, status, job.id);

  db.prepare('DELETE FROM job_skills WHERE job_id = ?').run(job.id);
  const ids = [].concat(skill_ids || []).filter(Boolean);
  ids.forEach((sid) => {
    const level = req.body['skill_level_' + sid] || 'Intermediate';
    db.prepare('INSERT INTO job_skills (job_id, skill_id, required_level) VALUES (?, ?, ?)').run(job.id, sid, level);
  });

  req.session.flashSuccess = 'Job updated successfully.';
  res.redirect('/employer/jobs');
});

router.post('/jobs/:id/status', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, employer.id);
  if (!job) return res.status(404).render('error', { title: 'Not Found', message: 'This job could not be found.' });
  const { status } = req.body;
  if (!['draft', 'published', 'closed'].includes(status)) {
    req.session.flashError = 'Invalid status.';
    return res.redirect('/employer/jobs');
  }
  db.prepare(`UPDATE jobs SET status = ?, updated_at = NOW() WHERE id = ?`).run(status, job.id);
  req.session.flashSuccess = `Job marked as ${status}.`;
  res.redirect('/employer/jobs');
});

router.post('/jobs/:id/delete', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  db.prepare('DELETE FROM jobs WHERE id = ? AND employer_id = ?').run(req.params.id, employer.id);
  req.session.flashSuccess = 'Job deleted.';
  res.redirect('/employer/jobs');
});

// ===== APPLICANTS =====
router.get('/jobs/:id/applicants', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, employer.id);
  if (!job) return res.status(404).render('error', { title: 'Not Found', message: 'This job could not be found.' });

  const statusFilter = req.query.status;
  let sql = `SELECT a.*, u.full_name, u.email, u.phone, u.location AS candidate_location, u.bio
    FROM applications a JOIN users u ON u.id = a.jobseeker_id WHERE a.job_id = ?`;
  const params = [job.id];
  if (statusFilter && ['Pending','Reviewed','Shortlisted','Accepted','Rejected'].includes(statusFilter)) {
    sql += ' AND a.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY a.applied_at DESC';
  const applicants = db.prepare(sql).all(...params);

  const { getMatchForJobAndUser } = require('../services/matching');
  applicants.forEach(a => {
    a.match = getMatchForJobAndUser(job.id, a.jobseeker_id);
    a.document = a.document_id ? db.prepare('SELECT * FROM documents WHERE id = ?').get(a.document_id) : null;
  });

  const counts = db.prepare('SELECT status, COUNT(*) c FROM applications WHERE job_id = ? GROUP BY status').all(job.id);

  res.render('employer/applicants', { title: `Applicants — ${job.title}`, job, applicants, counts, activeStatus: statusFilter || '' });
});

router.get('/applicants/:appId', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const application = db.prepare(`
    SELECT a.*, j.title AS job_title, j.employer_id, u.full_name, u.email, u.phone, u.location AS candidate_location, u.bio
    FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.jobseeker_id WHERE a.id = ?
  `).get(req.params.appId);

  if (!application || application.employer_id !== employer.id) {
    return res.status(404).render('error', { title: 'Not Found', message: 'This application could not be found.' });
  }

  const education = db.prepare('SELECT * FROM education WHERE user_id = ? ORDER BY start_date DESC').all(application.jobseeker_id);
  const experience = db.prepare('SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC').all(application.jobseeker_id);
  const skills = db.prepare('SELECT s.name, us.proficiency FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?').all(application.jobseeker_id);
  const document = application.document_id ? db.prepare('SELECT * FROM documents WHERE id = ?').get(application.document_id) : null;
  const { getMatchForJobAndUser } = require('../services/matching');
  const match = getMatchForJobAndUser(application.job_id, application.jobseeker_id);

  res.render('employer/candidate', { title: `${application.full_name} — Application`, application, education, experience, skills, document, match });
});

router.post('/applicants/:appId/status', (req, res) => {
  const employer = getEmployerRecord(req.currentUser.id);
  const application = db.prepare(`SELECT a.*, j.employer_id, j.title FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`).get(req.params.appId);

  if (!application || application.employer_id !== employer.id) {
    return res.status(404).render('error', { title: 'Not Found', message: 'This application could not be found.' });
  }

  const { status } = req.body;
  if (!['Pending','Reviewed','Shortlisted','Accepted','Rejected'].includes(status)) {
    req.session.flashError = 'Invalid application status.';
    return res.redirect('back');
  }

  db.prepare(`UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?`).run(status, application.id);

  const messages = {
    Reviewed: `Your application for "${application.title}" has been reviewed by the employer.`,
    Shortlisted: `Great news! Your application for "${application.title}" has been shortlisted.`,
    Accepted: `Congratulations! Your application for "${application.title}" has been accepted. The employer will contact you with next steps.`,
    Rejected: `Your application for "${application.title}" was not successful this time. Don't be discouraged — keep applying!`,
    Pending: `Your application for "${application.title}" status was updated to Pending.`
  };
  notify(application.jobseeker_id, `Application ${status}`, messages[status], 'application');

  req.session.flashSuccess = `Application status updated to ${status}.`;
  res.redirect(`/employer/jobs/${application.job_id}/applicants`);
});

module.exports = router;
