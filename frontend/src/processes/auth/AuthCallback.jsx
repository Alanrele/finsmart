import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import useAuthStore from '@entities/session/model/authStore'
import { completeMicrosoftLogin } from '@shared/api/base'
import LoadingScreen from '@shared/ui/LoadingScreen'
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
            console.log('🔑 AuthCallback - MS access token obtained, exchanging for app JWT')

            // Build minimal userInfo payload for backend
            const userInfo = {
              id: response.account.localAccountId,
              mail: response.account.username,
              userPrincipalName: response.account.username,
              givenName: response.account.idTokenClaims?.given_name || 'Usuario',
              surname: response.account.idTokenClaims?.family_name || 'Microsoft'
            }

            // Exchange MS token for backend JWT
            const data = await completeMicrosoftLogin({ accessToken, userInfo })
            // Store our app JWT in auth store
            login(data.user, data.token)
            toast.success('✅ Autenticación exitosa con Microsoft')
            navigate('/dashboard')
          } catch (tokenError) {
            console.error('❌ AuthCallback - Error getting access token:', tokenError)
            // Optional demo fallback only when explicitly allowed via env and not in production
            const allowDemo = import.meta.env.VITE_ALLOW_DEMO_MODE === 'true'
            const isProd = import.meta.env.MODE === 'production'
            if (allowDemo && !isProd) {
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
            } else {
              toast.error('No se pudo obtener el token de Microsoft. Vuelve a iniciar sesión.')
              navigate('/login')
            }
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
