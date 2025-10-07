const User = require('../models/userModel');

/**
 * Cleanup malformed or corrupted tokens from the database
 * This function should be run periodically or on server startup
 */
const cleanupMalformedTokens = async () => {
  try {
    console.log('🧹 Starting malformed token cleanup...');
    
    // Find all users with access tokens
    const usersWithTokens = await User.find({ 
      accessToken: { $exists: true, $ne: null } 
    }).select('email accessToken');

    let cleanedCount = 0;
    
    for (const user of usersWithTokens) {
      const token = user.accessToken;
      
      // Check for malformed tokens
      // Note: Microsoft Graph tokens may not follow JWT format (no dots)
      const isMalformed = 
        !token || 
        typeof token !== 'string' ||
        token.includes('undefined') || 
        token.includes('null') || 
        token === 'undefined' || 
        token === 'null' ||
        token.length < 10; // Very short tokens are likely corrupted
      
      // Skip Microsoft Graph tokens (they may not have dots)
      const isMicrosoftGraphToken = token.startsWith('EwB') || token.startsWith('eyJ') || (token.length > 100 && !token.includes('.'));
      
      if (isMalformed && !isMicrosoftGraphToken) {
        console.log(`🧹 Cleaning malformed token for user: ${user.email}`);
        
        // Clear all token-related fields
        await User.findByIdAndUpdate(user._id, {
          $unset: {
            accessToken: 1,
            refreshToken: 1,
            tokenExpiry: 1
          },
          syncEnabled: false,
          lastSync: new Date()
        });
        
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} malformed token(s) from database`);
    } else {
      console.log('✅ No malformed tokens found in database');
    }
    
    return cleanedCount;
    
  } catch (error) {
    console.error('❌ Error during token cleanup:', error);
    return 0;
  }
};

/**
 * Check if a specific token is malformed
 * Note: Microsoft Graph tokens may not follow JWT format
 */
const isTokenMalformed = (token) => {
  if (!token || typeof token !== 'string') return true;
  if (token.includes('undefined') || token.includes('null')) return true;
  if (token === 'undefined' || token === 'null') return true;
  if (token.length < 10) return true; // Very short tokens are likely corrupted
  
  // Microsoft Graph tokens are valid even without dots
  const isMicrosoftGraphToken = token.startsWith('EwB') || token.startsWith('eyJ') || (token.length > 100 && !token.includes('.'));
  if (isMicrosoftGraphToken) return false;
  
  // For JWT tokens, check format
  if (!token.includes('.') || token.split('.').length < 2) return true;
  return false;
};

/**
 * Clean up a specific user's corrupted token
 */
const cleanupUserToken = async (userId) => {
  try {
    const result = await User.findByIdAndUpdate(userId, {
      $unset: {
        accessToken: 1,
        refreshToken: 1,
        tokenExpiry: 1
      },
      syncEnabled: false,
      lastSync: new Date()
    });
    
    if (result) {
      console.log(`🧹 Cleaned up token for user: ${result.email}`);
      return true;
    }
    return false;
    
  } catch (error) {
    console.error('❌ Error cleaning up user token:', error);
    return false;
  }
};

module.exports = {
  cleanupMalformedTokens,
  isTokenMalformed,
  cleanupUserToken
};