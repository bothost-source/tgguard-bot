import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, UserCheck, UserX } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface UserStats {
  total: number
  new: number
  active: number
  inactive: number
  connected_groups: number
  removed_tgguard: number
}

export default function OwnerUsers() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d')
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/owner/users?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError('Failed to load user statistics')
      }
    } catch (e) {
      setError('Failed to load user statistics')
    } finally {
      setLoading(false)
    }
  }

  // ✅ ADDED: Loading state
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

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <div className="flex gap-2">
          {(['today', '7d', '30d', '90d', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.total ?? 0} color="cyan" delay={0} />
        <StatCard icon={UserPlus} label="New Users" value={stats?.new ?? 0} color="green" delay={0.1} />
        <StatCard icon={UserCheck} label="Active Users" value={stats?.active ?? 0} color="purple" delay={0.2} />
        <StatCard icon={UserX} label="Inactive Users" value={stats?.inactive ?? 0} color="red" delay={0.3} />
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4">User Activity</h3>
        <div className="space-y-3">
          {[
            { label: 'Users who connected groups', value: stats?.connected_groups ?? 0 },
            { label: 'Users who removed TGGuard', value: stats?.removed_tgguard ?? 0 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-sm text-white/70">{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </AnimatedCard>
    </motion.div>
  )
}
