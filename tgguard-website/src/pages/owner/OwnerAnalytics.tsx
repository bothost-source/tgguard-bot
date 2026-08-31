import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, Gamepad2 } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface PlatformAnalytics {
  daily_active_users: number
  games_per_day: number
  messages_processed: number
  moderation_actions: number
  weekly_activity: number[]
  top_groups: { name: string; members: number; activity: number }[]
}

export default function OwnerAnalytics() {
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/owner/analytics', {
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <h1 className="text-3xl font-bold text-white">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Daily Active Users" value={data?.daily_active_users ?? 0} color="cyan" delay={0} />
        <StatCard icon={Gamepad2} label="Games Per Day" value={data?.games_per_day ?? 0} color="green" delay={0.1} />
        <StatCard icon={BarChart3} label="Messages Processed" value={data?.messages_processed ?? 0} color="purple" delay={0.2} />
        <StatCard icon={BarChart3} label="Moderation Actions" value={data?.moderation_actions ?? 0} color="yellow" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedCard delay={0.2}>
          <h3 className="text-lg font-bold text-white mb-4">Weekly Activity</h3>
          {data?.weekly_activity && data.weekly_activity.length > 0 ? (
            <div className="flex items-end gap-2 h-48">
              {data.weekly_activity.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(h, 100)}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/50 to-cyan-400" />
                  <span className="text-xs text-white/40">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No weekly activity data</p>
          )}
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <h3 className="text-lg font-bold text-white mb-4">Top Performing Groups</h3>
          {data?.top_groups && data.top_groups.length > 0 ? (
            <div className="space-y-3">
              {data.top_groups.map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <span className="text-lg font-bold text-white/30 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{g.name}</p>
                    <p className="text-xs text-white/40">{g.members.toLocaleString()} members</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{g.activity}%</p>
                    <p className="text-xs text-white/40">activity</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No group data available</p>
          )}
        </AnimatedCard>
      </div>
    </motion.div>
  )
}
