import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDB, db } from './models/db.js'
import groupRoutes from './routes/groups.js'
import ownerRoutes from './routes/owner.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { startBot } from './services/bot.js'

dotenv.config()

const app = express()

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

app.use(express.json())

await connectDB()

// DEBUG: Check auth routes loading
let authRoutes
try {
  const authModule = await import('./routes/auth.js')
  authRoutes = authModule.default
  console.log('=== AUTH ROUTES LOADED ===')
  console.log('=== authRoutes type ===', typeof authRoutes)
  console.log('=== authRoutes stack ===', authRoutes?.stack?.map(l => l.route?.path))
} catch (err) {
  console.error('=== AUTH ROUTES FAILED TO LOAD ===')
  console.error(err.message)
  console.error(err.stack)
  authRoutes = express.Router()
}

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

// DEBUG: List all registered routes
app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/owner', ownerRoutes)

// DEBUG: Show all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = []
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) })
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({ path: handler.route.path, methods: Object.keys(handler.route.methods) })
        }
      })
    }
  })
  res.json({ routes })
})

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`TGGuard backend running on port ${PORT}`)
})

const botMode = process.env.BOT_MODE || 'polling'
const botStarted = await startBot(botMode)
if (botStarted) {
  console.log(`TGGuard bot started in ${botMode} mode`)
} else {
  console.error('WARNING: Bot failed to start. Check BOT_TOKEN configuration.')
}
