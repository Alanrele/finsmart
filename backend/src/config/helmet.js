// Alternative helmet configuration for production
const productionHelmetConfig = {
  contentSecurityPolicy: false, // Disable CSP for React compatibility
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Keep other security features
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
};

const developmentHelmetConfig = {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
};

module.exports = {
  productionHelmetConfig,
  developmentHelmetConfig
};
