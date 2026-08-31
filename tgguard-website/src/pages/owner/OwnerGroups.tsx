import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UsersRound, Shield, Gamepad2, TrendingUp, TrendingDown } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface GroupStats {
  total: number
  active: number
  recently_connected: number
  removed: number
  protection_usage: { name: string; enabled: number; pct: number }[]
  games_enabled: { name: string; count: number }[]
}

export default function OwnerGroups() {
  const [stats, setStats] = useState<GroupStats | null>(null)
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
      const res = await fetch('/api/owner/groups', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError('Failed to load group statistics')
      }
    } catch (e) {
      setError('Failed to load group statistics')
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

      <h1 className="text-3xl font-bold text-white">Groups</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UsersRound} label="Total Groups" value={stats?.total ?? 0} color="cyan" delay={0} />
        <StatCard icon={Shield} label="Active Groups" value={stats?.active ?? 0} color="green" delay={0.1} />
        <StatCard icon={TrendingUp} label="Recently Connected" value={stats?.recently_connected ?? 0} color="purple" delay={0.2} />
        <StatCard icon={TrendingDown} label="Groups Removed" value={stats?.removed ?? 0} color="red" delay={0.3} />
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4">Protection Usage</h3>
        {stats?.protection_usage && stats.protection_usage.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.protection_usage.map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">{item.name}</span>
                  <span className="text-xs text-white/40">{item.enabled.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                </div>
                <p className="text-xs text-white/30 mt-1">{item.pct}% of active groups</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No protection usage data available</p>
        )}
      </AnimatedCard>

      <AnimatedCard delay={0.2}>
        <h3 className="text-lg font-bold text-white mb-4">Games Enabled</h3>
        {stats?.games_enabled && stats.games_enabled.length > 0 ? (
          <div className="grid grid-cols-5 gap-4">
            {stats.games_enabled.map((game, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-lg font-bold text-white">{game.count.toLocaleString()}</p>
                <p className="text-xs text-white/40 mt-1">{game.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No game data available</p>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
