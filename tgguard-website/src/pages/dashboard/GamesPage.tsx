import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gamepad2, Puzzle, Globe, Zap, Type, Brain, Trophy, Users, Settings,
  BarChart3, Lock
} from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'
import ToggleSwitch from '../../components/ToggleSwitch'
import GlassButton from '../../components/GlassButton'

interface Props {
  group: { id: string; name: string } | null
}

interface GameSettings {
  enabled: boolean
  permission: 'admins' | 'members' | 'approval'
}

interface GameStats {
  id: string
  name: string
  played: number
  participants: number
}

const gameIcons: Record<string, any> = {
  scramble: Puzzle, trivia: Globe, speed: Zap, letters: Type, emoji: Brain,
}

const gameColors: Record<string, string> = {
  scramble: 'from-pink-500 to-rose-500', trivia: 'from-blue-500 to-cyan-500',
  speed: 'from-yellow-500 to-orange-500', letters: 'from-green-500 to-emerald-500',
  emoji: 'from-purple-500 to-violet-500',
}

export default function GamesPage({ group }: Props) {
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [stats, setStats] = useState<GameStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    if (!group) return
    fetchGameData()
  }, [group])

  const fetchGameData = async () => {
    if (!group) return
    setLoading(true)
    setError('')
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/games/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/groups/${group.id}/games/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (settingsRes.ok) setSettings(await settingsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (e) {
      setError('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!group || !settings) return
    setSaving(true)
    try {
      await fetch(`/api/groups/${group.id}/games/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      })
    } catch (e) {
      console.error('Failed to save game settings:', e)
    } finally {
      setSaving(false)
    }
  }

  if (!group) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-96">
        <p className="text-white/50">Select a group to manage games</p>
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
        <p className="text-white/50">Failed to load game settings. <button onClick={fetchGameData} className="text-cyan-400 underline">Retry</button></p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Games</h1>
        <GlassButton variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : <><Settings className="w-4 h-4 mr-2" />Save</>}
        </GlassButton>
      </div>

      <AnimatedCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">TGGuard Games</h3>
              <p className="text-sm text-white/50">Engage your community with fun games</p>
            </div>
          </div>
          <ToggleSwitch checked={settings.enabled}
            onChange={(v) => setSettings(prev => prev ? { ...prev, enabled: v } : null)} />
        </div>
      </AnimatedCard>

      {settings.enabled && (
        <>
          <AnimatedCard delay={0.1}>
            <h3 className="text-lg font-bold text-white mb-4">Game Permissions</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'admins', label: 'Admins Only', icon: Lock },
                { value: 'members', label: 'Members Allowed', icon: Users },
                { value: 'approval', label: 'Admin Approval', icon: Trophy },
              ].map((opt) => (
                <button key={opt.value}
                  onClick={() => setSettings(prev => prev ? { ...prev, permission: opt.value as any } : null)}
                  className={`p-4 rounded-xl text-center transition-all ${
                    settings.permission === opt.value
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                  }`}>
                  <opt.icon className="w-5 h-5 mx-auto mb-2" />
                  <p className="text-xs font-medium">{opt.label}</p>
                </button>
              ))}
            </div>
          </AnimatedCard>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((game, i) => {
              const Icon = gameIcons[game.id] || Gamepad2
              return (
                <AnimatedCard key={game.id} delay={0.1 + i * 0.05} className="group cursor-pointer">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gameColors[game.id] || 'from-cyan-500 to-blue-500'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{game.played} played</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{game.participants} players</span>
                  </div>
                </AnimatedCard>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}
