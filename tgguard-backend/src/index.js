import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDB, db } from './models/db.js'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import ownerRoutes from './routes/owner.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { startBot } from './services/bot.js'

dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

app.use(express.json())

// Connect MongoDB
await connectDB()

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tgguard-backend',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', async (req, res) => {
  try {
    await db.admin().ping()
    res.status(200).json({
      status: 'ok',
      service: 'tgguard-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    })
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'tgguard-backend',
      database: 'disconnected'
    })
  }
})

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'TGGuard API',
    endpoints: ['/api/health', '/api/auth', '/api/groups', '/api/owner']
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/owner', ownerRoutes)

// 404 and error handlers
app.use(notFoundHandler)
app.use(errorHandler)

// ── STARTUP: Log all registered routes ──
function logRoutes() {
  const routes = []
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',')
      routes.push(`${methods} ${middleware.route.path}`)
    } else if (middleware.name === 'router' && middleware.handle?.stack) {
      const basePath = middleware.regexp?.toString().replace('\\^', '').replace('\\/?(?=\\/|$)', '') || ''
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',')
          const fullPath = basePath + handler.route.path
          routes.push(`${methods} ${fullPath}`)
        }
      })
    }
  })
  console.log('\n📋 REGISTERED ROUTES:')
  routes.forEach(r => console.log(`   ${r}`))
  console.log('')
}

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`\n🚀 TGGuard backend running on port ${PORT}`)
  console.log(`   Health:  http://localhost:${PORT}/api/health`)
  console.log(`   Auth:    http://localhost:${PORT}/api/auth/telegram`)
  console.log(`   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  logRoutes()
})

// Start bot
const botMode = process.env.BOT_MODE || 'polling'
const botStarted = await startBot(botMode)
if (botStarted) {
  console.log(`🤖 TGGuard bot started in ${botMode} mode`)
} else {
  console.error('⚠️  WARNING: Bot failed to start. Check BOT_TOKEN configuration.')
}
