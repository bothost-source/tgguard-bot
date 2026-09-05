import TelegramBot from 'node-telegram-bot-api'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'
import * as tg from './telegram.js'
import jwt from 'jsonwebtoken'
import { 
  sendRich, 
  buildWelcomeMessage, 
  buildDashboardMessage,
  buildActionNotification,
  buildAntiLinkNotification,
  buildLockdownNotification,
  toTelegramHTML
} from './richMessage.js'
import { 
  processAIModeration, 
  initAIModerationSettings 
} from './aiModeration.js'
import {
  startGame,
  handleGameTextAnswer,
  handleGameCallback,
  getLeaderboard
} from './games.js'

const BOT_TOKEN = process.env.BOT_TOKEN
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID
let bot = null
let isRunning = false

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function inlineKeyboard(buttons) {
  return { reply_markup: { inline_keyboard: buttons } }
}

/**
 * Check if a chat is a private chat (DM)
 * @param {Object} chat - Telegram chat object
 * @returns {boolean}
 */
function isPrivateChat(chat) {
  return chat?.type === 'private'
}

/**
 * Check if a chat is a group/supergroup
 * @param {Object} chat - Telegram chat object
 * @returns {boolean}
 */
function isGroupChat(chat) {
  return chat?.type === 'group' || chat?.type === 'supergroup'
}

/**
 * Generate a secure dashboard token
 * Includes groupId, telegramId, role, and timestamp
 */
function generateDashboardToken(userId, chatId, role = 'community_admin') {
  return jwt.sign(
    { 
      telegramId: userId.toString(), 
      groupId: chatId.toString(), 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.BOT_TOKEN,
    { expiresIn: '7d' }
  )
}

/**
 * Get anti-link strike count for a user
 */
async function getAntiLinkStrikes(groupId, userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
  return db.collection('moderation_logs').countDocuments({
    group_id: groupId,
    user_telegram_id: BigInt(userId),
    action: { $in: ['delete', 'delete_warn', 'delete_restrict'] },
    reason: { $regex: /link/i },
    created_at: { $gte: since }
  })
}

// ═══════════════════════════════════════════════════════════════
// INIT BOT
// ═══════════════════════════════════════════════════════════════

export function initBot() {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not configured - bot cannot start')
    return null
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: false })

  // ─── /START COMMAND ───
  bot.onText(/\/start/, async (msg) => {
    const user = msg.from
    const chatId = msg.chat.id
    const isGroup = isGroupChat(msg.chat)

    await db.collection('users').updateOne(
      { telegram_id: BigInt(user.id) },
      {
        $set: {
          username: user.username || null,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          language_code: user.language_code || 'en',
          updated_at: new Date()
        },
        $setOnInsert: {
          telegram_id: BigInt(user.id),
          role: user.id.toString() === OWNER_TELEGRAM_ID ? 'owner' : 'community_admin',
          created_at: new Date()
        }
      },
      { upsert: true }
    )

    if (isGroup) {
      // In groups: NO website links, just bot info
      await sendRich(bot, chatId, `<b>👋 TGGuard is active!</b>

This group is protected by TGGuard.

<b>Available commands:</b>
• /menu — Open main menu
• /games — Play group games
• /help — Get help

<i>Only admins can access the dashboard.</i>`)
    } else {
      // In private chat: show dashboard link
      const welcomeText = `<b>👋 Welcome to TGGuard!</b>

TGGuard helps protect and manage Telegram communities with smart moderation, verification, welcome messages, reports, games and analytics.

Your group is managed from the TGGuard Dashboard.

Tap below to get started.`

      await sendRich(bot, chatId, welcomeText, inlineKeyboard([
        [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
        [{ text: '📚 Documentation', url: `${process.env.FRONTEND_URL}/docs` }],
        [{ text: '❓ Help', callback_data: 'help' }]
      ]))
    }
  })

  // ─── /MENU COMMAND ───
  bot.onText(/\/menu/, async (msg) => { await showMainMenu(msg) })

  // ─── /HELP COMMAND ───
  bot.onText(/\/help/, async (msg) => { await showHelp(msg) })

  // ─── /GAMES COMMAND ───
  bot.onText(/\/games/, async (msg) => { await showGamesMenu(msg) })

  // ─── CALLBACK QUERY HANDLER ───
  bot.on('callback_query', async (query) => {
    const data = query.data
    const msg = query.message
    const chatId = msg.chat.id
    const isGroup = isGroupChat(msg.chat)

    try {
      await bot.answerCallbackQuery(query.id)

      switch (data) {
        case 'main_menu': await showMainMenu(query); break
        case 'help': await showHelp(query); break
        case 'faq': await showFAQ(query); break
        case 'help_protection': await showHelpProtection(query); break
        case 'help_games': await showHelpGames(query); break
        case 'help_welcome': await showHelpWelcome(query); break
        case 'help_verification': await showHelpVerification(query); break
        case 'help_reports': await showHelpReports(query); break
        case 'help_setup': await showHelpSetup(query); break
        case 'add_to_group': await showAddToGroup(query); break
        case 'control_panel':
          await sendRich(bot, chatId, `<b>⚙️ Control Panel</b>

Open the Control Panel to manage your group settings.`)
          break
        case 'games': await showGamesMenu(query); break
        case 'rate': await showRateMenu(query); break
        case 'leaderboard': await showLeaderboard(query); break
        case 'how_to_play': await showHowToPlay(query); break
        case 'word_scramble': await startGame(bot, query, 'scramble'); break
        case 'world_trivia': await startGame(bot, query, 'trivia'); break
        case 'speed_quiz': await startGame(bot, query, 'speed'); break
        case 'missing_letters': await startGame(bot, query, 'letters'); break
        case 'emoji_challenge': await startGame(bot, query, 'emoji'); break
        case 'dashboard_button':
          await handleDashboardButton(query)
          break
        default:
          if (data.match(/^game_answer_/)) await handleGameCallback(bot, query, data)
          else if (data.startsWith('verify_')) await handleVerification(query, data)
          else if (data.startsWith('report_')) await handleReport(query, data)
          else await sendRich(bot, chatId, '❓ Unknown action. Use /menu to see options.')
      }
    } catch (err) {
      console.error('Callback query error:', err)
      await sendRich(bot, chatId, '❌ An error occurred. Please try again.')
    }
  })

  // ─── NEW CHAT MEMBERS ───
  bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id
    const newMembers = msg.new_chat_members
    const botInfo = await tg.getBotInfo()
    const wasBotAdded = newMembers.some(m => m.id === botInfo?.id)
    if (wasBotAdded) { await handleBotAdded(msg, chatId); return }
    for (const member of newMembers) { await handleNewMember(msg, chatId, member) }
  })

  // ─── LEFT CHAT MEMBER ───
  bot.on('left_chat_member', async (msg) => {
    const chatId = msg.chat.id
    const member = msg.left_chat_member
    const botInfo = await tg.getBotInfo()
    if (member.id === botInfo?.id) {
      await db.collection('groups').updateOne(
        { chat_id: BigInt(chatId) },
        { $set: { is_active: false, bot_is_admin: false, updated_at: new Date() } }
      )
      return
    }
    await db.collection('groups').updateOne(
      { chat_id: BigInt(chatId) },
      { $inc: { members_left_today: 1 }, $set: { updated_at: new Date() } }
    )
  })

  // ─── MY CHAT MEMBER ───
  bot.on('my_chat_member', async (msg) => {
    const chatId = msg.chat.id
    const newStatus = msg.new_chat_member.status
    const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
    if (!group) return

    if (newStatus === 'administrator') {
      const perms = await tg.getBotPermissions(chatId)
      await db.collection('groups').updateOne(
        { _id: group._id },
        { $set: { bot_is_admin: true, bot_permissions: perms, is_active: true, updated_at: new Date() } }
      )
      await tg.sendMessage(chatId, '✅ TGGuard is now active with administrator permissions.')
    } else if (newStatus === 'member') {
      await db.collection('groups').updateOne(
        { _id: group._id },
        { $set: { bot_is_admin: false, is_active: false, updated_at: new Date() } }
      )
    } else if (newStatus === 'left' || newStatus === 'kicked') {
      await db.collection('groups').updateOne(
        { _id: group._id },
        { $set: { is_active: false, bot_is_admin: false, updated_at: new Date() } }
      )
    }
  })

  // ─── MESSAGE HANDLER (Protection + Games + AI Moderation) ───
  bot.on('message', async (msg) => {
    // Check game answers FIRST (before protection deletes the message)
    await handleGameTextAnswer(bot, msg)

    const chatId = msg.chat?.id
    const message = msg
    const user = msg.from

    if (isPrivateChat(msg.chat) || !chatId) return

    const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
    if (!group || !group.is_active) return

    const settings = await db.collection('group_settings').findOne({ group_id: group._id })
    if (!settings) return

    const isAdmin = await tg.isUserAdmin(chatId, user.id)

    // ─── LOCKDOWN CHECK ───
    if (settings.lockdown_enabled && !isAdmin) {
      await tg.deleteMessage(chatId, message.message_id)
      await sendRich(bot, chatId, `🔒 <b>Group is in lockdown mode.</b>\n\nOnly administrators can send messages.`, { disable_notification: true })
      return
    }

    if (isAdmin) return

    let actionTaken = false
    let actionType = null
    let actionReason = null

    // ─── ANTI-LINK ───
    if (settings.anti_link_enabled && message.text) {
      const hasLink = /https?:\/\/|www\.|\.com|\.org|\.net|\.io|t\.me\//i.test(message.text)
      if (hasLink) {
        const allowedDomains = settings.anti_link_domains ? settings.anti_link_domains.split(',').map(d => d.trim()).filter(Boolean) : []
        const isAllowed = allowedDomains.some(domain => message.text.includes(domain))
        if (settings.anti_link_mode === 'block_all' || !isAllowed) {
          // Get strike count
          const strikes = await getAntiLinkStrikes(group._id, user.id)
          const maxStrikes = settings.anti_link_max_strikes || 3

          // Determine action based on strikes
          let linkAction = settings.anti_link_action || 'delete'
          if (strikes >= maxStrikes - 1) {
            linkAction = settings.anti_link_repeat_action || 'restrict'
          }

          actionTaken = await executeAction(bot, msg, linkAction, 'Blocked link')

          if (actionTaken) {
            actionType = linkAction
            actionReason = 'Blocked link'

            // Send customized notification
            const notifyText = buildAntiLinkNotification(user, settings, strikes + 1)
            await sendRich(bot, chatId, notifyText, { disable_notification: true })

            // If restrict action, apply custom mute duration
            if (linkAction === 'restrict' || linkAction === 'delete_restrict') {
              const muteDuration = (settings.anti_link_mute_duration || 60) * 60 // convert minutes to seconds
              await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + muteDuration)
            }
          }
        }
      }
    }

    // ─── WORD FILTER ───
    if (!actionTaken && settings.word_filter_enabled && message.text) {
      const filterWords = await db.collection('filter_words').find({ group_id: group._id, enabled: { $ne: false } }).toArray()
      const lowerText = message.text.toLowerCase()
      const matchedWord = filterWords.find(fw => lowerText.includes(fw.word.toLowerCase()))
      if (matchedWord) {
        actionTaken = await executeAction(bot, msg, matchedWord.action || settings.word_filter_action, `Filtered word: ${matchedWord.word}`)
        if (actionTaken) { actionType = matchedWord.action || settings.word_filter_action; actionReason = `Filtered phrase: ${matchedWord.word}` }
      }
    }

    // ─── MEDIA CONTROLS ───
    if (!actionTaken) {
      const mediaType = getMediaType(message)
      if (mediaType) {
        const mediaSetting = settings[`media_${mediaType}`]
        if (mediaSetting === 'blocked') {
          actionTaken = await executeAction(bot, msg, 'delete', `Blocked ${mediaType}`)
          if (actionTaken) { actionType = 'delete'; actionReason = `Blocked ${mediaType}` }
        }
      }
    }

    // ─── LOG ACTION ───
    if (actionTaken) {
      await db.collection('moderation_logs').insertOne({
        group_id: group._id,
        user_telegram_id: BigInt(user.id),
        user_username: user.username || null,
        user_first_name: user.first_name || null,
        action: actionType,
        reason: actionReason,
        message_id: message.message_id,
        message_text: message.text || null,
        created_at: new Date()
      })
    }

    // ─── AI MODERATION (runs AFTER normal protection) ───
    if (!actionTaken && message.text) {
      try {
        await processAIModeration(bot, msg, group, settings)
      } catch (err) {
        console.error('AI moderation error:', err.message)
        // AI failure handled internally - don't crash bot
      }
    }
  })

  // ─── ERROR HANDLER ───
  bot.on('polling_error', (err) => {
    console.error('Bot polling error:', err)
    db.collection('system_logs').insertOne({
      level: 'error',
      message: err.message,
      stack: err.stack,
      component: 'bot',
      created_at: new Date()
    }).catch(console.error)
  })

  bot.on('error', (err) => {
    console.error('Bot error:', err)
    db.collection('system_logs').insertOne({
      level: 'error',
      message: err.message,
      stack: err.stack,
      component: 'bot',
      created_at: new Date()
    }).catch(console.error)
  })

  return bot
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD BUTTON HANDLER (FIXED TOKEN)
// ═══════════════════════════════════════════════════════════════

async function handleDashboardButton(query) {
  const chatId = query.message?.chat?.id
  const userId = query.from.id
  const chatIdStr = chatId?.toString()

  if (!chatIdStr) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Error: Could not identify group.', show_alert: true })
    return
  }

  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })

  if (!group || !group.added_by) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Dashboard access unavailable. The bot could not detect who added it.', show_alert: true })
    return
  }

  if (userId === group.added_by) {
    const token = generateDashboardToken(userId, chatId)
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard?token=${token}`

    try {
      const dmText = buildDashboardMessage(group, false)
      await sendRich(bot, userId, dmText, inlineKeyboard([
        [{ text: '🌐 Open Dashboard', url: dashboardUrl }]
      ]))
      await bot.answerCallbackQuery(query.id, { text: '✅ Check your DMs for the dashboard link!', show_alert: true })
    } catch (err) {
      console.error('Failed to DM dashboard link:', err.message)
      await bot.answerCallbackQuery(query.id, { text: '❌ Could not send DM. Make sure you started a chat with me.', show_alert: true })
    }
  } else {
    await bot.answerCallbackQuery(query.id, { text: '🚫 Not Allowed — Only the person who added the bot can access this.', show_alert: true })
  }
}

// ═══════════════════════════════════════════════════════════════
// MENU FUNCTIONS (NO WEBSITE LINKS IN GROUP CONTEXT)
// ═══════════════════════════════════════════════════════════════

async function showMainMenu(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  if (isGroup) {
    // In groups: NO website links
    await sendRich(bot, chatId, `<b>🛡️ TGGuard Main Menu</b>

<b>Available options:</b>
• 🛡️ Add to Group — Get bot add link
• 🎮 Games — Play group games
• 📖 Help — View help topics
• ❓ FAQ — Frequently asked questions
• ⭐ Rate TGGuard — Rate your experience

<i>Dashboard access is available in private chat only.</i>`, inlineKeyboard([
      [{ text: '🛡️ Add to Group', callback_data: 'add_to_group' }],
      [{ text: '🎮 Games', callback_data: 'games' }],
      [{ text: '📖 Help', callback_data: 'help' }],
      [{ text: '❓ FAQ', callback_data: 'faq' }],
      [{ text: '⭐ Rate TGGuard', callback_data: 'rate' }]
    ]))
  } else {
    // In private chat: show dashboard link
    await sendRich(bot, chatId, `<b>🛡️ TGGuard Main Menu</b>`, inlineKeyboard([
      [{ text: '🛡️ Add to Group', callback_data: 'add_to_group' }],
      [{ text: '⚙️ Control Panel', callback_data: 'control_panel' }],
      [{ text: '🎮 Games', callback_data: 'games' }],
      [{ text: '📖 Help', callback_data: 'help' }],
      [{ text: '❓ FAQ', callback_data: 'faq' }],
      [{ text: '⭐ Rate TGGuard', callback_data: 'rate' }]
    ]))
  }
}

async function showHelp(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  await sendRich(bot, chatId, `<b>📖 TGGuard Help</b>`, inlineKeyboard([
    [{ text: '🛡️ Protection', callback_data: 'help_protection' }],
    [{ text: '🎮 Games', callback_data: 'help_games' }],
    [{ text: '👋 Welcome', callback_data: 'help_welcome' }],
    [{ text: '🔐 Verification', callback_data: 'help_verification' }],
    [{ text: '🚨 Reports', callback_data: 'help_reports' }],
    [{ text: '⚙️ Setup', callback_data: 'help_setup' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showFAQ(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>❓ Frequently Asked Questions</b>

<b>1. What is TGGuard?</b>
TGGuard is a Telegram community protection and management platform.

<b>2. How do I add TGGuard?</b>
Tap "Add to Group" and follow the instructions.

<b>3. What permissions does TGGuard need?</b>
Administrator permissions for moderation features.

<b>4. How do protection features work?</b>
Configure them in the dashboard. The bot executes them automatically.

<b>5. How do games work?</b>
Enable games in the dashboard. Members play in Telegram.

<b>6. How do I remove TGGuard?</b>
Remove the bot from your group. Data is retained for 30 days.

<b>7. How do I contact support?</b>
${isGroup ? 'Visit the support page via the dashboard.' : `Visit <a href="${process.env.FRONTEND_URL}/support">Support</a>`}`

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showAddToGroup(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const botInfo = await tg.getBotInfo()
  if (!botInfo) {
    await sendRich(bot, chatId, '❌ Bot is not available right now.')
    return
  }
  const text = `<b>🛡️ Add TGGuard to Your Group</b>

1. Add @${botInfo.username} to your group
2. Make it an administrator
3. Return to the dashboard to verify

<a href="https://t.me/${botInfo.username}?startgroup=true">➕ Add TGGuard</a>`

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '➕ Add TGGuard', url: `https://t.me/${botInfo.username}?startgroup=true` }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showGamesMenu(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  if (!chatId || isPrivateChat(source.chat || source.message?.chat)) {
    await sendRich(bot, chatId, `<b>🎮 TGGuard Games</b>

Games are played in Telegram groups. Enable them in your group dashboard.`, inlineKeyboard([
      [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }],
      [{ text: '📖 How To Play', callback_data: 'how_to_play' }],
      [{ text: '⬅️ Back', callback_data: 'main_menu' }]
    ]))
    return
  }
  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) {
    await sendRich(bot, chatId, '❌ This group is not connected to TGGuard.')
    return
  }
  const settings = await db.collection('group_settings').findOne({ group_id: group._id })
  if (!settings?.games_enabled) {
    await sendRich(bot, chatId, '🎮 Games are currently disabled in this group.')
    return
  }
  await sendRich(bot, chatId, '<b>🎮 TGGuard Games</b>', inlineKeyboard([
    [{ text: '🧩 Word Scramble', callback_data: 'word_scramble' }],
    [{ text: '🌍 World Trivia', callback_data: 'world_trivia' }],
    [{ text: '⚡ Speed Quiz', callback_data: 'speed_quiz' }],
    [{ text: '🔤 Missing Letters', callback_data: 'missing_letters' }],
    [{ text: '😀 Emoji Challenge', callback_data: 'emoji_challenge' }],
    [{ text: '📖 How To Play', callback_data: 'how_to_play' }],
    [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showRateMenu(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  await sendRich(bot, chatId, '<b>⭐ Rate TGGuard</b>\n\nHow would you rate your experience?', inlineKeyboard([
    [{ text: '⭐', callback_data: 'rate_1' }, { text: '⭐⭐', callback_data: 'rate_2' }],
    [{ text: '⭐⭐⭐', callback_data: 'rate_3' }, { text: '⭐⭐⭐⭐', callback_data: 'rate_4' }],
    [{ text: '⭐⭐⭐⭐⭐', callback_data: 'rate_5' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showLeaderboard(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const topScores = await getLeaderboard(10)

  let text = '<b>🏆 TGGuard Global Leaderboard</b>\n'

  if (topScores.length === 0) {
    text += '\n\n<i>No games played yet. Be the first!</i>'
  } else {
    topScores.forEach((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      text += `\n${medal} <b>${s.username || `User${s._id}`}</b>\n   💰 <b>${s.total}</b> pts | 🎮 ${s.games} games | ✅ ${s.correct} correct`
    })
  }

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '🎮 Play Games', callback_data: 'games' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showHowToPlay(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const text = `<b>📖 How to Play TGGuard Games</b>

<b>🧩 Word Scramble</b> — Unscramble letters. First correct wins! 5 rounds.
<b>🌍 World Trivia</b> — Answer geography, science, history questions. 5 rounds.
<b>⚡ Speed Quiz</b> — Fast-paced 10-round quiz. Speed = bonus points!
<b>🔤 Missing Letters</b> — Fill in the blanks. 5 rounds of vocabulary fun.
<b>😀 Emoji Challenge</b> — Guess countries from emoji clues. 5 rounds.

<b>Scoring:</b>
• Base: 10 points per correct answer
• Speed Bonus: Up to 30 extra points for fast answers
• Leaderboard tracks global rankings

<i>All games played in Telegram groups!</i>`

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '🎮 Play Now', callback_data: 'games' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

// ═══════════════════════════════════════════════════════════════
// HELP TOPIC HANDLERS (NO WEBSITE LINKS IN GROUP CONTEXT)
// ═══════════════════════════════════════════════════════════════

async function showHelpProtection(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>🛡️ Protection Features</b>

<b>Anti-Spam</b>
Detects and blocks spam messages automatically. Configure sensitivity (low/medium/high) and choose the action: warn, delete, restrict, or ban.

<b>Anti-Link</b>
Blocks unwanted links in messages. Two modes:
• <b>Block All</b> — Removes any link
• <b>Allow List</b> — Only allows specific domains you set

<b>Word Filter</b>
Create a custom list of banned words or phrases. Each word can have its own action. The bot checks every message and acts instantly.

<b>Media Controls</b>
Restrict what members can send:
• Photos, Videos, Stickers, GIFs
• Documents, Audio, Voice messages
• Polls, Forwarded messages

<b>Flood Control</b>
Limits how many messages a user can send in a short time. Prevents spam raids and message floods.

<i>All features are configured in your Dashboard.</i>`

  const buttons = [[{ text: '⬅️ Back to Help', callback_data: 'help' }]]

  // Only add dashboard link in private chat
  if (!isGroup) {
    buttons.unshift([{ text: '⚙️ Configure in Dashboard', url: process.env.FRONTEND_URL }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

async function showHelpGames(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>🎮 Games Guide</b>

TGGuard includes <b>5 multiplayer games</b> for your community:

<b>🧩 Word Scramble</b>
Unscramble the letters. First correct answer wins! 5 rounds per game.

<b>🌍 World Trivia</b>
Geography, science, history & more. 5 rounds with multiple choice answers.

<b>⚡ Speed Quiz</b>
Fast-paced 10-round quiz. Speed matters — faster answers = more points!

<b>🔤 Missing Letters</b>
Fill in the blanks to complete the word. 5 rounds of vocabulary fun.

<b>😀 Emoji Challenge</b>
Guess countries from emoji clues. 5 rounds of visual puzzles.

<b>How to Enable:</b>
1. Open your group Dashboard
2. Go to <b>Games Settings</b>
3. Toggle <b>Games Enabled</b>
4. Set who can start games (Members / Admins only)
5. Adjust cooldown between games

<b>Scoring:</b>
• Base: 10 points per correct answer
• Speed Bonus: Up to 30 extra points for fast answers
• Leaderboard tracks global rankings across all groups`

  const buttons = [
    [{ text: '🎮 Start a Game', callback_data: 'games' }],
    [{ text: '🏆 View Leaderboard', callback_data: 'leaderboard' }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]

  if (!isGroup) {
    buttons.splice(2, 0, [{ text: '⚙️ Game Settings', url: `${process.env.FRONTEND_URL}/dashboard/games` }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

async function showHelpWelcome(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>👋 Welcome Messages</b>

Greet new members automatically when they join your group.

<b>Two Modes:</b>

<b>1. Default Message</b>
A pre-written welcome with the group name and member count.

<b>2. Custom Message</b>
Write your own welcome with dynamic variables:
• <code>{group_name}</code> — Group name
• <code>{user_name}</code> — New member's first name
• <code>{username}</code> — @username or fallback
• <code>{user_id}</code> — Telegram ID
• <code>{member_count}</code> — Current member count

<b>Welcome Buttons</b>
Add up to 3 clickable buttons (links or callbacks) below the welcome message.

<b>Auto-Cleanup</b>
Automatically delete welcome messages after a set time (e.g., 60 seconds) to keep chat clean.

<b>Setup:</b>
1. Dashboard → <b>Welcome Settings</b>
2. Toggle <b>Welcome Enabled</b>
3. Choose mode and customize
4. Set cleanup timer (optional)`

  const buttons = [[{ text: '⬅️ Back to Help', callback_data: 'help' }]]

  if (!isGroup) {
    buttons.unshift([{ text: '⚙️ Welcome Settings', url: `${process.env.FRONTEND_URL}/dashboard/welcome` }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

async function showHelpVerification(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>🔐 Verification System</b>

Prevent bot raids and fake accounts with human verification.

<b>How It Works:</b>
1. New member joins → automatically muted
2. Bot sends a verification message with a button
3. User taps <b>✅ Verify Me</b>
4. Bot unmutes them instantly

<b>Timeout Settings:</b>
• Default: <b>5 minutes</b> to verify
• Customizable up to 60 minutes
• Action on timeout: Kick or Notify

<b>Requirements:</b>
Bot MUST have <b>Restrict Members</b> permission to mute/unmute users.

<b>Best Practices:</b>
• Use with <b>Welcome Messages</b> for smooth onboarding
• Set timeout to 3-5 minutes for active groups
• Enable <b>Anti-Spam</b> alongside verification for layered protection

<b>Setup:</b>
Dashboard → <b>Verification Settings</b> → Toggle On`

  const buttons = [[{ text: '⬅️ Back to Help', callback_data: 'help' }]]

  if (!isGroup) {
    buttons.unshift([{ text: '⚙️ Verification Settings', url: `${process.env.FRONTEND_URL}/dashboard/verification` }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

async function showHelpReports(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)

  const text = `<b>🚨 Reports System</b>

Let members report rule-breaking messages to admins.

<b>How It Works:</b>
1. Member replies to a bad message with <code>/report</code>
2. Bot forwards the message to admin chat
3. Admin reviews and takes action directly

<b>Report Actions:</b>
• <b>Warn</b> — Add a warning to the user
• <b>Restrict</b> — Mute for 1 hour
• <b>Kick</b> — Remove from group
• <b>Ban</b> — Permanent ban
• <b>Delete</b> — Remove the reported message

<b>Warning Ladder:</b>
• 3 warnings → 24-hour restriction
• 5 warnings → Automatic kick

<b>Admin Notifications:</b>
Reports are sent to a private admin channel or DM. Configure in Dashboard.

<i>Coming soon: Auto-moderation based on report thresholds.</i>`

  const buttons = [[{ text: '⬅️ Back to Help', callback_data: 'help' }]]

  if (!isGroup) {
    buttons.unshift([{ text: '⚙️ Report Settings', url: `${process.env.FRONTEND_URL}/dashboard/reports` }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

async function showHelpSetup(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const isGroup = isGroupChat(source.message?.chat || source.chat)
  const botInfo = await tg.getBotInfo()

  const text = `<b>⚙️ Setup Guide</b>

Getting TGGuard running in 3 steps:

<b>Step 1: Add to Group</b>
• Tap <b>🛡️ Add to Group</b> or use <code>/start</code>
• Add @${botInfo?.username || 'TGGuardBot'} to your group
• Promote to <b>Administrator</b>

<b>Step 2: Grant Permissions</b>
The bot needs these admin rights:
• <b>Delete Messages</b> — For moderation
• <b>Restrict Members</b> — For verification & mutes
• <b>Pin Messages</b> — For announcements
• <b>Invite Users</b> — For join requests

<b>Step 3: Configure Dashboard</b>
• Open the dashboard link sent to your DMs
• Or visit: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a>
• Enable features: Protection, Welcome, Verification, Games
• Customize settings for your community

<b>Quick Setup Checklist:</b>
✅ Bot added as admin
✅ Protection features enabled
✅ Welcome message configured
✅ Verification turned on (optional)
✅ Games enabled (optional)

<b>Need Help?</b>
${isGroup ? 'Visit documentation via the dashboard.' : `Visit <a href="${process.env.FRONTEND_URL}/docs">Documentation</a> or <a href="${process.env.FRONTEND_URL}/support">Support</a>`}`

  const buttons = [
    [{ text: '🛡️ Add to Group', callback_data: 'add_to_group' }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]

  if (!isGroup) {
    buttons.splice(1, 0, [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }])
    buttons.splice(2, 0, [{ text: '📚 Full Documentation', url: `${process.env.FRONTEND_URL}/docs` }])
  }

  await sendRich(bot, chatId, text, inlineKeyboard(buttons))
}

// ═══════════════════════════════════════════════════════════════
// GROUP HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleBotAdded(msg, chatId) {
  const chat = msg.chat
  const perms = await tg.getBotPermissions(chatId)
  const existing = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })

  const adderId = msg.from?.id || null

  if (existing) {
    await db.collection('groups').updateOne(
      { _id: existing._id },
      {
        $set: {
          name: chat.title,
          chat_type: chat.type,
          is_active: perms?.is_admin || false,
          bot_is_admin: perms?.is_admin || false,
          bot_permissions: perms,
          added_by: adderId,
          updated_at: new Date()
        }
      }
    )
  } else {
    const result = await db.collection('groups').insertOne({
      chat_id: BigInt(chatId),
      name: chat.title,
      chat_type: chat.type,
      invite_link: chat.invite_link || null,
      member_count: await tg.getChatMembersCount(chatId),
      is_active: perms?.is_admin || false,
      is_verified: false,
      bot_is_admin: perms?.is_admin || false,
      bot_permissions: perms,
      admins: [],
      added_by: adderId,
      games_played_total: 0,
      created_at: new Date(),
      updated_at: new Date()
    })

    await db.collection('group_settings').insertOne({
      group_id: result.insertedId, 
      protection_enabled: true, 
      anti_spam_enabled: false,
      anti_spam_sensitivity: 'medium', 
      anti_spam_action: 'warn', 
      anti_link_enabled: false,
      anti_link_mode: 'block_all', 
      anti_link_action: 'delete_warn', 
      anti_link_domains: '',
      anti_link_max_strikes: 3,
      anti_link_mute_duration: 60,
      anti_link_repeat_action: 'restrict',
      anti_link_custom_message: '',
      word_filter_enabled: false, 
      word_filter_action: 'delete_warn', 
      media_photos: 'allowed',
      media_videos: 'allowed', 
      media_stickers: 'allowed', 
      media_docs: 'allowed',
      lockdown_enabled: false, 
      welcome_enabled: false, 
      welcome_mode: 'default',
      welcome_custom_text: '', 
      welcome_buttons: [], 
      welcome_cleanup: false, 
      welcome_cleanup_time: 60,
      verification_enabled: false, 
      verification_timeout: 300, 
      verification_timeout_action: 'remove',
      games_enabled: false, 
      games_permission: 'members', 
      notifications_enabled: true, 
      language: 'en',
      created_at: new Date(), 
      updated_at: new Date()
    })

    await db.collection('game_configurations').insertOne({
      group_id: result.insertedId, 
      scramble_enabled: true, 
      trivia_enabled: true,
      speed_enabled: true, 
      letters_enabled: true, 
      emoji_enabled: true,
      cooldown_minutes: 5, 
      time_limit_seconds: 30, 
      points_per_win: 10,
      created_at: new Date(), 
      updated_at: new Date()
    })

    // Initialize AI moderation settings
    await initAIModerationSettings(result.insertedId)
  }

  // DM to adder
  if (adderId) {
    if (adderId.toString() === OWNER_TELEGRAM_ID) {
      try {
        const token = generateDashboardToken(adderId, chatId, 'owner')
        const ownerUrl = `${process.env.FRONTEND_URL}/owner/dashboard?token=${token}`
        const dmText = buildDashboardMessage({ name: chat.title }, true)

        await sendRich(bot, adderId, dmText, inlineKeyboard([
          [{ text: '👑 Owner Panel', url: ownerUrl }]
        ]))
      } catch (dmErr) {
        console.error('Failed to send owner DM:', dmErr.message)
      }
    } else {
      try {
        const token = generateDashboardToken(adderId, chatId, 'community_admin')
        const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard?token=${token}`
        const dmText = buildDashboardMessage({ name: chat.title }, false)

        await sendRich(bot, adderId, dmText, inlineKeyboard([
          [{ text: '🌐 Open Dashboard', url: dashboardUrl }]
        ]))
      } catch (dmErr) {
        console.error('Failed to send DM to bot adder:', dmErr.message)
      }
    }
  }

  // Group message (NO website links!)
  if (perms?.is_admin) {
    if (adderId) {
      await sendRich(bot, chatId, `<b>✅ TGGuard has been added!</b>

The bot will send a private message to the person who added it with the dashboard link.

<b>Quick setup:</b>
• Check your DMs for the dashboard
• Configure protection settings
• Set up welcome messages
• Enable games (optional)`)
    } else {
      await sendRich(bot, chatId, `<b>✅ TGGuard has been added!</b>

The bot will send a private message to the person who added it with the dashboard link.`)
    }
  } else {
    await sendRich(bot, chatId, `<b>⚠️ TGGuard needs administrator permissions.</b>

Please grant:
• Delete messages
• Restrict users
• Pin messages`)
  }
}

async function handleNewMember(msg, chatId, member) {
  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group || !group.is_active) return
  const settings = await db.collection('group_settings').findOne({ group_id: group._id })
  if (!settings) return

  await db.collection('group_members').updateOne(
    { group_id: group._id, telegram_id: BigInt(member.id) },
    {
      $set: {
        username: member.username || null,
        first_name: member.first_name || null,
        last_name: member.last_name || null,
        is_admin: false,
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date()
      }
    },
    { upsert: true }
  )

  const count = await tg.getChatMembersCount(chatId)
  await db.collection('groups').updateOne(
    { _id: group._id },
    { $set: { member_count: count, updated_at: new Date() } }
  )

  // WELCOME (FIXED - uses buildWelcomeMessage)
  if (settings.welcome_enabled) {
    let welcomeText = ''

    if (settings.welcome_mode === 'default') {
      welcomeText = buildWelcomeMessage(member, group, count)
    } else if (settings.welcome_mode === 'custom' && settings.welcome_custom_text) {
      welcomeText = settings.welcome_custom_text
        .replace(/{group_name}/g, group.name)
        .replace(/{user_name}/g, member.first_name || 'there')
        .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name || 'there')
        .replace(/{user_id}/g, member.id)
        .replace(/{member_count}/g, count)

      // Convert to Telegram HTML if it contains custom tags
      welcomeText = toTelegramHTML(welcomeText)
    }

    if (welcomeText) {
      const welcomeMsg = await sendRich(bot, chatId, welcomeText, {
        reply_markup: settings.welcome_buttons?.length > 0
          ? { inline_keyboard: settings.welcome_buttons.map(b => [{ text: b.text, url: b.url || undefined, callback_data: b.callback_data || undefined }]) }
          : undefined
      })

      if (settings.welcome_cleanup && welcomeMsg && settings.welcome_cleanup_time > 0) {
        setTimeout(async () => { 
          try { await tg.deleteMessage(chatId, welcomeMsg.message_id) } catch (e) {} 
        }, settings.welcome_cleanup_time * 1000)
      }
    }
  }

  // VERIFICATION
  if (settings.verification_enabled) {
    if (settings.bot_permissions?.can_restrict_members) {
      await tg.restrictUser(chatId, member.id, null, { 
        can_send_messages: false, 
        can_send_media_messages: false, 
        can_send_other_messages: false 
      })
    }
    const verifyMsg = await sendRich(bot, chatId, `<b>👋 Welcome ${member.first_name || 'there'}!</b>

Before you can participate, please verify that you're human.`, inlineKeyboard([
      [{ text: '✅ Verify Me', callback_data: `verify_${member.id}` }]
    ]))

    const expiresAt = new Date(Date.now() + (settings.verification_timeout || 300) * 1000)
    await db.collection('verification_sessions').insertOne({
      group_id: group._id, 
      user_telegram_id: BigInt(member.id),
      username: member.username || null, 
      first_name: member.first_name || null,
      status: 'pending', 
      message_id: verifyMsg?.message_id, 
      expires_at: expiresAt, 
      created_at: new Date()
    })

    setTimeout(async () => {
      const session = await db.collection('verification_sessions').findOne({ 
        group_id: group._id, 
        user_telegram_id: BigInt(member.id), 
        status: 'pending' 
      })
      if (session) {
        await db.collection('verification_sessions').updateOne(
          { _id: session._id }, 
          { $set: { status: 'expired', updated_at: new Date() } }
        )
        const action = settings.verification_timeout_action || 'remove'
        if (action === 'remove') await tg.kickUser(chatId, member.id)
        else if (action === 'notify') await sendRich(bot, chatId, `⏰ ${member.first_name || 'User'} did not complete verification in time.`)
      }
    }, (settings.verification_timeout || 300) * 1000)
  }
}

async function handleVerification(query, data) {
  const userId = query.from.id
  const chatId = query.message?.chat?.id
  const targetUserId = parseInt(data.replace('verify_', ''))

  if (userId !== targetUserId) {
    await bot.answerCallbackQuery(query.id, { text: '❌ This verification is not for you.', show_alert: true })
    return
  }

  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) return

  const session = await db.collection('verification_sessions').findOne({ 
    group_id: group._id, 
    user_telegram_id: BigInt(userId), 
    status: 'pending' 
  })

  if (!session) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Verification session not found.', show_alert: true })
    return
  }

  await bot.answerCallbackQuery(query.id, { text: '✅ Verification successful!' })

  if (group.bot_permissions?.can_restrict_members) {
    await tg.restrictUser(chatId, userId, null, { 
      can_send_messages: true, 
      can_send_media_messages: true, 
      can_send_other_messages: true, 
      can_add_web_page_previews: true 
    })
  }

  await db.collection('verification_sessions').updateOne(
    { _id: session._id },
    { $set: { status: 'completed', completed_at: new Date(), updated_at: new Date() } }
  )

  await sendRich(bot, chatId, '✅ You have been verified! Welcome to the group.')
}

async function handleReport(query, data) {
  await bot.answerCallbackQuery(query.id, { text: 'Report system coming soon!' })
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function getMediaType(message) {
  if (message.photo) return 'photos'
  if (message.video) return 'videos'
  if (message.animation) return 'stickers'
  if (message.sticker) return 'stickers'
  if (message.document) return 'docs'
  if (message.audio) return 'docs'
  if (message.voice) return 'docs'
  if (message.video_note) return 'videos'
  if (message.poll) return 'docs'
  return null
}

async function executeAction(botInstance, msg, action, reason) {
  const chatId = msg.chat.id
  const messageId = msg.message_id
  const user = msg.from

  switch (action) {
    case 'delete': 
      return await tg.deleteMessage(chatId, messageId)
    case 'warn':
      await addWarning(msg, reason)
      await sendRich(botInstance, chatId, buildActionNotification('warn', reason, user))
      return true
    case 'delete_warn':
      await tg.deleteMessage(chatId, messageId)
      await addWarning(msg, reason)
      await sendRich(botInstance, chatId, buildActionNotification('delete_warn', reason, user))
      return true
    case 'restrict':
      await tg.deleteMessage(chatId, messageId)
      await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 3600)
      await sendRich(botInstance, chatId, buildActionNotification('restrict', reason, user))
      return true
    case 'delete_restrict':
      await tg.deleteMessage(chatId, messageId)
      await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 3600)
      await sendRich(botInstance, chatId, buildActionNotification('delete_restrict', reason, user))
      return true
    case 'kick':
      await tg.deleteMessage(chatId, messageId)
      await tg.kickUser(chatId, user.id)
      return true
    case 'ban':
      await tg.deleteMessage(chatId, messageId)
      await tg.banUser(chatId, user.id)
      return true
    default: 
      return await tg.deleteMessage(chatId, messageId)
  }
}

async function addWarning(msg, reason) {
  const chatId = msg.chat.id
  const user = msg.from
  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) return

  await db.collection('warnings').insertOne({
    group_id: group._id, 
    user_telegram_id: BigInt(user.id),
    username: user.username || null, 
    first_name: user.first_name || null,
    reason: reason, 
    message_id: msg.message_id, 
    created_at: new Date()
  })

  await db.collection('group_members').updateOne(
    { group_id: group._id, telegram_id: BigInt(user.id) },
    { $inc: { warnings: 1 }, $set: { updated_at: new Date() } }
  )

  const warningCount = await db.collection('warnings').countDocuments({ 
    group_id: group._id, 
    user_telegram_id: BigInt(user.id) 
  })

  const settings = await db.collection('group_settings').findOne({ group_id: group._id })
  if (settings) {
    if (warningCount >= 5) {
      await tg.kickUser(chatId, user.id)
      await sendRich(bot, chatId, `🚫 <b>${user.first_name || 'User'}</b> removed after <b>${warningCount}</b> warnings.`, { disable_notification: true })
    } else if (warningCount >= 3) {
      await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 86400)
      await sendRich(bot, chatId, `🔇 <b>${user.first_name || 'User'}</b> restricted for 24 hours after <b>${warningCount}</b> warnings.`, { disable_notification: true })
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// START / STOP / STATUS EXPORTS
// ═══════════════════════════════════════════════════════════════

export async function startBot(mode = 'polling') {
  if (!bot) bot = initBot()
  if (!bot) { console.error('Bot initialization failed'); return false }
  try {
    if (mode === 'webhook' && process.env.WEBHOOK_URL) {
      await bot.setWebHook(`${process.env.WEBHOOK_URL}/bot${BOT_TOKEN}`)
      console.log('Bot started in webhook mode')
    } else {
      await bot.startPolling()
      console.log('Bot started in polling mode')
    }
    isRunning = true
    await db.collection('bot_state').updateOne(
      { key: 'status' },
      { $set: { key: 'status', is_running: true, mode: mode, started_at: new Date(), updated_at: new Date() } },
      { upsert: true }
    )
    return true
  } catch (err) {
    console.error('Failed to start bot:', err)
    await db.collection('system_logs').insertOne({ 
      level: 'error', 
      message: `Bot start failed: ${err.message}`, 
      stack: err.stack, 
      component: 'bot', 
      created_at: new Date() 
    })
    return false
  }
}

export async function stopBot() {
  if (bot) {
    await bot.stopPolling()
    isRunning = false
    await db.collection('bot_state').updateOne(
      { key: 'status' },
      { $set: { is_running: false, stopped_at: new Date(), updated_at: new Date() } }
    )
    console.log('Bot stopped')
  }
}

export async function getBotStatus() {
  const state = await db.collection('bot_state').findOne({ key: 'status' })
  const botInfo = await tg.getBotInfo()
  return {
    is_running: isRunning && !!botInfo,
    mode: state?.mode || 'unknown',
    started_at: state?.started_at,
    bot_username: botInfo?.username || null,
    bot_id: botInfo?.id || null,
    healthy: !!botInfo
  }
}

export function getBot() { return bot }
