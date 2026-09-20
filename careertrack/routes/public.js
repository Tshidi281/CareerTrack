const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.get('/', async (req, res) => {
  const stats = {
    jobs: (await db.prepare("SELECT COUNT(*) c FROM jobs WHERE status = 'published'").get()).c,
    employers: (await db.prepare('SELECT COUNT(*) c FROM employers').get()).c,
    jobseekers: (await db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'jobseeker'").get()).c,
    placements: (await db.prepare("SELECT COUNT(*) c FROM applications WHERE status = 'Accepted'").get()).c
  };

  const featuredJobs = await db.prepare(`
    SELECT j.*, e.company_name FROM jobs j
    JOIN employers e ON e.id = j.employer_id
    WHERE j.status = 'published' AND DATE(j.closing_date) >= DATE(NOW())
    ORDER BY j.created_at DESC LIMIT 6
  `).all();

  for (const job of featuredJobs) {
    const skills = await db.prepare(`SELECT s.name FROM job_skills js JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ?`).all(job.id);
    job.skillNames = skills.map(s => s.name);
  }

  res.render('home', { title: 'Home', stats, featuredJobs });
});

module.exports = router;
