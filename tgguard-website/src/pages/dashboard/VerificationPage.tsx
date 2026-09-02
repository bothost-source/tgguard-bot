import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Clock, UserX, Shield, Save } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'
import Skeleton from '../../components/Skeleton'

interface VerificationSettings {
  enabled: boolean
  timeout: number
  timeoutAction: string
}

export default function VerificationPage() {
  const { selectedGroup } = useGroup()
  const [settings, setSettings] = useState<VerificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    api.get(`/groups/${selectedGroup.id}/verification`)
      .then(r => setSettings(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load verification settings'))
      .finally(() => setLoading(false))
  }, [selectedGroup])

  const handleSave = async () => {
    if (!selectedGroup || !settings) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await api.put(`/groups/${selectedGroup.id}/verification`, settings)
      setSuccess('Verification settings saved')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (!selectedGroup) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-white/40">Select a group first</p></div>
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verification</h1>
          <p className="text-white/40 text-sm mt-1">Configure new member verification</p>
        </div>
        <GlassButton variant="primary" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />Save
        </GlassButton>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="glass p-4 border-green-500/20 bg-green-500/5"><p className="text-sm text-green-400">{success}</p></div>}

      <AnimatedCard className="!p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings?.enabled ? 'bg-white/[0.08]' : 'bg-white/[0.03]'}`}>
              <Shield className={`w-5 h-5 ${settings?.enabled ? 'text-white' : 'text-white/30'}`} />
            </div>
            <div>
              <h3 className="text-white font-medium">Enable Verification</h3>
              <p className="text-xs text-white/30">Require new members to verify before participating</p>
            </div>
          </div>
          <button onClick={() => setSettings(prev => prev ? { ...prev, enabled: !prev.enabled } : prev)} className={`w-12 h-6 rounded-full transition-colors relative ${settings?.enabled ? 'bg-white' : 'bg-white/10'}`}>
            <div className={`w-5 h-5 rounded-full bg-black absolute top-0.5 transition-transform ${settings?.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </AnimatedCard>

      {settings?.enabled && (
        <>
          <AnimatedCard>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">Verification Timeout</span>
            </div>
            <div className="flex items-center gap-4">
              <input type="range" min="60" max="3600" step="60" value={settings.timeout} onChange={(e) => setSettings(prev => prev ? { ...prev, timeout: parseInt(e.target.value) } : prev)} className="flex-1 accent-white" />
              <span className="text-sm text-white font-mono w-20 text-right">{Math.floor(settings.timeout / 60)}m</span>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <div className="flex items-center gap-2 mb-4">
              <UserX className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">Timeout Action</span>
            </div>
            <div className="space-y-2">
              {[
                { value: 'remove', label: 'Remove user from group', desc: 'Kick the user if they dont verify in time' },
                { value: 'restrict', label: 'Keep restricted', desc: 'Keep the user restricted until they verify' },
                { value: 'notify', label: 'Notify moderators', desc: 'Send a notification to group moderators' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setSettings(prev => prev ? { ...prev, timeoutAction: opt.value } : prev)} className={`w-full text-left p-4 rounded-xl border transition-all ${settings.timeoutAction === opt.value ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.04] hover:border-white/[0.08]'}`}>
                  <p className="text-sm text-white font-medium">{opt.label}</p>
                  <p className="text-xs text-white/30 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </AnimatedCard>
        </>
      )}
    </motion.div>
  )
}
