import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Key, Bell, Globe } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'
import ToggleSwitch from '../../components/ToggleSwitch'
import GlassButton from '../../components/GlassButton'

interface OwnerConfig {
  notifications: boolean
  maintenance: boolean
}

export default function OwnerSettings() {
  const [config, setConfig] = useState<OwnerConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/owner/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setConfig(await res.json())
      } else {
        setError('Failed to load settings')
      }
    } catch (e) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/50">Failed to load settings. <button onClick={fetchConfig} className="text-cyan-400 underline">Retry</button></p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Owner Settings</h1>
        <GlassButton variant="primary" size="sm" onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-cyan-400" />API Keys
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Bot Token</label>
            <input type="password" value="••••••••••••••••••••••••••••••••" readOnly
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
            <p className="text-xs text-white/30 mt-1">Stored securely server-side. Never exposed to frontend.</p>
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">Webhook Secret</label>
            <input type="password" value="••••••••••••••••••••••••••••••••" readOnly
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.1}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />Notifications
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="text-sm font-medium text-white">System Alerts</p>
            <p className="text-xs text-white/40">Get notified about critical system events</p>
          </div>
          <ToggleSwitch checked={config.notifications}
            onChange={(v) => setConfig(prev => prev ? { ...prev, notifications: v } : null)} />
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.2}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />Maintenance Mode
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="text-sm font-medium text-white">Enable Maintenance</p>
            <p className="text-xs text-white/40">Temporarily disable non-essential services</p>
          </div>
          <ToggleSwitch checked={config.maintenance}
            onChange={(v) => setConfig(prev => prev ? { ...prev, maintenance: v } : null)} />
        </div>
      </AnimatedCard>
    </motion.div>
  )
}
