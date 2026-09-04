import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// This component checks for bot-generated tokens in the URL and auto-logs in
export default function AuthHandler() {
  const { loginWithBotToken } = useAuth()  // ─── FIXED: removed unused `refreshUser` ───
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const botToken = searchParams.get('token')
    if (botToken) {
      loginWithBotToken(botToken).then((success) => {
        if (success) {
          // Remove token from URL and go to dashboard
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/?error=invalid_token', { replace: true })
        }
      })
    }
  }, [searchParams, loginWithBotToken, navigate])

  return null
}
