import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_URL = (import.meta as any).env.VITE_API_URL || '/api'

interface User {
  id: string
  telegram_id: string
  username: string
  first_name: string
  role: 'community_admin' | 'owner'
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: () => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tgguard_token')
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => setUser(data))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = () => {
    window.location.href = `${API_URL}/auth/telegram`
  }

  const logout = () => {
    localStorage.removeItem('tgguard_token')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
