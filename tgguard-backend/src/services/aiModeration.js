import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'
import * as tg from './telegram.js'
import { buildAIModerationNotification, buildRichMessage } from './richMessage.js'

/**
 * ═══════════════════════════════════════════════════════════════
 * TGGuard AI Moderation Module
 * Implements the 16-point AI Moderation Specification
 * ═══════════════════════════════════════════════════════════════
 */

// ─── AI PROVIDER CONFIG ───
const AI_PROVIDER = process.env.AI_MODERATION_PROVIDER || 'openai'
const AI_API_KEY = process.env.AI_MODERATION_API_KEY
const AI_MODEL = process.env.AI_MODERATION_MODEL || 'gpt-4o-mini'
const AI_TIMEOUT_MS = parseInt(process.env.AI_MODERATION_TIMEOUT || '5000')
const AI_MAX_RETRIES = parseInt(process.env.AI_MODERATION_MAX_RETRIES || '2')
const AI_RETRY_DELAY_MS = parseInt(process.env.AI_MODERATION_RETRY_DELAY || '1000')

// ─── PROMOTIONAL INTENT KEYWORDS (for fast pre-filtering) ───
const PROMOTIONAL_TRIGGERS = [
  'dm me', 'contact me', 'my business', 'my service', 'hire me',
  'for sale', 'buy now', 'order here', 'link in bio', 'check my',
  'promote', 'advertise', 'affiliate', 'referral code', 'discount code',
  'limited time', 'special offer', 'free trial', 'sign up', 'join now'
]

// ─── SUSPICIOUS PATTERNS (for fast pre-filtering) ───
const SUSPICIOUS_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, category: 'suspicious links', reason: 'Email address in message' },
  { pattern: /https?:\/\/[^\s]+\.(tk|ml|ga|cf|gq)\b/, category: 'suspicious links', reason: 'Suspicious TLD detected' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, category: 'suspicious/scam', reason: 'Possible credit card number' },
  { pattern: /\b[A-Za-z0-9]{30,}\b/, category: 'suspicious/scam', reason: 'Suspicious long token/string' }
]

// ─── HIGH CHAT ACTIVITY TRACKING ───
const userMessageHistory = new Map() // chatId -> userId -> [{timestamp, text}]
const HISTORY_WINDOW_MS = 60000 // 1 minute window
const MAX_HISTORY_PER_USER = 50

/**
 * Main AI moderation entry point
 * Called from bot.js message handler AFTER normal protection checks
 * 
 * Flow:
 * 1. Check if AI moderation is enabled for this group
 * 2. Fast pre-filter (rule-based checks before AI)
 * 3. Check if admin (exempt from AI moderation)
 * 4. Send to AI for analysis if needed
 * 5. Execute configured action
 * 6. Log the event
 */
export async function processAIModeration(botInstance, msg, group, settings) {
  const chatId = msg.chat.id
  const user = msg.from
  const text = msg.text || msg.caption || ''

  // ─── 1. CHECK IF AI MODERATION ENABLED ───
  const aiSettings = await db.collection('ai_moderation_settings').findOne({ group_id: group._id })
  if (!aiSettings || !aiSettings.enabled) {
    return { moderated: false, reason: 'AI moderation disabled' }
  }

  // ─── 2. FAST PRE-FILTER (don't send everything to AI) ───
  const preFilterResult = await runPreFilter(text, user, chatId, aiSettings)
  if (preFilterResult.action === 'allow') {
    return { moderated: false, reason: 'Pre-filter allowed', preFilterResult }
  }
  if (preFilterResult.action === 'block') {
    // Fast block - no AI needed
    await executeAIAction(botInstance, msg, group, aiSettings, preFilterResult)
    await logAIModerationEvent(group._id, user, msg, preFilterResult)
    return { moderated: true, reason: 'Pre-filter blocked', preFilterResult }
  }

  // ─── 3. CHECK ADMIN EXEMPTION ───
  const isAdmin = await tg.isUserAdmin(chatId, user.id)
  if (isAdmin) {
    return { moderated: false, reason: 'Admin exempt', isAdmin: true }
  }

  // ─── 4. AI ANALYSIS ───
  let aiResult = null
  let aiError = null

  try {
    aiResult = await analyzeWithAI(text, aiSettings, user, chatId)
  } catch (err) {
    aiError = err
    console.error('AI moderation analysis error:', err.message)

    // ─── 14. AI FAILURE HANDLING ───
    // Log failure, continue with normal protection
    await db.collection('ai_moderation_logs').insertOne({
      group_id: group._id,
      user_telegram_id: BigInt(user.id),
      message_id: msg.message_id,
      message_text: text.substring(0, 500),
      status: 'ai_error',
      error: err.message,
      created_at: new Date()
    })

    // Continue normal rule-based protection (don't block message)
    return { moderated: false, reason: 'AI service unavailable', aiError: err.message }
  }

  if (!aiResult || !aiResult.shouldModerate) {
    return { moderated: false, reason: 'AI allowed', aiResult }
  }

  // ─── 5. EXECUTE CONFIGURED ACTION ───
  await executeAIAction(botInstance, msg, group, aiSettings, aiResult)

  // ─── 6. LOG THE EVENT ───
  await logAIModerationEvent(group._id, user, msg, aiResult)

  return { moderated: true, reason: aiResult.category, aiResult }
}

/**
 * Fast pre-filter before sending to AI
 * Rules:
 * - Allow normal active conversation
 * - Allow long conversations
 * - Allow fast but legitimate conversation
 * - Block repeated identical messages
 * - Block obvious spam patterns
 * - Block suspicious automated behavior
 */
async function runPreFilter(text, user, chatId, aiSettings) {
  const userId = user.id
  const now = Date.now()

  // Initialize history for this chat
  if (!userMessageHistory.has(chatId)) {
    userMessageHistory.set(chatId, new Map())
  }
  const chatHistory = userMessageHistory.get(chatId)

  if (!chatHistory.has(userId)) {
    chatHistory.set(userId, [])
  }
  const history = chatHistory.get(userId)

  // Clean old history
  const cutoff = now - HISTORY_WINDOW_MS
  const recentHistory = history.filter(h => h.timestamp > cutoff)
  chatHistory.set(userId, recentHistory)

  // ─── HIGH CHAT ACTIVITY CHECK (Point 3 of spec) ───
  // Don't punish high activity alone
  const messageCount = recentHistory.length
  const uniqueMessages = new Set(recentHistory.map(h => h.text)).size

  // If user sends many messages but they're all different (normal conversation)
  if (messageCount > 10 && uniqueMessages / messageCount > 0.7) {
    return { action: 'allow', reason: 'Normal active conversation' }
  }

  // ─── REPEATED IDENTICAL MESSAGES ───
  const identicalCount = recentHistory.filter(h => h.text === text).length
  if (identicalCount >= 3) {
    return { 
      action: 'block', 
      category: 'repeated unwanted messages',
      confidence: 0.95,
      reason: `Repeated identical message ${identicalCount} times`
    }
  }

  // ─── OBVIOUS SPAM PATTERNS ───
  const spamPatterns = [
    /(.+)\1{4,}/, // Repeated characters
    /^[A-Z\s!]{50,}$/, // ALL CAPS shouting
    /\b(buy now|click here|limited offer|act now|don't miss)\b/gi,
    /(http[s]?:\/\/){3,}/ // Multiple links
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return {
        action: 'block',
        category: 'spam',
        confidence: 0.9,
        reason: 'Obvious spam pattern detected'
      }
    }
  }

  // ─── SUSPICIOUS PATTERN CHECK ───
  for (const suspicious of SUSPICIOUS_PATTERNS) {
    if (suspicious.pattern.test(text)) {
      return {
        action: 'block',
        category: suspicious.category,
        confidence: 0.85,
        reason: suspicious.reason
      }
    }
  }

  // ─── PROMOTION PRE-FILTER (Point 5) ───
  if (aiSettings.promotion_protection?.enabled) {
    const lowerText = text.toLowerCase()
    const triggerCount = PROMOTIONAL_TRIGGERS.filter(t => lowerText.includes(t)).length

    if (triggerCount >= 2) {
      return {
        action: 'ai_check',
        category: 'promotional content',
        confidence: 0.7,
        reason: `Multiple promotional triggers detected (${triggerCount})`
      }
    }
  }

  // ─── SUSPICIOUS AUTOMATED BEHAVIOR ───
  if (recentHistory.length >= 5) {
    const timeSpan = now - recentHistory[0].timestamp
    const rate = recentHistory.length / (timeSpan / 1000) // messages per second

    if (rate > 2) { // More than 2 messages per second sustained
      return {
        action: 'block',
        category: 'suspicious/scam',
        confidence: 0.8,
        reason: 'Suspicious message rate detected'
      }
    }
  }

  // ─── SCAM ATTEMPTS ───
  const scamPatterns = [
    /\b(send\s+(?:btc|bitcoin|eth|crypto)|wallet\s*address|private\s*key|seed\s*phrase)\b/gi,
    /\b(double\s+your|guaranteed\s+return|invest\s+now|send\s+money)\b/gi,
    /\b(verify\s+your\s+account|account\s+suspended|unusual\s+activity)\b/gi
  ]

  for (const pattern of scamPatterns) {
    if (pattern.test(text)) {
      return {
        action: 'block',
        category: 'suspicious/scam',
        confidence: 0.88,
        reason: 'Potential scam attempt detected'
      }
    }
  }

  // ─── MALICIOUS LINKS ───
  const urlPattern = /https?:\/\/[^\s]+/g
  const urls = text.match(urlPattern) || []
  const suspiciousDomains = ['bit.ly', 'tinyurl', 't.co', 'short.link', 'goo.gl']

  for (const url of urls) {
    if (suspiciousDomains.some(d => url.includes(d))) {
      return {
        action: 'block',
        category: 'suspicious links',
        confidence: 0.75,
        reason: 'Shortened/suspicious URL detected'
      }
    }
  }

  // ─── NO CLEAR VIOLATION - SEND TO AI ───
  return { action: 'ai_check', reason: 'No pre-filter match, needs AI analysis' }
}

/**
 * Analyze message with AI provider
 * 
 * Point 4: AI Moderation Features
 * Point 6: Context-Aware Promotion Detection
 */
async function analyzeWithAI(text, aiSettings, user, chatId) {
  if (!AI_API_KEY) {
    throw new Error('AI moderation API key not configured')
  }

  const categories = aiSettings.detection_categories || [
    'spam', 'harassment', 'toxic/abusive', 'suspicious/scam',
    'phishing-style', 'repeated unwanted messages', 'suspicious links',
    'promotional content', 'self-promotion', 'business-promotion'
  ]

  const promotionContext = aiSettings.promotion_protection?.enabled
    ? `
PROMOTION DETECTION RULES (Point 6 - Context-Aware):
- Normal conversation about businesses is ALLOWED (e.g., "This phone was bought from Samsung")
- Only flag messages with CLEAR promotional INTENT (e.g., "I sell phones. DM me for cheap Samsung phones. Contact me...")
- Consider: context, intent, repetition, behavior patterns
- Do NOT flag simply because business-related words appear
`
    : ''

  const prompt = `You are TGGuard AI, a Telegram group moderation assistant.
Analyze the following message and determine if it violates group rules.

Message: """${text.substring(0, 2000)}"""

Detection Categories: ${categories.join(', ')}

${promotionContext}

RULES:
1. High chat activity alone is NOT spam (Point 3)
2. Normal conversation about businesses is ALLOWED (Point 6)
3. Only flag clear violations with confidence > 0.7
4. Consider context and intent, not just keywords
5. Be conservative - avoid false positives

Respond in JSON format:
{
  "shouldModerate": boolean,
  "category": "one of the categories or null",
  "confidence": number (0-1),
  "reason": "brief explanation",
  "suggestedAction": "delete|warn|delete_warn|restrict|kick|ban|none"
}`

  let lastError = null

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: 'You are a precise content moderation AI. Respond only with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('Empty AI response')
      }

      const result = JSON.parse(content)

      // Validate result
      if (typeof result.shouldModerate !== 'boolean') {
        throw new Error('Invalid AI response format')
      }

      return {
        shouldModerate: result.shouldModerate && result.confidence >= (aiSettings.confidence_threshold || 0.7),
        category: result.category || 'unknown',
        confidence: result.confidence || 0,
        reason: result.reason || 'AI-detected violation',
        suggestedAction: result.suggestedAction || 'delete_warn'
      }

    } catch (err) {
      lastError = err
      console.error(`AI analysis attempt ${attempt + 1} failed:`, err.message)

      if (attempt < AI_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, AI_RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('All AI analysis attempts failed')
}

/**
 * Execute the configured AI moderation action
 * Point 8: Promotion Protection Configuration
 * Point 10: Example Promotion Flow
 */
async function executeAIAction(botInstance, msg, group, aiSettings, result) {
  const chatId = msg.chat.id
  const user = msg.from
  const messageId = msg.message_id

  // Get the configured action for this category
  let action = 'delete_warn' // default

  if (aiSettings.promotion_protection?.enabled && 
      (result.category === 'promotional content' || 
       result.category === 'self-promotion' || 
       result.category === 'business-promotion')) {
    action = aiSettings.promotion_protection.action || 'delete_warn'
  } else if (aiSettings.category_actions && aiSettings.category_actions[result.category]) {
    action = aiSettings.category_actions[result.category]
  }

  // Execute the action
  const actionParts = action.split('_')
  const primaryAction = actionParts[0] // delete, warn, restrict, kick, ban
  const secondaryAction = actionParts[1] || null // warn, restrict

  let executed = false

  // Delete message if primary or secondary action includes delete
  if (primaryAction === 'delete' || secondaryAction === 'delete') {
    await tg.deleteMessage(chatId, messageId)
    executed = true
  }

  // Warn user
  if (primaryAction === 'warn' || secondaryAction === 'warn') {
    await addAIWarning(msg, result.reason, group)
    executed = true
  }

  // Restrict user
  if (primaryAction === 'restrict' || secondaryAction === 'restrict') {
    const duration = aiSettings.restriction_duration || 3600 // 1 hour default
    await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + duration)
    executed = true
  }

  // Kick user
  if (primaryAction === 'kick') {
    await tg.kickUser(chatId, user.id)
    executed = true
  }

  // Ban user
  if (primaryAction === 'ban') {
    await tg.banUser(chatId, user.id)
    executed = true
  }

  // Send notification if configured
  if (aiSettings.send_notifications !== false && executed) {
    const notificationText = buildAIModerationNotification(
      result.category,
      user,
      result.confidence,
      result.reason
    )

    await botInstance.sendMessage(chatId, notificationText, {
      parse_mode: 'HTML',
      disable_notification: true
    })
  }

  return executed
}

/**
 * Add an AI-generated warning to a user
 */
async function addAIWarning(msg, reason, group) {
  const chatId = msg.chat.id
  const user = msg.from

  await db.collection('warnings').insertOne({
    group_id: group._id,
    user_telegram_id: BigInt(user.id),
    username: user.username || null,
    first_name: user.first_name || null,
    reason: reason,
    source: 'ai_moderation',
    message_id: msg.message_id,
    created_at: new Date()
  })

  await db.collection('group_members').updateOne(
    { group_id: group._id, telegram_id: BigInt(user.id) },
    { $inc: { warnings: 1, ai_warnings: 1 }, $set: { updated_at: new Date() } }
  )

  // Check warning ladder
  const warningCount = await db.collection('warnings').countDocuments({
    group_id: group._id,
    user_telegram_id: BigInt(user.id)
  })

  if (warningCount >= 5) {
    await tg.kickUser(chatId, user.id)
    await botInstance.sendMessage(chatId, 
      `🚫 <b>${user.first_name || 'User'}</b> removed after <b>${warningCount}</b> AI warnings.`,
      { parse_mode: 'HTML', disable_notification: true }
    )
  } else if (warningCount >= 3) {
    await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 86400)
    await botInstance.sendMessage(chatId,
      `🔇 <b>${user.first_name || 'User'}</b> restricted for 24 hours after <b>${warningCount}</b> AI warnings.`,
      { parse_mode: 'HTML', disable_notification: true }
    )
  }
}

/**
 * Log AI moderation event (Point 15)
 */
async function logAIModerationEvent(groupId, user, msg, result) {
  await db.collection('ai_moderation_logs').insertOne({
    group_id: groupId,
    user_telegram_id: BigInt(user.id),
    user_username: user.username || null,
    user_first_name: user.first_name || null,
    message_id: msg.message_id,
    message_text: (msg.text || msg.caption || '').substring(0, 500),
    detection_category: result.category || 'unknown',
    ai_decision: result.shouldModerate ? 'blocked' : 'allowed',
    confidence: result.confidence || 0,
    reason: result.reason || 'No reason provided',
    action_taken: result.suggestedAction || 'none',
    pre_filtered: result.action === 'block',
    timestamp: new Date(),
    user_was_exempt: false,
    final_result: result.shouldModerate ? 'action_executed' : 'no_action'
  })
}

/**
 * Initialize AI moderation settings for a new group
 * Called when bot is added to a group
 */
export async function initAIModerationSettings(groupId) {
  await db.collection('ai_moderation_settings').insertOne({
    group_id: groupId,
    enabled: false,
    confidence_threshold: 0.75,
    detection_categories: [
      'spam',
      'harassment',
      'toxic/abusive',
      'suspicious/scam',
      'phishing-style',
      'repeated unwanted messages',
      'suspicious links',
      'promotional content'
    ],
    category_actions: {
      spam: 'delete_warn',
      harassment: 'delete_restrict',
      'toxic/abusive': 'delete_restrict',
      'suspicious/scam': 'delete_ban',
      'phishing-style': 'delete_ban',
      'repeated unwanted messages': 'delete_warn',
      'suspicious links': 'delete_warn',
      'promotional content': 'delete_warn'
    },
    promotion_protection: {
      enabled: false,
      sensitivity: 'medium',
      action: 'delete_warn'
    },
    restriction_duration: 3600,
    send_notifications: true,
    whitelist_users: [],
    whitelist_domains: [],
    created_at: new Date(),
    updated_at: new Date()
  })
}

/**
 * Get AI moderation stats for a group
 */
export async function getAIModerationStats(groupId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalEvents, blockedCount, allowedCount, categoryBreakdown] = await Promise.all([
    db.collection('ai_moderation_logs').countDocuments({ group_id: groupId, timestamp: { $gte: since } }),
    db.collection('ai_moderation_logs').countDocuments({ group_id: groupId, timestamp: { $gte: since }, ai_decision: 'blocked' }),
    db.collection('ai_moderation_logs').countDocuments({ group_id: groupId, timestamp: { $gte: since }, ai_decision: 'allowed' }),
    db.collection('ai_moderation_logs').aggregate([
      { $match: { group_id: groupId, timestamp: { $gte: since } } },
      { $group: { _id: '$detection_category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
  ])

  return {
    total_events: totalEvents,
    blocked: blockedCount,
    allowed: allowedCount,
    block_rate: totalEvents > 0 ? Math.round((blockedCount / totalEvents) * 100) : 0,
    category_breakdown: categoryBreakdown,
    period_days: days
  }
}

/**
 * Clean up old message history (call periodically)
 */
export function cleanupMessageHistory() {
  const cutoff = Date.now() - HISTORY_WINDOW_MS
  for (const [chatId, chatHistory] of userMessageHistory) {
    for (const [userId, history] of chatHistory) {
      const filtered = history.filter(h => h.timestamp > cutoff)
      if (filtered.length === 0) {
        chatHistory.delete(userId)
      } else {
        chatHistory.set(userId, filtered)
      }
    }
    if (chatHistory.size === 0) {
      userMessageHistory.delete(chatId)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupMessageHistory, 300000)

export default {
  processAIModeration,
  initAIModerationSettings,
  getAIModerationStats,
  cleanupMessageHistory
}
