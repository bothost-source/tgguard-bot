import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'

// ============================================
// VERIFY TELEGRAM LOGIN WIDGET HASH
// Algorithm per Telegram docs:
// 1. Secret key = SHA256(bot_token)
// 2. Data check string = sorted key=value pairs joined by \n
// 3. Hash = HMAC_SHA256(secret_key, data_check_string) in hex
// ============================================
export function verifyTelegramHash(authData, botToken) {
  const { hash, ...data } = authData
  if (!hash) return false

  const dataCheckString = Object.keys(data)
    .filter(key => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(hash, 'hex'))
}

export function isAuthRecent(authDate, maxAgeSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000)
  return (now - parseInt(authDate)) < maxAgeSeconds
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    )
    if (!user) return res.status(401).json({ error: 'User not found' })

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' })
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
    console.error('Auth middleware error:', err)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient permissions' })
    next()
  }
}

export async function requireGroupAccess(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })

    const groupId = req.params.id || req.params.groupId || req.body.group_id
    if (!groupId) return res.status(400).json({ error: 'Group ID required' })

    if (req.user.role === 'owner') {
      const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) })
      if (!group) return res.status(404).json({ error: 'Group not found' })
      req.group = group
      return next()
    }

    const membership = await db.collection('group_memberships').findOne({
      group_id: new ObjectId(groupId),
      user_id: req.user._id,
      role: { $in: ['admin', 'moderator'] }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: not an admin of this group' })
    }

    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    req.group = group
    req.membership = membership
    next()
  } catch (err) {
    console.error('Group access check error:', err)
    return res.status(500).json({ error: 'Failed to verify group access' })
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next()

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    )
    if (user) req.user = user
    next()
  } catch {
    next()
  }
}
