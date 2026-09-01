import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgguard'

export const client = new MongoClient(uri)
export let db

export async function connectDB() {
  await client.connect()
  db = client.db('tgguard')
  console.log('Connected to MongoDB')

  await db.collection('users').createIndex({ telegram_id: 1 }, { unique: true })
  await db.collection('users').createIndex({ role: 1 })
  await db.collection('users').createIndex({ created_at: -1 })

  await db.collection('groups').createIndex({ chat_id: 1 }, { unique: true })
  await db.collection('groups').createIndex({ admins: 1 })
  await db.collection('groups').createIndex({ is_active: 1 })
  await db.collection('groups').createIndex({ created_at: -1 })

  await db.collection('group_memberships').createIndex({ group_id: 1, user_id: 1 }, { unique: true })
  await db.collection('group_memberships').createIndex({ user_id: 1 })

  await db.collection('group_settings').createIndex({ group_id: 1 }, { unique: true })

  await db.collection('filter_words').createIndex({ group_id: 1 })
  await db.collection('filter_words').createIndex({ group_id: 1, word: 1 }, { unique: true })

  await db.collection('warnings').createIndex({ group_id: 1, user_telegram_id: 1 })
  await db.collection('warnings').createIndex({ group_id: 1, created_at: -1 })

  await db.collection('verification_sessions').createIndex({ group_id: 1, user_telegram_id: 1 })
  await db.collection('verification_sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  await db.collection('reports').createIndex({ group_id: 1, status: 1 })
  await db.collection('reports').createIndex({ group_id: 1, created_at: -1 })

  await db.collection('moderation_logs').createIndex({ group_id: 1, created_at: -1 })
  await db.collection('moderation_logs').createIndex({ created_at: -1 })

  await db.collection('game_configurations').createIndex({ group_id: 1 }, { unique: true })
  await db.collection('game_sessions').createIndex({ group_id: 1, status: 1 })
  await db.collection('game_sessions').createIndex({ status: 1, created_at: -1 })

  await db.collection('game_players').createIndex({ session_id: 1, user_telegram_id: 1 }, { unique: true })
  await db.collection('game_answers').createIndex({ session_id: 1, user_telegram_id: 1, round: 1 })
  await db.collection('game_scores').createIndex({ session_id: 1, user_telegram_id: 1 }, { unique: true })
  await db.collection('game_scores').createIndex({ group_id: 1, user_telegram_id: 1 })

  await db.collection('feedback').createIndex({ user_id: 1 })
  await db.collection('feedback').createIndex({ rating: 1 })
  await db.collection('feedback').createIndex({ created_at: -1 })

  await db.collection('ratings').createIndex({ user_id: 1 }, { unique: true })
  await db.collection('ratings').createIndex({ created_at: -1 })

  await db.collection('system_logs').createIndex({ level: 1, created_at: -1 })
  await db.collection('system_logs').createIndex({ component: 1 })
  await db.collection('system_logs').createIndex({ created_at: -1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

  await db.collection('owner_audit_log').createIndex({ created_at: -1 })
  await db.collection('owner_audit_log').createIndex({ action: 1 })

  await db.collection('bot_state').createIndex({ key: 1 }, { unique: true })

  return db
}

export async function closeDB() {
  await client.close()
}
