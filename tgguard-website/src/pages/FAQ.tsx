import { motion } from 'framer-motion'
import { HelpCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'

const faqs = [
  { q: 'What is TGGuard?', a: 'TGGuard is an intelligent moderation platform for Telegram groups. It provides smart filters, verification, welcome messages, games, and analytics.' },
  { q: 'How do I add TGGuard to my group?', a: 'Click "Add Telegram Group" in your dashboard, add TGGuard as an administrator, then return and click "Check Group" to verify.' },
  { q: 'Why does TGGuard need administrator permissions?', a: 'TGGuard needs admin permissions to delete spam, restrict/ban users, pin welcome messages, and perform moderation actions.' },
  { q: 'How does protection work?', a: 'Once configured, TGGuard monitors messages in real-time. When a message triggers a filter, TGGuard performs your configured action.' },
  { q: 'How do word filters work?', a: 'You add words or phrases to your group's filter list. Each group has its own independent filter list.' },
  { q: 'How does verification work?', a: 'When a new member joins, TGGuard sends a verification challenge. They must complete it within the timeout period.' },
  { q: 'How do welcome messages work?', a: 'You can choose between a default welcome or create a custom one with text, media, and buttons.' },
  { q: 'How do reports work?', a: 'Group members can report messages or users. Reports are sent privately to authorized administrators.' },
  { q: 'How do games work?', a: 'TGGuard includes 5 community games played in Telegram. You control who can start games.' },
  { q: 'How do I remove TGGuard?', a: 'Go to Settings and click "Disconnect Group", or remove TGGuard from your Telegram group admin list.' },
  { q: 'How do I contact support?', a: 'Send a message to @LORDTARRIFIC or email supportaurachat@gmail.com.' },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <HelpCircle className="w-10 h-10 text-white/40 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Frequently Asked Questions</h1>
          <p className="text-white/40">Everything you need to know about TGGuard</p>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <AnimatedCard key={i} delay={i * 0.02} className="!p-0 overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="flex items-center justify-between w-full text-left p-5">
                <span className="text-white text-sm font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-5 pb-5 border-t border-white/[0.04]">
                  <p className="text-sm text-white/40 leading-relaxed pt-4">{faq.a}</p>
                </motion.div>
              )}
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/" className="text-sm text-white/30 hover:text-white transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
