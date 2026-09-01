import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, Trash2, AlertTriangle, Lock, Shield, Link2, Type, Ban } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'

interface Props {
  group: { id: string; name: string } | null
}

interface LogEntry {
  id: string
  time: string
  user: string
  action: string
  reason: string
  type: 'delete' | 'warn' | 'restrict' | 'ban' | 'filter' | 'link' | 'spam'
}

const typeIcons: Record<string, any> = {
  delete: Trash2, warn: AlertTriangle, restrict: Lock, ban: Ban, filter: Type, link: Link2, spam: Shield,
}

const typeColors: Record<string, string> = {
  delete: 'text-red-400', warn: 'text-yellow-400', restrict: 'text-purple-400',
  ban: 'text-red-500', filter: 'text-orange-400', link: 'text-cyan-400', spam: 'text-green-400',
}

export default function LogsPage({ group }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchLogs()
  }, [group])

  const fetchLogs = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${group.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setLogs(await res.json())
      } else {
        setError('Failed to load moderation logs')
      }
    } catch (e) {
      setError('Failed to load moderation logs')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter)

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to view moderation logs</p>
      </motion.div>
    )
  }

  if (loading && logs.length === 0) {
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
        <h1 className="text-2xl font-bold text-white">Moderation Logs</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/30" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500">
            <option value="all" className="bg-tgg-card">All Actions</option>
            <option value="delete" className="bg-tgg-card">Deleted Messages</option>
            <option value="warn" className="bg-tgg-card">Warnings</option>
            <option value="restrict" className="bg-tgg-card">Restrictions</option>
            <option value="ban" className="bg-tgg-card">Bans</option>
            <option value="filter" className="bg-tgg-card">Word Filter</option>
            <option value="link" className="bg-tgg-card">Anti-Link</option>
            <option value="spam" className="bg-tgg-card">Anti-Spam</option>
          </select>
        </div>
      </div>

      <AnimatedCard>
        {filtered.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">No moderation logs found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const Icon = typeIcons[log.type] || Shield
              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <span className="text-xs text-white/30 font-mono w-12">{log.time}</span>
                  <Icon className={`w-4 h-4 ${typeColors[log.type] || 'text-white/50'}`} />
                  <span className="text-sm text-white/70 w-28">{log.user}</span>
                  <span className="text-sm text-white font-medium flex-1">{log.action}</span>
                  <span className="text-xs text-white/40">{log.reason}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
