import { sendMessage } from './telegram.js'

/**
 * Rich Message Converter for TGGuard
 * Converts custom HTML-like tags to Telegram-compatible HTML
 * 
 * Supported custom tags:
 * <h1>, <h2>, <h3> -> <b> with emoji prefixes
 * <p> -> plain text with newlines
 * <table>, <tr>, <th>, <td> -> formatted text with alignment
 * <ul>, <li> -> bullet points
 * <blockquote> -> Telegram blockquote
 * <code> -> inline code
 * <pre> -> preformatted code block
 * <b>, <i>, <u>, <s>, <a> -> pass through (native Telegram support)
 */

const EMOJI_HEADERS = {
  h1: '',
  h2: '',
  h3: '▫️ '
}

/**
 * Convert custom rich HTML to Telegram-compatible HTML
 * @param {string} html - Custom HTML with extended tags
 * @returns {string} - Telegram-compatible HTML
 */
export function toTelegramHTML(html) {
  if (!html) return ''

  let result = html

  // --- HEADERS ---
  result = result.replace(/<h1>(.*?)<\/h1>/gi, '<b>$1</b>')
  result = result.replace(/<h2>(.*?)<\/h2>/gi, '<b>$1</b>')
  result = result.replace(/<h3>(.*?)<\/h3>/gi, '<b>▫️ $1</b>')

  // --- TABLES ---
  result = result.replace(/<table>([\s\S]*?)<\/table>/gi, (match, content) => {
    const rows = content.match(/<tr>([\s\S]*?)<\/tr>/gi) || []
    let tableText = ''

    rows.forEach((row, rowIndex) => {
      const cells = row.match(/<(th|td)>([\s\S]*?)<\/(th|td)>/gi) || []
      const isHeader = row.includes('<th>')

      if (isHeader) {
        tableText += cells.map(c => {
          const text = c.replace(/<\/?(th|td)>/gi, '').trim()
          return `<b>${text}</b>`
        }).join('  |  ') + '\n'
        tableText += '─'.repeat(30) + '\n'
      } else {
        tableText += cells.map(c => {
          const text = c.replace(/<\/?(th|td)>/gi, '').trim()
          return text
        }).join('  |  ') + '\n'
      }
    })

    return tableText.trim()
  })

  // --- LISTS ---
  result = result.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const items = content.match(/<li>([\s\S]*?)<\/li>/gi) || []
    return items.map(item => {
      const text = item.replace(/<\/?li>/gi, '').trim()
      return `• ${text}`
    }).join('\n')
  })

  // --- BLOCKQUOTE ---
  result = result.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '<blockquote>$1</blockquote>')

  // --- PARAGRAPHS ---
  result = result.replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n')

  // --- CLEAN UP ---
  result = result.replace(/<\/?(div|span|section|article|aside|nav|header|footer|main)>/gi, '')

  // Clean up excessive newlines
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

/**
 * Build a rich welcome message
 * @param {Object} options - Message options
 * @param {string} options.title - Main title
 * @param {string} options.subtitle - Subtitle/description
 * @param {Array} options.sections - Array of sections with title and items
 * @param {string} options.footer - Footer text
 * @param {string} options.quote - Blockquote text
 * @returns {string} - Telegram-compatible HTML
 */
export function buildRichMessage({ title, subtitle, sections = [], footer, quote }) {
  let html = ''

  if (title) {
    html += `<h1>${title}</h1>\n\n`
  }

  if (subtitle) {
    html += `<p>${subtitle}</p>\n`
  }

  sections.forEach(section => {
    if (section.title) {
      html += `<h2>${section.title}</h2>\n`
    }

    if (section.table) {
      html += `<table>\n`
      if (section.table.headers) {
        html += `  <tr>${section.table.headers.map(h => `<th>${h}</th>`).join('')}</tr>\n`
      }
      section.table.rows.forEach(row => {
        html += `  <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>\n`
      })
      html += `</table>\n\n`
    }

    if (section.list) {
      html += `<ul>\n${section.list.map(item => `  <li>${item}</li>`).join('\n')}\n</ul>\n\n`
    }

    if (section.text) {
      html += `<p>${section.text}</p>\n\n`
    }
  })

  if (quote) {
    html += `<blockquote>${quote}</blockquote>\n\n`
  }

  if (footer) {
    html += `<p><i>${footer}</i></p>`
  }

  return toTelegramHTML(html)
}

/**
 * Send a rich message to a chat
 * @param {Object} botInstance - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {string|Object} content - Raw HTML string or rich message object
 * @param {Object} options - Additional sendMessage options
 */
export async function sendRich(botInstance, chatId, content, options = {}) {
  let html

  if (typeof content === 'string') {
    html = toTelegramHTML(content)
  } else {
    html = buildRichMessage(content)
  }

  return botInstance.sendMessage(chatId, html, { 
    parse_mode: 'HTML', 
    disable_web_page_preview: true,
    ...options 
  })
}

/**
 * Build a welcome message for new members
 * @param {Object} user - User object
 * @param {Object} group - Group object
 * @param {Object} settings - Group settings
 * @returns {string} - Telegram-compatible HTML
 */
export function buildWelcomeMessage(user, group, count) {
  return buildRichMessage({
    title: `👋 Welcome ${user.first_name || 'there'}!`,
    subtitle: `You've joined <b>${group.name || 'the group'}</b>. This community is protected by TGGuard.`,
    sections: [
      {
        title: '📊 Group Info',
        table: {
          headers: ['Stat', 'Value'],
          rows: [
            ['Group', group.name || 'Unknown'],
            ['Members', count?.toString() || '?'],
            ['Protection', 'Active']
          ]
        }
      },
      {
        title: '🎯 Quick Tips',
        list: [
          'Read the group rules before posting',
          'Use /menu to see bot options',
          'Play games with /games',
          'Report issues to admins'
        ]
      }
    ],
    footer: 'Enjoy your stay! 🎉'
  })
}

/**
 * Build a dashboard access message (DM only)
 * @param {Object} group - Group object
 * @param {string} dashboardUrl - Dashboard URL
 * @param {boolean} isOwner - Whether user is owner
 * @returns {Object} - Rich message object
 */
export function buildDashboardMessage(group, isOwner = false) {
  return buildRichMessage({
    title: isOwner ? '👑 Owner Panel' : '🌐 Dashboard Access',
    subtitle: `Manage <b>${group.name || 'your group'}</b> from the web dashboard.`,
    sections: [
      {
        title: '⚡ Quick Actions',
        list: [
          'Configure protection settings',
          'Manage welcome messages',
          'View moderation logs',
          'Customize game settings'
        ]
      }
    ],
    footer: 'Tap the button below to open your dashboard.'
  })
}

/**
 * Build a protection action notification
 * @param {string} action - Action taken (delete, warn, restrict, kick, ban)
 * @param {string} reason - Reason for action
 * @param {Object} user - User object
 * @param {Object} settings - Group settings
 * @returns {string} - Telegram-compatible HTML
 */
export function buildActionNotification(action, reason, user, settings = {}) {
  const actionEmojis = {
    delete: '🗑️',
    warn: '⚠️',
    restrict: '🔇',
    kick: '👢',
    ban: '🚫',
    delete_warn: '⚠️',
    delete_restrict: '🔇'
  }

  const actionNames = {
    delete: 'Message deleted',
    warn: 'Warning issued',
    restrict: 'User restricted',
    kick: 'User kicked',
    ban: 'User banned',
    delete_warn: 'Deleted & warned',
    delete_restrict: 'Deleted & restricted'
  }

  const emoji = actionEmojis[action] || '⚠️'
  const name = actionNames[action] || 'Action taken'

  return buildRichMessage({
    title: `${emoji} ${name}`,
    sections: [
      {
        table: {
          headers: ['Detail', 'Info'],
          rows: [
            ['User', user.first_name || 'Unknown'],
            ['Reason', reason],
            ['Action', name]
          ]
        }
      }
    ],
    footer: settings.notifications_enabled !== false ? 'TGGuard Protection' : undefined
  })
}

/**
 * Build an anti-link notification with customization
 * @param {Object} user - User object
 * @param {Object} settings - Anti-link settings
 * @param {number} strikeCount - Current strike count
 * @returns {string} - Telegram-compatible HTML
 */
export function buildAntiLinkNotification(user, settings, strikeCount = 1) {
  const customMessage = settings.anti_link_custom_message

  if (customMessage) {
    return customMessage
      .replace(/{user_name}/g, user.first_name || 'User')
      .replace(/{username}/g, user.username ? `@${user.username}` : user.first_name || 'User')
      .replace(/{strike_count}/g, strikeCount.toString())
      .replace(/{max_strikes}/g, (settings.anti_link_max_strikes || 3).toString())
      .replace(/{mute_duration}/g, (settings.anti_link_mute_duration || 60).toString())
  }

  return buildRichMessage({
    title: '🔗 Link Removed',
    subtitle: `<b>${user.first_name || 'User'}</b> sent a link that was removed.`,
    sections: [
      {
        text: strikeCount > 1 
          ? `Strike <b>${strikeCount}/${settings.anti_link_max_strikes || 3}</b>. Repeated violations will result in restrictions.`
          : 'Please avoid sharing unauthorized links.'
      }
    ]
  })
}

/**
 * Build a lockdown notification
 * @param {boolean} isLocked - Whether group is being locked or unlocked
 * @param {string} reason - Reason for lockdown
 * @returns {string} - Telegram-compatible HTML
 */
export function buildLockdownNotification(isLocked, reason) {
  if (isLocked) {
    return buildRichMessage({
      title: '🔒 Group Locked Down',
      subtitle: 'The group has been temporarily locked. Only administrators can send messages.',
      sections: [
        {
          text: reason ? `<b>Reason:</b> ${reason}` : 'Normal maintenance mode.'
        }
      ],
      footer: 'Admins can unlock the group from the dashboard.'
    })
  }

  return buildRichMessage({
    title: '🔓 Group Unlocked',
    subtitle: 'The group is now open. Everyone can send messages again.',
    footer: 'Welcome back! 🎉'
  })
}

/**
 * Build an AI moderation notification
 * @param {string} category - Detection category (spam, promotion, harassment, etc.)
 * @param {Object} user - User object
 * @param {number} confidence - Confidence score (0-1)
 * @param {string} reason - Detailed reason
 * @returns {string} - Telegram-compatible HTML
 */
export function buildAIModerationNotification(category, user, confidence, reason) {
  const categoryEmojis = {
    spam: '📧',
    harassment: '😤',
    'toxic/abusive': '💢',
    'suspicious/scam': '⚠️',
    'phishing-style': '🎣',
    'repeated unwanted': '🔁',
    'suspicious links': '🔗',
    'promotional content': '📢',
    'self-promotion': '👤',
    'business-promotion': '💼'
  }

  const emoji = categoryEmojis[category] || '🤖'
  const confidencePercent = Math.round((confidence || 0) * 100)

  return buildRichMessage({
    title: `${emoji} AI Moderation: ${category}`,
    sections: [
      {
        table: {
          headers: ['Detail', 'Info'],
          rows: [
            ['User', user.first_name || 'Unknown'],
            ['Category', category],
            ['Confidence', `${confidencePercent}%`],
            ['Reason', reason || 'AI-detected violation']
          ]
        }
      }
    ],
    footer: 'This action was taken automatically by TGGuard AI.'
  })
}

/**
 * Build a game results message
 * @param {Object} session - Game session
 * @param {Array} topPlayers - Top players array
 * @returns {string} - Telegram-compatible HTML
 */
export function buildGameResultsMessage(session, topPlayers) {
  const gameNames = {
    scramble: '🧩 Word Scramble',
    trivia: '🌍 World Trivia',
    letters: '🔤 Missing Letters',
    emoji: '😀 Emoji Challenge',
    speed: '⚡ Speed Quiz'
  }

  const sections = []

  if (topPlayers.length > 0) {
    sections.push({
      title: '🏆 Final Results',
      table: {
        headers: ['Rank', 'Player', 'Score', 'Correct'],
        rows: topPlayers.map((p, i) => [
          i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`,
          p.username || `User${p.userId}`,
          p.total.toString(),
          `${p.correct}/${session.total_rounds}`
        ])
      }
    })
  } else {
    sections.push({
      text: '<i>No scores this round. Better luck next time!</i>'
    })
  }

  return buildRichMessage({
    title: `${gameNames[session.game_type] || '🎮 Game Over'}`,
    subtitle: '<b>Game Complete!</b>',
    sections,
    footer: 'Play again with /games'
  })
}

/**
 * Validate that HTML is safe for Telegram
 * @param {string} html - HTML string to validate
 * @returns {string} - Sanitized HTML
 */
export function sanitizeForTelegram(html) {
  if (!html) return ''

  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script[\s\S]*?>\s*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')

  return sanitized
}

export default {
  toTelegramHTML,
  buildRichMessage,
  sendRich,
  buildWelcomeMessage,
  buildDashboardMessage,
  buildActionNotification,
  buildAntiLinkNotification,
  buildLockdownNotification,
  buildAIModerationNotification,
  buildGameResultsMessage,
  sanitizeForTelegram
}
