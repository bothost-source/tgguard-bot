import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Bell, Globe } from 'lucide-react'
import { useGroup } from '../../context/GroupContext'
import api from '../../lib/api'
import AnimatedCard from '../../components/AnimatedCard'
import ToggleSwitch from '../../components/ToggleSwitch'
import GlassButton from '../../components/GlassButton'

interface GroupSettings {
  welcome: { enabled: boolean; message: string; autoDelete: boolean }
  verification: { enabled: boolean; timeout: number }
  notifications: { enabled: boolean }
}

export default function SettingsPage() {
  const { selectedGroup } = useGroup()
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!selectedGroup) return
    fetchSettings()
  }, [selectedGroup])

  const fetchSettings = async () => {
    if (!selectedGroup) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/groups/${selectedGroup.id}/settings`)
      setSettings(data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!selectedGroup || !settings) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.put(`/groups/${selectedGroup.id}/settings`, settings)
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, subKey: string, value: any) => {
    if (!settings) return
    setSettings(prev => prev ? {
      ...prev,
      [key]: { ...prev[key as keyof GroupSettings], [subKey]: value }
    } : null)
  }

  if (!selectedGroup) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to view settings</p>
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
      {success && <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-cyan-400" />Welcome Message
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="text-sm font-medium text-white">Enable Welcome</p>
              <p className="text-xs text-white/40">Send welcome message to new members</p>
            </div>
            <ToggleSwitch checked={settings.welcome.enabled} onChange={(v) => updateSetting('welcome', 'enabled', v)} />
          </div>
          {settings.welcome.enabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Welcome Message</label>
                <textarea rows={3} value={settings.welcome.message || ''}
                  onChange={(e) => updateSetting('welcome', 'message', e.target.value)}
                  placeholder="Welcome to the group!"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="text-sm text-white/70">Auto-delete after</p>
                </div>
                <select value={settings.welcome.autoDelete ? '1h' : 'never'}
                  onChange={(e) => updateSetting('welcome', 'autoDelete', e.target.value !== 'never')}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                  <option value="never" className="bg-tgg-card">Never</option>
                  <option value="1h" className="bg-tgg-card">1 hour</option>
                  <option value="24h" className="bg-tgg-card">24 hours</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.1}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />Verification
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="text-sm font-medium text-white">Enable Verification</p>
              <p className="text-xs text-white/40">Require new members to verify</p>
            </div>
            <ToggleSwitch checked={settings.verification.enabled} onChange={(v) => updateSetting('verification', 'enabled', v)} />
          </div>
          {settings.verification.enabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Timeout (minutes)</label>
                <input type="number" value={settings.verification.timeout || 5}
                  onChange={(e) => updateSetting('verification', 'timeout', parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
              </div>
            </motion.div>
          )}
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.2}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />Notifications
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="text-sm font-medium text-white">Group Notifications</p>
            <p className="text-xs text-white/40">Receive alerts for moderation events</p>
          </div>
          <ToggleSwitch checked={settings.notifications.enabled} onChange={(v) => updateSetting('notifications', 'enabled', v)} />
        </div>
      </AnimatedCard>
    </motion.div>
  )
}
