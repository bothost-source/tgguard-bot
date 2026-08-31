import jwt from 'jsonwebtoken'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    )
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
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
  next()
}
