import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, TrendingUp, TrendingDown, MessageSquare, Gamepad2,
  Shield, AlertTriangle
} from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface Props {
  group: { id: string; name: string; member_count: number } | null
}

interface AnalyticsData {
  member_count: number
  new_members: number
  members_left: number
  messages: number
  moderation_events: { label: string; value: number }[]
  game_activity: { name: string; played: number; participants: number }[]
}

export default function AnalyticsPage({ group }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchAnalytics()
  }, [group, period])

  const fetchAnalytics = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${group.id}/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setData(await res.json())
      } else {
        setError('Failed to load analytics')
      }
    } catch (e) {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to view analytics</p>
      </motion.div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Members" value={data?.member_count ?? group.member_count} color="cyan" delay={0} />
        <StatCard icon={TrendingUp} label="New Members" value={data?.new_members ?? 0} color="green" delay={0.1} />
        <StatCard icon={TrendingDown} label="Members Left" value={data?.members_left ?? 0} color="red" delay={0.2} />
        <StatCard icon={MessageSquare} label="Messages" value={data?.messages ?? 0} color="purple" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedCard delay={0.2}>
          <h3 className="text-lg font-bold text-white mb-4">Moderation Events</h3>
          {data?.moderation_events && data.moderation_events.length > 0 ? (
            <div className="space-y-4">
              {data.moderation_events.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No moderation data available</p>
          )}
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <h3 className="text-lg font-bold text-white mb-4">Game Activity</h3>
          {data?.game_activity && data.game_activity.length > 0 ? (
            <div className="space-y-3">
              {data.game_activity.map((game, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-white">{game.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span>{game.played} played</span>
                    <span>{game.participants} players</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No game activity data available</p>
          )}
        </AnimatedCard>
      </div>
    </motion.div>
  )
}
