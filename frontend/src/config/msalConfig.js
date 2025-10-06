import { LogLevel } from '@azure/msal-browser';
import { getRailwayConfig } from './railway';

const railwayConfig = getRailwayConfig();

console.log('� MSAL Config - Railway Environment:', {
  isDevelopment: railwayConfig.isDevelopment,
  isProduction: railwayConfig.isProduction,
  hostname: railwayConfig.hostname,
  redirectUri: railwayConfig.redirectUri
});

export const msalConfig = {
  auth: {
    clientId: '29f56526-69dc-4e89-9955-060aa8292fd0',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: railwayConfig.redirectUri,
    postLogoutRedirectUri: railwayConfig.isProduction 
      ? `${railwayConfig.protocol}//${railwayConfig.hostname}/login`
      : 'http://localhost:3000/login',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        const timestamp = new Date().toISOString();
        switch (level) {
          case LogLevel.Error:
            console.error(`[MSAL ${timestamp}] ${message}`);
            break;
          case LogLevel.Warning:
            console.warn(`[MSAL ${timestamp}] ${message}`);
            break;
          case LogLevel.Info:
            console.info(`[MSAL ${timestamp}] ${message}`);
            break;
          case LogLevel.Verbose:
            console.debug(`[MSAL ${timestamp}] ${message}`);
            break;
          default:
            console.log(`[MSAL ${timestamp}] ${message}`);
        }
      },
      logLevel: railwayConfig.isDevelopment ? LogLevel.Verbose : LogLevel.Warning,
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false
  }
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
  forceRefresh: false,
  prompt: 'select_account'
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};
