const nodemailer = require('nodemailer');

const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = (process.env.SMTP_USER || '').trim();
const smtpPass = (process.env.SMTP_PASS || '').trim();
const smtpFrom = (process.env.SMTP_FROM || smtpUser || 'CareerTrack <noreply@example.com>').trim();

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
});

function isPlaceholderValue(value) {
  if (!value) return true;
  return /your-|example\.com|placeholder|change-this/i.test(value);
}

async function sendMail({ to, subject, html, text }) {
  const configIssues = [];

  if (!smtpUser) configIssues.push('SMTP_USER is missing.');
  if (!smtpPass) configIssues.push('SMTP_PASS is missing.');
  if (smtpUser && !smtpUser.includes('@')) configIssues.push('SMTP_USER must be a full email address such as yourname@gmail.com.');
  if (isPlaceholderValue(smtpUser)) configIssues.push('SMTP_USER still contains the sample Gmail address. Replace it with your real Gmail address.');
  if (isPlaceholderValue(smtpPass)) configIssues.push('SMTP_PASS still contains the sample value. Replace it with your 16-character Gmail app password.');

  if (configIssues.length) {
    throw new Error(`Email not configured: ${configIssues.join(' ')}`);
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Password reset email failed:', error.message);
    throw error;
  }
}

module.exports = { sendMail };