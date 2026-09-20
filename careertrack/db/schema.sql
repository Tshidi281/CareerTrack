-- CareerTrack MySQL Schema/mysql2


CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  role ENUM('jobseeker', 'employer', 'admin') NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  location VARCHAR(150) NULL,
  bio TEXT NULL,
  profile_photo VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employers (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  industry VARCHAR(150) NULL,
  description TEXT NULL,
  website VARCHAR(255) NULL,
  company_size VARCHAR(100) NULL,
  location VARCHAR(150) NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  logo VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_employers_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS jobs (
  id INT NOT NULL AUTO_INCREMENT,
  employer_id INT NOT NULL,
  category_id INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(150) NOT NULL,
  job_type ENUM('Full-time', 'Part-time', 'Internship', 'Contract', 'Learnership', 'Temporary') NOT NULL,
  min_qualification VARCHAR(200) NULL,
  experience_level VARCHAR(100) NULL,
  salary_range VARCHAR(100) NULL,
  closing_date DATE NOT NULL,
  status ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_jobs_employer
    FOREIGN KEY (employer_id) REFERENCES employers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_jobs_category
    FOREIGN KEY (category_id) REFERENCES job_categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS skills (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_skills (
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  proficiency ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_skills (
  job_id INT NOT NULL,
  skill_id INT NOT NULL,
  required_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
  PRIMARY KEY (job_id, skill_id),
  CONSTRAINT fk_job_skills_job
    FOREIGN KEY (job_id) REFERENCES jobs(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_job_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS education (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  institution VARCHAR(200) NOT NULL,
  qualification VARCHAR(200) NOT NULL,
  field_of_study VARCHAR(200) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  currently_studying TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_education_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS work_experience (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  job_title VARCHAR(200) NOT NULL,
  employer_name VARCHAR(200) NOT NULL,
  location VARCHAR(150) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  currently_working TINYINT(1) DEFAULT 0,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_work_experience_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  doc_type ENUM('CV', 'ID', 'Certificate', 'Cover Letter', 'Other') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes INT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_documents_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS applications (
  id INT NOT NULL AUTO_INCREMENT,
  job_id INT NOT NULL,
  jobseeker_id INT NOT NULL,
  document_id INT NULL,
  cover_note TEXT NULL,
  status ENUM('Pending', 'Reviewed', 'Shortlisted', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_application (job_id, jobseeker_id),
  CONSTRAINT fk_applications_job
    FOREIGN KEY (job_id) REFERENCES jobs(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_applications_jobseeker
    FOREIGN KEY (jobseeker_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_applications_document
    FOREIGN KEY (document_id) REFERENCES documents(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(80) DEFAULT 'general',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) NOT NULL,
  session_json LONGTEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  PRIMARY KEY (sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_jobseeker ON applications(jobseeker_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_job_skills_job ON job_skills(job_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);