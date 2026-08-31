import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, MessageSquare, Link2, Type, Image, Lock, Ban, AlertTriangle
} from 'lucide-react'
import ToggleSwitch from '../../components/ToggleSwitch'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface ProtectionSettings {
  antiSpam: { enabled: boolean; sensitivity: string; action: string }
  antiLink: { enabled: boolean; mode: string; action: string; approvedDomains: string }
  wordFilter: { enabled: boolean; action: string; words: string }
  mediaControls: { photos: string; videos: string; stickers: string; docs: string }
  lockdown: { enabled: boolean }
}

export default function ProtectionPage({ group }: Props) {
  const [settings, setSettings] = useState<ProtectionSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchSettings()
  }, [group])

  const fetchSettings = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${group.id}/protection`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else {
        setError('Failed to load protection settings')
      }
    } catch (e) {
      setError('Failed to load protection settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!group || !settings) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/groups/${group.id}/protection`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to save settings')
      }
    } catch (e) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, subKey: string, value: any) => {
    if (!settings) return
    setSettings(prev => prev ? {
      ...prev,
      [key]: { ...prev[key as keyof ProtectionSettings], [subKey]: value }
    } : null)
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to configure protection</p>
      </motion.div>
    )
  }

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/50">Failed to load settings. <button onClick={fetchSettings} className="text-cyan-400 underline">Retry</button></p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Protection Settings</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>

      {/* Anti-Spam */}
      <AnimatedCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Anti-Spam</h3>
              <p className="text-sm text-white/50">Automatically detect and handle spam messages</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.antiSpam.enabled} onChange={(v) => updateSetting('antiSpam', 'enabled', v)} />
        </div>
        {settings.antiSpam.enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 pt-4 border-t border-white/5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Sensitivity</label>
                <select value={settings.antiSpam.sensitivity} onChange={(e) => updateSetting('antiSpam', 'sensitivity', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="low" className="bg-tgg-card">Low</option>
                  <option value="medium" className="bg-tgg-card">Medium</option>
                  <option value="high" className="bg-tgg-card">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Action</label>
                <select value={settings.antiSpam.action} onChange={(e) => updateSetting('antiSpam', 'action', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="delete" className="bg-tgg-card">Delete message</option>
                  <option value="warn" className="bg-tgg-card">Warn user</option>
                  <option value="restrict" className="bg-tgg-card">Restrict user</option>
                  <option value="remove" className="bg-tgg-card">Remove user</option>
                  <option value="notify" className="bg-tgg-card">Notify moderators</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatedCard>

      {/* Anti-Link */}
      <AnimatedCard delay={0.1}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Anti-Link</h3>
              <p className="text-sm text-white/50">Control links shared in your group</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.antiLink.enabled} onChange={(v) => updateSetting('antiLink', 'enabled', v)} />
        </div>
        {settings.antiLink.enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 pt-4 border-t border-white/5">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Link Mode</label>
              <div className="flex gap-3">
                {['block_all', 'allow_approved'].map((mode) => (
                  <button key={mode} onClick={() => updateSetting('antiLink', 'mode', mode)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      settings.antiLink.mode === mode
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                    }`}>
                    {mode === 'block_all' ? 'Block All Links' : 'Allow Approved Domains'}
                  </button>
                ))}
              </div>
            </div>
            {settings.antiLink.mode === 'allow_approved' && (
              <div>
                <label className="text-sm text-white/70 mb-2 block">Approved Domains (one per line)</label>
                <textarea rows={3} value={settings.antiLink.approvedDomains || ''}
                  onChange={(e) => updateSetting('antiLink', 'approvedDomains', e.target.value)}
                  placeholder="youtube.com
github.com
example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
            )}
            <div>
              <label className="text-sm text-white/70 mb-2 block">Action on Blocked Link</label>
              <select value={settings.antiLink.action} onChange={(e) => updateSetting('antiLink', 'action', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                <option value="delete" className="bg-tgg-card">Delete message</option>
                <option value="delete_warn" className="bg-tgg-card">Delete + Warning (Recommended)</option>
                <option value="delete_restrict" className="bg-tgg-card">Delete + Restrict</option>
                <option value="remove" className="bg-tgg-card">Remove user</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatedCard>

      {/* Word Filter */}
      <AnimatedCard delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Type className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Word Filter</h3>
              <p className="text-sm text-white/50">Filter unwanted words and phrases</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.wordFilter.enabled} onChange={(v) => updateSetting('wordFilter', 'enabled', v)} />
        </div>
        {settings.wordFilter.enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 pt-4 border-t border-white/5">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Filtered Words (one per line)</label>
              <textarea rows={4} value={settings.wordFilter.words || ''}
                onChange={(e) => updateSetting('wordFilter', 'words', e.target.value)}
                placeholder="badword1
badword2
unwanted phrase"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-2 block">Action</label>
              <select value={settings.wordFilter.action} onChange={(e) => updateSetting('wordFilter', 'action', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                <option value="delete" className="bg-tgg-card">Delete message</option>
                <option value="delete_warn" className="bg-tgg-card">Delete + Warning (Recommended)</option>
                <option value="delete_restrict" className="bg-tgg-card">Delete + Restrict</option>
                <option value="remove" className="bg-tgg-card">Remove user</option>
                <option value="ban" className="bg-tgg-card">Ban user</option>
                <option value="delete_notify" className="bg-tgg-card">Delete + Notify moderators</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatedCard>

      {/* Media Controls */}
      <AnimatedCard delay={0.3}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Image className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Media Controls</h3>
              <p className="text-sm text-white/50">Control allowed message types</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-white/5">
          {[
            { key: 'photos', label: 'Photos' },
            { key: 'videos', label: 'Videos' },
            { key: 'stickers', label: 'Stickers' },
            { key: 'docs', label: 'Documents' },
          ].map((item) => (
            <div key={item.key} className="p-3 rounded-xl bg-white/5">
              <p className="text-sm text-white/70 mb-2">{item.label}</p>
              <div className="flex gap-2">
                <button onClick={() => updateSetting('mediaControls', item.key, 'allowed')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    settings.mediaControls[item.key as keyof typeof settings.mediaControls] === 'allowed'
                      ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}>Allowed</button>
                <button onClick={() => updateSetting('mediaControls', item.key, 'blocked')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    settings.mediaControls[item.key as keyof typeof settings.mediaControls] === 'blocked'
                      ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}>Blocked</button>
              </div>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {/* Lockdown */}
      <AnimatedCard delay={0.4} className={settings.lockdown.enabled ? 'border-red-500/30' : ''}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${settings.lockdown.enabled ? 'bg-red-500/30' : 'bg-red-500/20'} flex items-center justify-center`}>
              <Ban className={`w-5 h-5 ${settings.lockdown.enabled ? 'text-red-400 animate-pulse' : 'text-red-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Lockdown Mode</h3>
              <p className="text-sm text-white/50">Emergency protection for your group</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.lockdown.enabled} onChange={(v) => updateSetting('lockdown', 'enabled', v)} />
        </div>
        {settings.lockdown.enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 border-t border-red-500/20">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">🔴 Lockdown is active</p>
                <p className="text-xs text-red-300/60 mt-1">Emergency restrictions are applied to ordinary members. Only administrators can send messages.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
