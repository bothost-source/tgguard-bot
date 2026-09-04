import express from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'
import { verifyTelegramHash, isAuthRecent } from '../middleware/auth.js'

const router = express.Router()

const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

// ── Existing Telegram OAuth endpoint (keep for direct access) ──
router.get('/telegram', async (req, res) => {
  try {
    const { id, first_name, username, photo_url, auth_date, hash } = req.query
    if (!id || !hash || !auth_date) {
      return res.redirect(`${getFrontendUrl()}/login?error=missing_fields`)
    }
    if (!verifyTelegramHash(req.query, process.env.BOT_TOKEN)) {
      return res.redirect(`${getFrontendUrl()}/login?error=invalid_auth`)
    }
    if (!isAuthRecent(auth_date)) {
      return res.redirect(`${getFrontendUrl()}/login?error=auth_expired`)
    }
    const telegramId = BigInt(id)
    const isOwner = telegramId.toString() === process.env.OWNER_TELEGRAM_ID
    let user = await db.collection('users').findOne({ telegram_id: telegramId })
    if (!user) {
      const result = await db.collection('users').insertOne({
        telegram_id: telegramId, username: username || null, first_name: first_name || null,
        avatar_url: photo_url || null, role: isOwner ? 'owner' : 'community_admin',
        is_active: true, last_login: new Date(), created_at: new Date(), updated_at: new Date()
      })
      user = await db.collection('users').findOne({ _id: result.insertedId })
    } else {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { username: username || user.username, first_name: first_name || user.first_name, avatar_url: photo_url || user.avatar_url, last_login: new Date(), updated_at: new Date() } }
      )
      user = await db.collection('users').findOne({ _id: user._id })
    }
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, telegramId: user.telegram_id.toString() },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    res.redirect(`${getFrontendUrl()}/dashboard?token=${token}`)
  } catch (err) {
    console.error('Telegram auth error:', err)
    res.redirect(`${getFrontendUrl()}/login?error=auth_failed`)
  }
})

// ── NEW: Bot-generated magic link endpoint ──
router.post('/bot-token', async (req, res) => {
  try {
    const { token: botToken } = req.body
    if (!botToken) {
      return res.status(400).json({ error: 'Missing token' })
    }
    if (!process.env.BOT_TOKEN) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Verify the bot-generated token
    const decoded = jwt.verify(botToken, process.env.BOT_TOKEN)  // ─── FIXED: removed `as any` ───
    const { telegramId, groupId } = decoded

    if (!telegramId) {
      return res.status(400).json({ error: 'Invalid token' })
    }

    const tgId = BigInt(telegramId)
    const isOwner = tgId.toString() === process.env.OWNER_TELEGRAM_ID

    // Find or create user
    let user = await db.collection('users').findOne({ telegram_id: tgId })
    if (!user) {
      const result = await db.collection('users').insertOne({
        telegram_id: tgId, username: null, first_name: null,
        avatar_url: null, role: isOwner ? 'owner' : 'community_admin',
        is_active: true, last_login: new Date(), created_at: new Date(), updated_at: new Date()
      })
      user = await db.collection('users').findOne({ _id: result.insertedId })
    } else {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { last_login: new Date(), updated_at: new Date() } }
      )
      user = await db.collection('users').findOne({ _id: user._id })
    }

    // If groupId provided, ensure group exists and user has membership
    if (groupId) {
      const group = await db.collection('groups').findOne({ chat_id: BigInt(groupId) })
      if (group) {
        const membership = await db.collection('group_memberships').findOne({
          user_id: user._id, group_id: group._id
        })
        if (!membership) {
          await db.collection('group_memberships').insertOne({
            user_id: user._id, group_id: group._id,
            role: 'admin', created_at: new Date()
          })
        }
      }
    }

    // Generate auth token
    const authToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, telegramId: user.telegram_id.toString() },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ token: authToken, user: {
      id: user._id.toString(), telegram_id: user.telegram_id.toString(),
      username: user.username, first_name: user.first_name, role: user.role
    }})
  } catch (err) {
    console.error('Bot token auth error:', err)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }
    const token = authHeader.replace('Bearer ', '')
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' })
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    const memberships = await db.collection('group_memberships').find({ user_id: user._id }).toArray()
    const groupIds = memberships.map(m => m.group_id)
    const groups = groupIds.length > 0 ? await db.collection('groups').find({ _id: { $in: groupIds } }).toArray() : []
    res.json({
      id: user._id.toString(), telegram_id: user.telegram_id.toString(),
      username: user.username, first_name: user.first_name, role: user.role,
      avatar: user.avatar_url,
      groups: groups.map(g => ({ id: g._id.toString(), name: g.name, chat_id: g.chat_id?.toString() }))
    })
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' })
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true })
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const newToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, telegramId: user.telegram_id.toString() },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    res.json({ token: newToken })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
