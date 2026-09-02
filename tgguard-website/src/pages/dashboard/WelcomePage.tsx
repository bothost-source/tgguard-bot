import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Type, Image, Video, Eye, Save } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'
import Skeleton from '../../components/Skeleton'

interface WelcomeSettings {
  enabled: boolean
  mode: 'default' | 'custom'
  customText: string
  buttons: string[]
  cleanup: boolean
  cleanupTime: number
}

export default function WelcomePage() {
  const { selectedGroup } = useGroup()
  const [settings, setSettings] = useState<WelcomeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!selectedGroup) { setLoading(false); return }
    setLoading(true)
    api.get(`/groups/${selectedGroup.id}/welcome`)
      .then(r => setSettings(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load welcome settings'))
      .finally(() => setLoading(false))
  }, [selectedGroup])

  const handleSave = async () => {
    if (!selectedGroup || !settings) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await api.put(`/groups/${selectedGroup.id}/welcome`, settings)
      setSuccess('Welcome settings saved')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const getPreviewText = () => {
    if (!settings?.customText || !selectedGroup) return 'Welcome to the group!'
    return settings.customText
      .replace(/{group_name}/g, selectedGroup.name)
      .replace(/{user}/g, '@new_member')
      .replace(/{username}/g, 'new_member')
      .replace(/{user_id}/g, '123456789')
  }

  if (!selectedGroup) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-white/40">Select a group first</p></div>
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Messages</h1>
          <p className="text-white/40 text-sm mt-1">Configure how new members are greeted</p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="secondary" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4" />{showPreview ? 'Hide' : 'Preview'}
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />Save
          </GlassButton>
        </div>
      </div>

      {error && <div className="glass p-4 border-red-500/20 bg-red-500/5"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="glass p-4 border-green-500/20 bg-green-500/5"><p className="text-sm text-green-400">{success}</p></div>}

      {showPreview && settings?.enabled && (
        <AnimatedCard className="!p-5 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Preview</span>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{getPreviewText()}</p>
          </div>
        </AnimatedCard>
      )}

      <AnimatedCard className="!p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-white/40" />
            <span className="text-white font-medium">Enable Welcome Messages</span>
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
              <Type className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">Message Content</span>
            </div>
            <textarea
              value={settings.customText}
              onChange={(e) => setSettings(prev => prev ? { ...prev, customText: e.target.value } : prev)}
              rows={6}
              className="input-field resize-none font-mono text-sm"
              placeholder="Enter welcome message..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['{group_name}', '{user}', '{username}', '{user_id}'].map((p) => (
                <button key={p} onClick={() => setSettings(prev => prev ? { ...prev, customText: prev.customText + ' ' + p } : prev)} className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors font-mono">{p}</button>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <h3 className="text-sm font-medium text-white mb-4">Media Options</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Type, label: 'Text Only' },
                { icon: Image, label: 'Image + Text' },
                { icon: Video, label: 'Video + Text' },
              ].map((opt) => (
                <button key={opt.label} className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/[0.06] transition-colors">
                  <opt.icon className="w-5 h-5 text-white/40" />
                  <span className="text-xs text-white/40">{opt.label}</span>
                </button>
              ))}
            </div>
          </AnimatedCard>
        </>
      )}
    </motion.div>
  )
}
