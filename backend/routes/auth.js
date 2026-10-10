const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// @route  POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: 'Name, email, mobile and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: (mobile || '').trim(),
      password
    });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// @route  POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signin' });
  }
});

// @route  GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route  POST /api/auth/forgot-password
// Emails a reset link (valid for 15 minutes) if the email is registered.
// If the email is not registered, tells the user so.
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'This email does not exist. Please check it or sign up.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Interest Book password',
        text:
          `Hello ${user.name},\n\n` +
          `Click the link below to reset your password. It is valid for 15 minutes.\n\n` +
          `${resetLink}\n\n` +
          `If you did not request this, you can safely ignore this email.`,
        html:
          `<p>Hello ${user.name},</p>` +
          `<p>Click the button below to reset your password. This link is valid for <b>15 minutes</b>.</p>` +
          `<p><a href="${resetLink}" style="display:inline-block;padding:12px 22px;background:#00897b;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>` +
          `<p>Or copy this link into your browser:<br>${resetLink}</p>` +
          `<p>If you did not request this, you can safely ignore this email.</p>`
      });
    } catch (mailErr) {
      // Email failed: remove the token and log the real reason on the server.
      console.error('Failed to send reset email:', mailErr);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'Could not send the email. Please try again later.' });
    }

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// @route  POST /api/auth/reset-password/:token
// Verifies the emailed token (hashed match + not expired), sets the new password,
// and clears the token so the link works only once.
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token),
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = newPassword; // pre-save hook hashes this automatically
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

module.exports = router;