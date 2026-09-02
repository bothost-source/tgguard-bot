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
  login: () => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/telegram`
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tgguard_token')
    setUser(null)
    window.location.href = '/'
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
