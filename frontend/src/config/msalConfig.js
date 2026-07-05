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
    // Configurable vía VITE_AZURE_CLIENT_ID; el fallback mantiene el valor actual
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '29f56526-69dc-4e89-9955-060aa8292fd0',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: railwayConfig.redirectUri,
    postLogoutRedirectUri: railwayConfig.isProduction
      ? `${railwayConfig.protocol}//${railwayConfig.hostname}/login`
      : 'http://localhost:3001/login',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true, // Required for Safari and when iframes are blocked
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
    // (msal-browser v4 removió `allowNativeBroker`; el broker nativo no aplica en web)
    windowHashTimeout: 60000,
    iframeHashTimeout: 10000, // Increased timeout for iframe operations
    loadFrameTimeout: 10000, // Increased timeout
    asyncPopups: false,
    allowRedirectInIframe: false // Prevent redirect attempts in iframes
  }
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
  forceRefresh: false,
  prompt: 'select_account',
  redirectUri: railwayConfig.redirectUri // Explicit redirect for popup
};

// Separate request for Microsoft Graph Mail access
export const graphMailRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'openid', 'profile', 'email'],
  forceRefresh: false,
  redirectUri: railwayConfig.redirectUri // Explicit redirect for popup
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};
