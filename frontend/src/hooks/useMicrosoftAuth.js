import { useMsal } from '@azure/msal-react'
import { loginRequest, graphMailRequest } from '../config/msalConfig'
import useAuthStore from '../stores/authStore'
import { completeMicrosoftLogin } from '../services/api'
import { getRailwayConfig } from '../config/railway'
import toast from 'react-hot-toast'

export const useMicrosoftAuth = () => {
  const { instance, accounts } = useMsal()
  const { login } = useAuthStore()

  const loginMicrosoft = async () => {
    try {
      console.log('🚀 Starting Microsoft login redirect...')

      // Get dynamic redirect URI based on environment
      const railwayConfig = getRailwayConfig()
      const redirectUri = railwayConfig.redirectUri
      console.log('🔗 Using redirect URI:', redirectUri)

      // Clear any previous login state
      sessionStorage.removeItem('msalLoginInProgress')
      sessionStorage.setItem('msalLoginInProgress', 'true')

      // Usar redirect como en Render (más estable que popup)
      await instance.loginRedirect({
        scopes: ["openid", "profile", "User.Read"],
        prompt: "select_account",
        redirectUri
      })

      // Nota: loginRedirect no retorna respuesta, se maneja en AuthCallback

    } catch (error) {
      console.error('❌ Microsoft login redirect error:', error)
      toast.error('Error al iniciar sesión con Microsoft')
      sessionStorage.removeItem('msalLoginInProgress')
      throw error
    }
  }

  const handleLoginSuccess = async (response) => {
    try {
      if (response && response.account) {
        const userInfo = {
          _id: response.account.localAccountId,
          firstName: response.account.idTokenClaims?.given_name || 'Usuario',
          lastName: response.account.idTokenClaims?.family_name || 'Microsoft',
          email: response.account.username,
          avatar: null
        }

        // Get Microsoft access token and exchange for backend JWT
        const accessToken = await getAccessToken();

        if (accessToken) {
          const data = await completeMicrosoftLogin({ accessToken, userInfo: {
            id: response.account.localAccountId,
            mail: response.account.username,
            userPrincipalName: response.account.username,
            givenName: response.account.idTokenClaims?.given_name || 'Usuario',
            surname: response.account.idTokenClaims?.family_name || 'Microsoft'
          }})
          login(data.user, data.token)
          toast.success('Autenticación exitosa con Microsoft')
        } else {
          toast.error('No se pudo obtener un token de acceso de Microsoft.');
        }

        // Clear login progress flag
        sessionStorage.removeItem('msalLoginInProgress')

        return true
      }
    } catch (error) {
      console.error('Login success handler error:', error)
      toast.error('Error al procesar la autenticación')
      sessionStorage.removeItem('msalLoginInProgress')
    }
    return false
  }

  const loginMicrosoftPopup = async () => {
    try {
      const response = await instance.loginPopup(loginRequest)
      return response
    } catch (error) {
      console.error('Microsoft popup login error:', error)
      throw error
    }
  }

  const logoutMicrosoft = async () => {
    try {
      await instance.logoutRedirect()
    } catch (error) {
      console.error('Microsoft logout error:', error)
    }
  }

  const getAccessToken = async () => {
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please sign in with Microsoft first.')
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      })
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire access token from Microsoft')
      }
      
      return response.accessToken
    } catch (error) {
      console.error('Silent token acquisition failed:', error)
      // Try interactive token acquisition
      try {
        const response = await instance.acquireTokenPopup(loginRequest)
        
        if (!response || !response.accessToken) {
          throw new Error('Failed to acquire access token from Microsoft popup')
        }
        
        return response.accessToken
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError)
        throw new Error('Could not acquire Microsoft access token. Please sign in again.')
      }
    }
  }

  // Get access token specifically for Microsoft Graph Mail operations
  const getGraphMailToken = async () => {
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please sign in with Microsoft first.')
    }

    try {
      // First, try to get token from cache without iframe
      const silentRequest = {
        ...graphMailRequest,
        account: accounts[0],
        forceRefresh: false,
        cacheLookupPolicy: 2 // CacheLookupPolicy.Default - check cache first
      }

      console.log('🔍 Attempting to get Graph Mail token from cache...')
      
      try {
        const response = await instance.acquireTokenSilent(silentRequest)
        
        if (!response || !response.accessToken) {
          throw new Error('No token in cache')
        }
        
        console.log('✅ Successfully acquired Graph Mail token from cache')
        return response.accessToken
      } catch (cacheError) {
        console.log('ℹ️ Token not in cache or expired, will request interactively')
        // Continue to interactive acquisition
      }

      // If cache fails, go straight to interactive (popup) - skip iframe attempts
      console.log('🔄 Requesting Graph Mail token via popup...')
      const response = await instance.acquireTokenPopup(graphMailRequest)
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire Graph Mail access token from Microsoft popup')
      }
      
      console.log('✅ Successfully acquired Graph Mail token via popup')
      return response.accessToken

    } catch (error) {
      console.error('❌ Graph Mail token acquisition failed:', error)
      
      // Check if it's a specific MSAL error
      if (error.errorCode === 'user_cancelled' || error.errorMessage?.includes('cancelled')) {
        throw new Error('Autenticación cancelada. Por favor, intenta conectar Outlook nuevamente.')
      }
      
      if (error.errorCode === 'consent_required') {
        throw new Error('Se requiere permiso para acceder a tus emails. Por favor, acepta los permisos cuando se soliciten.')
      }
      
      throw new Error('Could not acquire Microsoft Graph Mail access token. Please grant permission to access your emails.')
    }
  }

  const isLoggedIn = accounts.length > 0

  return {
    loginMicrosoft,
    loginMicrosoftPopup,
    logoutMicrosoft,
    getAccessToken,
    getGraphMailToken,
    isLoggedIn,
    account: accounts[0] || null
  }
}
