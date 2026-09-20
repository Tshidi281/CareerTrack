# CareerTrack — Youth Employment & Skills Matching Platform

A full-stack South African employment platform connecting job seekers with employers through transparent, **rule-based** skills matching (no AI/ML — every match score is explainable set comparison).

Built with **Node.js, Express, EJS (server-rendered), and SQLite** — no frontend build step required.

## Node.js Compatibility

This project is verified to install and run cleanly on **Node.js v22+ (including v24.13.0) on Windows**, with **zero native module compilation required**. See `NODE24-WINDOWS-MIGRATION.md` for the full audit of what changed and why.

## Quick Start

```bash
npm install
npm run init      # creates the SQLite database and schema
npm run seed       # loads realistic South African demo data (safe to run once)
npm start           # starts the server
```

Then open **http://localhost:3000**


## Project Structure

```
careertrack/
├── server.js              # Express app entry point
├── db/
│   ├── schema.sql         # Full relational schema (10 core entities)
│   ├── connection.js      # Shared better-sqlite3 connection (applied on boot)
│   ├── init.js             # One-off schema init script
│   └── seed.js             # Realistic South African demo data
├── middleware/
│   └── auth.js             # Session loading, requireAuth, requireRole (RBAC)
├── services/
│   ├── matching.js             # Rule-based skills matching engine
│   ├── notifications.js        # Notification creation/read helpers
│   ├── upload.js                 # Multer config for CV/document uploads
│   └── sqlite-session-store.js   # Custom express-session store on better-sqlite3
├── routes/
│   ├── public.js, auth.js, jobs.js
│   ├── jobseeker.js, employer.js, admin.js, notifications.js
├── views/                   # EJS templates (layout + partials + role folders)
├── public/css/style.css     # Design system (navy/teal/gold)
└── uploads/                  # Uploaded CVs/documents (gitignored)
```

## Architecture Notes

- **Roles & RBAC**: `middleware/auth.js` attaches the logged-in user to every request and exposes `requireRole(...)` for route protection. Job seekers cannot access employer routes and vice versa; admin routes are fully separate.
- **Skills matching**: `services/matching.js` compares a job seeker's `user_skills` against a job's `job_skills`, producing a 0–100% score plus explicit matched/missing skill lists. This is deterministic set comparison with proficiency-level weighting — not machine learning — and is used both for the "Recommended Jobs" feature and for employers reviewing applicants.
- **Notifications**: Centralised through `services/notifications.js`, triggered on registration, application submission, and every employer status change (Reviewed/Shortlisted/Accepted/Rejected).
- **File uploads**: `services/upload.js` restricts CVs/documents to PDF, Word, and image types, capped at 5MB, validated server-side via Multer's `fileFilter`.
- **Sessions**: Stored directly in the main `careertrack.sqlite` database via a small custom `express-session` store (`services/sqlite-session-store.js`) built on the same better-sqlite3 connection as everything else — no second native SQLite driver, so login state survives server restarts with zero extra dependency risk.

## Database Schema

Ten core entities: `users`, `employers`, `jobs`, `applications`, `skills`, `user_skills`, `job_skills`, `education`, `work_experience`, `documents`, `notifications`, `job_categories` — with foreign keys, `UNIQUE` constraints (e.g. one application per job/seeker pair), and indexes on the most-queried columns. See `db/schema.sql` for the full definition; this maps directly onto the required ERD.

## What's Implemented

- Full auth (bcrypt, sessions, RBAC) for jobseeker/employer/admin roles
- Job seeker: profile, education, work experience, skills, document uploads, job search/filter, apply flow, application tracking, recommendations
- Employer: company profile, job posting/editing with per-skill requirement levels, applicant review, candidate detail view, status updates
- Admin: platform stats dashboard, skills management, job category management, user overview
- Rule-based skills matching with visible matched/missing skill breakdowns
- In-platform notifications with unread counts and mark-as-read
- Responsive, accessible UI with empty/loading/error states throughout

## Known Limitations / Next Steps

- No email delivery — notifications are in-platform only (as specified)
- No password-reset flow
- Admin cannot yet edit/delete individual jobs or applications directly (can view via user list; job moderation would be a natural next addition)
- File uploads are stored on local disk (`/uploads`) — fine for a demo/university project, would move to object storage (e.g. S3) for production
- No automated test suite — testing so far has been manual/scripted smoke testing of every role's core journeys

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- Parameterised queries throughout (better-sqlite3 prepared statements) — no SQL injection surface
- Session cookies are `httpOnly`, `sameSite: lax`
- Uploaded file types are allow-listed server-side (not just by extension)
- Ownership checks on every employer/job-seeker mutation (e.g. an employer can only edit their own jobs, view applicants to their own vacancies)
