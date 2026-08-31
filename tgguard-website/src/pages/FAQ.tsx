import { motion } from 'framer-motion'
import { HelpCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import AnimatedCard from '../components/AnimatedCard'

const faqs = [
  {
    q: 'What is TGGuard?',
    a: 'TGGuard is an intelligent moderation platform for Telegram groups. It provides smart filters, verification, welcome messages, games, and analytics — all managed through a powerful web dashboard.',
  },
  {
    q: 'How do I add TGGuard to my group?',
    a: 'Click "Add Telegram Group" in your dashboard, add TGGuard as an administrator in your Telegram group, then return to the dashboard and click "Check Group" to verify the connection.',
  },
  {
    q: 'Why does TGGuard need administrator permissions?',
    a: 'TGGuard needs administrator permissions to delete spam messages, restrict or ban users, pin welcome messages, and perform other moderation actions on your behalf. Without these permissions, TGGuard cannot protect your group.',
  },
  {
    q: 'How does protection work?',
    a: 'Once configured, TGGuard monitors messages in real-time. When a message triggers a filter (spam, links, banned words, or restricted media), TGGuard performs the action you configured — from deleting the message to removing the user.',
  },
  {
    q: 'How do word filters work?',
    a: "You add words or phrases to your group's filter list. When a message contains a filtered word, TGGuard performs your configured action. Each group has its own independent filter list.",
  },
  {
    q: 'How does verification work?',
    a: 'When a new member joins, TGGuard sends them a verification challenge. They must complete it within the timeout period. If they fail or timeout, TGGuard performs your configured timeout action.',
  },
  {
    q: 'How do welcome messages work?',
    a: 'You can choose between a default welcome message or create a custom one with text, media, and buttons. Welcome messages are sent automatically when new members join. You can also set them to auto-delete after a configured time.',
  },
  {
    q: 'How do reports work?',
    a: 'Group members can report messages or users. Reports are sent privately to authorized administrators, never to the whole group. Admins can view, warn, restrict, remove, or dismiss each report.',
  },
  {
    q: 'How do games work?',
    a: 'TGGuard includes 5 community games: Word Scramble, World Trivia, Speed Quiz, Missing Letters, and Emoji Challenge. You control who can start games (admins only, all members, or admin approval required).',
  },
  {
    q: 'How do leaderboards work?',
    a: 'Each group has its own community leaderboard. There is also a global leaderboard across all participating TGGuard communities. Scores are validated server-side to prevent cheating.',
  },
  {
    q: 'How do I remove TGGuard?',
    a: 'Go to Settings in your dashboard and click "Disconnect Group". You can also remove TGGuard directly from your Telegram group's administrator list.',
  },
  {
    q: 'How do I contact support?',
    a: 'Send a message to the TGGuard bot owner @LORDTARRIFIC or email supportaurachat@gmail.com.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-tgg-dark">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <HelpCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-white/50">Everything you need to know about TGGuard</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <AnimatedCard key={i} delay={i * 0.03}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="text-white font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t border-white/5"
                >
                  <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </AnimatedCard>
          ))}
        </div>
      </div>
    </div>
  )
}
