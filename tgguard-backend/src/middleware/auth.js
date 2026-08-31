import jwt from 'jsonwebtoken'
import { pool } from '../models/db.js'

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = result.rows[0]
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' })
    }
    next()
  }
}

export function requireGroupAccess(req, res, next) {
  // Middleware to verify user has access to the requested group
  // This will be implemented in group routes
  next()
}
