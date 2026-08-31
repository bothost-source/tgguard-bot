import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDB } from './models/db.js'
import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import ownerRoutes from './routes/owner.js'
import { errorHandler } from './middleware/error.js'

dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}))

// Rate limiting — BUT skip health check so UptimeRobot doesn't get blocked
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

app.use(express.json())

// Connect MongoDB before starting server
await connectDB()

// === HEALTH CHECK ENDPOINTS ===
// Root health check (UptimeRobot can hit this too)
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'tgguard-bot',
    timestamp: new Date().toISOString() 
  })
})

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'tgguard-bot',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Also handle /api/ bare path gracefully (your screenshot error)
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

// Error handler
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`TGGuard backend running on port ${PORT}`)
})
