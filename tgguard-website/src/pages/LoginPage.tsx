import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Shield, MessageCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GlassButton from '../components/GlassButton'

export default function LoginPage() {
  const { login, user, isLoading, refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    if (error) console.error('Login error:', error)
    if (token) {
      localStorage.setItem('tgguard_token', token)
      refreshUser().then(() => navigate('/dashboard', { replace: true }))
    }
  }, [searchParams, refreshUser, navigate])

  useEffect(() => {
    if (user && !isLoading) {
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/dashboard', { replace: true })
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-3xl" />
      </div>
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors z-20">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </Link>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-strong p-8 md:p-10">
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-black" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to TGGuard</h1>
            <p className="text-white/40 text-sm">Sign in to manage your Telegram communities</p>
          </div>
          <div className="space-y-4">
            <GlassButton variant="primary" size="lg" className="w-full justify-center" onClick={login}>
              <MessageCircle className="w-5 h-5" />
              Continue with Telegram
            </GlassButton>
            <p className="text-center text-xs text-white/30 leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
