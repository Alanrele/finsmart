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
      console.log('🔑 Microsoft token detected, processing...');

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

        // Fallback to demo user if Graph API fails
        req.user = {
          _id: 'microsoft-user-id',
          firstName: 'Microsoft',
          lastName: 'User',
          email: 'microsoft@example.com'
        };
        return next();
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
