import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, AlertTriangle, Shield, CheckCircle } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import Skeleton from '../../components/Skeleton'

interface Member {
  id: string
  username: string
  firstName: string
  warnings: number
  isAdmin: boolean
  joinedAt: string
  status: string
}

export default function MembersPage() {
  const { selectedGroup } = useGroup()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    api.get(`/groups/${selectedGroup.id}/members`)
      .then(r => setMembers(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load members'))
      .finally(() => setLoading(false))
  }, [selectedGroup])

  const handleWarn = async (memberId: string) => {
    if (!selectedGroup) return
    setActionLoading(memberId)
    try {
      await api.post(`/groups/${selectedGroup.id}/members/${memberId}/warn`, { reason: 'Manual warning from dashboard' })
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, warnings: m.warnings + 1 } : m))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to warn member')
    } finally { setActionLoading(null) }
  }

  const handleClearWarnings = async (memberId: string) => {
    if (!selectedGroup) return
    setActionLoading(memberId)
    try {
      await api.post(`/groups/${selectedGroup.id}/members/${memberId}/clear-warnings`)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, warnings: 0 } : m))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clear warnings')
    } finally { setActionLoading(null) }
  }

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.firstName.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedGroup) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-white/40">Select a group first</p></div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Members</h1>
          <p className="text-white/40 text-sm mt-1">Manage group members</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Users className="w-4 h-4" />
          <span>{members.length} members</span>
        </div>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No members found</p>
        </div>
      ) : (
        <AnimatedCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Member</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Warnings</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Joined</th>
                  <th className="text-left text-xs text-white/30 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <span className="text-xs font-medium text-white/60">{member.firstName[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white">{member.firstName}</p>
                          <p className="text-xs text-white/30">{member.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className={`w-4 h-4 ${member.warnings > 0 ? 'text-yellow-400' : 'text-white/10'}`} />
                        <span className="text-sm text-white/60">{member.warnings}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${member.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-white/30">{member.joinedAt}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => handleWarn(member.id)} disabled={actionLoading === member.id} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Warn">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400/60" />
                        </button>
                        <button onClick={() => handleClearWarnings(member.id)} disabled={actionLoading === member.id} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Clear Warnings">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400/60" />
                        </button>
                      </div>
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
