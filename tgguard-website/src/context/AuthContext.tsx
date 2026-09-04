import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '../lib/api'

export interface User {
  id: string
  telegram_id: string
  username: string
  first_name: string
  role: 'community_admin' | 'owner'
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isBotLoggingIn: boolean
  login: () => void
  loginWithBotToken: (token: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isBotLoggingIn: false,
  login: () => {},
  loginWithBotToken: async () => false,
  logout: () => {},
  refreshUser: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBotLoggingIn, setIsBotLoggingIn] = useState(false)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('tgguard_token')
    if (!token) { setUser(null); setIsLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
    } catch (err) {
      localStorage.removeItem('tgguard_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refreshUser() }, [refreshUser])

  const login = useCallback(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://tgguard-bot.onrender.com/api'
    window.location.href = `${API_URL}/auth/telegram`
  }, [])

  const loginWithBotToken = useCallback(async (botToken: string): Promise<boolean> => {
    setIsBotLoggingIn(true)
    try {
      const { data } = await api.post('/auth/bot-token', { token: botToken })
      localStorage.setItem('tgguard_token', data.token)
      setUser(data.user)
      return true
    } catch (err) {
      console.error('Bot token login failed:', err)
      return false
    } finally {
      setIsBotLoggingIn(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tgguard_token')
    setUser(null)
    window.location.href = '/'
  }, [])

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated: !!user, 
      isBotLoggingIn,
      login, 
      loginWithBotToken, 
      logout, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
