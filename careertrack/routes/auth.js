const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/connection');
const { sendMail } = require('./email');
const { notify } = require('../services/notifications');

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.get('/register', (req, res) => {
  const role = ['jobseeker', 'employer'].includes(req.query.role) ? req.query.role : 'jobseeker';
  res.render('auth/register', { title: 'Sign Up', role, values: {}, errors: [] });
});

router.post('/register', async (req, res) => {
  const { role, full_name, email, password, confirm_password, phone, location, company_name, industry } = req.body;
  const errors = [];

  if (!['jobseeker', 'employer'].includes(role)) errors.push('Please select a valid account type.');
  if (!full_name || full_name.trim().length < 2) errors.push('Please enter your full name.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters long.');
  if (password !== confirm_password) errors.push('Passwords do not match.');
  if (role === 'employer' && (!company_name || company_name.trim().length < 2)) errors.push('Please enter your company name.');

  if (!errors.length) {
    const [existingRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingRows.length) {
      errors.push('An account with this email already exists. Try logging in instead.');
    }
  }

  if (errors.length) {
    return res.status(400).render('auth/register', { title: 'Sign Up', role: role || 'jobseeker', values: req.body, errors });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (role, full_name, email, password_hash, phone, location)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [role, full_name.trim(), email.toLowerCase().trim(), password_hash, phone || null, location || null]
    );

    const userId = result.insertId;

    if (role === 'employer') {
      await db.execute(
        `INSERT INTO employers (user_id, company_name, industry, location, contact_email, contact_phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, company_name.trim(), industry || null, location || null, email.toLowerCase().trim(), phone || null]
      );
    }

    notify(userId, 'Welcome to CareerTrack!', role === 'employer'
      ? 'Your employer account has been created. Complete your company profile and post your first vacancy.'
      : 'Your account has been created. Complete your profile and add your skills to start receiving job recommendations.', 'system');

    req.session.userId = userId;
    req.session.flashSuccess = `Welcome to CareerTrack, ${full_name.split(' ')[0]}! Your account has been created.`;
    return res.redirect(role === 'employer' ? '/employer/dashboard' : '/jobseeker/dashboard');
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).render('auth/register', {
      title: 'Sign Up',
      role: role || 'jobseeker',
      values: req.body,
      errors: ['There was a problem creating your account. Please try again.']
    });
  }
});

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Log In', errors: [], values: {} });
});

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password', errors: [], values: {} });
});

router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address.');
  }

  if (errors.length) {
    return res.status(400).render('auth/forgot-password', { title: 'Forgot Password', errors, values: { email } });
  }

  const user = await db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email);

  if (user) {
    const token = generateResetToken();
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
    await db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))')
      .run(user.id, token);

    const resetMessage = `Hello ${user.full_name},\n\nA password reset was requested for your CareerTrack account.\n\nPlease use the following link to choose a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can ignore this email.\n\nRegards,\nCareerTrack Team`;

    await notify(
      user.id,
      'Password reset requested',
      'A password reset request has been submitted. If email is configured, the reset instructions are on the way.',
      'system'
    );

    try {
      await sendMail({
        to: email,
        subject: 'CareerTrack password reset request',
        text: resetMessage,
        html: `<p>Hello ${user.full_name},</p><p>A password reset was requested for your CareerTrack account.</p><p>Please use the following link to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, you can ignore this email.</p><p>Regards,<br />CareerTrack Team</p>`
      });

      req.session.flashSuccess = 'If an account exists for that email, a password reset email has been sent.';
    } catch (err) {
      console.error('Error sending password reset email:', err);
      req.session.flashError = 'The password reset email could not be sent because the SMTP email settings are not configured correctly. Update your Gmail app password in .env and try again.';
    }
  } else {
    req.session.flashSuccess = 'If an account exists for that email, a reset request has been queued and an email may have been sent.';
  }

  return res.redirect('/login');
});

router.get('/reset-password/:token', async (req, res) => {
  const token = (req.params.token || '').trim();

  if (!token) {
    return res.status(400).render('auth/reset-password', {
      title: 'Reset Password',
      token: '',
      valid: false,
      errors: ['This reset link is invalid.'],
      values: {}
    });
  }

  const resetRow = await db.prepare('SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()').get(token);
  if (!resetRow) {
    return res.status(400).render('auth/reset-password', {
      title: 'Reset Password',
      token,
      valid: false,
      errors: ['This reset link is invalid or has expired.'],
      values: {}
    });
  }

  const user = await db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(resetRow.user_id);
  return res.render('auth/reset-password', {
    title: 'Reset Password',
    token,
    valid: true,
    user,
    errors: [],
    values: {}
  });
});

router.post('/reset-password/:token', async (req, res) => {
  const token = (req.params.token || '').trim();
  const password = (req.body.password || '').trim();
  const confirmPassword = (req.body.confirm_password || '').trim();
  const errors = [];

  const resetRow = await db.prepare('SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()').get(token);

  if (!resetRow) {
    errors.push('This reset link is invalid or has expired.');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (errors.length) {
    return res.status(400).render('auth/reset-password', {
      title: 'Reset Password',
      token,
      valid: !!resetRow,
      errors,
      values: { password, confirm_password: confirmPassword },
      user: resetRow ? await db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(resetRow.user_id) : null
    });
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(resetRow.user_id);
  if (!user) {
    return res.status(400).render('auth/reset-password', {
      title: 'Reset Password',
      token,
      valid: false,
      errors: ['This account no longer exists.'],
      values: {}
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?').run(passwordHash, user.id);
  await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);

  req.session.flashSuccess = 'Your password has been updated successfully. Please log in.';
  return res.redirect('/login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const errors = [];

  let user = null;
  if (email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    user = rows[0] || null;
  }

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    errors.push('Invalid email or password. Please try again.');
    return res.status(400).render('auth/login', { title: 'Log In', errors, values: req.body });
  }

  req.session.userId = user.id;
  req.session.flashSuccess = `Welcome back, ${user.full_name.split(' ')[0]}!`;

  if (user.role === 'employer') return res.redirect('/employer/dashboard');
  if (user.role === 'admin') return res.redirect('/admin/dashboard');
  return res.redirect('/jobseeker/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
