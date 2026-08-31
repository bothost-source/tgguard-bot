import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Trash2, AlertTriangle, Bell, Globe, Shield } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'
import ToggleSwitch from '../../components/ToggleSwitch'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface BotPermission {
  name: string
  granted: boolean
}

interface GroupSettings {
  notifications: boolean
  language: string
  permissions: BotPermission[]
}

export default function SettingsPage({ group }: Props) {
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      const res = await fetch(`/api/groups/${group.id}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSettings(await res.json())
      } else {
        setError('Failed to load settings')
      }
    } catch (e) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!group || !settings) return
    setSaving(true)
    try {
      await fetch(`/api/groups/${group.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notifications: settings.notifications, language: settings.language }),
      })
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  const disconnectGroup = async () => {
    if (!group) return
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (e) {
      console.error('Failed to disconnect group:', e)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to manage settings</p>
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />Notifications
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="text-sm font-medium text-white">Moderation Alerts</p>
            <p className="text-xs text-white/40">Get notified about important moderation events</p>
          </div>
          <ToggleSwitch checked={settings.notifications}
            onChange={(v) => setSettings(prev => prev ? { ...prev, notifications: v } : null)} />
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.1}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />Language
        </h3>
        <select value={settings.language}
          onChange={(e) => setSettings(prev => prev ? { ...prev, language: e.target.value } : null)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
          <option value="en" className="bg-tgg-card">English</option>
          <option value="es" className="bg-tgg-card">Spanish</option>
          <option value="ru" className="bg-tgg-card">Russian</option>
          <option value="de" className="bg-tgg-card">German</option>
        </select>
      </AnimatedCard>

      <AnimatedCard delay={0.2}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />Bot Permissions
        </h3>
        <div className="space-y-3">
          {settings.permissions.map((perm, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-sm text-white/70">{perm.name}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${perm.granted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {perm.granted ? 'Granted' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.3} className="border-red-500/20">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />Danger Zone
        </h3>
        {!showDeleteConfirm ? (
          <GlassButton variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" />Disconnect Group
          </GlassButton>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-sm text-red-400">Are you sure? This will remove all TGGuard settings for this group.</p>
            <div className="flex gap-3">
              <GlassButton variant="danger" size="sm" onClick={disconnectGroup}>Yes, Disconnect</GlassButton>
              <GlassButton variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</GlassButton>
            </div>
          </motion.div>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
