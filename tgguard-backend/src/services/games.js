import { db } from '../models/db.js'
import { ObjectId } from 'mongodb'
import * as tg from './telegram.js'
import { sendRich, buildGameResultsMessage } from './richMessage.js'

/**
 * ═══════════════════════════════════════════════════════════════
 * TGGuard Games Module
 * Extracted from bot.js for better organization
 * ═══════════════════════════════════════════════════════════════
 */

// ─── GAME DATA BANKS ───

const WORD_SCRAMBLE_BANK = [
  { word: 'LONDON', hint: 'Capital of the UK' },
  { word: 'PARIS', hint: 'City of lights' },
  { word: 'TOKYO', hint: 'Capital of Japan' },
  { word: 'SYDNEY', hint: 'Australian harbor city' },
  { word: 'BERLIN', hint: 'German capital' },
  { word: 'MADRID', hint: 'Spanish capital' },
  { word: 'MOSCOW', hint: 'Red Square city' },
  { word: 'DUBLIN', hint: 'Irish capital' },
  { word: 'VIENNA', hint: 'City of music' },
  { word: 'ATHENS', hint: 'Birthplace of democracy' },
  { word: 'BUDAPEST', hint: 'Danube city' },
  { word: 'WARSAW', hint: 'Polish capital' },
  { word: 'LISBON', hint: 'Portuguese capital' },
  { word: 'OSLO', hint: 'Norwegian capital' },
  { word: 'HELSINKI', hint: 'Finnish capital' },
  { word: 'PRAGUE', hint: 'City of a hundred spires' },
  { word: 'ZURICH', hint: 'Swiss banking city' },
  { word: 'AMSTERDAM', hint: 'City of canals' },
  { word: 'BRUSSELS', hint: 'EU capital' },
  { word: 'COPENHAGEN', hint: 'Danish capital' }
]

const TRIVIA_BANK = [
  { q: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], answer: 2, category: 'Geography' },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1, category: 'Science' },
  { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Rembrandt'], answer: 2, category: 'Art' },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3, category: 'Geography' },
  { q: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], answer: 2, category: 'History' },
  { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2, category: 'Science' },
  { q: 'Which country has the most natural lakes?', options: ['USA', 'Russia', 'Canada', 'Brazil'], answer: 2, category: 'Geography' },
  { q: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], answer: 1, category: 'Literature' },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2, category: 'Math' },
  { q: 'Which element has the atomic number 1?', options: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'], answer: 2, category: 'Science' },
  { q: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], answer: 1, category: 'Geography' },
  { q: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'John Glenn'], answer: 2, category: 'History' },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2, category: 'Science' },
  { q: 'Which country invented tea?', options: ['India', 'Japan', 'China', 'England'], answer: 2, category: 'Culture' },
  { q: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], answer: 2, category: 'Culture' },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2, category: 'Geography' },
  { q: 'What is the largest mammal?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'], answer: 1, category: 'Nature' },
  { q: 'Which gas do plants absorb?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], answer: 1, category: 'Science' },
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], answer: 2, category: 'Geography' },
  { q: 'Who invented the telephone?', options: ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Guglielmo Marconi'], answer: 1, category: 'History' }
]

const MISSING_LETTERS_BANK = [
  { word: 'GERMANY', display: 'G_R_M_NY', hint: 'European country' },
  { word: 'BRAZIL', display: 'B_A_I_', hint: 'South American country' },
  { word: 'CANADA', display: 'C_N_D_', hint: 'North American country' },
  { word: 'MEXICO', display: 'M_X_C_', hint: 'Country south of USA' },
  { word: 'EGYPT', display: 'E_Y_P_', hint: 'Land of the pyramids' },
  { word: 'TURKEY', display: 'T_R_EY', hint: 'Country bridging Europe and Asia' },
  { word: 'NORWAY', display: 'N_R_AY', hint: 'Fjord country' },
  { word: 'SWEDEN', display: 'S_E_EN', hint: "IKEA's home" },
  { word: 'ITALY', display: 'I_A_Y', hint: 'Pizza and pasta' },
  { word: 'GREECE', display: 'G_EE_E', hint: 'Ancient civilization' },
  { word: 'INDIA', display: 'I_D_A', hint: 'Land of spices' },
  { word: 'CHINA', display: 'C_I_A', hint: 'Great Wall country' },
  { word: 'JAPAN', display: 'J_P_N', hint: 'Land of the rising sun' },
  { word: 'KOREA', display: 'K_R_A', hint: 'K-pop homeland' },
  { word: 'THAILAND', display: 'T_A_LA_D', hint: 'Land of smiles' },
  { word: 'VIETNAM', display: 'V_E_NAM', hint: 'Southeast Asian country' },
  { word: 'PHILIPPINES', display: 'P_I_IP_IN_S', hint: 'Archipelago nation' },
  { word: 'INDONESIA', display: 'I_DO_ES_A', hint: "World's largest island country" },
  { word: 'ARGENTINA', display: 'A_GE_TI_A', hint: 'Tango origin' },
  { word: 'COLOMBIA', display: 'C_LOM_IA', hint: 'Coffee exporter' }
]

const EMOJI_CHALLENGE_BANK = [
  { emojis: '🗼🥐🇫🇷', answer: 'France', hint: 'European country' },
  { emojis: '🍕🍝🏛️', answer: 'Italy', hint: 'European country' },
  { emojis: '🍔🗽🦅', answer: 'USA', hint: 'North American country' },
  { emojis: '🍣🗻🌸', answer: 'Japan', hint: 'Asian country' },
  { emojis: '🦘🐨🏄', answer: 'Australia', hint: 'Oceania country' },
  { emojis: '🦁🐘🦒', answer: 'Africa', hint: 'Continent' },
  { emojis: '🐂💃🍷', answer: 'Spain', hint: 'European country' },
  { emojis: '🍫⌚🏔️', answer: 'Switzerland', hint: 'European country' },
  { emojis: '🍺🥨🏰', answer: 'Germany', hint: 'European country' },
  { emojis: '🍁🦌🏒', answer: 'Canada', hint: 'North American country' },
  { emojis: '🌮🌵💀', answer: 'Mexico', hint: 'North American country' },
  { emojis: '🐪🏜️🕌', answer: 'Egypt', hint: 'African country' },
  { emojis: '🐅🧘🕌', answer: 'India', hint: 'Asian country' },
  { emojis: '🐉🧧🏮', answer: 'China', hint: 'Asian country' },
  { emojis: '🦍🌿🥁', answer: 'Congo', hint: 'African country' },
  { emojis: '🌷🚲🧀', answer: 'Netherlands', hint: 'European country' },
  { emojis: '🥐☕🎨', answer: 'France', hint: 'European country (again!)' },
  { emojis: '🦅⚽🏛️', answer: 'Brazil', hint: 'South American country' },
  { emojis: '🐧❄️🏔️', answer: 'Antarctica', hint: 'Continent' },
  { emojis: '🍀🍺🎻', answer: 'Ireland', hint: 'European country' }
]

const SPEED_QUIZ_BANK = [
  { q: 'What is 7 x 8?', options: ['54', '56', '58', '52'], answer: 1, category: 'Math' },
  { q: 'What color is a banana?', options: ['Red', 'Green', 'Yellow', 'Orange'], answer: 2, category: 'General' },
  { q: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], answer: 1, category: 'Nature' },
  { q: 'What is the opposite of hot?', options: ['Warm', 'Cold', 'Cool', 'Freezing'], answer: 1, category: 'General' },
  { q: 'Which shape has 3 sides?', options: ['Square', 'Circle', 'Triangle', 'Rectangle'], answer: 2, category: 'Math' },
  { q: 'What do bees make?', options: ['Wax', 'Honey', 'Silk', 'Milk'], answer: 1, category: 'Nature' },
  { q: 'How many days in a week?', options: ['5', '6', '7', '8'], answer: 2, category: 'General' },
  { q: 'What is H2O?', options: ['Hydrogen', 'Oxygen', 'Water', 'Helium'], answer: 2, category: 'Science' },
  { q: 'Which animal says "moo"?', options: ['Sheep', 'Pig', 'Cow', 'Horse'], answer: 2, category: 'Nature' },
  { q: 'What is 100 / 10?', options: ['1', '10', '100', '1000'], answer: 1, category: 'Math' },
  { q: 'What is the first letter of the alphabet?', options: ['A', 'B', 'C', 'D'], answer: 0, category: 'General' },
  { q: 'How many months in a year?', options: ['10', '11', '12', '13'], answer: 2, category: 'General' },
  { q: 'What is 5 + 7?', options: ['10', '11', '12', '13'], answer: 2, category: 'Math' },
  { q: 'Which planet do we live on?', options: ['Mars', 'Venus', 'Earth', 'Jupiter'], answer: 2, category: 'Science' },
  { q: 'What do you use to write?', options: ['Fork', 'Pen', 'Spoon', 'Knife'], answer: 1, category: 'General' },
  { q: 'How many colors in a rainbow?', options: ['5', '6', '7', '8'], answer: 2, category: 'Nature' },
  { q: 'What is 9 x 9?', options: ['72', '81', '90', '99'], answer: 1, category: 'Math' },
  { q: 'Which season comes after summer?', options: ['Spring', 'Autumn', 'Winter', 'Fall'], answer: 1, category: 'Nature' },
  { q: 'What is the largest animal?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Shark'], answer: 1, category: 'Nature' },
  { q: 'How many seconds in a minute?', options: ['30', '60', '90', '100'], answer: 1, category: 'General' }
]

const GAME_NAMES = {
  scramble: '🧩 Word Scramble',
  trivia: '🌍 World Trivia',
  letters: '🔤 Missing Letters',
  emoji: '😀 Emoji Challenge',
  speed: '⚡ Speed Quiz'
}

// ─── HELPERS ───

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function scrambleWord(word) {
  const letters = word.split('')
  let scrambled
  do {
    scrambled = shuffleArray(letters).join(' ')
  } while (scrambled.replace(/ /g, '') === word)
  return scrambled
}

// ─── GAME SESSION MANAGEMENT ───

/**
 * Start a new game session
 * @param {Object} botInstance - Telegram bot instance
 * @param {Object} query - Callback query object
 * @param {string} gameType - Type of game
 */
export async function startGame(botInstance, query, gameType) {
  const chatId = query.message?.chat?.id
  if (!chatId) {
    await sendRich(botInstance, chatId, '❌ Games can only be played in groups.')
    return
  }

  const group = await db.collection('groups').findOne({ chat_id: BigInt(chatId) })
  if (!group) {
    await sendRich(botInstance, chatId, '❌ This group is not connected to TGGuard.')
    return
  }

  const settings = await db.collection('group_settings').findOne({ group_id: group._id })
  if (!settings?.games_enabled) {
    await sendRich(botInstance, chatId, '🎮 Games are disabled in this group.')
    return
  }

  const gameConfig = await db.collection('game_configurations').findOne({ group_id: group._id })
  const isAdmin = await tg.isUserAdmin(chatId, query.from.id)
  const canStart = settings.games_permission === 'members' || 
                   (settings.games_permission === 'admins' && isAdmin) || 
                   (settings.games_permission === 'approval' && isAdmin)

  if (!canStart) {
    await sendRich(botInstance, chatId, '🎮 Only admins can start games in this group.')
    return
  }

  // Check cooldown
  const lastGame = await db.collection('game_sessions').findOne(
    { group_id: group._id, status: { $in: ['active', 'waiting'] } },
    { sort: { created_at: -1 } }
  )

  if (lastGame) {
    const cooldownMs = (gameConfig?.cooldown_minutes || 5) * 60 * 1000
    if (Date.now() - lastGame.created_at.getTime() < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (Date.now() - lastGame.created_at.getTime())) / 1000)
      await sendRich(botInstance, chatId, `⏳ Please wait <b>${remaining}s</b> before starting another game.`)
      return
    }
  }

  // Build game session
  const roundCount = gameType === 'speed' ? 10 : 5
  let questions = []

  switch (gameType) {
    case 'scramble': questions = shuffleArray(WORD_SCRAMBLE_BANK).slice(0, roundCount); break
    case 'trivia': questions = shuffleArray(TRIVIA_BANK).slice(0, roundCount); break
    case 'letters': questions = shuffleArray(MISSING_LETTERS_BANK).slice(0, roundCount); break
    case 'emoji': questions = shuffleArray(EMOJI_CHALLENGE_BANK).slice(0, roundCount); break
    case 'speed': questions = shuffleArray(SPEED_QUIZ_BANK).slice(0, roundCount); break
  }

  const session = await db.collection('game_sessions').insertOne({
    group_id: group._id,
    chat_id: BigInt(chatId),
    host_user_id: BigInt(query.from.id),
    host_username: query.from.username || null,
    game_type: gameType,
    status: 'waiting',
    current_round: 0,
    total_rounds: roundCount,
    questions: questions,
    scores: {},
    players: [],
    answers: [],
    started_at: null,
    ended_at: null,
    created_at: new Date()
  })

  // Show game intro
  await sendRich(botInstance, chatId, `<b>${GAME_NAMES[gameType]}</b>

<b>📋 Rules:</b>
• <b>${roundCount}</b> rounds
• Answer in the chat (text games) or tap buttons (quiz games)
• Fastest correct answer gets bonus points
• Type <code>/join</code> to participate

Starting in <b>5 seconds</b>...`)

  setTimeout(() => runGameRound(botInstance, chatId, session.insertedId, gameType, 1), 5000)
}

/**
 * Run a single game round
 */
export async function runGameRound(botInstance, chatId, sessionId, gameType, round) {
  const session = await db.collection('game_sessions').findOne({ _id: sessionId })
  if (!session || session.status === 'completed') return

  const question = session.questions[round - 1]
  const timeLimit = gameType === 'speed' || gameType === 'trivia' ? 15 : 30

  await db.collection('game_sessions').updateOne(
    { _id: sessionId },
    { $set: { status: 'active', current_round: round, started_at: new Date() } }
  )

  let text = ''
  let keyboard = { inline_keyboard: [] }

  switch (gameType) {
    case 'scramble': {
      const scrambled = scrambleWord(question.word)
      text = `<b>🧩 WORD SCRAMBLE — Round ${round}/${session.total_rounds}</b>

<b>Hint:</b> <i>${question.hint}</i>

<code>${scrambled}</code>

⏱️ <b>${timeLimit} seconds</b>
<i>Type the correct word in chat!</i>`
      break
    }
    case 'trivia': {
      const opts = ['A', 'B', 'C', 'D']
      text = `<b>🌍 WORLD TRIVIA — Round ${round}/${session.total_rounds}</b>
<i>${question.category}</i>

<b>${question.q}</b>

${opts.map((opt, i) => `${opt}. ${question.options[i]}`).join('\n')}

⏱️ <b>${timeLimit} seconds</b>
<i>Tap the correct answer!</i>`
      keyboard = {
        inline_keyboard: [
          [{ text: 'A', callback_data: `game_answer_${sessionId}_${round}_0` }, { text: 'B', callback_data: `game_answer_${sessionId}_${round}_1` }],
          [{ text: 'C', callback_data: `game_answer_${sessionId}_${round}_2` }, { text: 'D', callback_data: `game_answer_${sessionId}_${round}_3` }]
        ]
      }
      break
    }
    case 'letters': {
      text = `<b>🔤 MISSING LETTERS — Round ${round}/${session.total_rounds}</b>

<b>Hint:</b> <i>${question.hint}</i>

<code>${question.display}</code>

⏱️ <b>${timeLimit} seconds</b>
<i>Type the complete word in chat!</i>`
      break
    }
    case 'emoji': {
      text = `<b>😀 EMOJI CHALLENGE — Round ${round}/${session.total_rounds}</b>

<b>${question.emojis}</b>

<i>${question.hint}</i>

⏱️ <b>${timeLimit} seconds</b>
<i>Type your guess in chat!</i>`
      break
    }
    case 'speed': {
      const opts = ['A', 'B', 'C', 'D']
      text = `<b>⚡ SPEED QUIZ — Round ${round}/${session.total_rounds}</b>
<i>${question.category}</i>

<b>${question.q}</b>

${opts.map((opt, i) => `${opt}. ${question.options[i]}`).join('\n')}

⏱️ <b>${timeLimit} seconds</b>
<i>Tap fast — speed matters!</i>`
      keyboard = {
        inline_keyboard: [
          [{ text: 'A', callback_data: `game_answer_${sessionId}_${round}_0` }, { text: 'B', callback_data: `game_answer_${sessionId}_${round}_1` }],
          [{ text: 'C', callback_data: `game_answer_${sessionId}_${round}_2` }, { text: 'D', callback_data: `game_answer_${sessionId}_${round}_3` }]
        ]
      }
      break
    }
  }

  const sentMsg = await sendRich(botInstance, chatId, text, 
    keyboard.inline_keyboard.length > 0 ? { reply_markup: keyboard } : undefined)

  // Store message ID for cleanup
  await db.collection('game_sessions').updateOne(
    { _id: sessionId },
    { $set: { current_message_id: sentMsg?.message_id } }
  )

  // Set round timer
  setTimeout(async () => {
    await endGameRound(botInstance, chatId, sessionId, round, gameType)
  }, timeLimit * 1000)
}

/**
 * End a game round and show results
 */
export async function endGameRound(botInstance, chatId, sessionId, round, gameType) {
  const session = await db.collection('game_sessions').findOne({ _id: sessionId })
  if (!session || session.current_round !== round) return

  const question = session.questions[round - 1]
  let correctAnswer = ''

  switch (gameType) {
    case 'scramble': correctAnswer = question.word; break
    case 'trivia': correctAnswer = question.options[question.answer]; break
    case 'letters': correctAnswer = question.word; break
    case 'emoji': correctAnswer = question.answer; break
    case 'speed': correctAnswer = question.options[question.answer]; break
  }

  // Show round results
  const roundAnswers = session.answers.filter(a => a.round === round)
  let resultText = `<b>⏰ Time's up!</b>\n\n<b>Answer:</b> <code>${correctAnswer}</code>\n\n`

  if (roundAnswers.length === 0) {
    resultText += '<i>No one answered correctly 😢</i>'
  } else {
    resultText += '<b>🏆 Round Winners:</b>\n'
    roundAnswers
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 3)
      .forEach((a, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
        resultText += `${medal} ${a.username || `User${a.userId}`} — <b>+${a.points}</b> pts\n`
      })
  }

  await sendRich(botInstance, chatId, resultText)

  // Delete old question message if possible
  if (session.current_message_id) {
    try { await tg.deleteMessage(chatId, session.current_message_id) } catch (e) {}
  }

  // Next round or end game
  if (round < session.total_rounds) {
    setTimeout(() => runGameRound(botInstance, chatId, sessionId, gameType, round + 1), 3000)
  } else {
    setTimeout(() => endGame(botInstance, chatId, sessionId), 2000)
  }
}

/**
 * End the game and show final results
 */
export async function endGame(botInstance, chatId, sessionId) {
  const session = await db.collection('game_sessions').findOne({ _id: sessionId })
  if (!session) return

  await db.collection('game_sessions').updateOne(
    { _id: sessionId },
    { $set: { status: 'completed', ended_at: new Date() } }
  )

  // Calculate final scores
  const playerScores = {}
  session.answers.forEach(a => {
    if (!playerScores[a.userId]) {
      playerScores[a.userId] = { username: a.username, total: 0, correct: 0 }
    }
    playerScores[a.userId].total += a.points
    playerScores[a.userId].correct += 1
  })

  const sortedPlayers = Object.entries(playerScores)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5)

  // Save to global leaderboard
  for (const [userId, data] of sortedPlayers) {
    db.collection('game_scores').updateOne(
      { user_telegram_id: BigInt(userId), game_type: session.game_type },
      {
        $inc: { score: data.total, games_played: 1, correct_answers: data.correct },
        $set: { username: data.username, updated_at: new Date() }
      },
      { upsert: true }
    ).catch(console.error)
  }

  // Update group stats
  await db.collection('groups').updateOne(
    { _id: session.group_id },
    { 
      $inc: { games_played_total: 1 },
      $set: { updated_at: new Date() }
    }
  )

  const finalText = buildGameResultsMessage(session, sortedPlayers.map(([userId, data]) => ({
    userId,
    username: data.username,
    total: data.total,
    correct: data.correct
  })))

  await sendRich(botInstance, chatId, finalText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Play Again', callback_data: 'games' }],
        [{ text: '🏆 Global Leaderboard', callback_data: 'leaderboard' }]
      ]
    }
  })
}

/**
 * Handle text-based game answers (scramble, letters, emoji)
 */
export async function handleGameTextAnswer(botInstance, msg) {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const text = msg.text?.toLowerCase().trim()
  if (!text || msg.chat.type === 'private') return

  const session = await db.collection('game_sessions').findOne({
    chat_id: BigInt(chatId),
    status: 'active',
    game_type: { $in: ['scramble', 'letters', 'emoji'] }
  })

  if (!session) return

  const round = session.current_round
  const question = session.questions[round - 1]
  if (!question) return

  // Check if already answered this round
  const alreadyAnswered = session.answers.some(a => a.round === round && a.userId === userId)
  if (alreadyAnswered) return

  let correctAnswer = ''

  switch (session.game_type) {
    case 'scramble': correctAnswer = question.word.toLowerCase(); break
    case 'letters': correctAnswer = question.word.toLowerCase(); break
    case 'emoji': correctAnswer = question.answer.toLowerCase(); break
  }

  const isCorrect = text === correctAnswer

  if (isCorrect) {
    const roundStart = session.started_at?.getTime() || Date.now()
    const timeMs = Date.now() - roundStart
    const basePoints = 10
    const speedBonus = Math.max(0, Math.floor((30000 - timeMs) / 1000))
    const totalPoints = basePoints + speedBonus

    await db.collection('game_sessions').updateOne(
      { _id: session._id },
      {
        $push: {
          answers: {
            round,
            userId,
            username: msg.from.username || msg.from.first_name || `User${userId}`,
            timeMs,
            points: totalPoints,
            correct: true
          }
        },
        $addToSet: { players: BigInt(userId) }
      }
    )

    await sendRich(botInstance, chatId, 
      `✅ <b>${msg.from.first_name || 'Player'}</b> got it! <b>+${totalPoints}</b> pts`, 
      { disable_notification: true })
  }
}

/**
 * Handle button-based game answers (trivia, speed quiz)
 */
export async function handleGameCallback(botInstance, query, data) {
  const match = data.match(/^game_answer_([a-f0-9]+)_(\d+)_(\d+)$/)
  if (!match) {
    await botInstance.answerCallbackQuery(query.id, { text: '❌ Invalid game data' })
    return
  }

  const [, sessionIdStr, roundStr, answerIndexStr] = match
  const sessionId = new ObjectId(sessionIdStr)
  const round = parseInt(roundStr)
  const answerIndex = parseInt(answerIndexStr)
  const userId = query.from.id
  const chatId = query.message?.chat?.id

  const session = await db.collection('game_sessions').findOne({ _id: sessionId })
  if (!session || session.status !== 'active' || session.current_round !== round) {
    await botInstance.answerCallbackQuery(query.id, { text: '⏰ Too late!' })
    return
  }

  // Check if already answered
  const alreadyAnswered = session.answers.some(a => a.round === round && a.userId === userId)
  if (alreadyAnswered) {
    await botInstance.answerCallbackQuery(query.id, { text: '✅ Already answered!' })
    return
  }

  const question = session.questions[round - 1]
  const isCorrect = answerIndex === question.answer

  if (isCorrect) {
    const roundStart = session.started_at?.getTime() || Date.now()
    const timeMs = Date.now() - roundStart
    const basePoints = 10
    const speedBonus = Math.max(0, Math.floor((15000 - timeMs) / 1000))
    const totalPoints = basePoints + speedBonus

    await db.collection('game_sessions').updateOne(
      { _id: sessionId },
      {
        $push: {
          answers: {
            round,
            userId,
            username: query.from.username || query.from.first_name || `User${userId}`,
            timeMs,
            points: totalPoints,
            correct: true
          }
        },
        $addToSet: { players: BigInt(userId) }
      }
    )

    await botInstance.answerCallbackQuery(query.id, { text: `✅ Correct! +${totalPoints} pts` })
  } else {
    await botInstance.answerCallbackQuery(query.id, { text: '❌ Wrong answer!' })
  }
}

/**
 * Get global leaderboard
 */
export async function getLeaderboard(limit = 10) {
  return db.collection('game_scores').aggregate([
    { $group: { 
      _id: '$user_telegram_id', 
      total: { $sum: '$score' }, 
      username: { $first: '$username' }, 
      games: { $sum: '$games_played' }, 
      correct: { $sum: '$correct_answers' } 
    }},
    { $sort: { total: -1 } },
    { $limit: limit }
  ]).toArray()
}

/**
 * Get group-specific game stats
 */
export async function getGroupGameStats(groupId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalGames, totalPlayers, topPlayer] = await Promise.all([
    db.collection('game_sessions').countDocuments({ group_id: groupId, created_at: { $gte: since } }),
    db.collection('game_sessions').aggregate([
      { $match: { group_id: groupId, created_at: { $gte: since } } },
      { $unwind: '$players' },
      { $group: { _id: null, uniquePlayers: { $addToSet: '$players' } } },
      { $project: { count: { $size: '$uniquePlayers' } } }
    ]).toArray(),
    db.collection('game_sessions').aggregate([
      { $match: { group_id: groupId, created_at: { $gte: since } } },
      { $unwind: '$answers' },
      { $group: { _id: '$answers.userId', totalPoints: { $sum: '$answers.points' }, username: { $first: '$answers.username' } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 1 }
    ]).toArray()
  ])

  return {
    total_games: totalGames,
    total_players: totalPlayers[0]?.count || 0,
    top_player: topPlayer[0] || null,
    period_days: days
  }
}

export default {
  startGame,
  runGameRound,
  endGameRound,
  endGame,
  handleGameTextAnswer,
  handleGameCallback,
  getLeaderboard,
  getGroupGameStats
}
