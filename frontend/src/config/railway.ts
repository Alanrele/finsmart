// Configuración específica para Railway.app (migrado a TypeScript)

export interface RailwayConfig {
  isDevelopment: boolean
  isProduction: boolean
  hostname: string
  protocol: string
  apiUrl: string
  websocketUrl: string
  redirectUri: string
}

const isRailwayProduction = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('railway.app')
}

const isLocalDevelopment = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

const getRailwayConfig = (): RailwayConfig => {
  const baseConfig = {
    isDevelopment: isLocalDevelopment(),
    isProduction: isRailwayProduction(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'https:',
  }

  if (baseConfig.isProduction) {
    return {
      ...baseConfig,
      apiUrl: `${baseConfig.protocol}//${baseConfig.hostname}`,
      websocketUrl: `${baseConfig.protocol === 'https:' ? 'wss' : 'ws'}://${baseConfig.hostname}`,
      redirectUri: `${baseConfig.protocol}//${baseConfig.hostname}/auth/ms-callback`,
    }
  }

  return {
    ...baseConfig,
    apiUrl: 'http://localhost:5000',
    websocketUrl: 'ws://localhost:5000',
    redirectUri: 'http://localhost:3001/auth/ms-callback',
  }
}

export { isRailwayProduction, isLocalDevelopment, getRailwayConfig }
