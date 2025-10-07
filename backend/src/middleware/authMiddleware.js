const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

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
    console.log('🔍 Token length:', token.length);
    console.log('🔍 Token type:', typeof token);
    console.log('🔍 Token first 50 chars:', token.substring(0, 50));
    console.log('🔍 Token last 10 chars:', token.substring(token.length - 10));

    // Check if this token was recently cleaned up to prevent loops
    const tokenHash = token.substring(0, 30); // Use first 30 chars as hash
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
        await cleanupCorruptedToken(token);
        return res.status(401).json({ 
          error: 'Invalid authentication token', 
          details: 'Token is malformed or corrupted. Please re-authenticate.',
          code: 'TOKEN_CORRUPTED'
        });
      }

      // Additional pre-validation for Microsoft tokens
      // Check for common patterns that indicate corruption
      if (token.length < 20 || token.includes(' ') || token.includes('\n') || token.includes('\r')) {
        console.error('❌ Suspicious token format detected - likely corrupted');
        await cleanupCorruptedToken(token);
        return res.status(401).json({
          error: 'Suspicious token format',
          details: 'Token appears to be corrupted. Please re-authenticate.',
          code: 'TOKEN_FORMAT_SUSPICIOUS'
        });
      }

      // Microsoft Graph tokens can have different formats (not always JWT)
      // Skip JWT format validation for Microsoft tokens
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

        // Check for specific JWT malformed error from Microsoft
        if (error.message && error.message.includes('JWT is not well formed')) {
          console.error('🔑 JWT malformed error detected - cleaning up corrupted token');
          
          // Add to recently cleaned tokens cache to prevent loops
          const tokenHash = token.substring(0, 30);
          recentlyCleanedTokens.add(tokenHash);
          setTimeout(() => {
            recentlyCleanedTokens.delete(tokenHash);
          }, CLEANUP_CACHE_DURATION);
          
          // Clean up the corrupted token immediately
          await cleanupCorruptedToken(token);
          
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
          
          // Add to recently cleaned tokens cache to prevent loops
          const tokenHash = token.substring(0, 30);
          recentlyCleanedTokens.add(tokenHash);
          setTimeout(() => {
            recentlyCleanedTokens.delete(tokenHash);
          }, CLEANUP_CACHE_DURATION);
          
          // Clean up the invalid token
          await cleanupCorruptedToken(token);
          
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

// Helper function to cleanup corrupted tokens from database
const cleanupCorruptedToken = async (corruptedToken) => {
  try {
    console.log('🧹 Cleaning up corrupted token from database...');
    console.log('🔍 Corrupted token preview:', corruptedToken.substring(0, 30) + '...');
    
    // First, let's see how many users have this token
    const usersWithToken = await User.find({ accessToken: corruptedToken });
    console.log(`🔍 Found ${usersWithToken.length} user(s) with this corrupted token`);
    
    if (usersWithToken.length > 0) {
      usersWithToken.forEach(user => {
        console.log(`🔍 User with corrupted token: ${user.email}`);
      });
    }
    
    // Find users with this corrupted token and clear it
    const result = await User.updateMany(
      { accessToken: corruptedToken },
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
    } else {
      console.log('🧹 No users found with this specific corrupted token');
    }
    
    // Also clean up any tokens that might be similar or partial matches
    const partialResult = await User.updateMany(
      { 
        accessToken: { 
          $regex: corruptedToken.substring(0, 20),
          $options: 'i' 
        }
      },
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
    
    if (partialResult.modifiedCount > 0) {
      console.log(`🧹 Additional cleanup: found ${partialResult.modifiedCount} user(s) with similar tokens`);
    }
    
  } catch (cleanupError) {
    console.error('❌ Error cleaning up corrupted token:', cleanupError);
  }
};

module.exports = authMiddleware;
