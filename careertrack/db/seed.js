const bcrypt = require('bcryptjs');
const db = require('./connection');

function hash(pw) { return bcrypt.hashSync(pw, 10); }

async function main() {
  const [skillCountRows] = await db.query('SELECT COUNT(*) AS c FROM skills');
  const [categoryCountRows] = await db.query('SELECT COUNT(*) AS c FROM job_categories');
  const [jobCountRows] = await db.query('SELECT COUNT(*) AS c FROM jobs');

  const hasSeededReferenceData = Number(skillCountRows[0]?.c || 0) > 0 && Number(categoryCountRows[0]?.c || 0) > 0;
  const alreadySeeded = Number(jobCountRows[0]?.c || 0) > 0 && hasSeededReferenceData;

  if (alreadySeeded) {
    console.log('Seed data is already present. Skipping seed.');
    process.exit(0);
  }

  const insertUser = db.prepare(`INSERT INTO users (role, full_name, email, password_hash, phone, location, bio)
    VALUES (@role, @full_name, @email, @password_hash, @phone, @location, @bio)`);
  const getUserByEmail = async (email) => {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return user || null;
  };

  const skillNames = [
    'Microsoft Excel', 'Customer Service', 'Communication', 'Sales', 'Bookkeeping',
    'JavaScript', 'Python', 'SQL', 'React', 'Node.js', 'Graphic Design', 'Adobe Photoshop',
    'Project Management', 'Warehouse Operations', 'Forklift Operation', 'Electrical Wiring',
    'Plumbing', 'Nursing Care', 'First Aid', 'Teaching', 'Marketing', 'Social Media Management',
    'Data Analysis', 'Networking (IT)', 'Cybersecurity Basics', 'Driving (Code 10)',
    'Hospitality', 'Cooking', 'Cashier Operations', 'Call Centre Experience', 'Human Resources',
    'Supply Chain Management', 'Accounting', 'Welding', 'Carpentry', 'Solar Installation'
  ];

  const skillIds = {};
  const insertSkill = db.prepare('INSERT INTO skills (name) VALUES (?)');
  for (const s of skillNames) {
    const existing = await db.prepare('SELECT id FROM skills WHERE name = ?').get(s);
    if (existing) {
      skillIds[s] = existing.id;
    } else {
      const res = await db.prepare('INSERT INTO skills (name) VALUES (?)').run(s);
      skillIds[s] = res.lastInsertRowid;
    }
  }

  const categories = [
    'Information Technology', 'Retail & Customer Service', 'Skilled Trades', 'Healthcare',
    'Administration & Office', 'Sales & Marketing', 'Hospitality & Tourism', 'Logistics & Warehousing',
    'Finance & Accounting', 'Education & Training', 'Learnerships & Internships'
  ];

  const catIds = {};
  const insertCat = db.prepare('INSERT INTO job_categories (name) VALUES (?)');
  for (const c of categories) {
    const existing = await db.prepare('SELECT id FROM job_categories WHERE name = ?').get(c);
    if (existing) {
      catIds[c] = existing.id;
    } else {
      const res = await insertCat.run(c);
      catIds[c] = res.lastInsertRowid;
    }
  }

  const insertEmployer = db.prepare(`INSERT INTO employers (user_id, company_name, industry, description, website, company_size, location, contact_email, contact_phone)
    VALUES (@user_id, @company_name, @industry, @description, @website, @company_size, @location, @contact_email, @contact_phone)`);

  const employersData = [
    { full_name: 'Thabo Nkosi', email: 'hr@brightwavetech.co.za', company_name: 'BrightWave Technologies', industry: 'Information Technology', description: 'BrightWave Technologies builds digital products for South African SMEs, specialising in web platforms, cloud hosting and IT support.', website: 'https://brightwavetech.co.za', company_size: '51-200 employees', location: 'Sandton, Johannesburg', contact_email: 'hr@brightwavetech.co.za', contact_phone: '011 555 0192' },
    { full_name: 'Zanele Dlamini', email: 'careers@ubuntu-retail.co.za', company_name: 'Ubuntu Retail Group', industry: 'Retail', description: 'Ubuntu Retail Group operates a chain of community supermarkets across Gauteng and KwaZulu-Natal, committed to local employment.', website: 'https://ubuntu-retail.co.za', company_size: '500+ employees', location: 'Durban, KwaZulu-Natal', contact_email: 'careers@ubuntu-retail.co.za', contact_phone: '031 555 0421' },
    { full_name: 'Pieter van Wyk', email: 'jobs@capebuild.co.za', company_name: 'CapeBuild Construction & Trades', industry: 'Construction', description: 'CapeBuild delivers residential and commercial construction projects across the Western Cape, and trains artisans through learnerships.', website: 'https://capebuild.co.za', company_size: '201-500 employees', location: 'Cape Town, Western Cape', contact_email: 'jobs@capebuild.co.za', contact_phone: '021 555 0765' },
    { full_name: 'Lindiwe Khumalo', email: 'recruitment@sunrisehealth.co.za', company_name: 'Sunrise Health Group', industry: 'Healthcare', description: 'Sunrise Health Group operates clinics and care facilities focused on accessible primary healthcare for South African communities.', website: 'https://sunrisehealth.co.za', company_size: '201-500 employees', location: 'Pretoria, Gauteng', contact_email: 'recruitment@sunrisehealth.co.za', contact_phone: '012 555 0330' }
  ];

  const employerIds = {};
  for (const e of employersData) {
    let user = await getUserByEmail(e.email);
    if (!user) {
      const userRes = await insertUser.run({
        role: 'employer', full_name: e.full_name, email: e.email, password_hash: hash('Employer123!'),
        phone: e.contact_phone, location: e.location, bio: `Recruiter at ${e.company_name}`
      });
      user = { id: userRes.lastInsertRowid };
    }

    const existingEmployer = await db.prepare('SELECT id FROM employers WHERE user_id = ?').get(user.id);
    let empRes;
    if (existingEmployer) {
      empRes = { lastInsertRowid: existingEmployer.id };
    } else {
      empRes = await insertEmployer.run({
        user_id: user.id, company_name: e.company_name, industry: e.industry, description: e.description,
        website: e.website, company_size: e.company_size, location: e.location,
        contact_email: e.contact_email, contact_phone: e.contact_phone
      });
    }
    employerIds[e.company_name] = empRes.lastInsertRowid;
  }

  const insertJob = db.prepare(`INSERT INTO jobs (employer_id, category_id, title, description, location, job_type, min_qualification, experience_level, salary_range, closing_date, status)
    VALUES (@employer_id, @category_id, @title, @description, @location, @job_type, @min_qualification, @experience_level, @salary_range, @closing_date, @status)`);
  const insertJobSkill = db.prepare('INSERT INTO job_skills (job_id, skill_id, required_level) VALUES (?, ?, ?)');

  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const jobsData = [
    { company: 'BrightWave Technologies', title: 'Junior Web Developer', description: 'We are looking for a motivated Junior Web Developer to join our product team. You will work on internal tools and client-facing web applications using JavaScript and modern frameworks, under the mentorship of senior engineers.', location: 'Sandton, Johannesburg', job_type: 'Full-time', min_qualification: 'Diploma in IT/Computer Science or equivalent bootcamp', experience_level: 'Entry level (0-2 years)', salary_range: 'R12,000 - R18,000 per month', closing_date: futureDate(30), status: 'published', category: 'Information Technology', skills: [['JavaScript','Intermediate'], ['React','Beginner'], ['Node.js','Beginner'], ['SQL','Beginner']] },
    { company: 'BrightWave Technologies', title: 'IT Support Intern', description: 'A 12-month internship supporting our internal helpdesk, assisting with hardware setup, basic networking, and troubleshooting for staff across departments.', location: 'Sandton, Johannesburg', job_type: 'Internship', min_qualification: 'National Certificate in IT (NQF 4/5)', experience_level: 'No experience required', salary_range: 'R5,500 per month stipend', closing_date: futureDate(21), status: 'published', category: 'Information Technology', skills: [['Networking (IT)','Beginner'], ['Customer Service','Beginner'], ['Cybersecurity Basics','Beginner']] },
    { company: 'Ubuntu Retail Group', title: 'Store Cashier', description: 'Ubuntu Retail is hiring friendly, reliable cashiers for our Durban branches. You will handle point-of-sale transactions, assist customers, and help keep the store running smoothly.', location: 'Durban, KwaZulu-Natal', job_type: 'Full-time', min_qualification: 'Grade 12 (Matric)', experience_level: 'Entry level', salary_range: 'R4,500 - R5,800 per month', closing_date: futureDate(14), status: 'published', category: 'Retail & Customer Service', skills: [['Cashier Operations','Beginner'], ['Customer Service','Intermediate'], ['Communication','Intermediate']] },
    { company: 'Ubuntu Retail Group', title: 'Assistant Store Manager', description: 'Support the Store Manager in daily operations, stock control, staff scheduling and achieving sales targets across our Durban supermarket branches.', location: 'Durban, KwaZulu-Natal', job_type: 'Full-time', min_qualification: 'Grade 12 plus retail/supervisory experience', experience_level: 'Mid level (2-4 years)', salary_range: 'R9,000 - R13,000 per month', closing_date: futureDate(25), status: 'published', category: 'Retail & Customer Service', skills: [['Customer Service','Advanced'], ['Sales','Intermediate'], ['Supply Chain Management','Beginner'], ['Human Resources','Beginner']] },
    { company: 'CapeBuild Construction & Trades', title: 'Electrician Learnership', description: 'A structured 24-month learnership combining classroom theory and on-site practical training, leading to a recognised electrical trade qualification.', location: 'Cape Town, Western Cape', job_type: 'Learnership', min_qualification: 'Grade 12 with Maths and Physical Science', experience_level: 'No experience required', salary_range: 'R4,200 per month stipend', closing_date: futureDate(40), status: 'published', category: 'Learnerships & Internships', skills: [['Electrical Wiring','Beginner'], ['First Aid','Beginner']] },
    { company: 'CapeBuild Construction & Trades', title: 'Site Plumber', description: 'Experienced plumber needed for residential construction sites across Cape Town. Must be able to read plans, install piping systems, and work safely on-site.', location: 'Cape Town, Western Cape', job_type: 'Contract', min_qualification: 'Trade Test Certificate - Plumbing', experience_level: 'Mid level (2-5 years)', salary_range: 'R10,000 - R15,000 per month', closing_date: futureDate(18), status: 'published', category: 'Skilled Trades', skills: [['Plumbing','Advanced'], ['First Aid','Beginner']] },
    { company: 'CapeBuild Construction & Trades', title: 'Solar Installation Technician', description: 'Join our growing renewable energy division installing residential and commercial solar systems across the Western Cape.', location: 'Cape Town, Western Cape', job_type: 'Full-time', min_qualification: 'Electrical trade qualification advantageous', experience_level: 'Entry to mid level', salary_range: 'R8,000 - R14,000 per month', closing_date: futureDate(35), status: 'published', category: 'Skilled Trades', skills: [['Solar Installation','Beginner'], ['Electrical Wiring','Intermediate']] },
    { company: 'Sunrise Health Group', title: 'Enrolled Nurse', description: 'Provide direct patient care at our Pretoria clinic under supervision of registered nurses, including basic procedures, patient monitoring and administrative record-keeping.', location: 'Pretoria, Gauteng', job_type: 'Full-time', min_qualification: 'Diploma in Nursing (Enrolled Nurse registration with SANC)', experience_level: 'Entry level (0-2 years)', salary_range: 'R11,000 - R16,000 per month', closing_date: futureDate(28), status: 'published', category: 'Healthcare', skills: [['Nursing Care','Intermediate'], ['First Aid','Advanced'], ['Communication','Intermediate']] },
    { company: 'Sunrise Health Group', title: 'Clinic Receptionist / Administrator', description: 'Front-of-house administrator managing patient bookings, records and enquiries at our Pretoria clinic. Great opportunity for someone organised and personable.', location: 'Pretoria, Gauteng', job_type: 'Full-time', min_qualification: 'Grade 12, computer literacy required', experience_level: 'Entry level', salary_range: 'R6,000 - R8,500 per month', closing_date: futureDate(12), status: 'published', category: 'Administration & Office', skills: [['Customer Service','Intermediate'], ['Microsoft Excel','Beginner'], ['Communication','Advanced']] },
    { company: 'BrightWave Technologies', title: 'Digital Marketing Assistant', description: 'Support our marketing team with social media content, campaign scheduling and basic performance reporting for client accounts.', location: 'Sandton, Johannesburg', job_type: 'Part-time', min_qualification: 'Certificate/Diploma in Marketing advantageous', experience_level: 'Entry level', salary_range: 'R6,500 per month (part-time)', closing_date: futureDate(20), status: 'published', category: 'Sales & Marketing', skills: [['Social Media Management','Intermediate'], ['Marketing','Beginner'], ['Communication','Intermediate']] },
    { company: 'Ubuntu Retail Group', title: 'Warehouse Stock Controller', description: 'Manage incoming and outgoing stock at our regional distribution centre, ensuring accurate inventory records and safe warehouse operations.', location: 'Pinetown, KwaZulu-Natal', job_type: 'Full-time', min_qualification: 'Grade 12, forklift licence advantageous', experience_level: 'Entry to mid level', salary_range: 'R7,000 - R9,500 per month', closing_date: futureDate(15), status: 'published', category: 'Logistics & Warehousing', skills: [['Warehouse Operations','Intermediate'], ['Forklift Operation','Beginner'], ['Microsoft Excel','Beginner']] },
    { company: 'BrightWave Technologies', title: 'Junior Data Analyst', description: 'Analyse product usage and business data to support decision-making across BrightWave. You will build reports and dashboards using SQL and spreadsheet tools.', location: 'Sandton, Johannesburg', job_type: 'Full-time', min_qualification: 'Diploma/Degree in a numerate field', experience_level: 'Entry level (0-2 years)', salary_range: 'R14,000 - R19,000 per month', closing_date: futureDate(45), status: 'published', category: 'Information Technology', skills: [['SQL','Intermediate'], ['Data Analysis','Intermediate'], ['Microsoft Excel','Advanced'], ['Python','Beginner']] }
  ];

  const jobIds = {};
  for (const j of jobsData) {
    const jobRes = await insertJob.run({
      employer_id: employerIds[j.company], category_id: catIds[j.category], title: j.title,
      description: j.description, location: j.location, job_type: j.job_type,
      min_qualification: j.min_qualification, experience_level: j.experience_level,
      salary_range: j.salary_range, closing_date: j.closing_date, status: j.status
    });
    const id = jobRes.lastInsertRowid;
    jobIds[j.title] = id;
    for (const [skillName, level] of j.skills) {
      if (skillIds[skillName]) await insertJobSkill.run(id, skillIds[skillName], level);
    }
  }

  const insertEdu = db.prepare(`INSERT INTO education (user_id, institution, qualification, field_of_study, start_date, end_date, currently_studying)
    VALUES (@user_id, @institution, @qualification, @field_of_study, @start_date, @end_date, @currently_studying)`);
  const insertExp = db.prepare(`INSERT INTO work_experience (user_id, job_title, employer_name, location, start_date, end_date, currently_working, description)
    VALUES (@user_id, @job_title, @employer_name, @location, @start_date, @end_date, @currently_working, @description)`);
  const insertUserSkill = db.prepare('INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)');
  const insertNotif = db.prepare(`INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)`);

  const seekersData = [
    { full_name: 'Sipho Mahlangu', email: 'sipho.mahlangu@example.co.za', phone: '082 111 2233', location: 'Johannesburg, Gauteng', bio: 'Aspiring web developer with a passion for building useful digital tools.', education: [{ institution: 'CTU Training Solutions', qualification: 'Diploma in Software Development', field_of_study: 'Software Development', start_date: '2023-01', end_date: '2024-12', currently_studying: 0 }], experience: [{ job_title: 'IT Support Volunteer', employer_name: 'Local Community Centre', location: 'Soweto, Johannesburg', start_date: '2024-01', end_date: '2024-06', currently_working: 0, description: 'Assisted with basic computer troubleshooting and digital literacy training for community members.' }], skills: [['JavaScript','Intermediate'], ['React','Beginner'], ['SQL','Beginner'], ['Communication','Intermediate']] },
    { full_name: 'Amahle Ngcobo', email: 'amahle.ngcobo@example.co.za', phone: '083 222 3344', location: 'Durban, KwaZulu-Natal', bio: 'Friendly and reliable, looking for opportunities in retail and customer service.', education: [{ institution: 'Durban Girls Secondary School', qualification: 'National Senior Certificate (Matric)', field_of_study: 'General', start_date: '2019-01', end_date: '2023-12', currently_studying: 0 }], experience: [{ job_title: 'Cashier', employer_name: 'Corner Cafe', location: 'Durban', start_date: '2024-02', end_date: null, currently_working: 1, description: 'Handling till operations, customer queries and basic stock replenishment.' }], skills: [['Cashier Operations','Intermediate'], ['Customer Service','Advanced'], ['Communication','Advanced']] },
    { full_name: 'Bongani Zulu', email: 'bongani.zulu@example.co.za', phone: '084 333 4455', location: 'Cape Town, Western Cape', bio: 'Qualified electrician seeking on-site opportunities in the construction sector.', education: [{ institution: 'False Bay TVET College', qualification: 'N3 Electrical Engineering', field_of_study: 'Electrical Engineering', start_date: '2021-01', end_date: '2022-12', currently_studying: 0 }], experience: [{ job_title: 'Electrician Assistant', employer_name: 'PowerFix Electrical', location: 'Cape Town', start_date: '2023-01', end_date: null, currently_working: 1, description: 'Assisting qualified electricians with residential wiring installations and maintenance.' }], skills: [['Electrical Wiring','Advanced'], ['First Aid','Intermediate']] },
    { full_name: 'Palesa Mokoena', email: 'palesa.mokoena@example.co.za', phone: '072 444 5566', location: 'Pretoria, Gauteng', bio: 'Enrolled Nurse with a passion for community healthcare.', education: [{ institution: 'Tshwane North TVET College', qualification: 'Diploma in Nursing (Enrolled Nurse)', field_of_study: 'Nursing', start_date: '2021-01', end_date: '2023-12', currently_studying: 0 }], experience: [{ job_title: 'Nursing Auxiliary', employer_name: 'Steve Biko Academic Hospital', location: 'Pretoria', start_date: '2024-01', end_date: null, currently_working: 1, description: 'Supporting registered nurses with basic patient care, vitals monitoring and ward administration.' }], skills: [['Nursing Care','Advanced'], ['First Aid','Advanced'], ['Communication','Intermediate']] },
    { full_name: 'Kagiso Sithole', email: 'kagiso.sithole@example.co.za', phone: '076 555 6677', location: 'Johannesburg, Gauteng', bio: 'Recent graduate interested in data analysis and business intelligence.', education: [{ institution: 'University of Johannesburg', qualification: 'BCom Information Systems', field_of_study: 'Information Systems', start_date: '2021-01', end_date: '2024-12', currently_studying: 0 }], experience: [], skills: [['SQL','Intermediate'], ['Data Analysis','Intermediate'], ['Microsoft Excel','Advanced'], ['Python','Beginner']] }
  ];

  const seekerIds = {};
  for (const s of seekersData) {
    let user = await getUserByEmail(s.email);
    if (!user) {
      const userRes = await insertUser.run({
        role: 'jobseeker', full_name: s.full_name, email: s.email, password_hash: hash('Seeker123!'),
        phone: s.phone, location: s.location, bio: s.bio
      });
      user = { id: userRes.lastInsertRowid };
    }

    const uid = user.id;
    seekerIds[s.full_name] = uid;
    for (const edu of s.education) await insertEdu.run({ user_id: uid, ...edu });
    for (const exp of s.experience) await insertExp.run({ user_id: uid, ...exp });
    for (const [skillName, level] of s.skills) {
      if (skillIds[skillName]) {
        const existingSkill = await db.prepare('SELECT 1 FROM user_skills WHERE user_id = ? AND skill_id = ?').get(uid, skillIds[skillName]);
        if (!existingSkill) await insertUserSkill.run(uid, skillIds[skillName], level);
      }
    }
    const existingNotif = await db.prepare('SELECT 1 FROM notifications WHERE user_id = ? AND title = ?').get(uid, 'Welcome to CareerTrack!');
    if (!existingNotif) {
      await insertNotif.run(uid, 'Welcome to CareerTrack!', 'Complete your profile and add your skills to start receiving job recommendations.', 'system', 0);
    }
  }

  const insertApp = db.prepare(`INSERT INTO applications (job_id, jobseeker_id, cover_note, status, applied_at)
    VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`);

  await insertApp.run(jobIds['Junior Web Developer'], seekerIds['Sipho Mahlangu'], 'I am excited to apply for this role and grow my development skills with your team.', 'Shortlisted', 5);
  await insertNotif.run(seekerIds['Sipho Mahlangu'], 'Application Shortlisted', 'Your application for "Junior Web Developer" at BrightWave Technologies has been shortlisted.', 'application', 0);

  await insertApp.run(jobIds['Store Cashier'], seekerIds['Amahle Ngcobo'], 'I have over a year of cashier experience and would love to join Ubuntu Retail Group.', 'Reviewed', 3);
  await insertNotif.run(seekerIds['Amahle Ngcobo'], 'Application Reviewed', 'Your application for "Store Cashier" at Ubuntu Retail Group has been reviewed by the employer.', 'application', 0);

  await insertApp.run(jobIds['Site Plumber'], seekerIds['Bongani Zulu'], 'Experienced electrician available immediately, keen to expand into general site work.', 'Pending', 1);

  await insertApp.run(jobIds['Enrolled Nurse'], seekerIds['Palesa Mokoena'], 'I am a registered Enrolled Nurse with hands-on hospital experience.', 'Accepted', 7);
  await insertNotif.run(seekerIds['Palesa Mokoena'], 'Congratulations - Application Accepted!', 'Your application for "Enrolled Nurse" at Sunrise Health Group has been accepted. The employer will contact you with next steps.', 'application', 0);

  await insertApp.run(jobIds['Junior Data Analyst'], seekerIds['Kagiso Sithole'], 'BCom graduate with strong Excel and SQL skills, eager to start my analytics career.', 'Pending', 2);

  console.log('Seed data inserted successfully.');
  console.log('---');
  console.log('Demo login credentials:');
  console.log('Admin:    admin@careertrack.co.za / Admin123!');
  console.log('Employer: hr@brightwavetech.co.za / Employer123!');
  console.log('Employer: careers@ubuntu-retail.co.za / Employer123!');
  console.log('Jobseeker: sipho.mahlangu@example.co.za / Seeker123!');
  console.log('Jobseeker: amahle.ngcobo@example.co.za / Seeker123!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
