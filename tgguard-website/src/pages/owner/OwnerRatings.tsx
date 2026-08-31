import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import StatCard from '../../components/StatCard'
import AnimatedCard from '../../components/AnimatedCard'

interface RatingStats {
  average: number
  total: number
  distribution: { stars: number; count: number; pct: number }[]
}

export default function OwnerRatings() {
  const [stats, setStats] = useState<RatingStats | null>(null)
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
      const res = await fetch('/api/owner/ratings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      } else {
        setError('Failed to load ratings')
      }
    } catch (e) {
      setError('Failed to load ratings')
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

      <h1 className="text-3xl font-bold text-white">Ratings</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Average Rating" value={stats ? `${stats.average}/5` : '0/5'} color="yellow" delay={0} />
        <StatCard icon={Star} label="Total Ratings" value={stats?.total ?? 0} color="cyan" delay={0.1} />
      </div>

      <AnimatedCard>
        <h3 className="text-lg font-bold text-white mb-6">Rating Distribution</h3>
        {stats?.distribution && stats.distribution.length > 0 ? (
          <div className="space-y-4">
            {stats.distribution.map((r, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-24">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < r.stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                  ))}
                </div>
                <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500" />
                </div>
                <span className="text-sm font-bold text-white w-12 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-8">No ratings data available</p>
        )}
      </AnimatedCard>
    </motion.div>
  )
}
