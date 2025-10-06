// MSAL configuration for Microsoft Graph authentication
export const msalConfig = {
  auth: {
    clientId: "29f56526-69dc-4e89-9955-060aa8292fd0", // Hardcoded for production
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://finsmart-production.up.railway.app",
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

// Scopes for Microsoft Graph API
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
  redirectUri: "https://finsmart-production.up.railway.app"
}

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages"
}
