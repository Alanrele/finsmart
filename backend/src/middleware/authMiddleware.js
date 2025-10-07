const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('🔑 Auth middleware - Token received:', token.substring(0, 20) + '...');

    // Check if it's a demo token
    if (token.startsWith('demo-token-')) {
      console.log('🎭 Demo token detected, allowing access');
      // Create a demo user for the request
      req.user = {
        _id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com'
      };
      return next();
    }

    // Check if it's a Microsoft token (typical pattern)
    if (token.length > 100 && !token.includes('.')) {
      console.log('🔑 Microsoft token detected, allowing access');
      // For Microsoft tokens, create a demo user
      req.user = {
        _id: 'microsoft-user-id',
        firstName: 'Microsoft',
        lastName: 'User',
        email: 'microsoft@example.com'
      };
      return next();
    }

    // Try to verify as JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({ error: 'Token is not valid.' });
      }

      console.log('✅ JWT token verified for user:', user.email);
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Token is not valid.' });
    }

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({ error: 'Token is not valid.' });
  }
};

module.exports = authMiddleware;
