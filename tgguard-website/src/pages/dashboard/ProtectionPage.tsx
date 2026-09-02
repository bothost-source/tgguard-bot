import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Link, MessageSquare, Image, Lock, AlertTriangle, Zap, Save } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'
import Skeleton from '../../components/Skeleton'

interface ProtectionSettings {
  antiSpam: { enabled: boolean; sensitivity: string; action: string }
  antiLink: { enabled: boolean; mode: string; action: string; approvedDomains: string }
  wordFilter: { enabled: boolean; action: string; words: { id: string; word: string; action: string; enabled: boolean }[] }
  mediaControls: { photos: string; videos: string; stickers: string; docs: string }
  lockdown: { enabled: boolean }
}

const features = [
  { key: 'antiSpam', icon: Shield, name: 'Anti-Spam', desc: 'Detect rapid or repetitive messaging' },
  { key: 'antiLink', icon: Link, name: 'Anti-Link', desc: 'Block or filter links in messages' },
  { key: 'wordFilter', icon: MessageSquare, name: 'Word Filter', desc: 'Filter banned words and phrases' },
  { key: 'mediaControl', icon: Image, name: 'Media Controls', desc: 'Control photos, videos, stickers' },
  { key: 'lockdown', icon: Zap, name: 'Lockdown', desc: 'Emergency restriction mode' },
]

export default function ProtectionPage() {
  const { selectedGroup } = useGroup()
  const [settings, setSettings] = useState<ProtectionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    api.get(`/groups/${selectedGroup.id}/protection`)
      .then(r => setSettings(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load protection settings'))
      .finally(() => setLoading(false))
  }, [selectedGroup])

  const toggleFeature = (key: string) => {
    if (!settings) return
    setSettings(prev => {
      if (!prev) return prev
      const updated = { ...prev }
      if (key === 'antiSpam') updated.antiSpam = { ...updated.antiSpam, enabled: !updated.antiSpam.enabled }
      else if (key === 'antiLink') updated.antiLink = { ...updated.antiLink, enabled: !updated.antiLink.enabled }
      else if (key === 'wordFilter') updated.wordFilter = { ...updated.wordFilter, enabled: !updated.wordFilter.enabled }
      else if (key === 'lockdown') updated.lockdown = { ...updated.lockdown, enabled: !updated.lockdown.enabled }
      return updated
    })
  }

  const handleSave = async () => {
    if (!selectedGroup || !settings) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.put(`/groups/${selectedGroup.id}/protection`, settings)
      setSuccess('Protection settings saved')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedGroup) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-white/40">Select a group to configure protection</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Protection</h1>
          <p className="text-white/40 text-sm mt-1">Configure protection for {selectedGroup.name}</p>
        </div>
        <GlassButton variant="primary" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />Save Changes
        </GlassButton>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="glass p-4 border-green-500/20 bg-green-500/5"><p className="text-sm text-green-400">{success}</p></div>}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          features.map((feature, i) => {
            const enabled = settings ? (settings as any)[feature.key]?.enabled : false
            return (
              <AnimatedCard key={feature.key} delay={i * 0.05} className="!p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-white/[0.08]' : 'bg-white/[0.03]'}`}>
                      <feature.icon className={`w-5 h-5 ${enabled ? 'text-white' : 'text-white/30'}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{feature.name}</h3>
                      <p className="text-xs text-white/30">{feature.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleFeature(feature.key)} className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-white' : 'bg-white/10'}`}>
                    <div className={`w-5 h-5 rounded-full bg-black absolute top-0.5 transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </AnimatedCard>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
