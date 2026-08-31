import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Gamepad2, Trophy, Users, BarChart3 } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface GameStats {
  total_played: number
  total_players: number
  most_popular: string
  games_today: number
  games_by_type: { name: string; count: number; color: string }[]
}

export default function OwnerGames() {
  const [stats, setStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/owner/games', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError('Failed to load game statistics')
      }
    } catch (e) {
      setError('Failed to load game statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <h1 className="text-3xl font-bold text-white">Games</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Gamepad2} label="Total Games Played" value={stats?.total_played ?? 0} color="cyan" delay={0} />
        <StatCard icon={Users} label="Total Players" value={stats?.total_players ?? 0} color="green" delay={0.1} />
        <StatCard icon={Trophy} label="Most Popular" value={stats?.most_popular ?? '--'} color="purple" delay={0.2} />
        <StatCard icon={BarChart3} label="Games Today" value={stats?.games_today ?? 0} color="yellow" delay={0.3} />
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-4">Games by Type</h3>
        {stats?.games_by_type && stats.games_by_type.length > 0 ? (
          <div className="space-y-4">
            {stats.games_by_type.map((game, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{game.name}</span>
                  <span className="text-sm font-bold text-white">{game.count.toLocaleString()}</span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${game.color}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No game statistics available</p>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
