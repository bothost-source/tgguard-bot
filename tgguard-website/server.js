const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

// Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tgguard-frontend',
    timestamp: new Date().toISOString()
  })
})

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`TGGuard frontend running on port ${PORT}`)
})
