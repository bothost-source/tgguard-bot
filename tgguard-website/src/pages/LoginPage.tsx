import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Shield, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GlassButton from '../components/GlassButton'

export default function LoginPage() {
  const { login, user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('tgguard_token', token)
      window.location.href = '/dashboard'
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-tgg-dark relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to TGGuard</h1>
            <p className="text-white/50">Sign in to manage your Telegram communities</p>
          </div>

          <div className="space-y-4">
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={login}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              Continue with Telegram
            </GlassButton>

            <p className="text-center text-xs text-white/30 mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              <br />
              We never post to your groups without permission.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
