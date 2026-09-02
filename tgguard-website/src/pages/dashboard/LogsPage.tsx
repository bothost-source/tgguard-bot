import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Filter, Activity } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import Skeleton from '../../components/Skeleton'

interface Log {
  id: string
  time: string
  user: string
  action: string
  reason: string
  type: 'auto' | 'manual'
}

export default function LogsPage() {
  const { selectedGroup } = useGroup()
  const [logs, setLogs] = useState<Log[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    api.get(`/groups/${selectedGroup.id}/logs?limit=50`)
      .then(r => setLogs(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load logs'))
      .finally(() => setLoading(false))
  }, [selectedGroup])

  const filtered = logs.filter(l => filter === 'all' || l.type === filter)

  if (!selectedGroup) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-white/40">Select a group first</p></div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Moderation Logs</h1>
          <p className="text-white/40 text-sm mt-1">History of all moderation actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/30" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field w-32 py-2">
            <option value="all" className="bg-background">All</option>
            <option value="auto" className="bg-background">Auto</option>
            <option value="manual" className="bg-background">Manual</option>
          </select>
        </div>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <ScrollText className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No logs yet</p>
        </div>
      ) : (
        <AnimatedCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Time</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">User</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Action</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Reason</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-xs text-white/30 font-mono">{log.time}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{log.user}</td>
                    <td className="py-3 px-4 text-sm text-white">{log.action}</td>
                    <td className="py-3 px-4 text-xs text-white/40">{log.reason}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${log.type === 'auto' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      )}
    </motion.div>
  )
}
