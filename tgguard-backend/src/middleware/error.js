import { db } from '../models/db.js'

async function logError(err, req) {
  try {
    await db.collection('system_logs').insertOne({
      level: err.status >= 500 ? 'error' : 'warning',
      message: err.message,
      stack: err.stack,
      status: err.status,
      path: req?.path,
      method: req?.method,
      user_id: req?.user?._id,
      ip: req?.ip,
      user_agent: req?.headers?.['user-agent'],
      component: 'api',
      created_at: new Date()
    })
  } catch (logErr) {
    console.error('Failed to log error:', logErr)
  }
}

export async function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  await logError(err, req)
  const status = err.status || err.statusCode || 500
  const isDev = process.env.NODE_ENV === 'development'
  const response = { error: err.message || 'Internal server error', status }
  if (isDev && err.stack) response.stack = err.stack
  if (err.code) response.code = err.code
  res.status(status).json(response)
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method })
}
