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
    clientId: "29f56526-69dc-4e89-9955-060aa8292fd0", // Hardcoded para debug
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback", // Hardcoded exacto
    postLogoutRedirectUri: "https://finsmart-production.up.railway.app",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false, // Disables WAM Broker
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  }
}

// Scopes for Microsoft Graph API - Railway Production
export const loginRequest = {
  scopes: [
    "User.Read",
    "Mail.Read",
    "Mail.ReadBasic",
    "offline_access",
    "openid",
    "profile",
    "email"
  ],
  prompt: "select_account",
  redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback" // Como en Render
}

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages"
}
