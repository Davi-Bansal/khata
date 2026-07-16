const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
}

// Normalizes a mobile number for comparison purposes only (strip spaces/dashes/+),
// so "079-8621 5946" and "07986215946" are treated as the same number.
function normalizeMobile(mobile) {
  return (mobile || '').replace(/\D/g, '');
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
      mobile: mobile.trim(),
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

// @route  POST /api/auth/verify-recovery
// Step 1 of "Forgot Password": confirm name + email + mobile all match a single
// existing account before letting the person move on to setting a new password.
router.post('/verify-recovery', async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    if (!name || !email || !mobile) {
      return res.status(400).json({ message: 'Name, email and mobile are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with these details' });
    }

    const nameMatches = user.name.trim().toLowerCase() === name.trim().toLowerCase();
    const mobileMatches = normalizeMobile(user.mobile) === normalizeMobile(mobile);

    if (!nameMatches || !mobileMatches) {
      return res.status(404).json({ message: 'No account found with these details' });
    }

    res.json({ verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error verifying account' });
  }
});

// @route  POST /api/auth/reset-password
// Step 2: re-checks the same name + email + mobile match (never trusts step 1
// alone) and then sets the new password if everything still lines up.
router.post('/reset-password', async (req, res) => {
  try {
    const { name, email, mobile, newPassword } = req.body;
    if (!name || !email || !mobile || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with these details' });
    }

    const nameMatches = user.name.trim().toLowerCase() === name.trim().toLowerCase();
    const mobileMatches = normalizeMobile(user.mobile) === normalizeMobile(mobile);

    if (!nameMatches || !mobileMatches) {
      return res.status(404).json({ message: 'No account found with these details' });
    }

    user.password = newPassword; // pre-save hook hashes this automatically
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

module.exports = router;