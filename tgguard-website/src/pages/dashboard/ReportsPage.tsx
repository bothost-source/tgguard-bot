import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import Skeleton from '../../components/Skeleton'

interface Report {
  id: string
  reportedUser: string
  reportedBy: string
  reason: string
  messagePreview: string
  status: 'pending' | 'resolved' | 'dismissed'
  timestamp: string
}

export default function ReportsPage() {
  const { selectedGroup } = useGroup()
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReports = async () => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const { data } = await api.get(`/groups/${selectedGroup.id}/reports`)
      setReports(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [selectedGroup])

  const handleAction = async (reportId: string, action: string) => {
    if (!selectedGroup) return
    setActionLoading(reportId)
    try {
      await api.post(`/groups/${selectedGroup.id}/reports/${reportId}/${action}`)
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' } : r))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process report')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = reports.filter(r => filter === 'all' || r.status === filter)

  if (!selectedGroup) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-white/40">Select a group first</p></div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
          <p className="text-white/40 text-sm mt-1">Manage member reports</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          {reports.filter(r => r.status === 'pending').length} pending
        </span>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="flex gap-2">
        {['all', 'pending', 'resolved', 'dismissed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-white text-black' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <AnimatedCard key={report.id} className="!p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.status === 'pending' ? 'bg-yellow-500/10' : report.status === 'resolved' ? 'bg-green-500/10' : 'bg-white/[0.06]'}`}>
                    {report.status === 'pending' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> : report.status === 'resolved' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-white/30" />}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{report.reason}</p>
                    <p className="text-xs text-white/30">Reported by {report.reportedBy} • {report.reportedUser}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : report.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/[0.06] text-white/30 border border-white/[0.08]'}`}>
                  {report.status}
                </span>
              </div>

              {report.messagePreview && (
                <div className="glass p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/30">Reported message</span>
                  </div>
                  <p className="text-sm text-white/60">{report.messagePreview}</p>
                </div>
              )}

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(report.id, 'warn')} disabled={actionLoading === report.id} className="btn-ghost text-xs">
                    <AlertTriangle className="w-3 h-3" />Warn
                  </button>
                  <button onClick={() => handleAction(report.id, 'restrict')} disabled={actionLoading === report.id} className="btn-ghost text-xs">
                    <Eye className="w-3 h-3" />Restrict
                  </button>
                  <button onClick={() => handleAction(report.id, 'remove')} disabled={actionLoading === report.id} className="btn-ghost text-xs text-red-400/60 hover:text-red-400">
                    <XCircle className="w-3 h-3" />Remove
                  </button>
                  <button onClick={() => handleAction(report.id, 'dismiss')} disabled={actionLoading === report.id} className="btn-ghost text-xs ml-auto">
                    <CheckCircle className="w-3 h-3" />Dismiss
                  </button>
                </div>
              )}
              <p className="text-xs text-white/20 mt-2">{report.timestamp}</p>
            </AnimatedCard>
          ))}
        </div>
      )}
    </motion.div>
  )
}
