import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthHandler() {
  const { loginWithBotToken, isBotLoggingIn, isAuthenticated, isRestoring } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const hasProcessed = useRef(false)

  useEffect(() => {
    const botToken = searchParams.get('token')
    
    // Already authenticated + has token in URL → just clean URL and stay
    if (isAuthenticated && botToken) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('token')
      navigate({ pathname: location.pathname, search: newParams.toString() }, { replace: true })
      return
    }
    
    // Wait for auth restoration to finish before processing
    if (!botToken || hasProcessed.current || isBotLoggingIn || isRestoring) return
    
    hasProcessed.current = true
    
    loginWithBotToken(botToken).then((success) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('token')
      
      if (success) {
        const userStr = localStorage.getItem('tgguard_user')
        const user = userStr ? JSON.parse(userStr) : null
        const targetPath = user?.role === 'owner' ? '/owner/dashboard' : '/dashboard'
        navigate({ pathname: targetPath, search: newParams.toString() }, { replace: true })
      } else {
        // Bad token: strip it and stay on current page
        navigate({ pathname: location.pathname, search: newParams.toString() }, { replace: true })
      }
    })
  }, [searchParams, loginWithBotToken, navigate, isBotLoggingIn, isAuthenticated, isRestoring, location.pathname])

  return null
}
