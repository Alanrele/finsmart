// Configuración específica para Railway.app
const isRailwayProduction = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('railway.app');
};

const isLocalDevelopment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const getRailwayConfig = () => {
  const baseConfig = {
    isDevelopment: isLocalDevelopment(),
    isProduction: isRailwayProduction(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'https:',
  };

  if (baseConfig.isProduction) {
    return {
      ...baseConfig,
      apiUrl: `${baseConfig.protocol}//${baseConfig.hostname}`,
      websocketUrl: `wss://${baseConfig.hostname}`,
      redirectUri: `${baseConfig.protocol}//${baseConfig.hostname}/auth/ms-callback`
    };
  }

  // Development configuration
  return {
    ...baseConfig,
    apiUrl: 'http://localhost:5000',
    websocketUrl: 'ws://localhost:5000',
    redirectUri: 'http://localhost:3000/auth/ms-callback'
  };
};

export { isRailwayProduction, isLocalDevelopment, getRailwayConfig };