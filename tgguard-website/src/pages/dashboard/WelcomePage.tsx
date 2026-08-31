import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Hand, Eye, Save, Image, Type, MousePointer } from 'lucide-react'
import ToggleSwitch from '../../components/ToggleSwitch'
import AnimatedCard from '../../components/AnimatedCard'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface WelcomeSettings {
  enabled: boolean
  mode: 'default' | 'custom'
  customText: string
  buttons: { label: string; url: string }[]
  cleanup: boolean
  cleanupTime: number
}

export default function WelcomePage({ group }: Props) {
  const [settings, setSettings] = useState<WelcomeSettings | null>(null)
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
      const res = await fetch(`/api/groups/${group.id}/welcome`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else {
        setError('Failed to load welcome settings')
      }
    } catch (e) {
      setError('Failed to load welcome settings')
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
      const res = await fetch(`/api/groups/${group.id}/welcome`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSuccess('Welcome settings saved')
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

  const defaultWelcome = `👋 Welcome to {group_name}, {user}!

🛡️ This community is protected by TGGuard.

Please read the group rules and enjoy your stay.`

  const previewText = settings?.mode === 'default'
    ? defaultWelcome.replace('{group_name}', group?.name || 'Your Group').replace('{user}', '@NewUser')
    : settings?.customText || ''

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to configure welcome messages</p>
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
        <h1 className="text-2xl font-bold text-white">Welcome Messages</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save</>}
        </GlassButton>
      </div>

      <AnimatedCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Hand className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Welcome Messages</h3>
              <p className="text-sm text-white/50">Greet new members when they join</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.enabled} onChange={(v) => setSettings(prev => prev ? { ...prev, enabled: v } : null)} />
        </div>
      </AnimatedCard>

      {settings.enabled && (
        <>
          <AnimatedCard delay={0.1}>
            <h3 className="text-lg font-bold text-white mb-4">Welcome Mode</h3>
            <div className="flex gap-3">
              <button onClick={() => setSettings(prev => prev ? { ...prev, mode: 'default' } : null)}
                className={`flex-1 p-4 rounded-xl text-left transition-all ${
                  settings.mode === 'default' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}>
                <Type className={`w-5 h-5 mb-2 ${settings.mode === 'default' ? 'text-cyan-400' : 'text-white/50'}`} />
                <p className={`text-sm font-semibold ${settings.mode === 'default' ? 'text-cyan-400' : 'text-white'}`}>Default TGGuard Welcome</p>
                <p className="text-xs text-white/40 mt-1">Simple text welcome with placeholders</p>
              </button>
              <button onClick={() => setSettings(prev => prev ? { ...prev, mode: 'custom' } : null)}
                className={`flex-1 p-4 rounded-xl text-left transition-all ${
                  settings.mode === 'custom' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}>
                <Image className={`w-5 h-5 mb-2 ${settings.mode === 'custom' ? 'text-cyan-400' : 'text-white/50'}`} />
                <p className={`text-sm font-semibold ${settings.mode === 'custom' ? 'text-cyan-400' : 'text-white'}`}>Custom Welcome</p>
                <p className="text-xs text-white/40 mt-1">Text, media, and buttons</p>
              </button>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <h3 className="text-lg font-bold text-white mb-4">
              {settings.mode === 'default' ? 'Default Welcome Text' : 'Custom Welcome Editor'}
            </h3>

            {settings.mode === 'default' && (
              <div className="mb-4 p-3 rounded-xl bg-white/5">
                <p className="text-xs text-white/40 mb-2">Supported placeholders:</p>
                <div className="flex flex-wrap gap-2">
                  {['{group_name}', '{user_name}', '{username}', '{user_id}'].map(p => (
                    <span key={p} className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <textarea rows={6} value={settings.mode === 'default' ? defaultWelcome : settings.customText}
              onChange={(e) => settings.mode === 'custom' && setSettings(prev => prev ? { ...prev, customText: e.target.value } : null)}
              readOnly={settings.mode === 'default'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />

            {settings.mode === 'custom' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-white/70">Buttons</p>
                {settings.buttons.map((btn, i) => (
                  <div key={i} className="flex gap-3">
                    <input value={btn.label}
                      onChange={(e) => {
                        const newBtns = [...settings.buttons]
                        newBtns[i].label = e.target.value
                        setSettings(prev => prev ? { ...prev, buttons: newBtns } : null)
                      }}
                      placeholder="Button label" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" />
                    <input value={btn.url}
                      onChange={(e) => {
                        const newBtns = [...settings.buttons]
                        newBtns[i].url = e.target.value
                        setSettings(prev => prev ? { ...prev, buttons: newBtns } : null)
                      }}
                      placeholder="URL (optional)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" />
                  </div>
                ))}
                <GlassButton variant="ghost" size="sm"
                  onClick={() => setSettings(prev => prev ? { ...prev, buttons: [...prev.buttons, { label: '', url: '' }] } : null)}>
                  <MousePointer className="w-4 h-4 mr-2" />Add Button
                </GlassButton>
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-white/50" />
              <h3 className="text-lg font-bold text-white">Preview</h3>
            </div>
            <div className="p-4 rounded-xl bg-[#17212b] border border-white/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Hand className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cyan-400 mb-1">TGGuard</p>
                  <p className="text-sm text-white/90 whitespace-pre-line">{previewText || 'Your welcome message will appear here...'}</p>
                  {settings.mode === 'custom' && settings.buttons.some(b => b.label) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {settings.buttons.filter(b => b.label).map((btn, i) => (
                        <button key={i} className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white hover:bg-white/20 transition-colors">
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-bold text-white mb-4">Welcome Cleanup</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="text-sm font-medium text-white">Auto-remove welcome messages</p>
                <p className="text-xs text-white/40">Delete welcome messages after a set time</p>
              </div>
              <ToggleSwitch checked={settings.cleanup}
                onChange={(v) => setSettings(prev => prev ? { ...prev, cleanup: v } : null)} />
            </div>
            {settings.cleanup && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4">
                <label className="text-sm text-white/70 mb-2 block">Remove after (seconds)</label>
                <input type="number" value={settings.cleanupTime}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, cleanupTime: Number(e.target.value) } : null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
              </motion.div>
            )}
          </AnimatedCard>
        </>
      )}
    </motion.div>
  )
}
