import express from 'express'
import { ObjectId } from 'mongodb'
import { db } from '../models/db.js'
import { authenticate, requireGroupAccess } from '../middleware/auth.js'
import * as tg from '../services/telegram.js'

const router = express.Router()
router.use(authenticate)

// GET /api/groups - List user's groups
router.get('/', async (req, res) => {
  try {
    let groups
    if (req.user.role === 'owner') {
      groups = await db.collection('groups').find().toArray()
    } else {
      const memberships = await db.collection('group_memberships').find({ user_id: req.user._id }).toArray()
      const groupIds = memberships.map(m => m.group_id)
      groups = groupIds.length > 0 ? await db.collection('groups').find({ _id: { $in: groupIds } }).toArray() : []
    }

    res.json(groups.map(g => ({
      id: g._id.toString(),
      name: g.name,
      chat_id: g.chat_id?.toString(),
      member_count: g.member_count || 0,
      is_active: g.is_active || false,
      bot_is_admin: g.bot_is_admin || false,
      is_verified: g.is_verified || false
    })))
  } catch (err) {
    console.error('Fetch groups error:', err)
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// POST /api/groups - Verify and add a group
router.post('/', async (req, res) => {
  try {
    const { chat_id } = req.body
    if (!chat_id) return res.status(400).json({ error: 'Chat ID required' })

    const chatIdNum = BigInt(chat_id)
    const existing = await db.collection('groups').findOne({ chat_id: chatIdNum })
    if (existing) return res.status(409).json({ error: 'Group already connected' })

    const chat = await tg.getChat(chat_id)
    if (!chat) return res.status(404).json({ error: 'Group not found. Make sure TGGuard is added to the group.' })

    const botPerms = await tg.getBotPermissions(chat_id)
    if (!botPerms?.is_admin) {
      return res.status(403).json({
        error: 'TGGuard is not an administrator',
        permissions: botPerms,
        message: 'Add TGGuard as an administrator, then try again.'
      })
    }

    const isUserAdmin = await tg.isUserAdmin(chat_id, req.user.telegram_id.toString())
    if (!isUserAdmin && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'You must be an administrator of this group to connect it.' })
    }

    const telegramAdmins = await tg.getChatAdministrators(chat_id)
    const adminIds = telegramAdmins.map(a => BigInt(a.user.id))
    const memberCount = await tg.getChatMembersCount(chat_id)

    const result = await db.collection('groups').insertOne({
      chat_id: chatIdNum,
      name: chat.title || 'Unnamed Group',
      chat_type: chat.type,
      invite_link: chat.invite_link || null,
      member_count: memberCount,
      is_active: true,
      is_verified: true,
      bot_is_admin: true,
      bot_permissions: botPerms,
      admins: adminIds,
      added_by: req.user._id,
      created_at: new Date(),
      updated_at: new Date()
    })

    for (const admin of telegramAdmins) {
      const adminUser = await db.collection('users').findOne({ telegram_id: BigInt(admin.user.id) })
      if (adminUser) {
        await db.collection('group_memberships').updateOne(
          { group_id: result.insertedId, user_id: adminUser._id },
          { $set: { role: admin.status === 'creator' ? 'owner' : 'admin', telegram_status: admin.status, updated_at: new Date() } },
          { upsert: true }
        )
      }
    }

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

    await db.collection('game_configurations').insertOne({
      group_id: result.insertedId,
      scramble_enabled: true,
      trivia_enabled: true,
      speed_enabled: true,
      letters_enabled: true,
      emoji_enabled: true,
      cooldown_minutes: 5,
      time_limit_seconds: 30,
      points_per_win: 10,
      created_at: new Date(),
      updated_at: new Date()
    })

    res.status(201).json({
      id: result.insertedId.toString(),
      name: chat.title,
      message: 'Group connected successfully',
      bot_permissions: botPerms
    })
  } catch (err) {
    console.error('Add group error:', err)
    res.status(500).json({ error: 'Failed to add group' })
  }
})

// POST /api/groups/:id/verify - Re-verify group permissions
router.post('/:id/verify', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const group = req.group
    const chatId = group.chat_id.toString()

    const botPerms = await tg.getBotPermissions(chatId)
    const memberCount = await tg.getChatMembersCount(chatId)
    const telegramAdmins = await tg.getChatAdministrators(chatId)
    const adminIds = telegramAdmins.map(a => BigInt(a.user.id))

    await db.collection('groups').updateOne(
      { _id: groupId },
      { $set: { bot_is_admin: botPerms?.is_admin || false, bot_permissions: botPerms, member_count: memberCount, admins: adminIds, is_active: botPerms?.is_admin || false, updated_at: new Date() } }
    )

    for (const admin of telegramAdmins) {
      const adminUser = await db.collection('users').findOne({ telegram_id: BigInt(admin.user.id) })
      if (adminUser) {
        await db.collection('group_memberships').updateOne(
          { group_id: groupId, user_id: adminUser._id },
          { $set: { role: admin.status === 'creator' ? 'owner' : 'admin', telegram_status: admin.status, updated_at: new Date() } },
          { upsert: true }
        )
      }
    }

    res.json({ message: 'Group verified', bot_is_admin: botPerms?.is_admin || false, permissions: botPerms, member_count: memberCount })
  } catch (err) {
    console.error('Verify group error:', err)
    res.status(500).json({ error: 'Failed to verify group' })
  }
})

// GET /api/groups/:id/stats
router.get('/:id/stats', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [warningsToday, deletedToday, pendingReports] = await Promise.all([
      db.collection('warnings').countDocuments({ group_id: groupId, created_at: { $gte: today } }),
      db.collection('moderation_logs').countDocuments({ group_id: groupId, action: 'delete', created_at: { $gte: today } }),
      db.collection('reports').countDocuments({ group_id: groupId, status: 'pending' })
    ])

    const group = req.group
    res.json({
      member_count: group.member_count || 0,
      warnings_today: warningsToday,
      deleted_messages_today: deletedToday,
      pending_reports: pendingReports,
      bot_is_admin: group.bot_is_admin,
      is_active: group.is_active
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/groups/:id/logs
router.get('/:id/logs', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)

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
      timestamp: l.created_at
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// GET /api/groups/:id/protection
router.get('/:id/protection', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const settings = await db.collection('group_settings').findOne({ group_id: groupId })
    if (!settings) return res.status(404).json({ error: 'Settings not found' })

    const filterWords = await db.collection('filter_words').find({ group_id: groupId }).toArray()

    res.json({
      antiSpam: { enabled: settings.anti_spam_enabled, sensitivity: settings.anti_spam_sensitivity, action: settings.anti_spam_action },
      antiLink: { enabled: settings.anti_link_enabled, mode: settings.anti_link_mode, action: settings.anti_link_action, approvedDomains: settings.anti_link_domains },
      wordFilter: { enabled: settings.word_filter_enabled, action: settings.word_filter_action, words: filterWords.map(w => ({ id: w._id.toString(), word: w.word, action: w.action, enabled: w.enabled !== false })) },
      mediaControls: { photos: settings.media_photos, videos: settings.media_videos, stickers: settings.media_stickers, docs: settings.media_docs },
      lockdown: { enabled: settings.lockdown_enabled }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch protection settings' })
  }
})

// PUT /api/groups/:id/protection
router.put('/:id/protection', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body

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
        media_photos: data.mediaControls?.photos,
        media_videos: data.mediaControls?.videos,
        media_stickers: data.mediaControls?.stickers,
        media_docs: data.mediaControls?.docs,
        lockdown_enabled: data.lockdown?.enabled,
        updated_at: new Date()
      }}
    )

    if (data.wordFilter?.words) {
      for (const word of data.wordFilter.words) {
        if (word.id) {
          await db.collection('filter_words').updateOne(
            { _id: new ObjectId(word.id), group_id: groupId },
            { $set: { word: word.word, action: word.action, enabled: word.enabled, updated_at: new Date() } }
          )
        } else if (word.word) {
          await db.collection('filter_words').updateOne(
            { group_id: groupId, word: word.word },
            { $set: { action: word.action || 'delete_warn', enabled: true, updated_at: new Date() } },
            { upsert: true }
          )
        }
      }
    }

    res.json({ message: 'Protection settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save protection settings' })
  }
})

// GET /api/groups/:id/welcome
router.get('/:id/welcome', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
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
router.put('/:id/welcome', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body
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
router.get('/:id/verification', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
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
router.put('/:id/verification', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body
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
router.get('/:id/reports', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const reports = await db.collection('reports').find({ group_id: groupId }).sort({ created_at: -1 }).toArray()
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
router.post('/:id/reports/:reportId/:action', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const reportId = new ObjectId(req.params.reportId)
    const action = req.params.action
    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved'

    await db.collection('reports').updateOne(
      { _id: reportId, group_id: groupId },
      { $set: { status: newStatus, resolved_at: new Date(), resolved_by: req.user._id } }
    )

    res.json({ message: `Report ${newStatus}` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process report' })
  }
})

// GET /api/groups/:id/members
router.get('/:id/members', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const members = await db.collection('group_members').find({ group_id: groupId }).toArray()

    const warningCounts = await db.collection('warnings').aggregate([
      { $match: { group_id: groupId } },
      { $group: { _id: '$user_telegram_id', count: { $sum: 1 } } }
    ]).toArray()
    const warningMap = new Map(warningCounts.map(w => [w._id.toString(), w.count]))

    res.json(members.map(m => ({
      id: m._id.toString(),
      username: m.username || `@User${m.telegram_id}`,
      firstName: m.first_name || 'User',
      warnings: warningMap.get(m.telegram_id.toString()) || 0,
      isAdmin: m.is_admin || false,
      joinedAt: m.joined_at?.toISOString().slice(0, 10) || '',
      status: m.status || 'active'
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// POST /api/groups/:id/members/:memberId/warn
router.post('/:id/members/:memberId/warn', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const memberId = new ObjectId(req.params.memberId)
    const { reason } = req.body

    const member = await db.collection('group_members').findOne({ _id: memberId, group_id: groupId })
    if (!member) return res.status(404).json({ error: 'Member not found' })

    await db.collection('warnings').insertOne({
      group_id: groupId, user_telegram_id: member.telegram_id,
      username: member.username, first_name: member.first_name,
      reason: reason || 'Manual warning', source: 'dashboard',
      created_by: req.user._id, created_at: new Date()
    })

    await db.collection('group_members').updateOne(
      { _id: memberId },
      { $inc: { warnings: 1 }, $set: { updated_at: new Date() } }
    )

    res.json({ message: 'Warning issued' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to warn member' })
  }
})

// POST /api/groups/:id/members/:memberId/clear-warnings
router.post('/:id/members/:memberId/clear-warnings', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const memberId = new ObjectId(req.params.memberId)

    const member = await db.collection('group_members').findOne({ _id: memberId, group_id: groupId })
    if (!member) return res.status(404).json({ error: 'Member not found' })

    await db.collection('warnings').deleteMany({ group_id: groupId, user_telegram_id: member.telegram_id })
    await db.collection('group_members').updateOne(
      { _id: memberId },
      { $set: { warnings: 0, updated_at: new Date() } }
    )

    res.json({ message: 'Warnings cleared' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear warnings' })
  }
})

// GET /api/groups/:id/games/settings
router.get('/:id/games/settings', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const settings = await db.collection('group_settings').findOne({ group_id: groupId })
    const gameConfig = await db.collection('game_configurations').findOne({ group_id: groupId })
    res.json({
      enabled: settings?.games_enabled || false,
      permission: settings?.games_permission || 'members',
      config: gameConfig || {}
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game settings' })
  }
})

// PUT /api/groups/:id/games/settings
router.put('/:id/games/settings', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body
    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: { games_enabled: data.enabled, games_permission: data.permission, updated_at: new Date() } }
    )
    if (data.config) {
      await db.collection('game_configurations').updateOne(
        { group_id: groupId },
        { $set: { ...data.config, updated_at: new Date() } }
      )
    }
    res.json({ message: 'Game settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save game settings' })
  }
})

// GET /api/groups/:id/games/stats
router.get('/:id/games/stats', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const sessions = await db.collection('game_sessions').find({ group_id: groupId, status: 'completed' }).toArray()

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
router.get('/:id/analytics', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const period = req.query.period || '7d'
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 7
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
      members_left: 0,
      messages: 0,
      moderation_events: moderationEvents.map(e => ({ label: e._id, value: e.count })),
      game_activity: gameActivity.map(g => ({ name: g._id, played: g.count, participants: g.players }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// GET /api/groups/:id/settings
router.get('/:id/settings', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const settings = await db.collection('group_settings').findOne({ group_id: groupId })
    const group = req.group

    const permissions = group.bot_permissions ? [
      { name: 'Delete Messages', granted: group.bot_permissions.can_delete_messages },
      { name: 'Restrict Users', granted: group.bot_permissions.can_restrict_members },
      { name: 'Ban Users', granted: group.bot_permissions.can_restrict_members },
      { name: 'Pin Messages', granted: group.bot_permissions.can_pin_messages }
    ] : []

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
router.put('/:id/settings', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    const data = req.body
    await db.collection('group_settings').updateOne(
      { group_id: groupId },
      { $set: { notifications_enabled: data.notifications, language: data.language, updated_at: new Date() } }
    )
    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// DELETE /api/groups/:id
router.delete('/:id', requireGroupAccess, async (req, res) => {
  try {
    const groupId = new ObjectId(req.params.id)
    await db.collection('groups').deleteOne({ _id: groupId })
    await db.collection('group_settings').deleteOne({ group_id: groupId })
    await db.collection('group_memberships').deleteMany({ group_id: groupId })
    await db.collection('moderation_logs').deleteMany({ group_id: groupId })
    await db.collection('reports').deleteMany({ group_id: groupId })
    await db.collection('group_members').deleteMany({ group_id: groupId })
    await db.collection('game_sessions').deleteMany({ group_id: groupId })
    await db.collection('warnings').deleteMany({ group_id: groupId })
    await db.collection('filter_words').deleteMany({ group_id: groupId })
    await db.collection('verification_sessions').deleteMany({ group_id: groupId })
    await db.collection('game_configurations').deleteMany({ group_id: groupId })
    res.json({ message: 'Group disconnected' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect group' })
  }
})

export default router
