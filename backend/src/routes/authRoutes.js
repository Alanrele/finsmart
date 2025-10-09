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

// TEMPORARY: Demo login for development (remove in production)
router.post('/demo-login', async (req, res) => {
  try {
    // Only allow when explicitly enabled and never in production
    const ALLOW_DEMO_MODE = process.env.ALLOW_DEMO_MODE === 'true';
    if (process.env.NODE_ENV === 'production' || !ALLOW_DEMO_MODE) {
      return res.status(403).json({ error: 'Demo login not available' });
    }

    console.log('🎭 Demo login requested');

    // Check if demo user exists, create if not
    let demoUser = await User.findOne({ email: 'demo@example.com' });

    if (!demoUser) {
      console.log('🎭 Creating demo user...');
      demoUser = new User({
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        password: 'demo123', // Will be hashed by the model
        isDemo: true
      });
      await demoUser.save();
      console.log('✅ Demo user created');
    }

    // Generate token
    const token = generateToken(demoUser._id);

    console.log('✅ Demo login successful');

    res.json({
      message: 'Demo login successful',
      token,
      user: {
        _id: demoUser._id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        isDemo: true
      }
    });

  } catch (error) {
    console.error('❌ Demo login error:', error);
    res.status(500).json({
      error: 'Demo login failed',
      details: error.message
    });
  }
});

// Endpoint to clean up corrupted tokens for a specific user
router.post('/cleanup-corrupted-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        details: 'Please provide the corrupted token to clean up'
      });
    }

    console.log('🧹 Manual token cleanup requested for token:', token.substring(0, 20) + '...');

    // Find and clean up users with this corrupted token
    const result = await User.updateMany(
      { accessToken: token },
      {
        $unset: {
          accessToken: 1,
          refreshToken: 1,
          tokenExpiry: 1
        },
        lastSync: new Date(),
        syncEnabled: false
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up corrupted token for ${result.modifiedCount} user(s)`);

      res.json({
        message: 'Corrupted token cleaned up successfully',
        usersAffected: result.modifiedCount,
        recommendation: 'Please sign in again to get a new valid token'
      });
    } else {
      res.json({
        message: 'No users found with this token',
        usersAffected: 0,
        recommendation: 'Token may have already been cleaned up'
      });
    }

  } catch (error) {
    console.error('❌ Token cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup corrupted token',
      details: error.message
    });
  }
});

// Endpoint to clean up ALL corrupted tokens (admin/debug use)
router.post('/cleanup-all-corrupted-tokens', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup of ALL corrupted tokens requested');

    // Import the tokenCleanup utility
    const tokenCleanup = require('../utils/tokenCleanup');

    // Run comprehensive cleanup
    const cleanedCount = await tokenCleanup.cleanupMalformedTokens();

    console.log(`🧹 Comprehensive cleanup completed: ${cleanedCount} tokens cleaned`);

    res.json({
      message: 'Comprehensive token cleanup completed',
      tokensCleanedUp: cleanedCount,
      recommendation: 'All users with corrupted tokens should sign in again'
    });

  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      details: error.message
    });
  }
});

module.exports = router;
