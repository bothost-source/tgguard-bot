import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgguard'

export const client = new MongoClient(uri)
export let db

export async function connectDB() {
  await client.connect()
  db = client.db('tgguard')
  console.log('Connected to MongoDB')

  // Create indexes
  await db.collection('users').createIndex({ telegram_id: 1 }, { unique: true })
  await db.collection('groups').createIndex({ chat_id: 1 }, { unique: true })
  await db.collection('groups').createIndex({ admin_user_id: 1 })
  await db.collection('group_settings').createIndex({ group_id: 1 }, { unique: true })
  await db.collection('moderation_logs').createIndex({ group_id: 1, created_at: -1 })
  await db.collection('reports').createIndex({ group_id: 1, status: 1 })
  await db.collection('group_members').createIndex({ group_id: 1, telegram_id: 1 }, { unique: true })
  await db.collection('game_sessions').createIndex({ group_id: 1, status: 1 })
  await db.collection('ratings').createIndex({ user_id: 1 })
  await db.collection('owner_audit_log').createIndex({ created_at: -1 })

  return db
}

export async function closeDB() {
  await client.close()
}
