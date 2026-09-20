const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email not configured. Would send:', { to, subject });
    return;
  }

  if (!process.env.SMTP_USER.includes('@')) {
    throw new Error('SMTP_USER must be a full email address such as yourname@gmail.com. Gmail requires an App Password.');
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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