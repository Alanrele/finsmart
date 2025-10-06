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
          
          // Success - user is authenticated
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
          toast.success('✅ Autenticación exitosa con Microsoft')
          navigate('/dashboard')
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
