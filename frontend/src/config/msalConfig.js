// MSAL configuration for Microsoft Graph authentication - Railway Production

// Debug: verificar variables (temporal)
console.log('🔍 MSAL Config Debug:', {
  VITE_GRAPH_CLIENT_ID: import.meta.env.VITE_GRAPH_CLIENT_ID,
  VITE_GRAPH_TENANT_ID: import.meta.env.VITE_GRAPH_TENANT_ID,
  VITE_REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

export const msalConfig = {
  auth: {
    clientId: "29f56526-69dc-4e89-9955-060aa8292fd0",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback",
    postLogoutRedirectUri: "https://finsmart-production.up.railway.app",
    navigateToLoginRequestUrl: false,
    validateAuthority: false,
    // Forzar Authorization Code Flow con PKCE
    clientCapabilities: ["CP1"]
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    tokenRenewalOffsetSeconds: 300,
    navigateFrameWait: 500,
    // Forzar Authorization Code Flow
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`MSAL ${level}: ${message}`);
      },
      piiLoggingEnabled: false,
      logLevel: 3 // Info level
    }
  }
}

// Scopes for Microsoft Graph API - Authorization Code Flow
export const loginRequest = {
  scopes: ["openid", "profile", "User.Read"],
  prompt: "select_account",
  redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback",
  // Forzar Authorization Code Flow
  responseMode: "fragment", 
  state: `login_${Date.now()}`,
  extraQueryParameters: {}
}

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages"
}
