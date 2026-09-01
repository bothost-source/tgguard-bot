import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UsersRound, Gamepad2, Star,
  Activity, Server, AlertTriangle
} from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface PlatformStats {
  total_users: number
  active_users: number
  total_groups: number
  active_groups: number
  total_games_played: number
  total_players: number
  average_rating: number
  uptime: string
}

interface SystemHealth {
  name: string
  status: string
  uptime: string
  healthy: boolean
}

export default function OwnerOverview() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [health, setHealth] = useState<SystemHealth[]>([])
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
      const [statsRes, healthRes] = await Promise.all([
        fetch('/api/owner/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/owner/health', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (healthRes.ok) setHealth(await healthRes.json())
    } catch (e) {
      setError('Failed to load platform data')
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

      <h1 className="text-3xl font-bold text-white">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.total_users ?? 0} color="cyan" delay={0} />
        <StatCard icon={UsersRound} label="Active Users" value={stats?.active_users ?? 0} color="green" delay={0.1} />
        <StatCard icon={UsersRound} label="Total Groups" value={stats?.total_groups ?? 0} color="purple" delay={0.2} />
        <StatCard icon={UsersRound} label="Active Groups" value={stats?.active_groups ?? 0} color="blue" delay={0.3} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Gamepad2} label="Games Played" value={stats?.total_games_played ?? 0} color="yellow" delay={0} />
        <StatCard icon={Users} label="Total Players" value={stats?.total_players ?? 0} color="pink" delay={0.1} />
        <StatCard icon={Star} label="Avg Rating" value={stats ? `${stats.average_rating}/5` : '0/5'} color="orange" delay={0.2} />
        <StatCard icon={Activity} label="Uptime" value={stats?.uptime ?? '0%'} color="green" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedCard delay={0.3}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />System Health
          </h3>
          {health.length > 0 ? (
            <div className="space-y-3">
              {health.map((svc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${svc.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-white/70">{svc.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${svc.healthy ? 'text-green-400' : 'text-red-400'}`}>{svc.status}</span>
                    <p className="text-xs text-white/30">{svc.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No health data available</p>
          )}
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />Attention Needed
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-sm text-white/70">Pending Platform Reports</span>
              <span className="text-sm font-bold text-yellow-400">--</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-sm text-white/70">Failed Jobs (24h)</span>
              <span className="text-sm font-bold text-white">--</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-sm text-white/70">Groups Removed TGGuard</span>
              <span className="text-sm font-bold text-white">--</span>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </motion.div>
  )
}
