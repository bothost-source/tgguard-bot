import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, AlertTriangle, UserX, ShieldCheck, X } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface Report {
  id: string
  reportedUser: string
  reportedBy: string
  reason: string
  messagePreview: string
  status: 'pending' | 'resolved' | 'dismissed'
  timestamp: string
}

const reasonColors: Record<string, string> = {
  'Spam': 'bg-yellow-500/20 text-yellow-400',
  'Harassment': 'bg-red-500/20 text-red-400',
  'Scam/suspicious content': 'bg-purple-500/20 text-purple-400',
  'Unwanted advertising': 'bg-orange-500/20 text-orange-400',
  'Other': 'bg-white/10 text-white/50',
}

export default function ReportsPage({ group }: Props) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchReports()
  }, [group])

  const fetchReports = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${group.id}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setReports(await res.json())
      } else {
        setError('Failed to load reports')
      }
    } catch (e) {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  const handleAction = async (id: string, action: string) => {
    if (!group) return
    try {
      const res = await fetch(`/api/groups/${group.id}/reports/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === id
          ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' }
          : r
        ))
      }
    } catch (e) {
      console.error('Failed to process report:', e)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to view reports</p>
      </motion.div>
    )
  }

  if (loading && reports.length === 0) {
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
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-2">
          {(['all', 'pending', 'resolved', 'dismissed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((report, i) => (
          <AnimatedCard key={report.id} delay={i * 0.05}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${reasonColors[report.reason] || 'bg-white/10 text-white/50'}`}>
                    {report.reason}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {report.status}
                  </span>
                  <span className="text-xs text-white/30">{report.timestamp}</span>
                </div>
                <p className="text-sm text-white/70 mb-1">
                  <span className="text-white/50">Reported:</span> <span className="text-white font-medium">{report.reportedUser}</span>
                  <span className="text-white/50 mx-2">by</span>
                  <span className="text-white font-medium">{report.reportedBy}</span>
                </p>
                <div className="p-3 rounded-xl bg-white/5 mt-2">
                  <p className="text-sm text-white/50 italic">"{report.messagePreview}"</p>
                </div>
              </div>
            </div>

            {report.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <GlassButton variant="ghost" size="sm" onClick={() => handleAction(report.id, 'view')}>
                  <Eye className="w-4 h-4 mr-1" />View
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => handleAction(report.id, 'warn')}>
                  <AlertTriangle className="w-4 h-4 mr-1" />Warn
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => handleAction(report.id, 'restrict')}>
                  <UserX className="w-4 h-4 mr-1" />Restrict
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => handleAction(report.id, 'remove')}>
                  <UserX className="w-4 h-4 mr-1" />Remove
                </GlassButton>
                <GlassButton variant="ghost" size="sm" className="ml-auto" onClick={() => handleAction(report.id, 'dismiss')}>
                  <X className="w-4 h-4 mr-1" />Dismiss
                </GlassButton>
              </div>
            )}
          </AnimatedCard>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12">
            <ShieldCheck className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No {filter !== 'all' ? filter : ''} reports found</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
