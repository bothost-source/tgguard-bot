import express from 'express'
import { ObjectId } from 'mongodb'
import { db } from '../models/db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getBotStatus } from '../services/bot.js'

const router = express.Router()
router.use(authenticate)
router.use(requireRole('owner'))

async function logOwnerAction(userId, action, details = {}) {
  await db.collection('owner_audit_log').insertOne({
    user_id: userId, action, details, created_at: new Date()
  })
}

// GET /api/owner/stats
router.get('/stats', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalUsers, activeUsers, totalGroups, activeGroups, totalGames, totalPlayers, avgRating, botStatus] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ updated_at: { $gte: sevenDaysAgo } }),
      db.collection('groups').countDocuments(),
      db.collection('groups').countDocuments({ is_active: true }),
      db.collection('game_sessions').countDocuments({ status: 'completed' }),
      db.collection('game_players').aggregate([{ $group: { _id: '$user_telegram_id' } }, { $count: 'total' }]).toArray(),
      db.collection('ratings').aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).toArray(),
      getBotStatus()
    ])

    const botState = await db.collection('bot_state').findOne({ key: 'status' })
    let uptime = 'Unknown'
    if (botState?.started_at) {
      uptime = botStatus.is_running ? 'Running' : 'Stopped'
    }

    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_groups: totalGroups,
      active_groups: activeGroups,
      total_games_played: totalGames,
      total_players: totalPlayers[0]?.total || 0,
      average_rating: avgRating[0]?.avg ? parseFloat(avgRating[0].avg.toFixed(1)) : 0,
      bot_status: botStatus.is_running ? 'Online' : 'Offline',
      bot_username: botStatus.bot_username,
      uptime: uptime
    })
  } catch (err) {
    console.error('Owner stats error:', err)
    res.status(500).json({ error: 'Failed to fetch platform stats' })
  }
})

// GET /api/owner/health
router.get('/health', async (req, res) => {
  try {
    const results = []
    try {
      await db.admin().ping()
      results.push({ name: 'Database', status: 'Connected', healthy: true })
    } catch {
      results.push({ name: 'Database', status: 'Disconnected', healthy: false })
    }
    results.push({ name: 'Backend API', status: 'Healthy', healthy: true })

    const botStatus = await getBotStatus()
    results.push({
      name: 'Bot Service',
      status: botStatus.is_running ? `Online (@${botStatus.bot_username || 'unknown'})` : 'Offline',
      healthy: botStatus.is_running,
      mode: botStatus.mode,
      started_at: botStatus.started_at
    })

    res.json(results)
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' })
  }
})

// GET /api/owner/errors
router.get('/errors', async (req, res) => {
  try {
    const errors = await db.collection('system_logs')
      .find({ level: 'error' })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray()

    res.json(errors.map(e => ({
      time: e.created_at.toISOString().slice(11, 16),
      date: e.created_at.toISOString().slice(0, 10),
      message: e.message,
      component: e.component || 'unknown',
      path: e.path,
      severity: 'error'
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch errors' })
  }
})

// GET /api/owner/users
router.get('/users', async (req, res) => {
  try {
    const period = req.query.period || '30d'
    const days = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 9999
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [total, newUsers, active, inactive, connected] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ created_at: { $gte: startDate } }),
      db.collection('users').countDocuments({ updated_at: { $gte: sevenDaysAgo } }),
      db.collection('users').countDocuments({ updated_at: { $lt: thirtyDaysAgo } }),
      db.collection('group_memberships').aggregate([{ $group: { _id: '$user_id' } }, { $count: 'total' }]).toArray()
    ])

    const removedGroups = await db.collection('groups').countDocuments({ is_active: false, updated_at: { $gte: startDate } })

    res.json({
      total, new: newUsers, active, inactive,
      connected_groups: connected[0]?.total || 0,
      removed_tgguard: removedGroups
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats' })
  }
})

// GET /api/owner/groups
router.get('/groups', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [total, active, recent] = await Promise.all([
      db.collection('groups').countDocuments(),
      db.collection('groups').countDocuments({ is_active: true }),
      db.collection('groups').countDocuments({ created_at: { $gte: sevenDaysAgo } })
    ])

    const settings = await db.collection('group_settings').find().toArray()

    const protectionUsage = [
      { name: 'Anti-Spam', enabled: settings.filter(s => s.anti_spam_enabled).length },
      { name: 'Anti-Link', enabled: settings.filter(s => s.anti_link_enabled).length },
      { name: 'Word Filter', enabled: settings.filter(s => s.word_filter_enabled).length },
      { name: 'Verification', enabled: settings.filter(s => s.verification_enabled).length },
      { name: 'Welcome', enabled: settings.filter(s => s.welcome_enabled).length },
      { name: 'Lockdown', enabled: settings.filter(s => s.lockdown_enabled).length }
    ].map(p => ({ ...p, pct: active > 0 ? Math.round((p.enabled / active) * 100) : 0 }))

    const gamesEnabled = [
      { name: 'Word Scramble', count: settings.filter(s => s.games_enabled).length },
      { name: 'World Trivia', count: settings.filter(s => s.games_enabled).length },
      { name: 'Speed Quiz', count: settings.filter(s => s.games_enabled).length },
      { name: 'Missing Letters', count: settings.filter(s => s.games_enabled).length },
      { name: 'Emoji Challenge', count: settings.filter(s => s.games_enabled).length }
    ]

    const recentGroups = await db.collection('groups')
      .find({ created_at: { $gte: sevenDaysAgo } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray()

    res.json({
      total, active, recently_connected: recent, removed: total - active,
      protection_usage: protectionUsage,
      games_enabled: gamesEnabled,
      recent_groups: recentGroups.map(g => ({
        id: g._id.toString(), name: g.name,
        member_count: g.member_count || 0,
        is_active: g.is_active,
        created_at: g.created_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group stats' })
  }
})

// GET /api/owner/games
router.get('/games', async (req, res) => {
  try {
    const [totalPlayed, totalPlayers, gamesToday] = await Promise.all([
      db.collection('game_sessions').countDocuments({ status: 'completed' }),
      db.collection('game_players').aggregate([{ $group: { _id: '$user_telegram_id' } }, { $count: 'total' }]).toArray(),
      db.collection('game_sessions').countDocuments({ status: 'completed', created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ])

    const gamesByType = await db.collection('game_sessions').aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$game_type', count: { $sum: 1 } } }
    ]).toArray()

    const mostPopular = gamesByType.sort((a, b) => b.count - a.count)[0]?._id || 'None'

    const gamesPerDay = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const count = await db.collection('game_sessions').countDocuments({ status: 'completed', created_at: { $gte: date, $lt: nextDate } })
      gamesPerDay.push({ date: date.toISOString().slice(0, 10), count })
    }

    res.json({
      total_played: totalPlayed,
      total_players: totalPlayers[0]?.total || 0,
      most_popular: mostPopular,
      games_today: gamesToday,
      games_by_type: gamesByType.map(g => ({ name: g._id, count: g.count })),
      games_per_day: gamesPerDay
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' })
  }
})

// GET /api/owner/ratings
router.get('/ratings', async (req, res) => {
  try {
    const [total, avg, distribution] = await Promise.all([
      db.collection('ratings').countDocuments(),
      db.collection('ratings').aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).toArray(),
      db.collection('ratings').aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]).toArray()
    ])

    const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    distribution.forEach(d => { distMap[d._id] = d.count })

    const distArray = [5, 4, 3, 2, 1].map(stars => ({
      stars, count: distMap[stars],
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

// GET /api/owner/feedback
router.get('/feedback', async (req, res) => {
  try {
    const filter = req.query.rating
    const query = filter ? { rating: parseInt(filter) } : {}

    const feedback = await db.collection('feedback')
      .find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .toArray()

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

// GET /api/owner/analytics
router.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const dailyActive = await db.collection('users').countDocuments({ updated_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    const gamesPerDay = await db.collection('game_sessions').countDocuments({ created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    const moderationActions = await db.collection('moderation_logs').countDocuments({ created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })

    const weeklyActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const count = await db.collection('moderation_logs').countDocuments({ created_at: { $gte: date, $lt: nextDate } })
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
      messages_processed: 0,
      moderation_actions: moderationActions,
      weekly_activity: weeklyActivity,
      top_groups: topGroups.map(g => ({ name: g.name, members: g.member_count || 0, is_active: g.is_active }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// GET /api/owner/reports
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

    res.json({ total, pending, resolved, dismissed, reasons: reasons.map(r => ({ reason: r._id, count: r.count })) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// GET /api/owner/settings
router.get('/settings', async (req, res) => {
  try {
    const config = await db.collection('group_settings').findOne({ key: 'owner_config' }) || {}
    res.json({ notifications: config.notifications !== false, maintenance: config.maintenance || false, ...config })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/owner/settings
router.put('/settings', async (req, res) => {
  try {
    const data = req.body
    await db.collection('group_settings').updateOne(
      { key: 'owner_config' },
      { $set: { ...data, updated_at: new Date() } },
      { upsert: true }
    )
    await logOwnerAction(req.user._id, 'update_settings', data)
    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// GET /api/owner/audit-log
router.get('/audit-log', async (req, res) => {
  try {
    const logs = await db.collection('owner_audit_log')
      .find()
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()

    res.json(logs.map(l => ({
      id: l._id.toString(),
      time: l.created_at.toISOString().slice(11, 16),
      date: l.created_at.toISOString().slice(0, 10),
      action: l.action,
      details: l.details,
      user_id: l.user_id?.toString()
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})

export default router
