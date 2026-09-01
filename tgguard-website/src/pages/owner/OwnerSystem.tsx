import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'

interface SystemHealth {
  name: string
  status: string
  uptime: string
  healthy: boolean
}

interface SystemError {
  time: string
  message: string
  severity: 'error' | 'warning'
}

export default function OwnerSystem() {
  const [health, setHealth] = useState<SystemHealth[]>([])
  const [errors, setErrors] = useState<SystemError[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [healthRes, errorsRes] = await Promise.all([
        fetch('/api/owner/health', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/owner/errors', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (healthRes.ok) setHealth(await healthRes.json())
      if (errorsRes.ok) setErrors(await errorsRes.json())
    } catch (e) {
      setError('Failed to load system data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && health.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <h1 className="text-3xl font-bold text-white">System Health</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {health.length > 0 ? health.map((svc, i) => (
          <AnimatedCard key={i} delay={i * 0.05}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${svc.healthy ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                <div className={`w-2 h-2 rounded-full ${svc.healthy ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{svc.name}</p>
                <p className={`text-xs ${svc.healthy ? 'text-green-400' : 'text-red-400'}`}>{svc.status}</p>
              </div>
            </div>
            <p className="text-xs text-white/40">Uptime: {svc.uptime}</p>
          </AnimatedCard>
        )) : (
          <div className="col-span-full text-center py-8">
            <p className="text-white/40">No health data available</p>
          </div>
        )}
      </div>

      <AnimatedCard delay={0.2}>
        <h3 className="text-lg font-bold text-white mb-4">Recent Errors</h3>
        {errors.length > 0 ? (
          <div className="space-y-3">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${err.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`} />
                <div>
                  <p className="text-xs text-white/30 mb-1">{err.time}</p>
                  <p className="text-sm text-white/70">{err.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No recent errors</p>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
