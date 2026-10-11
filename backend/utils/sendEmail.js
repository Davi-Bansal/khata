// Sends email in one of two ways:
//
// 1) BREVO_API_KEY is set  -> sends through Brevo's HTTPS API (works on Render's free plan,
//    which blocks normal SMTP ports 25/465/587).
//    The sender address (EMAIL_USER) must be verified in your Brevo account.
//
// 2) BREVO_API_KEY is not set -> sends through Gmail SMTP with Nodemailer (fine for local use).
//    Needs EMAIL_USER and EMAIL_PASS (Gmail App Password).

const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'Interest Book';

async function sendWithBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: process.env.EMAIL_USER },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

async function sendWithGmail({ to, subject, text, html }) {
  const nodemailer = require('nodemailer'); // only loaded when needed

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // LOCAL DEVELOPMENT ONLY: set EMAIL_ALLOW_SELF_SIGNED=true if antivirus/proxy
    // causes "self-signed certificate in certificate chain". Never use in production.
    tls: {
      rejectUnauthorized: process.env.EMAIL_ALLOW_SELF_SIGNED !== 'true'
    }
  });

  await transporter.sendMail({
    from: `"${SENDER_NAME}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
}

async function sendEmail(options) {
  if (process.env.BREVO_API_KEY) {
    return sendWithBrevo(options);
  }
  return sendWithGmail(options);
}

module.exports = sendEmail;