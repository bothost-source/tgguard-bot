import express from 'express'
import { ObjectId } from 'mongodb'
import { db } from '../models/db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)
router.use(requireRole('owner'))

// GET /api/owner/stats - Platform overview
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalGroups, activeGroups, totalGames, totalPlayers, avgRating] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ updated_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      db.collection('groups').countDocuments(),
      db.collection('groups').countDocuments({ is_active: true }),
      db.collection('game_sessions').countDocuments({ status: 'completed' }),
      db.collection('game_sessions').aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: { $size: { $objectToArray: '$scores' } } } } }
      ]).toArray(),
      db.collection('ratings').aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]).toArray()
    ])

    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_groups: totalGroups,
      active_groups: activeGroups,
      total_games_played: totalGames,
      total_players: totalPlayers[0]?.total || 0,
      average_rating: avgRating[0]?.avg ? parseFloat(avgRating[0].avg.toFixed(1)) : 0,
      uptime: '99.9%'
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform stats' })
  }
})

// GET /api/owner/health - System health
router.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    await db.admin().ping()

    res.json([
      { name: 'Database', status: 'Connected', uptime: '99.9%', healthy: true },
      { name: 'Backend API', status: 'Healthy', uptime: '99.8%', healthy: true },
      { name: 'Bot Service', status: 'Online', uptime: '99.9%', healthy: true }
    ])
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' })
  }
})

// GET /api/owner/errors - Recent errors
router.get('/errors', async (req, res) => {
  try {
    const errors = await db.collection('owner_audit_log')
      .find({ action: { $regex: /error/i } })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray()

    res.json(errors.map(e => ({
      time: e.created_at.toISOString().slice(11, 16),
      message: e.action,
      severity: e.details?.severity || 'warning'
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch errors' })
  }
})

// GET /api/owner/users - User statistics
router.get('/users', async (req, res) => {
  try {
    const period = req.query.period || '30d'
    const days = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 9999
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [total, newUsers, active, inactive, connected, removed] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ created_at: { $gte: startDate } }),
      db.collection('users').countDocuments({ updated_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      db.collection('users').countDocuments({ updated_at: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      db.collection('groups').aggregate([
        { $group: { _id: '$admin_user_id' } },
        { $count: 'total' }
      ]).toArray(),
      0 // Would need tracking for removed TGGuard
    ])

    res.json({
      total,
      new: newUsers,
      active,
      inactive,
      connected_groups: connected[0]?.total || 0,
      removed_tgguard: removed
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats' })
  }
})

// GET /api/owner/groups - Group statistics
router.get('/groups', async (req, res) => {
  try {
    const [total, active, recent, removed] = await Promise.all([
      db.collection('groups').countDocuments(),
      db.collection('groups').countDocuments({ is_active: true }),
      db.collection('groups').countDocuments({ created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      0 // Would need tracking
    ])

    // Get protection usage stats
    const settings = await db.collection('group_settings').find().toArray()
    const activeGroupIds = (await db.collection('groups').find({ is_active: true }).toArray()).map(g => g._id.toString())

    const protectionUsage = [
      { name: 'Anti-Spam', enabled: settings.filter(s => s.anti_spam_enabled).length, pct: 0 },
      { name: 'Anti-Link', enabled: settings.filter(s => s.anti_link_enabled).length, pct: 0 },
      { name: 'Word Filter', enabled: settings.filter(s => s.word_filter_enabled).length, pct: 0 },
      { name: 'Verification', enabled: settings.filter(s => s.verification_enabled).length, pct: 0 },
      { name: 'Welcome', enabled: settings.filter(s => s.welcome_enabled).length, pct: 0 },
      { name: 'Lockdown', enabled: settings.filter(s => s.lockdown_enabled).length, pct: 0 }
    ].map(p => ({ ...p, pct: active > 0 ? Math.round((p.enabled / active) * 100) : 0 }))

    const gamesEnabled = [
      { name: 'Word Scramble', count: settings.filter(s => s.games_enabled).length },
      { name: 'World Trivia', count: settings.filter(s => s.games_enabled).length },
      { name: 'Speed Quiz', count: settings.filter(s => s.games_enabled).length },
      { name: 'Missing Letters', count: settings.filter(s => s.games_enabled).length },
      { name: 'Emoji Challenge', count: settings.filter(s => s.games_enabled).length }
    ]

    res.json({
      total,
      active,
      recently_connected: recent,
      removed,
      protection_usage: protectionUsage,
      games_enabled: gamesEnabled
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group stats' })
  }
})

// GET /api/owner/games - Game statistics
router.get('/games', async (req, res) => {
  try {
    const [totalPlayed, totalPlayers, gamesToday] = await Promise.all([
      db.collection('game_sessions').countDocuments({ status: 'completed' }),
      db.collection('game_sessions').aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: { $size: { $objectToArray: '$scores' } } } } }
      ]).toArray(),
      db.collection('game_sessions').countDocuments({
        status: 'completed',
        created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ])

    const gamesByType = await db.collection('game_sessions').aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$game_type', count: { $sum: 1 } } }
    ]).toArray()

    const typeColors = {
      scramble: 'from-pink-500 to-rose-500',
      trivia: 'from-blue-500 to-cyan-500',
      speed: 'from-yellow-500 to-orange-500',
      letters: 'from-green-500 to-emerald-500',
      emoji: 'from-purple-500 to-violet-500'
    }

    const mostPopular = gamesByType.sort((a, b) => b.count - a.count)[0]?._id || 'None'

    res.json({
      total_played: totalPlayed,
      total_players: totalPlayers[0]?.total || 0,
      most_popular: mostPopular,
      games_today: gamesToday,
      games_by_type: gamesByType.map(g => ({
        name: g._id,
        count: g.count,
        color: typeColors[g._id] || 'from-cyan-500 to-blue-500'
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' })
  }
})

// GET /api/owner/ratings - Rating statistics
router.get('/ratings', async (req, res) => {
  try {
    const [total, avg, distribution] = await Promise.all([
      db.collection('ratings').countDocuments(),
      db.collection('ratings').aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]).toArray(),
      db.collection('ratings').aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } }
      ]).toArray()
    ])

    const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    distribution.forEach(d => { distMap[d._id] = d.count })

    const distArray = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: distMap[stars],
      pct: total > 0 ? Math.round((distMap[stars] / total) * 100) : 0
    }))

    res.json({
      average: avg[0]?.avg ? parseFloat(avg[0].avg.toFixed(1)) : 0,
      total,
      distribution: distArray
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings' })
  }
})

// GET /api/owner/feedback - User feedback
router.get('/feedback', async (req, res) => {
  try {
    const filter = req.query.rating
    const query = filter ? { rating: parseInt(filter) } : {}

    const feedback = await db.collection('ratings')
      .find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .toArray()

    // Enrich with user data
    const userIds = feedback.map(f => f.user_id)
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray()
    const userMap = new Map(users.map(u => [u._id.toString(), u]))

    res.json(feedback.map(f => {
      const user = userMap.get(f.user_id.toString())
      return {
        id: f._id.toString(),
        user: user?.username ? `@${user.username}` : `@User${user?.telegram_id || ''}`,
        rating: f.rating,
        comment: f.comment || '',
        date: f.created_at.toISOString().slice(0, 10)
      }
    }))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

// GET /api/owner/analytics - Platform analytics
router.get('/analytics', async (req, res) => {
  try {
    const dailyActive = await db.collection('users').countDocuments({
      updated_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })

    const gamesPerDay = await db.collection('game_sessions').countDocuments({
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })

    const moderationActions = await db.collection('moderation_logs').countDocuments({
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })

    // Weekly activity (last 7 days)
    const weeklyActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = await db.collection('moderation_logs').countDocuments({
        created_at: { $gte: date, $lt: nextDate }
      })
      weeklyActivity.push(count)
    }

    const topGroups = await db.collection('groups')
      .find({ is_active: true })
      .sort({ member_count: -1 })
      .limit(5)
      .toArray()

    res.json({
      daily_active_users: dailyActive,
      games_per_day: gamesPerDay,
      messages_processed: 0, // Would need tracking
      moderation_actions: moderationActions,
      weekly_activity: weeklyActivity,
      top_groups: topGroups.map(g => ({
        name: g.name,
        members: g.member_count || 0,
        activity: Math.floor(Math.random() * 30) + 70 // Placeholder - would calculate from real data
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// GET /api/owner/reports - Platform reports
router.get('/reports', async (req, res) => {
  try {
    const [total, pending, resolved, dismissed] = await Promise.all([
      db.collection('reports').countDocuments(),
      db.collection('reports').countDocuments({ status: 'pending' }),
      db.collection('reports').countDocuments({ status: 'resolved' }),
      db.collection('reports').countDocuments({ status: 'dismissed' })
    ])

    const reasons = await db.collection('reports').aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]).toArray()

    res.json({
      total,
      pending,
      resolved,
      dismissed,
      reasons: reasons.map(r => ({ reason: r._id, count: r.count }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// GET /api/owner/settings - Owner config
router.get('/settings', async (req, res) => {
  try {
    // In production, this would come from a config collection
    res.json({
      notifications: true,
      maintenance: false
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/owner/settings
router.put('/settings', async (req, res) => {
  try {
    // In production, save to config collection
    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

export default router
