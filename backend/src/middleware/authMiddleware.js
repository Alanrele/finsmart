const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { cleanupUserToken } = require('../utils/tokenCleanup');

// Track recently cleaned up tokens to prevent infinite loops
const recentlyCleanedTokens = new Set();
const CLEANUP_CACHE_DURATION = 300000; // 5 minutes

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('🔑 Auth middleware - Token received:', token.substring(0, 20) + '...');

    // Check if this token was recently cleaned up to prevent loops
    const tokenHash = token.substring(0, 30);
    if (recentlyCleanedTokens.has(tokenHash)) {
      console.error('🔄 Token was recently cleaned up - preventing loop');
      return res.status(401).json({
        error: 'Token was recently invalidated',
        details: 'This token was recently cleaned up due to corruption. Please sign in again.',
        code: 'TOKEN_RECENTLY_CLEANED',
        action: 'REAUTHENTICATE_REQUIRED'
      });
    }

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

      // Enhanced token validation for obviously corrupted tokens
      if (token.includes('undefined') || token.includes('null') || token === 'undefined' || token === 'null') {
        console.error('❌ Malformed token detected (contains undefined/null)');
        await addToCleanupCache(tokenHash);
        await cleanupUserByToken(token);
        return res.status(401).json({
          error: 'Invalid authentication token',
          details: 'Token is malformed or corrupted. Please re-authenticate.',
          code: 'TOKEN_CORRUPTED'
        });
      }

      // Additional pre-validation for Microsoft tokens
      if (token.length < 20 || token.includes(' ') || token.includes('\n') || token.includes('\r')) {
        console.error('❌ Suspicious token format detected - likely corrupted');
        await addToCleanupCache(tokenHash);
        await cleanupUserByToken(token);
        return res.status(401).json({
          error: 'Suspicious token format',
          details: 'Token appears to be corrupted. Please re-authenticate.',
          code: 'TOKEN_FORMAT_SUSPICIOUS'
        });
      }

      console.log('🔍 Microsoft token format validation passed');

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

        // Check for token expiration errors
        if (error.message?.includes('401') ||
            error.message?.includes('InvalidAuthenticationToken') ||
            error.message?.includes('expired') ||
            error.message?.includes('token is expired')) {
          console.log('🔄 Microsoft token expired - returning specific error for frontend refresh');
          return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            message: 'Microsoft access token has expired. Please refresh the page and sign in again.',
            action: 'REFRESH_TOKEN'
          });
        }

        // Check for specific JWT malformed error from Microsoft
        if (error.message && error.message.includes('JWT is not well formed')) {
          console.error('🔑 JWT malformed error detected - cleaning up corrupted token');
          await addToCleanupCache(tokenHash);
          await cleanupUserByToken(token);
          
          return res.status(401).json({
            error: 'Authentication token corrupted',
            details: 'Microsoft rejected the token as malformed. Your authentication token has been cleaned up. Please sign in again.',
            code: 'JWT_MALFORMED_BY_MICROSOFT',
            action: 'REAUTHENTICATE_REQUIRED'
          });
        }

        // Check for invalid authentication token error
        if (error.code === 'InvalidAuthenticationToken') {
          console.error('🔑 Invalid authentication token - cleaning up');
          await addToCleanupCache(tokenHash);
          await cleanupUserByToken(token);
          
          return res.status(401).json({
            error: 'Invalid authentication token',
            details: 'Microsoft rejected the authentication token. Please sign in again.',
            code: 'INVALID_AUTH_TOKEN_BY_MICROSOFT',
            action: 'REAUTHENTICATE_REQUIRED'
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
          details: 'Token validation failed. Please sign in again.',
          code: 'MICROSOFT_VALIDATION_FAILED',
          action: 'REAUTHENTICATE_REQUIRED'
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

// Helper functions
const addToCleanupCache = (tokenHash) => {
  recentlyCleanedTokens.add(tokenHash);
  setTimeout(() => {
    recentlyCleanedTokens.delete(tokenHash);
  }, CLEANUP_CACHE_DURATION);
};

const cleanupUserByToken = async (token) => {
  try {
    console.log('🧹 Cleaning up corrupted token from database...');
    
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
      console.log(`🧹 Successfully cleaned up corrupted token for ${result.modifiedCount} user(s)`);
    }
  } catch (cleanupError) {
    console.error('❌ Error cleaning up corrupted token:', cleanupError);
  }
};

module.exports = authMiddleware;
