import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthHandler() {
  const { loginWithBotToken, isBotLoggingIn } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const hasProcessed = useRef(false)

  useEffect(() => {
    const botToken = searchParams.get('token')
    
    if (!botToken || hasProcessed.current || isBotLoggingIn) return
    
    hasProcessed.current = true
    
    loginWithBotToken(botToken).then((success) => {
      if (success) {
        const userStr = localStorage.getItem('tgguard_user')
        const user = userStr ? JSON.parse(userStr) : null
        if (user?.role === 'owner') {
          navigate('/owner/dashboard', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        navigate('/login?error=invalid_token', { replace: true })
      }
    })
  }, [searchParams, loginWithBotToken, navigate, isBotLoggingIn])

  return null
}
