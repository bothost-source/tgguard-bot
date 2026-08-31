import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Clock, UserX, UserCheck, AlertCircle } from 'lucide-react'
import ToggleSwitch from '../../components/ToggleSwitch'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface VerificationSettings {
  enabled: boolean
  timeout: number
  timeoutAction: string
}

export default function VerificationPage({ group }: Props) {
  const [settings, setSettings] = useState<VerificationSettings | null>(null)
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
      const res = await fetch(`/api/groups/${group.id}/verification`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSettings(await res.json())
      } else {
        setError('Failed to load verification settings')
      }
    } catch (e) {
      setError('Failed to load verification settings')
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
      const res = await fetch(`/api/groups/${group.id}/verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSuccess('Verification settings saved')
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

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to configure verification</p>
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
        <h1 className="text-2xl font-bold text-white">New Member Verification</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>

      <AnimatedCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Verification</h3>
              <p className="text-sm text-white/50">Require new members to complete a challenge before participating</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.enabled}
            onChange={(v) => setSettings(prev => prev ? { ...prev, enabled: v } : null)} />
        </div>
      </AnimatedCard>

      {settings.enabled && (
        <>
          <AnimatedCard delay={0.1}>
            <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
            <div className="space-y-3">
              {[
                'New member joins the group',
                'TGGuard places member under restriction',
                'Verification message is sent with [✅ Verify Me] button',
                'Member completes a simple human-verification challenge',
                'Restriction is removed upon successful completion',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-white/70">{step}</p>
                </div>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <h3 className="text-lg font-bold text-white mb-4">Timeout Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />Verification Timeout (seconds)
                </label>
                <input type="number" value={settings.timeout}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, timeout: Number(e.target.value) } : null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                <p className="text-xs text-white/30 mt-1">Default: 300 seconds (5 minutes)</p>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />Timeout Action
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'remove', label: 'Remove User', icon: UserX },
                    { value: 'restrict', label: 'Keep Restricted', icon: Lock },
                    { value: 'notify', label: 'Notify Moderators', icon: UserCheck },
                  ].map((action) => (
                    <button key={action.value}
                      onClick={() => setSettings(prev => prev ? { ...prev, timeoutAction: action.value } : null)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        settings.timeoutAction === action.value
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                      }`}>
                      <action.icon className="w-5 h-5 mx-auto mb-2" />
                      <p className="text-xs font-medium">{action.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </>
      )}
    </motion.div>
  )
}
