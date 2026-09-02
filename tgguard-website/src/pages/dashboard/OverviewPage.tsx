import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, AlertTriangle, MessageSquare, Activity, Group } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import Skeleton from '../../components/Skeleton'

interface Stats {
  member_count: number
  warnings_today: number
  deleted_messages_today: number
  pending_reports: number
  bot_is_admin: boolean
  is_active: boolean
}

interface Log {
  id: string
  time: string
  user: string
  action: string
  reason: string
}

export default function OverviewPage() {
  const { selectedGroup } = useGroup()
  const [stats, setStats] = useState<Stats | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/groups/${selectedGroup.id}/stats`).then(r => setStats(r.data)),
      api.get(`/groups/${selectedGroup.id}/logs?limit=5`).then(r => setLogs(r.data)),
    ]).catch((err) => {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    }).finally(() => setLoading(false))
  }, [selectedGroup])

  if (!selectedGroup) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">No group selected. Add a Telegram group to get started.</p>
        </div>
      </div>
    )
  }

  const statCards = [
    { icon: Users, label: 'Members', value: stats?.member_count ?? 0, suffix: '' },
    { icon: Shield, label: 'Protection', value: stats?.is_active ? 'Active' : 'Inactive', suffix: '', isStatus: true },
    { icon: AlertTriangle, label: 'Warnings Today', value: stats?.warnings_today ?? 0, suffix: '' },
    { icon: MessageSquare, label: 'Deleted Today', value: stats?.deleted_messages_today ?? 0, suffix: '' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/[0.06] flex-shrink-0">
          {selectedGroup.avatar_url ? (
            <img src={selectedGroup.avatar_url} alt={selectedGroup.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Group className="w-6 h-6 text-white/30" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Overview of {selectedGroup.name}</p>
        </div>
      </div>

      {error && (
        <div className="glass p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          statCards.map((stat, i) => (
            <AnimatedCard key={stat.label} delay={i * 0.05} className="!p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-white/60" />
                </div>
                <span className="text-xs text-white/30 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${stat.isStatus && stats?.is_active ? 'text-green-400' : 'text-white'}`}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </p>
            </AnimatedCard>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <AnimatedCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <span className="text-xs text-white/30 font-mono">Today</span>
          </div>
          {loading ? (
            <Skeleton className="h-48" />
          ) : logs.length === 0 ? (
            <div className="py-8 text-center">
              <Activity className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/30">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-white/30 font-mono w-12">{log.time}</span>
                  <span className="text-sm text-white/60 w-24 truncate">{log.user}</span>
                  <span className="text-sm text-white flex-1">{log.action}</span>
                  <span className="text-xs text-white/30">{log.reason}</span>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>

        <AnimatedCard>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { icon: Shield, label: 'Protection', desc: 'Configure anti-spam and filters', color: 'text-cyan-400' },
              { icon: MessageSquare, label: 'Welcome', desc: 'Set up welcome messages', color: 'text-green-400' },
              { icon: AlertTriangle, label: 'Reports', desc: 'Review member reports', color: 'text-yellow-400' },
            ].map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
                <div className={`w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-white/80">{action.label}</p>
                  <p className="text-xs text-white/30">{action.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </motion.div>
  )
}
