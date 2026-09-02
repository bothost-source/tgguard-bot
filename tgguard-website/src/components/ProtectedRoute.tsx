import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ReactNode } from 'react'

interface Props { children: ReactNode; allowedRoles?: string[] }
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!allowedRoles || allowedRoles.length === 0) return <>{children}</>
  if (!allowedRoles.includes(user!.role)) {
    return <Navigate to={user!.role === 'owner' ? '/owner/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}
 
