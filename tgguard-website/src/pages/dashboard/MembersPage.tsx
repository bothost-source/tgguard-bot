import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Shield, Warning, UserX, Ban } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface Member {
  id: string
  username: string
  firstName: string
  warnings: number
  isAdmin: boolean
  joinedAt: string
  status: 'active' | 'restricted' | 'banned'
}

export default function MembersPage({ group }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchMembers()
  }, [group])

  const fetchMembers = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setMembers(await res.json())
      } else {
        setError('Failed to load members')
      }
    } catch (e) {
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.firstName.toLowerCase().includes(search.toLowerCase())
  )

  const handleWarn = async (id: string) => {
    if (!group) return
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${id}/warn`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) fetchMembers()
    } catch (e) {
      console.error('Failed to warn member:', e)
    }
  }

  const handleClear = async (id: string) => {
    if (!group) return
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${id}/clear-warnings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) fetchMembers()
    } catch (e) {
      console.error('Failed to clear warnings:', e)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to view members</p>
      </motion.div>
    )
  }

  if (loading && members.length === 0) {
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
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 w-64" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((member, i) => (
          <AnimatedCard key={member.id} delay={i * 0.03} className="!p-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.isAdmin ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                <span className="text-sm font-bold text-white">{member.firstName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{member.username}</p>
                  {member.isAdmin && <Shield className="w-3 h-3 text-cyan-400" />}
                  {member.status === 'restricted' && <UserX className="w-3 h-3 text-yellow-400" />}
                  {member.status === 'banned' && <Ban className="w-3 h-3 text-red-400" />}
                </div>
                <p className="text-xs text-white/40">Joined {member.joinedAt}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{member.warnings}</p>
                  <p className="text-xs text-white/40">Warnings</p>
                </div>
                {!member.isAdmin && (
                  <div className="flex gap-2">
                    <GlassButton variant="ghost" size="sm" onClick={() => handleWarn(member.id)}>
                      <Warning className="w-3 h-3 mr-1" />Warn
                    </GlassButton>
                    <GlassButton variant="ghost" size="sm" onClick={() => handleClear(member.id)}>
                      Clear
                    </GlassButton>
                  </div>
                )}
              </div>
            </div>
          </AnimatedCard>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No members found</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
