import express from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'

const router = express.Router()

// Telegram Login Widget callback
router.get('/telegram', async (req, res) => {
  try {
    const { id, first_name, username, photo_url, auth_date, hash } = req.query

    // Verify Telegram auth (in production, verify hash with bot token)
    // For now, we trust the data and create/update user

    const telegramId = BigInt(id)

    // Find or create user
    let user = await db.collection('users').findOne({ telegram_id: telegramId })

    if (!user) {
      // Check if this is the owner
      const isOwner = telegramId.toString() === process.env.OWNER_TELEGRAM_ID

      const result = await db.collection('users').insertOne({
        telegram_id: telegramId,
        username: username || null,
        first_name: first_name || null,
        avatar_url: photo_url || null,
        role: isOwner ? 'owner' : 'community_admin',
        created_at: new Date(),
        updated_at: new Date()
      })

      user = await db.collection('users').findOne({ _id: result.insertedId })
    } else {
      // Update last seen
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { updated_at: new Date() } }
      )
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, telegramId: user.telegram_id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/login?token=${token}`
    res.redirect(redirectUrl)

  } catch (err) {
    console.error('Telegram auth error:', err)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`)
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No token' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    )

    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      id: user._id.toString(),
      telegram_id: user.telegram_id.toString(),
      username: user.username,
      first_name: user.first_name,
      role: user.role,
      avatar: user.avatar_url
    })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
