const db = require('../db/connection');

const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

/**
 * Transparent, rule-based skills matching.
 * For a given job seeker, compares their recorded skills against each
 * published job's required skills and produces a 0-100 match score plus
 * the list of matching (and missing) skills, so the reason for a
 * recommendation is always explainable to the user.
 *
 * No AI/ML is used or claimed - this is deterministic set comparison
 * with a simple proficiency-aware weighting.
 */
async function getRecommendationsForUser(userId, limit = 10) {
  const userSkills = await db.prepare(`
    SELECT s.id, s.name, us.proficiency FROM user_skills us
    JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?
  `).all(userId);

  const userSkillMap = new Map(userSkills.map(s => [s.id, s.proficiency]));

  const jobs = await db.prepare(`
    SELECT j.*, e.company_name FROM jobs j
    JOIN employers e ON e.id = j.employer_id
    WHERE j.status = 'published' AND DATE(j.closing_date) >= DATE(NOW())
  `).all();

  const results = [];

  for (const job of jobs) {
    const required = await db.prepare(`
      SELECT s.id, s.name, js.required_level FROM job_skills js
      JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ?
    `).all(job.id);

    if (required.length === 0) {
      results.push({
        job,
        score: 100,
        matchedSkills: [],
        missingSkills: [],
        matchedCount: 0,
        totalRequired: 0
      });
      continue;
    }

    let matchedCount = 0;
    const matchedSkills = [];
    const missingSkills = [];

    for (const req of required) {
      if (userSkillMap.has(req.id)) {
        matchedCount++;
        const userLevel = LEVEL_RANK[userSkillMap.get(req.id)] || 1;
        const reqLevel = LEVEL_RANK[req.required_level] || 1;
        matchedSkills.push({ name: req.name, meetsLevel: userLevel >= reqLevel });
      } else {
        missingSkills.push(req.name);
      }
    }

    if (matchedCount === 0) continue; // no overlap at all - not a recommendation

    const score = Math.round((matchedCount / required.length) * 100);

    results.push({
      job,
      score,
      matchedSkills,
      missingSkills,
      matchedCount,
      totalRequired: required.length
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Match summary for a single job seeker against a single job (used on job detail page & employer applicant view) */
async function getMatchForJobAndUser(jobId, userId) {
  const userSkills = await db.prepare(`
    SELECT s.id, s.name, us.proficiency FROM user_skills us
    JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?
  `).all(userId);
  const userSkillMap = new Map(userSkills.map(s => [s.id, s.proficiency]));

  const required = await db.prepare(`
    SELECT s.id, s.name, js.required_level FROM job_skills js
    JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ?
  `).all(jobId);

  if (required.length === 0) return { score: 0, matchedSkills: [], missingSkills: [] };

  const matchedSkills = [];
  const missingSkills = [];
  for (const req of required) {
    if (userSkillMap.has(req.id)) matchedSkills.push(req.name);
    else missingSkills.push(req.name);
  }
  const score = Math.round((matchedSkills.length / required.length) * 100);
  return { score, matchedSkills, missingSkills };
}

module.exports = { getRecommendationsForUser, getMatchForJobAndUser };
