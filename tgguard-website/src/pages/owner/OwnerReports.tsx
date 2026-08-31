import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface ReportStats {
  total: number
  pending: number
  resolved: number
  dismissed: number
  reasons: { reason: string; count: number }[]
}

export default function OwnerReports() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/owner/reports', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError('Failed to load report statistics')
      }
    } catch (e) {
      setError('Failed to load report statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <h1 className="text-3xl font-bold text-white">Reports</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Total Reports" value={stats?.total ?? 0} color="yellow" delay={0} />
        <StatCard icon={AlertTriangle} label="Pending" value={stats?.pending ?? 0} color="orange" delay={0.1} />
        <StatCard icon={ShieldCheck} label="Resolved" value={stats?.resolved ?? 0} color="green" delay={0.2} />
        <StatCard icon={AlertTriangle} label="Dismissed" value={stats?.dismissed ?? 0} color="red" delay={0.3} />
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4">Report Reasons</h3>
        {stats?.reasons && stats.reasons.length > 0 ? (
          <div className="space-y-3">
            {stats.reasons.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-sm text-white/70 flex-1">{item.reason}</span>
                <span className="text-sm font-bold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No report data available</p>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
