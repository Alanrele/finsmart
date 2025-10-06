// MSAL configuration for Microsoft Graph authentication
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_GRAPH_CLIENT_ID || "29f56526-69dc-4e89-9955-060aa8292fd0",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_GRAPH_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin + "/auth/ms-callback",
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false, // Disables WAM Broker
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
  prompt: "select_account"
}

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages"
}
