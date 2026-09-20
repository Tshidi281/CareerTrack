const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { getMatchForJobAndUser } = require('../services/matching');
const { notify } = require('../services/notifications');
const { upload } = require('../services/upload');

async function getJobSkills(jobId) {
  const [rows] = await db.execute(
    `SELECT s.id, s.name, js.required_level
     FROM job_skills js
     JOIN skills s ON s.id = js.skill_id
     WHERE js.job_id = ?`,
    [jobId]
  );
  return rows;
}

// ===== SEARCH / LISTING =====
router.get('/', async (req, res) => {
  const { q, location, job_type, category } = req.query;

  let sql = `SELECT j.*, e.company_name 
    FROM jobs j 
    JOIN employers e ON e.id = j.employer_id
    WHERE j.status = 'published' AND DATE(j.closing_date) >= DATE(NOW())`;
  const params = [];

  if (q && q.trim()) {
    sql += ` AND (j.title LIKE ? OR j.description LIKE ?)`;
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  if (location && location.trim()) {
    sql += ` AND j.location LIKE ?`;
    params.push(`%${location.trim()}%`);
  }
  if (job_type && job_type.trim()) {
    sql += ` AND j.job_type = ?`;
    params.push(job_type.trim());
  }
  if (category && category.trim()) {
    sql += ` AND j.category_id = ?`;
    params.push(category.trim());
  }
  sql += ` ORDER BY j.created_at DESC`;

  const [jobRows] = await db.execute(sql, params);
  const jobs = jobRows;

  for (const job of jobs) {
    job.skillNames = (await getJobSkills(job.id)).map(s => s.name);
  }

  const [categoryRows] = await db.execute('SELECT * FROM job_categories ORDER BY name');

  res.render('jobs/search', {
    title: 'Find Jobs',
    jobs,
    categories: categoryRows,
    filters: { q: q || '', location: location || '', job_type: job_type || '', category: category || '' }
  });
});

// ===== JOB DETAIL =====
router.get('/:id', async (req, res) => {
  const [jobRows] = await db.execute(`
    SELECT j.*, e.company_name, e.description AS company_description, e.website, e.location AS company_location,
      e.industry, e.id AS employer_row_id, e.user_id AS employer_user_id
    FROM jobs j
    JOIN employers e ON e.id = j.employer_id
    WHERE j.id = ?`, [req.params.id]);

  const job = jobRows[0];

  if (!job) return res.status(404).render('error', { title: 'Job Not Found', message: 'This vacancy does not exist or has been removed.' });

  const isOwner = req.currentUser && req.currentUser.role === 'employer' && job.employer_user_id === req.currentUser.id;
  if (job.status !== 'published' && !isOwner && req.currentUser?.role !== 'admin') {
    return res.status(404).render('error', { title: 'Job Not Available', message: 'This vacancy is not currently published.' });
  }

  const requiredSkills = await getJobSkills(job.id);
  const isClosed = job.status !== 'published' || new Date(job.closing_date) < new Date();

  let match = null;
  let alreadyApplied = false;
  let userDocuments = [];
  if (req.currentUser && req.currentUser.role === 'jobseeker') {
    match = getMatchForJobAndUser(job.id, req.currentUser.id);

    const [applicationRows] = await db.execute(
      'SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?',
      [job.id, req.currentUser.id]
    );
    alreadyApplied = applicationRows.length > 0;

    const [docRows] = await db.execute(
      "SELECT * FROM documents WHERE user_id = ? AND doc_type = 'CV' ORDER BY uploaded_at DESC",
      [req.currentUser.id]
    );
    userDocuments = docRows;
  }

  res.render('jobs/detail', { title: job.title, job, requiredSkills, isClosed, match, alreadyApplied, userDocuments, isOwner });
});

// ===== APPLY =====
router.post('/:id/apply', requireRole('jobseeker'), upload.single('new_cv'), async (req, res) => {
  const [jobRows] = await db.execute('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
  const job = jobRows[0];

  if (!job) return res.status(404).render('error', { title: 'Job Not Found', message: 'This vacancy does not exist.' });

  const redirectBack = () => res.redirect(`/jobs/${job.id}`);

  if (job.status !== 'published' || new Date(job.closing_date) < new Date()) {
    req.session.flashError = 'This vacancy is closed and no longer accepting applications.';
    return redirectBack();
  }

  const [existingRows] = await db.execute(
    'SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?',
    [job.id, req.currentUser.id]
  );

  if (existingRows.length) {
    req.session.flashError = 'You have already applied for this job. You can track its status under My Applications.';
    return redirectBack();
  }

  let documentId = req.body.existing_document_id ? parseInt(req.body.existing_document_id, 10) : null;

  if (req.file) {
    const [result] = await db.execute(
      `INSERT INTO documents (user_id, doc_type, original_name, stored_name, mime_type, size_bytes)
       VALUES (?, 'CV', ?, ?, ?, ?)`,
      [req.currentUser.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
    );
    documentId = result.insertId;
  }

  if (!documentId) {
    req.session.flashError = 'Please upload a CV or select a previously uploaded one before applying.';
    return redirectBack();
  }

  const [docCheckRows] = await db.execute(
    'SELECT id FROM documents WHERE id = ? AND user_id = ?',
    [documentId, req.currentUser.id]
  );

  if (!docCheckRows.length) {
    req.session.flashError = 'The selected document could not be verified. Please try again.';
    return redirectBack();
  }

  try {
    await db.execute(
      `INSERT INTO applications (job_id, jobseeker_id, document_id, cover_note, status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [job.id, req.currentUser.id, documentId, (req.body.cover_note || '').trim() || null]
    );

    const [employerRows] = await db.execute(
      'SELECT e.*, u.id as employer_user_id FROM employers e JOIN users u ON u.id = e.user_id WHERE e.id = ?',
      [job.employer_id]
    );
    const employer = employerRows[0];

    await notify(
      req.currentUser.id,
      'Application Submitted',
      `Your application for "${job.title}" has been submitted successfully. You'll be notified of any status updates.`,
      'application'
    );

    if (employer) {
      await notify(
        employer.employer_user_id,
        'New Application Received',
        `${req.currentUser.full_name} applied for "${job.title}".`,
        'application'
      );
    }

    req.session.flashSuccess = `Application submitted successfully for "${job.title}"! You can track its progress under My Applications.`;
  } catch (e) {
    console.error('Apply error:', e);
    req.session.flashError = 'We could not submit your application due to a system error. Please try again.';
  }

  res.redirect('/jobseeker/applications');
});

module.exports = router;
