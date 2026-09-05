import TelegramBot from 'node-telegram-bot-api'
import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'
import * as tg from './telegram.js'
import jwt from 'jsonwebtoken'

const BOT_TOKEN = process.env.BOT_TOKEN
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID
let bot = null
let isRunning = false

// ─── Helper: Send rich HTML message ───
function sendRich(bot, chatId, html, opts = {}) {
  return bot.sendMessage(chatId, html, { parse_mode: 'HTML', ...opts })
}

// ─── Helper: Build inline keyboard for node-telegram-bot-api ───
function inlineKeyboard(buttons) {
  return { reply_markup: { inline_keyboard: buttons } }
}

export function initBot() {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not configured - bot cannot start')
    return null
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: false })

  // ─── /START COMMAND ───
  bot.onText(/\/start/, async (msg) => {
    const user = msg.from
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

    const welcomeText = `<b>👋 Welcome to TGGuard!</b>

TGGuard helps protect and manage Telegram communities with smart moderation, verification, welcome messages, reports, games and analytics.

Your group is managed from the TGGuard Dashboard.

Tap below to get started.`

    await sendRich(bot, msg.chat.id, welcomeText, inlineKeyboard([
      [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
      [{ text: '📚 Documentation', url: `${process.env.FRONTEND_URL}/docs` }],
      [{ text: '❓ Help', callback_data: 'help' }]
    ]))
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
    try {
      await bot.answerCallbackQuery(query.id)
      switch (data) {
        case 'main_menu': await showMainMenu(query); break
        case 'help': await showHelp(query); break
        case 'faq': await showFAQ(query); break
        case 'add_to_group': await showAddToGroup(query); break
        case 'control_panel':
          await sendRich(bot, chatId, `<b>⚙️ Control Panel</b>

Open the Control Panel at: ${process.env.FRONTEND_URL}`, inlineKeyboard([
            [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
            [{ text: '⬅️ Back', callback_data: 'main_menu' }]
          ]))
          break
        case 'games': await showGamesMenu(query); break
        case 'rate': await showRateMenu(query); break
        case 'leaderboard': await showLeaderboard(query); break
        case 'how_to_play': await showHowToPlay(query); break
        case 'word_scramble': await startGame(query, 'scramble'); break
        case 'world_trivia': await startGame(query, 'trivia'); break
        case 'speed_quiz': await startGame(query, 'speed'); break
        case 'missing_letters': await startGame(query, 'letters'); break
        case 'emoji_challenge': await startGame(query, 'emoji'); break
        case 'dashboard_button':
          await handleDashboardButton(query)
          break
        default:
          if (data.startsWith('game_')) await handleGameCallback(query, data)
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

  // ─── MESSAGE HANDLER (Protection) ───
  bot.on('message', async (msg) => {
    const chatId = msg.chat?.id
    const message = msg
    const user = msg.from
    if (msg.chat?.type === 'private' || !chatId) return

    const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
    if (!group || !group.is_active) return

    const settings = await db.collection('group_settings').findOne({ group_id: group._id })
    if (!settings) return

    const isAdmin = await tg.isUserAdmin(chatId, user.id)
    if (isAdmin) return

    let actionTaken = false
    let actionType = null
    let actionReason = null

    // ANTI-LINK
    if (settings.anti_link_enabled && message.text) {
      const hasLink = /https?:\/\/|www\.|\.com|\.org|\.net|\.io|t\.me\//i.test(message.text)
      if (hasLink) {
        const allowedDomains = settings.anti_link_domains ? settings.anti_link_domains.split(',').map(d => d.trim()).filter(Boolean) : []
        const isAllowed = allowedDomains.some(domain => message.text.includes(domain))
        if (settings.anti_link_mode === 'block_all' || !isAllowed) {
          actionTaken = await executeAction(bot, msg, settings.anti_link_action, 'Blocked link')
          if (actionTaken) { actionType = settings.anti_link_action; actionReason = 'Blocked link' }
        }
      }
    }

    // WORD FILTER
    if (!actionTaken && settings.word_filter_enabled && message.text) {
      const filterWords = await db.collection('filter_words').find({ group_id: group._id, enabled: { $ne: false } }).toArray()
      const lowerText = message.text.toLowerCase()
      const matchedWord = filterWords.find(fw => lowerText.includes(fw.word.toLowerCase()))
      if (matchedWord) {
        actionTaken = await executeAction(bot, msg, matchedWord.action || settings.word_filter_action, `Filtered word: ${matchedWord.word}`)
        if (actionTaken) { actionType = matchedWord.action || settings.word_filter_action; actionReason = `Filtered phrase: ${matchedWord.word}` }
      }
    }

    // MEDIA CONTROLS
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

    // LOG ACTION
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

// ─── Handle dashboard button clicks ───
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
    const token = jwt.sign(
      { telegramId: userId.toString(), groupId: chatId.toString() },
      process.env.BOT_TOKEN,
      { expiresIn: '7d' }
    )
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard?token=${token}`

    try {
      await sendRich(bot, userId, `<b>🌐 Your Dashboard for this group:</b>`, inlineKeyboard([
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

// ─── MENU FUNCTIONS ───
async function showMainMenu(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  await sendRich(bot, chatId, `<b>🛡️ TGGuard Main Menu</b>`, inlineKeyboard([
    [{ text: '🛡️ Add to Group', callback_data: 'add_to_group' }],
    [{ text: '⚙️ Control Panel', callback_data: 'control_panel' }],
    [{ text: '🎮 Games', callback_data: 'games' }],
    [{ text: '📖 Help', callback_data: 'help' }],
    [{ text: '❓ FAQ', callback_data: 'faq' }],
    [{ text: '⭐ Rate TGGuard', callback_data: 'rate' }]
  ]))
}

async function showHelp(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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
Visit <a href="${process.env.FRONTEND_URL}/support">${process.env.FRONTEND_URL}/support</a>`

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
    [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

async function showGamesMenu(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  if (!chatId || source.chat?.type === 'private') {
    await sendRich(bot, chatId, `<b>🎮 TGGuard Games</b>

Games are played in Telegram groups. Enable them in your group dashboard.`, inlineKeyboard([
      [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
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
  const topScores = await db.collection('game_scores').aggregate([
    { $group: { _id: '$user_telegram_id', total: { $sum: '$score' }, username: { $first: '$username' } } },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]).toArray()

  let text = '<b>🏆 TGGuard Global Leaderboard</b>'
  if (topScores.length === 0) {
    text += '\n\nNo games played yet. Be the first!'
  } else {
    topScores.forEach((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      text += `\n${medal} ${s.username || `User${s._id}`} — <b>${s.total}</b> points`
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

<b>🧩 Word Scramble</b> — Unscramble letters. First correct wins!
<b>🌍 World Trivia</b> — Answer geography questions.
<b>⚡ Speed Quiz</b> — Answer quickly. Most points wins!
<b>🔤 Missing Letters</b> — Fill in missing letters.
<b>😀 Emoji Challenge</b> — Guess from emoji clues.

<i>All games played in Telegram!</i>`

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '🎮 Play Now', callback_data: 'games' }],
    [{ text: '⬅️ Back', callback_data: 'main_menu' }]
  ]))
}

// ─── GROUP HANDLERS ───
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
      created_at: new Date(),
      updated_at: new Date()
    })
    await db.collection('group_settings').insertOne({
      group_id: result.insertedId, protection_enabled: true, anti_spam_enabled: false,
      anti_spam_sensitivity: 'medium', anti_spam_action: 'warn', anti_link_enabled: false,
      anti_link_mode: 'block_all', anti_link_action: 'delete_warn', anti_link_domains: '',
      word_filter_enabled: false, word_filter_action: 'delete_warn', media_photos: 'allowed',
      media_videos: 'allowed', media_stickers: 'allowed', media_docs: 'allowed',
      lockdown_enabled: false, welcome_enabled: false, welcome_mode: 'default',
      welcome_custom_text: '', welcome_buttons: [], welcome_cleanup: false, welcome_cleanup_time: 60,
      verification_enabled: false, verification_timeout: 300, verification_timeout_action: 'remove',
      games_enabled: false, games_permission: 'members', notifications_enabled: true, language: 'en',
      created_at: new Date(), updated_at: new Date()
    })
    await db.collection('game_configurations').insertOne({
      group_id: result.insertedId, scramble_enabled: true, trivia_enabled: true,
      speed_enabled: true, letters_enabled: true, emoji_enabled: true,
      cooldown_minutes: 5, time_limit_seconds: 30, points_per_win: 10,
      created_at: new Date(), updated_at: new Date()
    })
  }

  // DM to adder
  if (adderId) {
    if (adderId.toString() === OWNER_TELEGRAM_ID) {
      try {
        const token = jwt.sign(
          { telegramId: adderId.toString(), groupId: chatId.toString(), role: 'owner' },
          process.env.BOT_TOKEN,
          { expiresIn: '7d' }
        )
        const ownerUrl = `${process.env.FRONTEND_URL}/owner/dashboard?token=${token}`
        await sendRich(bot, adderId, `<b>✅ TGGuard is active in ${chat.title || 'your group'}!</b>

You are the owner. Access your owner panel:`, inlineKeyboard([
          [{ text: '👑 Owner Panel', url: ownerUrl }]
        ]))
      } catch (dmErr) {
        console.error('Failed to send owner DM:', dmErr.message)
      }
    } else {
      try {
        const token = jwt.sign(
          { telegramId: adderId.toString(), groupId: chatId.toString(), role: 'community_admin' },
          process.env.BOT_TOKEN,
          { expiresIn: '7d' }
        )
        const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard?token=${token}`
        await sendRich(bot, adderId, `<b>✅ TGGuard is active in ${chat.title || 'your group'}!</b>

Manage settings:`, inlineKeyboard([
          [{ text: '🌐 Open Dashboard', url: dashboardUrl }]
        ]))
      } catch (dmErr) {
        console.error('Failed to send DM to bot adder:', dmErr.message)
      }
    }
  }

  // Group message
  if (perms?.is_admin) {
    if (adderId) {
      await sendRich(bot, chatId, `<b>✅ TGGuard has been added!</b>

Visit the dashboard to configure protection.`, inlineKeyboard([
        [{ text: '🌐 Open Dashboard', callback_data: 'dashboard_button' }]
      ]))
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

  // WELCOME
  if (settings.welcome_enabled) {
    let welcomeText = ''
    if (settings.welcome_mode === 'default') {
      welcomeText = `<b>👋 Welcome to ${group.name}, ${member.first_name || 'there'}!</b>

🛡️ This community is protected by TGGuard.

Please read the group rules and enjoy your stay.`
    } else if (settings.welcome_mode === 'custom' && settings.welcome_custom_text) {
      welcomeText = settings.welcome_custom_text
        .replace(/{group_name}/g, group.name)
        .replace(/{user_name}/g, member.first_name || 'there')
        .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name || 'there')
        .replace(/{user_id}/g, member.id)
        .replace(/{member_count}/g, count)
    }
    if (welcomeText) {
      const welcomeMsg = await sendRich(bot, chatId, welcomeText, {
        reply_markup: settings.welcome_buttons?.length > 0
          ? { inline_keyboard: settings.welcome_buttons.map(b => [{ text: b.text, url: b.url || undefined, callback_data: b.callback_data || undefined }]) }
          : undefined
      })
      if (settings.welcome_cleanup && welcomeMsg && settings.welcome_cleanup_time > 0) {
        setTimeout(async () => { await tg.deleteMessage(chatId, welcomeMsg.message_id) }, settings.welcome_cleanup_time * 1000)
      }
    }
  }

  // VERIFICATION
  if (settings.verification_enabled) {
    if (settings.bot_permissions?.can_restrict_members) {
      await tg.restrictUser(chatId, member.id, null, { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false })
    }
    const verifyMsg = await sendRich(bot, chatId, `<b>👋 Welcome ${member.first_name || 'there'}!</b>

Before you can participate, please verify that you're human.`, inlineKeyboard([
      [{ text: '✅ Verify Me', callback_data: `verify_${member.id}` }]
    ]))
    const expiresAt = new Date(Date.now() + (settings.verification_timeout || 300) * 1000)
    await db.collection('verification_sessions').insertOne({
      group_id: group._id, user_telegram_id: BigInt(member.id),
      username: member.username || null, first_name: member.first_name || null,
      status: 'pending', message_id: verifyMsg?.message_id, expires_at: expiresAt, created_at: new Date()
    })
    setTimeout(async () => {
      const session = await db.collection('verification_sessions').findOne({ group_id: group._id, user_telegram_id: BigInt(member.id), status: 'pending' })
      if (session) {
        await db.collection('verification_sessions').updateOne({ _id: session._id }, { $set: { status: 'expired', updated_at: new Date() } })
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
  const session = await db.collection('verification_sessions').findOne({ group_id: group._id, user_telegram_id: BigInt(userId), status: 'pending' })
  if (!session) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Verification session not found.', show_alert: true })
    return
  }
  await bot.answerCallbackQuery(query.id, { text: '✅ Verification successful!' })
  if (group.bot_permissions?.can_restrict_members) {
    await tg.restrictUser(chatId, userId, null, { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true })
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

// ─── UTILITIES ───
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
    case 'delete': return await tg.deleteMessage(chatId, messageId)
    case 'warn':
      await addWarning(msg, reason)
      await sendRich(botInstance, chatId, `⚠️ <b>${user.first_name || 'User'}</b> has been warned.
Reason: <i>${reason}</i>`, { disable_notification: true })
      return true
    case 'delete_warn':
      await tg.deleteMessage(chatId, messageId)
      await addWarning(msg, reason)
      await sendRich(botInstance, chatId, `⚠️ <b>${user.first_name || 'User'}</b> has been warned.
Reason: <i>${reason}</i>`, { disable_notification: true })
      return true
    case 'restrict':
      await tg.deleteMessage(chatId, messageId)
      await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 3600)
      await sendRich(botInstance, chatId, `🔇 <b>${user.first_name || 'User'}</b> restricted for 1 hour.
Reason: <i>${reason}</i>`, { disable_notification: true })
      return true
    case 'delete_restrict':
      await tg.deleteMessage(chatId, messageId)
      await tg.restrictUser(chatId, user.id, Math.floor(Date.now() / 1000) + 3600)
      await sendRich(botInstance, chatId, `🔇 <b>${user.first_name || 'User'}</b> restricted for 1 hour.
Reason: <i>${reason}</i>`, { disable_notification: true })
      return true
    case 'kick':
      await tg.deleteMessage(chatId, messageId)
      await tg.kickUser(chatId, user.id)
      return true
    case 'ban':
      await tg.deleteMessage(chatId, messageId)
      await tg.banUser(chatId, user.id)
      return true
    default: return await tg.deleteMessage(chatId, messageId)
  }
}

async function addWarning(msg, reason) {
  const chatId = msg.chat.id
  const user = msg.from
  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) return
  await db.collection('warnings').insertOne({
    group_id: group._id, user_telegram_id: BigInt(user.id),
    username: user.username || null, first_name: user.first_name || null,
    reason: reason, message_id: msg.message_id, created_at: new Date()
  })
  await db.collection('group_members').updateOne(
    { group_id: group._id, telegram_id: BigInt(user.id) },
    { $inc: { warnings: 1 }, $set: { updated_at: new Date() } }
  )
  const warningCount = await db.collection('warnings').countDocuments({ group_id: group._id, user_telegram_id: BigInt(user.id) })
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

// ─── GAME FUNCTIONS ───
async function startGame(query, gameType) {
  const chatId = query.message?.chat?.id
  if (!chatId) {
    await sendRich(bot, chatId, '❌ Games can only be played in groups.')
    return
  }
  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) {
    await sendRich(bot, chatId, '❌ This group is not connected to TGGuard.')
    return
  }
  const settings = await db.collection('group_settings').findOne({ group_id: group._id })
  if (!settings?.games_enabled) {
    await sendRich(bot, chatId, '🎮 Games are disabled in this group.')
    return
  }
  const gameConfig = await db.collection('game_configurations').findOne({ group_id: group._id })
  const isAdmin = await tg.isUserAdmin(chatId, query.from.id)
  const canStart = settings.games_permission === 'members' || (settings.games_permission === 'admins' && isAdmin) || (settings.games_permission === 'approval' && isAdmin)
  if (!canStart) {
    await sendRich(bot, chatId, '🎮 Only admins can start games in this group.')
    return
  }
  const lastGame = await db.collection('game_sessions').findOne({ group_id: group._id }, { sort: { created_at: -1 } })
  if (lastGame) {
    const cooldownMs = (gameConfig?.cooldown_minutes || 5) * 60 * 1000
    if (Date.now() - lastGame.created_at.getTime() < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (Date.now() - lastGame.created_at.getTime())) / 1000)
      await sendRich(bot, chatId, `⏳ Please wait <b>${remaining}s</b> before starting another game.`)
      return
    }
  }
  const session = await db.collection('game_sessions').insertOne({
    group_id: group._id, chat_id: BigInt(chatId), host_user_id: BigInt(query.from.id),
    host_username: query.from.username || null, game_type: gameType, status: 'waiting',
    current_round: 0, total_rounds: gameType === 'speed' ? 10 : 1, scores: {}, players: [],
    started_at: null, ended_at: null, created_at: new Date()
  })
  await runGameRound(query, session.insertedId, gameType, 1)
}

async function runGameRound(query, sessionId, gameType, round) {
  const gameContent = getGameContent(gameType, round)
  await db.collection('game_sessions').updateOne(
    { _id: sessionId },
    { $set: { status: 'active', current_round: round, started_at: new Date() } }
  )
  await sendRich(bot, query.message?.chat?.id, gameContent.text, { reply_markup: gameContent.keyboard })
  const timeLimit = gameContent.timeLimit || 30
  setTimeout(async () => { await endGameRound(sessionId, round) }, timeLimit * 1000)
}

function getGameContent(gameType, round) {
  const games = {
    scramble: {
      text: `<b>🧩 WORD SCRAMBLE</b>

Unscramble:

<code>N O D L O N</code>

⏱️ <b>30 seconds</b>
<i>First correct answer wins!</i>`,
      keyboard: { inline_keyboard: [] },
      timeLimit: 30,
      answer: 'london'
    },
    trivia: {
      text: `<b>🌍 WORLD TRIVIA</b>

Which country is home to the city of Berlin?

A. France
B. Germany
C. Italy
D. Spain

⏱️ <b>15 seconds</b>`,
      keyboard: {
        inline_keyboard: [
          [{ text: 'A. France', callback_data: 'game_answer_a' }],
          [{ text: 'B. Germany', callback_data: 'game_answer_b' }],
          [{ text: 'C. Italy', callback_data: 'game_answer_c' }],
          [{ text: 'D. Spain', callback_data: 'game_answer_d' }]
        ]
      },
      timeLimit: 15,
      answer: 'b'
    },
    letters: {
      text: `<b>🔤 COMPLETE THE WORD</b>

<code>G _ R M _ N Y</code>

<i>First correct answer wins.</i>`,
      keyboard: { inline_keyboard: [] },
      timeLimit: 30,
      answer: 'germany'
    },
    emoji: {
      text: `<b>🧠 EMOJI CHALLENGE</b>

🗼🥐🇫🇷

What country is represented?`,
      keyboard: { inline_keyboard: [] },
      timeLimit: 30,
      answer: 'france'
    },
    speed: {
      text: `<b>⚡ SPEED QUIZ — Question ${round}/10</b>

What is the capital of Japan?

A. Beijing
B. Seoul
C. Tokyo
D. Bangkok`,
      keyboard: {
        inline_keyboard: [
          [{ text: 'A. Beijing', callback_data: 'game_answer_a' }],
          [{ text: 'B. Seoul', callback_data: 'game_answer_b' }],
          [{ text: 'C. Tokyo', callback_data: 'game_answer_c' }],
          [{ text: 'D. Bangkok', callback_data: 'game_answer_d' }]
        ]
      },
      timeLimit: 15,
      answer: 'c'
    }
  }
  return games[gameType] || games.scramble
}

async function endGameRound(sessionId, round) {
  const session = await db.collection('game_sessions').findOne({ _id: sessionId })
  if (!session) return
  if (session.game_type !== 'speed' || round >= session.total_rounds) {
    await db.collection('game_sessions').updateOne(
      { _id: sessionId },
      { $set: { status: 'completed', ended_at: new Date() } }
    )
  }
}

async function handleGameCallback(query, data) {
  await bot.answerCallbackQuery(query.id, { text: 'Answer recorded!' })
}

// ─── START / STOP / STATUS ───
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
    await db.collection('system_logs').insertOne({ level: 'error', message: `Bot start failed: ${err.message}`, stack: err.stack, component: 'bot', created_at: new Date() })
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
