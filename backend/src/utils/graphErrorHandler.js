/**
 * Microsoft Graph Error Handler Utility
 * Provides comprehensive error handling and fallback strategies for Microsoft Graph API calls
 */

class GraphErrorHandler {
  static logError(error, context = '') {
    const timestamp = new Date().toISOString();
    console.log(`🚨 [${timestamp}] Microsoft Graph Error in ${context}:`);
    console.log(`   Code: ${error.code || 'Unknown'}`);
    console.log(`   Status: ${error.statusCode || 'Unknown'}`);
    console.log(`   Message: ${error.message || 'No message'}`);
    
    if (error.requestId) {
      console.log(`   Request ID: ${error.requestId}`);
    }
    
    if (error.headers) {
      console.log(`   Headers: ${JSON.stringify(Object.fromEntries(error.headers))}`);
    }
  }

  static isRetryableError(error) {
    const retryableCodes = [
      'TooManyRequests',
      'ServiceUnavailable',
      'InternalServerError',
      'RequestTimeout'
    ];
    
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    return retryableCodes.includes(error.code) || 
           retryableStatuses.includes(error.statusCode);
  }

  static isAuthError(error) {
    const authCodes = [
      'InvalidAuthenticationToken',
      'Unauthenticated',
      'Unauthorized',
      'TokenExpired'
    ];
    
    const authStatuses = [401, 403];
    
    return authCodes.includes(error.code) || 
           authStatuses.includes(error.statusCode);
  }

  static isComplexityError(error) {
    return error.code === 'InefficientFilter' || 
           error.message?.toLowerCase().includes('too complex');
  }

  static getErrorCategory(error) {
    if (this.isAuthError(error)) return 'authentication';
    if (this.isComplexityError(error)) return 'complexity';
    if (this.isRetryableError(error)) return 'retryable';
    return 'unknown';
  }

  static getRetryDelay(attempt) {
    // Exponential backoff: 2^attempt seconds (max 60 seconds)
    return Math.min(Math.pow(2, attempt) * 1000, 60000);
  }

  static formatErrorForUser(error) {
    const category = this.getErrorCategory(error);
    
    switch (category) {
      case 'authentication':
        return {
          type: 'auth',
          message: 'Autenticación requerida',
          details: 'Su sesión de Microsoft ha expirado. Por favor, vuelva a conectar su cuenta.',
          action: 'reconnect'
        };
        
      case 'complexity':
        return {
          type: 'complexity',
          message: 'Consulta simplificada activada',
          details: 'Microsoft Graph está usando consultas simplificadas para evitar problemas de complejidad.',
          action: 'automatic'
        };
        
      case 'retryable':
        return {
          type: 'temporary',
          message: 'Error temporal del servicio',
          details: 'Microsoft Graph está experimentando problemas temporales. Reintentando automáticamente.',
          action: 'retry'
        };
        
      default:
        return {
          type: 'unknown',
          message: 'Error inesperado',
          details: 'Ha ocurrido un error inesperado con Microsoft Graph.',
          action: 'contact_support'
        };
    }
  }

  static async executeWithFallback(primaryQuery, fallbackQueries = []) {
    const maxRetries = 3;
    
    // Try primary query with retries
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔍 Executing primary query (attempt ${attempt + 1}/${maxRetries})...`);
        const result = await primaryQuery();
        console.log('✅ Primary query successful');
        return result;
      } catch (error) {
        this.logError(error, 'Primary Query');
        
        if (this.isComplexityError(error)) {
          console.log('⚠️ Complexity error detected, switching to fallback strategies...');
          break; // Don't retry complexity errors, go straight to fallbacks
        }
        
        if (this.isAuthError(error)) {
          console.log('🔒 Authentication error detected, cannot retry');
          throw error; // Auth errors can't be fixed with retries
        }
        
        if (this.isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = this.getRetryDelay(attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (attempt === maxRetries - 1) {
          console.log('❌ Primary query failed after all retries, trying fallbacks...');
          break;
        }
      }
    }
    
    // Try fallback queries
    for (let i = 0; i < fallbackQueries.length; i++) {
      try {
        console.log(`🔄 Executing fallback query ${i + 1}/${fallbackQueries.length}...`);
        const result = await fallbackQueries[i]();
        console.log(`✅ Fallback query ${i + 1} successful`);
        return result;
      } catch (error) {
        this.logError(error, `Fallback Query ${i + 1}`);
        
        if (this.isAuthError(error)) {
          throw error; // Auth errors can't be fixed with different queries
        }
        
        if (i === fallbackQueries.length - 1) {
          console.log('❌ All fallback queries failed');
          throw error;
        }
      }
    }
    
    throw new Error('All queries failed');
  }
}

module.exports = GraphErrorHandler;