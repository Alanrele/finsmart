import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../config/msalConfig'

export const useMicrosoftAuth = () => {
  const { instance, accounts } = useMsal()

  const loginMicrosoft = async () => {
    try {
      // Use redirect instead of popup for better compatibility
      await instance.loginRedirect(loginRequest)
      // Note: This won't return a response as it redirects
      // The response will be handled in AuthCallback component
    } catch (error) {
      console.error('Microsoft login error:', error)
      throw error
    }
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
