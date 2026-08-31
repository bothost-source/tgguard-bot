import express from 'express'
import { ObjectId } from 'mongodb'
import { db } from '../models/db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All group routes require authentication
router.use(authenticate)

// GET /api/groups - List user's groups
router.get('/', async (req, res) => {
  try {
    const groups = await db.collection('groups')
      .find({ admin_user_id: req.user._id })
      .project({ chat_id: 0 }) // Don't expose chat_id in list
      .toArray()

    res.json(groups.map(g => ({
      id: g._id.toString(),
      name: g.name,
      chat_id: g.chat_id?.toString(),
      member_count: g.member_count || 0,
      is_active: g.is_active || false
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// POST /api/groups - Add/verify a group
router.post('/', async (req, res) => {
  try {
    const { chat_id, name, invite_link } = req.body

    // Check if group already exists
    const existing = await db.collection('groups').findOne({ chat_id: BigInt(chat_id) })
    if (existing) {
      return res.status(409).json({ error: 'Group already connected' })
    }

    // Insert group
    const result = await db.collection('groups').insertOne({
      chat_id: BigInt(chat_id),
      name: name || 'Unnamed Group',
      invite_link: invite_link || null,
      member_count: 0,
      is_active: false,
      is_verified: false,
      bot_is_admin: false,
      admin_user_id: req.user._id,
      created_at: new Date(),
      updated_at: new Date()
    })

    // Create default settings
    await db.collection('group_settings').insertOne({
      group_id: result.insertedId,
      protection_enabled: true,
      anti_spam_enabled: false,
      anti_spam_sensitivity: 'medium',
      anti_spam_action: 'warn',
      anti_link_enabled: false,
      anti_link_mode: 'block_all',
      anti_link_action: 'delete_warn',
      anti_link_domains: '',
      word_filter_enabled: false,
      word_filter_words: '',
      word_filter_action: 'delete_warn',
      media_photos: 'allowed',
      media_videos: 'allowed',
      media_stickers: 'allowed',
      media_docs: 'allowed',
      lockdown_enabled: false,
      welcome_enabled: false,
      welcome_mode: 'default',
      welcome_custom_text: '',
      welcome_buttons: [],
      welcome_cleanup: false,
      welcome_cleanup_time: 60,
      verification_enabled: false,
      verification_timeout: 300,
      verification_timeout_action: 'remove',
      games_enabled: false,
      games_permission: 'members',
      notifications_enabled: true,
      language: 'en',
      created_at: new Date(),
      updated_at: new Date()
    })

    res.status(201).json({ id: result.insertedId.toString(), message: 'Group added' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add group' })
  }
})

// GET /api/groups/:id/stats - Dashboard stats
router.get('/:id/stats', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    // Verify user owns this group
    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    // Count today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [warningsToday, deletedToday, pendingReports] = await Promise.all([
      db.collection('moderation_logs').countDocuments({
        group_id: groupId,
        action: 'Warning issued',
        created_at: { $gte: today }
      }),
      db.collection('moderation_logs').countDocuments({
        group_id: groupId,
        action: 'Message deleted',
        created_at: { $gte: today }
      }),
      db.collection('reports').countDocuments({
        group_id: groupId,
        status: 'pending'
      })
    ])

    res.json({
      member_count: group.member_count || 0,
      warnings_today: warningsToday,
      deleted_messages_today: deletedToday,
      pending_reports: pendingReports
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/groups/:id/logs - Moderation logs
router.get('/:id/logs', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const logs = await db.collection('moderation_logs')
      .find({ group_id: groupId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    res.json(logs.map(l => ({
      id: l._id.toString(),
      time: l.created_at.toISOString().slice(11, 16),
      user: l.user_username || `@User${l.user_telegram_id}`,
      action: l.action,
      reason: l.reason || '',
      type: l.type || 'delete'
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// GET /api/groups/:id/protection - Protection settings
router.get('/:id/protection', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const settings = await db.collection('group_settings').findOne({ group_id: groupId })
    if (!settings) return res.status(404).json({ error: 'Settings not found' })

    res.json({
      antiSpam: {
        enabled: settings.anti_spam_enabled,
        sensitivity: settings.anti_spam_sensitivity,
        action: settings.anti_spam_action
      },
      antiLink: {
        enabled: settings.anti_link_enabled,
        mode: settings.anti_link_mode,
        action: settings.anti_link_action,
        approvedDomains: settings.anti_link_domains
      },
      wordFilter: {
        enabled: settings.word_filter_enabled,
        action: settings.word_filter_action,
        words: settings.word_filter_words
      },
      mediaControls: {
        photos: settings.media_photos,
        videos: settings.media_videos,
        stickers: settings.media_stickers,
        docs: settings.media_docs
      },
      lockdown: {
        enabled: settings.lockdown_enabled
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch protection settings' })
  }
})

// PUT /api/groups/:id/protection - Update protection settings
router.put('/:id/protection', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: {
        anti_spam_enabled: data.antiSpam?.enabled,
        anti_spam_sensitivity: data.antiSpam?.sensitivity,
        anti_spam_action: data.antiSpam?.action,
        anti_link_enabled: data.antiLink?.enabled,
        anti_link_mode: data.antiLink?.mode,
        anti_link_action: data.antiLink?.action,
        anti_link_domains: data.antiLink?.approvedDomains,
        word_filter_enabled: data.wordFilter?.enabled,
        word_filter_action: data.wordFilter?.action,
        word_filter_words: data.wordFilter?.words,
        media_photos: data.mediaControls?.photos,
        media_videos: data.mediaControls?.videos,
        media_stickers: data.mediaControls?.stickers,
        media_docs: data.mediaControls?.docs,
        lockdown_enabled: data.lockdown?.enabled,
        updated_at: new Date()
      }}
    )

    res.json({ message: 'Protection settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save protection settings' })
  }
})

// GET /api/groups/:id/welcome - Welcome settings
router.get('/:id/welcome', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const settings = await db.collection('group_settings').findOne({ group_id: groupId })

    res.json({
      enabled: settings?.welcome_enabled || false,
      mode: settings?.welcome_mode || 'default',
      customText: settings?.welcome_custom_text || '',
      buttons: settings?.welcome_buttons || [],
      cleanup: settings?.welcome_cleanup || false,
      cleanupTime: settings?.welcome_cleanup_time || 60
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch welcome settings' })
  }
})

// PUT /api/groups/:id/welcome
router.put('/:id/welcome', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: {
        welcome_enabled: data.enabled,
        welcome_mode: data.mode,
        welcome_custom_text: data.customText,
        welcome_buttons: data.buttons,
        welcome_cleanup: data.cleanup,
        welcome_cleanup_time: data.cleanupTime,
        updated_at: new Date()
      }}
    )

    res.json({ message: 'Welcome settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save welcome settings' })
  }
})

// GET /api/groups/:id/verification
router.get('/:id/verification', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const settings = await db.collection('group_settings').findOne({ group_id: groupId })

    res.json({
      enabled: settings?.verification_enabled || false,
      timeout: settings?.verification_timeout || 300,
      timeoutAction: settings?.verification_timeout_action || 'remove'
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification settings' })
  }
})

// PUT /api/groups/:id/verification
router.put('/:id/verification', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: {
        verification_enabled: data.enabled,
        verification_timeout: data.timeout,
        verification_timeout_action: data.timeoutAction,
        updated_at: new Date()
      }}
    )

    res.json({ message: 'Verification settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save verification settings' })
  }
})

// GET /api/groups/:id/reports
router.get('/:id/reports', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const reports = await db.collection('reports')
      .find({ group_id: groupId })
      .sort({ created_at: -1 })
      .toArray()

    res.json(reports.map(r => ({
      id: r._id.toString(),
      reportedUser: r.reported_username || `@User${r.reported_user_id}`,
      reportedBy: r.reporter_username || `@User${r.reporter_user_id}`,
      reason: r.reason,
      messagePreview: r.message_preview || '',
      status: r.status,
      timestamp: r.created_at.toISOString().slice(11, 16)
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// POST /api/groups/:id/reports/:reportId/:action
router.post('/:id/reports/:reportId/:action', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const reportId = new ObjectId(req.params.reportId)
    const action = req.params.action

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved'

    await db.collection('reports').updateOne(
      { _id: reportId, group_id: groupId },
      { $set: { status: newStatus, resolved_at: new Date() } }
    )

    res.json({ message: `Report ${newStatus}` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process report' })
  }
})

// GET /api/groups/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const members = await db.collection('group_members')
      .find({ group_id: groupId })
      .toArray()

    res.json(members.map(m => ({
      id: m._id.toString(),
      username: m.username || `@User${m.telegram_id}`,
      firstName: m.first_name || 'User',
      warnings: m.warnings || 0,
      isAdmin: m.is_admin || false,
      joinedAt: m.joined_at?.toISOString().slice(0, 10) || '',
      status: m.status || 'active'
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// POST /api/groups/:id/members/:memberId/warn
router.post('/:id/members/:memberId/warn', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const memberId = new ObjectId(req.params.memberId)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_members').updateOne(
      { _id: memberId, group_id: groupId },
      { $inc: { warnings: 1 } }
    )

    res.json({ message: 'Warning issued' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to warn member' })
  }
})

// POST /api/groups/:id/members/:memberId/clear-warnings
router.post('/:id/members/:memberId/clear-warnings', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const memberId = new ObjectId(req.params.memberId)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_members').updateOne(
      { _id: memberId, group_id: groupId },
      { $set: { warnings: 0 } }
    )

    res.json({ message: 'Warnings cleared' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear warnings' })
  }
})

// GET /api/groups/:id/games/settings
router.get('/:id/games/settings', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const settings = await db.collection('group_settings').findOne({ group_id: groupId })

    res.json({
      enabled: settings?.games_enabled || false,
      permission: settings?.games_permission || 'members'
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game settings' })
  }
})

// PUT /api/groups/:id/games/settings
router.put('/:id/games/settings', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: {
        games_enabled: data.enabled,
        games_permission: data.permission,
        updated_at: new Date()
      }}
    )

    res.json({ message: 'Game settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save game settings' })
  }
})

// GET /api/groups/:id/games/stats
router.get('/:id/games/stats', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const sessions = await db.collection('game_sessions')
      .find({ group_id: groupId, status: 'completed' })
      .toArray()

    const stats = {
      scramble: { name: 'Word Scramble', played: 0, participants: 0 },
      trivia: { name: 'World Trivia', played: 0, participants: 0 },
      speed: { name: 'Speed Quiz', played: 0, participants: 0 },
      letters: { name: 'Missing Letters', played: 0, participants: 0 },
      emoji: { name: 'Emoji Challenge', played: 0, participants: 0 }
    }

    sessions.forEach(s => {
      if (stats[s.game_type]) {
        stats[s.game_type].played++
        stats[s.game_type].participants += Object.keys(s.scores || {}).length
      }
    })

    res.json(Object.values(stats))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game stats' })
  }
})

// GET /api/groups/:id/analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const period = req.query.period || '7d'

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    // Calculate date range
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [memberCount, newMembers, moderationEvents, gameActivity] = await Promise.all([
      db.collection('group_members').countDocuments({ group_id: groupId }),
      db.collection('group_members').countDocuments({ group_id: groupId, joined_at: { $gte: startDate } }),
      db.collection('moderation_logs').aggregate([
        { $match: { group_id: groupId, created_at: { $gte: startDate } } },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]).toArray(),
      db.collection('game_sessions').aggregate([
        { $match: { group_id: groupId, created_at: { $gte: startDate } } },
        { $group: { _id: '$game_type', count: { $sum: 1 }, players: { $sum: { $size: { $objectToArray: '$scores' } } } } }
      ]).toArray()
    ])

    res.json({
      member_count: memberCount,
      new_members: newMembers,
      members_left: 0, // Would need tracking
      messages: 0, // Would need message counting
      moderation_events: moderationEvents.map(e => ({ label: e._id, value: e.count })),
      game_activity: gameActivity.map(g => ({ name: g._id, played: g.count, participants: g.players }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// GET /api/groups/:id/settings
router.get('/:id/settings', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    const settings = await db.collection('group_settings').findOne({ group_id: groupId })

    // Check bot permissions (would query Telegram API in production)
    const permissions = [
      { name: 'Delete Messages', granted: group.bot_is_admin },
      { name: 'Restrict Users', granted: group.bot_is_admin },
      { name: 'Ban Users', granted: group.bot_is_admin },
      { name: 'Pin Messages', granted: group.bot_is_admin }
    ]

    res.json({
      notifications: settings?.notifications_enabled || false,
      language: settings?.language || 'en',
      permissions
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/groups/:id/settings
router.put('/:id/settings', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: {
        notifications_enabled: data.notifications,
        language: data.language,
        updated_at: new Date()
      }}
    )

    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// DELETE /api/groups/:id
router.delete('/:id', async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)

    const group = await db.collection('groups').findOne({
      _id: groupId,
      admin_user_id: req.user._id
    })
    if (!group) return res.status(403).json({ error: 'Access denied' })

    await db.collection('groups').deleteOne({ _id: groupId })
    // Cascading delete handled by MongoDB if configured, or manually:
    await db.collection('group_settings').deleteOne({ group_id: groupId })
    await db.collection('moderation_logs').deleteMany({ group_id: groupId })
    await db.collection('reports').deleteMany({ group_id: groupId })
    await db.collection('group_members').deleteMany({ group_id: groupId })
    await db.collection('game_sessions').deleteMany({ group_id: groupId })

    res.json({ message: 'Group disconnected' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect group' })
  }
})

export default router
