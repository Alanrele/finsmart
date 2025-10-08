import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import useAuthStore from '../stores/authStore'
import LoadingScreen from './LoadingScreen'
import toast from 'react-hot-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { instance } = useMsal()
  const { login, setLoading } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('📱 AuthCallback component mounted')
        setLoading(true)

        // Handle redirect promise
        const response = await instance.handleRedirectPromise()

        if (response && response.account) {
          console.log('✅ AuthCallback - Login successful:', response.account.username)

          // Get access token for Microsoft Graph
          const tokenRequest = {
            scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read'],
            account: response.account
          }

          try {
            const tokenResponse = await instance.acquireTokenSilent(tokenRequest)
            const accessToken = tokenResponse.accessToken
            console.log('🔑 AuthCallback - Access token obtained')

            // Success - user is authenticated
            const userInfo = {
              _id: response.account.localAccountId,
              firstName: response.account.idTokenClaims?.given_name || 'Usuario',
              lastName: response.account.idTokenClaims?.family_name || 'Microsoft',
              email: response.account.username,
              avatar: null
            }

            login(userInfo, accessToken)
            toast.success('✅ Autenticación exitosa con Microsoft')
            navigate('/dashboard')
          } catch (tokenError) {
            console.error('❌ AuthCallback - Error getting access token:', tokenError)
            // Fallback to demo token if token acquisition fails
            const token = `demo-token-${Date.now()}`
            const userInfo = {
              _id: response.account.localAccountId,
              firstName: response.account.idTokenClaims?.given_name || 'Usuario',
              lastName: response.account.idTokenClaims?.family_name || 'Microsoft',
              email: response.account.username,
              avatar: null
            }
            login(userInfo, token)
            toast.success('✅ Autenticación exitosa con Microsoft (modo demo)')
            navigate('/dashboard')
          }
        } else {
          console.log('⚠️ AuthCallback - No response, redirecting to login')
          navigate('/login')
        }
      } catch (error) {
        console.error('❌ AuthCallback error:', error)
        toast.error('Error en la autenticación')
        navigate('/login')
      } finally {
        setLoading(false)
        sessionStorage.removeItem('msalLoginInProgress')
      }
    }

    handleCallback()
  }, [instance, login, navigate, setLoading])

  return <LoadingScreen />
}

export default AuthCallback
