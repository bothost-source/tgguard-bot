// ─── HELP TOPIC HANDLERS ───
async function showHelpProtection(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '⚙️ Configure in Dashboard', url: process.env.FRONTEND_URL }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}

async function showHelpGames(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '🎮 Start a Game', callback_data: 'games' }],
    [{ text: '🏆 View Leaderboard', callback_data: 'leaderboard' }],
    [{ text: '⚙️ Game Settings', url: `${process.env.FRONTEND_URL}/dashboard/games` }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}

async function showHelpWelcome(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '⚙️ Welcome Settings', url: `${process.env.FRONTEND_URL}/dashboard/welcome` }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}

async function showHelpVerification(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '⚙️ Verification Settings', url: `${process.env.FRONTEND_URL}/dashboard/verification` }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}

async function showHelpReports(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
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

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '⚙️ Report Settings', url: `${process.env.FRONTEND_URL}/dashboard/reports` }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}

async function showHelpSetup(source) {
  const chatId = source.message?.chat?.id || source.chat?.id
  const text = `<b>⚙️ Setup Guide</b>

Getting TGGuard running in 3 steps:

<b>Step 1: Add to Group</b>
• Tap <b>🛡️ Add to Group</b> or use <code>/start</code>
• Add @${(await tg.getBotInfo())?.username || 'TGGuardBot'} to your group
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
Visit <a href="${process.env.FRONTEND_URL}/docs">Documentation</a> or <a href="${process.env.FRONTEND_URL}/support">Support</a>`

  await sendRich(bot, chatId, text, inlineKeyboard([
    [{ text: '🛡️ Add to Group', callback_data: 'add_to_group' }],
    [{ text: '🌐 Open Dashboard', url: process.env.FRONTEND_URL }],
    [{ text: '📚 Full Documentation', url: `${process.env.FRONTEND_URL}/docs` }],
    [{ text: '⬅️ Back to Help', callback_data: 'help' }]
  ]))
}
