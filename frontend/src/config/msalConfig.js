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
    // Configuración específica para SPA
    knownAuthorities: [],
    cloudDiscoveryMetadata: "",
    authorityMetadata: ""
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
    // Configuración optimizada para evitar GET requests
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    navigateFrameWait: 500,
    tokenRenewalOffsetSeconds: 300,
    allowRedirectInIframe: false,
    // Logging para debug
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`🔍 MSAL ${level}: ${message}`);
      },
      piiLoggingEnabled: false,
      logLevel: 3
    }
  }
}

// Scopes for Microsoft Graph API - Simplified for SPA
export const loginRequest = {
  scopes: ["openid", "profile", "User.Read"],
  prompt: "select_account",
  redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback",
  // Configuración específica para evitar GET requests
  responseMode: undefined, // Dejar que MSAL decida automáticamente
  extraQueryParameters: {},
  // Forzar PKCE para SPA
  codeChallenge: undefined,
  codeChallengeMethod: undefined
}

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages"
}
