import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Users, AlertTriangle, Trash2, Clock, Lock,
  MessageSquare, Link2
} from 'lucide-react'
import StatCard from '../../components/StatCard'
import ToggleSwitch from '../../components/ToggleSwitch'
import AnimatedCard from '../../components/AnimatedCard'

interface Props {
  group: { id: string; name: string; chat_id: string; member_count: number; is_active: boolean } | null
}

interface DashboardStats {
  member_count: number
  warnings_today: number
  deleted_messages_today: number
  pending_reports: number
}

interface ActivityLog {
  id: string
  time: string
  user: string
  action: string
  reason: string
}

export default function OverviewPage({ group }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [settings, setSettings] = useState({
    protection: true,
    verification: true,
    antiSpam: true,
    antiLink: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchDashboardData()
  }, [group])

  const fetchDashboardData = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/groups/${group.id}/logs?limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (logsRes.ok) setLogs(await logsRes.json())
    } catch (e) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    if (!group) return
    setSettings(prev => ({ ...prev, [key]: value }))
    try {
      await fetch(`/api/groups/${group.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      })
    } catch (e) {
      console.error('Failed to update setting:', e)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-white/30" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-white/50">Add a Telegram group to get started with TGGuard</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">TGGuard Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${group.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-white/50">{group.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">Protection:</span>
          <span className={`text-sm font-semibold ${group.is_active ? 'text-green-400' : 'text-red-400'}`}>
            {group.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Members" value={stats?.member_count ?? group.member_count} color="cyan" delay={0} />
            <StatCard icon={AlertTriangle} label="Warnings Today" value={stats?.warnings_today ?? 0} color="yellow" delay={0.1} />
            <StatCard icon={Trash2} label="Deleted Messages" value={stats?.deleted_messages_today ?? 0} color="red" delay={0.2} />
            <StatCard icon={Clock} label="Pending Reports" value={stats?.pending_reports ?? 0} color="purple" delay={0.3} />
          </div>

          <AnimatedCard>
            <h3 className="text-lg font-bold text-white mb-4">Quick Controls</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Protection</p>
                    <p className="text-xs text-white/40">All moderation features</p>
                  </div>
                </div>
                <ToggleSwitch checked={settings.protection} onChange={(v) => updateSetting('protection', v)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Verification</p>
                    <p className="text-xs text-white/40">New member challenges</p>
                  </div>
                </div>
                <ToggleSwitch checked={settings.verification} onChange={(v) => updateSetting('verification', v)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Anti-Spam</p>
                    <p className="text-xs text-white/40">Spam detection & removal</p>
                  </div>
                </div>
                <ToggleSwitch checked={settings.antiSpam} onChange={(v) => updateSetting('antiSpam', v)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Anti-Link</p>
                    <p className="text-xs text-white/40">Link filtering</p>
                  </div>
                </div>
                <ToggleSwitch checked={settings.antiLink} onChange={(v) => updateSetting('antiLink', v)} />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                  >
                    <span className="text-xs text-white/30 font-mono w-12">{log.time}</span>
                    <span className="text-sm text-white/70 w-28">{log.user}</span>
                    <span className="text-sm text-white font-medium flex-1">{log.action}</span>
                    <span className="text-xs text-white/40">{log.reason}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </>
      )}
    </motion.div>
  )
}
