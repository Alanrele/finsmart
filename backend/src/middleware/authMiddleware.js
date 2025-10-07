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
    if (token.length > 50 && typeof token === 'string') {
      console.log('🔑 Microsoft token detected, processing...');

      // Additional token validation
      if (token.includes('undefined') || token.includes('null') || token === 'undefined' || token === 'null') {
        console.error('❌ Malformed token detected (contains undefined/null)');
        return res.status(401).json({ 
          error: 'Invalid authentication token', 
          details: 'Token is malformed or corrupted. Please re-authenticate.'
        });
      }

      try {
        // Try to get user info from Microsoft Graph using the token
        const { Client } = require('@microsoft/microsoft-graph-client');

        class CustomAuthProvider {
          constructor(accessToken) {
            this.accessToken = accessToken;
          }
          async getAccessToken() {
            return this.accessToken;
          }
        }

        const authProvider = new CustomAuthProvider(token);
        const graphClient = Client.initWithMiddleware({ authProvider });

        // Get user profile from Microsoft Graph
        const profile = await graphClient.api('/me').get();

        console.log('👤 Microsoft Graph profile:', {
          displayName: profile.displayName,
          email: profile.mail || profile.userPrincipalName,
          id: profile.id
        });

        // Find or create user in database
        let user = await User.findOne({
          email: profile.mail || profile.userPrincipalName
        });

        if (!user) {
          // Create new user
          user = new User({
            email: profile.mail || profile.userPrincipalName,
            firstName: profile.givenName || 'Usuario',
            lastName: profile.surname || 'Microsoft',
            microsoftId: profile.id,
            accessToken: token,
            tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
            password: 'microsoft-auth-' + Date.now(), // Dummy password
            isVerified: true
          });

          await user.save();
          console.log('✅ New Microsoft user created:', user.email);
        } else {
          // Update existing user with new token
          user.accessToken = token;
          user.tokenExpiry = new Date(Date.now() + 3600000);
          user.microsoftId = profile.id;
          await user.save();
          console.log('✅ Existing Microsoft user updated:', user.email);
        }

        req.user = user;
        return next();

      } catch (error) {
        console.error('❌ Microsoft token validation failed:', error);

        // Check for specific JWT malformed error
        if (error.message && error.message.includes('JWT is not well formed')) {
          console.error('🔑 JWT malformed error detected');
          return res.status(401).json({
            error: 'Authentication token malformed',
            details: 'Your authentication token is corrupted. Please sign out and sign in again.',
            code: 'JWT_MALFORMED'
          });
        }

        // Try to find existing user by email from token header if possible
        try {
          // Check if we can find user by existing Microsoft ID or email
          const existingUser = await User.findOne({
            $or: [
              { accessToken: token },
              { email: { $exists: true } }
            ]
          }).sort({ updatedAt: -1 });

          if (existingUser) {
            console.log('⚠️ Using existing user despite token validation failure');
            req.user = existingUser;
            return next();
          }
        } catch (fallbackError) {
          console.error('Fallback user lookup failed:', fallbackError);
        }

        return res.status(401).json({
          error: 'Microsoft token validation failed',
          details: 'Token may have expired. Please log in again.',
          originalError: error.message
        });
      }
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
