const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/userModel');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

// Register validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
];

// Login validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Microsoft OAuth callback
router.post('/microsoft/callback', async (req, res) => {
  try {
    const { accessToken, refreshToken, userInfo } = req.body;

    if (!accessToken || !userInfo) {
      return res.status(400).json({ error: 'Missing required OAuth data' });
    }

    let user = await User.findOne({
      $or: [
        { email: userInfo.mail || userInfo.userPrincipalName },
        { microsoftId: userInfo.id }
      ]
    });

    if (user) {
      // Update existing user
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      user.microsoftId = userInfo.id;
      user.isVerified = true;
    } else {
      // Create new user
      user = new User({
        email: userInfo.mail || userInfo.userPrincipalName,
        firstName: userInfo.givenName || 'User',
        lastName: userInfo.surname || 'Microsoft',
        microsoftId: userInfo.id,
        accessToken,
        refreshToken,
        tokenExpiry: new Date(Date.now() + 3600000),
        isVerified: true,
        password: 'microsoft_oauth_' + Math.random().toString(36).substring(7)
      });
    }

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      message: 'Microsoft authentication successful',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    res.status(500).json({ error: 'Microsoft authentication failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: user.toJSON()
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token (implement your refresh token logic here)
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const newToken = generateToken(user._id);

    res.json({
      token: newToken,
      user: user.toJSON()
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
