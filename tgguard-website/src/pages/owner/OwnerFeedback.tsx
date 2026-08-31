import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Star, Filter } from 'lucide-react'
import AnimatedCard from '../../components/AnimatedCard'

interface Feedback {
  id: string
  user: string
  rating: number
  comment: string
  date: string
}

export default function OwnerFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('tgguard_token')

  useEffect(() => {
    fetchFeedback()
  }, [filter])

  const fetchFeedback = async () => {
    setLoading(true)
    setError('')
    try {
      const url = filter === 'all' ? '/api/owner/feedback' : `/api/owner/feedback?rating=${filter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        setFeedback(await res.json())
      } else {
        setError('Failed to load feedback')
      }
    } catch (e) {
      setError('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const filtered = feedback

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Feedback</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/30" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500">
            <option value="all" className="bg-tgg-card">All Ratings</option>
            <option value="5" className="bg-tgg-card">5 Stars</option>
            <option value="4" className="bg-tgg-card">4 Stars</option>
            <option value="3" className="bg-tgg-card">3 Stars</option>
            <option value="2" className="bg-tgg-card">2 Stars</option>
            <option value="1" className="bg-tgg-card">1 Star</option>
          </select>
        </div>
      </div>

      {loading && feedback.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((fb, i) => (
          <AnimatedCard key={fb.id} delay={i * 0.05}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{fb.user[1] || '?'}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{fb.user}</p>
                  <p className="text-xs text-white/40">{fb.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                ))}
              </div>
            </div>
            <p className="text-sm text-white/70">{fb.comment}</p>
          </AnimatedCard>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No feedback found</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
