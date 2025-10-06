import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../config/msalConfig'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'

export const useMicrosoftAuth = () => {
  const { instance, accounts } = useMsal()
  const { login } = useAuthStore()

  const loginMicrosoft = async () => {
    try {
      console.log('🚀 Starting Microsoft login redirect (like Render)...')

      // Clear any previous login state
      sessionStorage.removeItem('msalLoginInProgress')
      sessionStorage.setItem('msalLoginInProgress', 'true')

      // Usar redirect como en Render (más estable que popup)
      await instance.loginRedirect({
        scopes: ["openid", "profile", "User.Read"],
        prompt: "select_account",
        redirectUri: "https://finsmart-production.up.railway.app/auth/ms-callback"
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

        // Create a demo token for development
        const token = `demo-token-${Date.now()}`

        login(userInfo, token)
        toast.success('Autenticación exitosa con Microsoft')

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
      throw new Error('No accounts found')
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      })
      return response.accessToken
    } catch (error) {
      console.error('Silent token acquisition failed:', error)
      // Try interactive token acquisition
      try {
        const response = await instance.acquireTokenPopup(loginRequest)
        return response.accessToken
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError)
        throw interactiveError
      }
    }
  }

  const isLoggedIn = accounts.length > 0

  return {
    loginMicrosoft,
    loginMicrosoftPopup,
    logoutMicrosoft,
    getAccessToken,
    isLoggedIn,
    account: accounts[0] || null
  }
}
