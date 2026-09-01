import axios from 'axios'

const BOT_TOKEN = process.env.BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function getBotInfo() {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getMe`)
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Get bot info error:', err.message)
    return null
  }
}

export async function getChat(chatId) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getChat`, { params: { chat_id: chatId } })
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Get chat error:', err.message)
    return null
  }
}

export async function getChatMember(chatId, userId) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getChatMember`, { params: { chat_id: chatId, user_id: userId } })
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Get chat member error:', err.message)
    return null
  }
}

export async function getChatAdministrators(chatId) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getChatAdministrators`, { params: { chat_id: chatId } })
    return response.data.ok ? response.data.result : []
  } catch (err) {
    console.error('Get admins error:', err.message)
    return []
  }
}

export async function isUserAdmin(chatId, userId) {
  const admins = await getChatAdministrators(chatId)
  return admins.some(admin => admin.user.id === parseInt(userId) && ['creator', 'administrator'].includes(admin.status))
}

export async function getBotPermissions(chatId) {
  const botInfo = await getBotInfo()
  if (!botInfo) return null
  const member = await getChatMember(chatId, botInfo.id)
  if (!member) return null
  if (member.status !== 'administrator') {
    return { is_admin: false, can_delete_messages: false, can_restrict_members: false, can_pin_messages: false, can_invite_users: false, can_manage_chat: false }
  }
  return {
    is_admin: true,
    can_delete_messages: member.can_delete_messages || false,
    can_restrict_members: member.can_restrict_members || false,
    can_pin_messages: member.can_pin_messages || false,
    can_invite_users: member.can_invite_users || false,
    can_manage_chat: member.can_manage_chat || false,
    is_anonymous: member.is_anonymous || false
  }
}

export async function deleteMessage(chatId, messageId) {
  try {
    await axios.post(`${TELEGRAM_API}/deleteMessage`, { chat_id: chatId, message_id: messageId })
    return true
  } catch (err) {
    console.error('Delete message error:', err.message)
    return false
  }
}

export async function restrictUser(chatId, userId, untilDate = null, permissions = {}) {
  try {
    const defaultPerms = { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_invite_users: false, can_pin_messages: false, ...permissions }
    await axios.post(`${TELEGRAM_API}/restrictChatMember`, { chat_id: chatId, user_id: userId, permissions: defaultPerms, until_date: untilDate })
    return true
  } catch (err) {
    console.error('Restrict user error:', err.message)
    return false
  }
}

export async function kickUser(chatId, userId) {
  try {
    await axios.post(`${TELEGRAM_API}/banChatMember`, { chat_id: chatId, user_id: userId, until_date: Math.floor(Date.now() / 1000) + 60 })
    return true
  } catch (err) {
    console.error('Kick user error:', err.message)
    return false
  }
}

export async function banUser(chatId, userId) {
  try {
    await axios.post(`${TELEGRAM_API}/banChatMember`, { chat_id: chatId, user_id: userId })
    return true
  } catch (err) {
    console.error('Ban user error:', err.message)
    return false
  }
}

export async function unbanUser(chatId, userId) {
  try {
    await axios.post(`${TELEGRAM_API}/unbanChatMember`, { chat_id: chatId, user_id: userId })
    return true
  } catch (err) {
    console.error('Unban user error:', err.message)
    return false
  }
}

export async function sendMessage(chatId, text, options = {}) {
  try {
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: options.parse_mode || 'HTML', reply_markup: options.reply_markup, disable_notification: options.disable_notification || false })
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Send message error:', err.message)
    return null
  }
}

export async function sendPhoto(chatId, photo, caption, options = {}) {
  try {
    const response = await axios.post(`${TELEGRAM_API}/sendPhoto`, { chat_id: chatId, photo, caption, parse_mode: options.parse_mode || 'HTML', reply_markup: options.reply_markup })
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Send photo error:', err.message)
    return null
  }
}

export async function sendVideo(chatId, video, caption, options = {}) {
  try {
    const response = await axios.post(`${TELEGRAM_API}/sendVideo`, { chat_id: chatId, video, caption, parse_mode: options.parse_mode || 'HTML', reply_markup: options.reply_markup })
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Send video error:', err.message)
    return null
  }
}

export async function getChatMembersCount(chatId) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getChatMemberCount`, { params: { chat_id: chatId } })
    return response.data.ok ? response.data.result : 0
  } catch (err) {
    console.error('Get member count error:', err.message)
    return 0
  }
}

export async function setWebhook(url) {
  try {
    const response = await axios.post(`${TELEGRAM_API}/setWebhook`, { url, allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'inline_query'] })
    return response.data.ok
  } catch (err) {
    console.error('Set webhook error:', err.message)
    return false
  }
}

export async function deleteWebhook() {
  try {
    const response = await axios.post(`${TELEGRAM_API}/deleteWebhook`)
    return response.data.ok
  } catch (err) {
    console.error('Delete webhook error:', err.message)
    return false
  }
}

export async function getWebhookInfo() {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getWebhookInfo`)
    return response.data.ok ? response.data.result : null
  } catch (err) {
    console.error('Get webhook info error:', err.message)
    return null
  }
}
