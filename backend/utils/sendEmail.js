const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: process.env.EMAIL_ALLOW_SELF_SIGNED !== 'true'
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Interest Book" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
}

module.exports = sendEmail;