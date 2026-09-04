import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Lock, MessageSquare, Gamepad2, BarChart3, Zap, ChevronRight, ArrowRight, BookOpenText, Bot } from 'lucide-react'
import GlassButton from '../components/GlassButton'
import AnimatedCard from '../components/AnimatedCard'

const features = [
  { icon: Shield, title: 'Smart Protection', desc: 'Anti-spam, anti-link, word filters, and auto-moderation.', color: 'from-cyan-500 to-blue-600' },
  { icon: Lock, title: 'Member Verification', desc: 'CAPTCHA-style challenges for new members.', color: 'from-purple-500 to-pink-600' },
  { icon: MessageSquare, title: 'Custom Welcome', desc: 'Welcome messages with media and buttons.', color: 'from-green-500 to-emerald-600' },
  { icon: Zap, title: 'Raid Protection', desc: 'Instant lockdown for emergency situations.', color: 'from-red-500 to-orange-600' },
  { icon: Gamepad2, title: 'Community Games', desc: 'Word Scramble, World Trivia, Speed Quiz, and more.', color: 'from-yellow-500 to-amber-600' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track members, messages, and moderation events.', color: 'from-cyan-500 to-teal-600' },
]

const stats = [
  { value: '12,482', label: 'Protected Groups' },
  { value: '3.2M', label: 'Members Protected' },
  { value: '184K', label: 'Games Played' },
  { value: '4.7', label: 'Average Rating' },
]

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9])

  const BOT_USERNAME = 'YourBotUsername' // Replace with your bot's username

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden">
      <motion.section style={{ opacity, scale }} className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/50 font-mono">&lt;&gt; Trusted by 12,000+ communities</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-[0.95] tracking-tight">
            <span className="gradient-text">Protect</span><br /><span className="text-white">Your Community</span>
          </h1>
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            TGGuard is the intelligent moderation platform for Telegram groups.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Main CTA: Open Telegram Bot */}
            <a 
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GlassButton variant="primary" size="lg" className="group">
                <Bot className="w-5 h-5" />
                Add Bot to Your Group
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </a>
            <Link to="/docs">
              <GlassButton variant="secondary" size="lg">
                <BookOpenText className="w-5 h-5" />
                Documentation
              </GlassButton>
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/30 max-w-md mx-auto">
            No login required. Add the bot to your group and get your management link automatically.
          </p>
        </motion.div>
      </motion.section>

      {/* How It Works - Updated for bot-first flow */}
      <section className="relative z-10 py-24 px-4 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4 font-mono">02 / HOW IT WORKS</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Three Steps to Safety</h2>
          </motion.div>
          <div className="space-y-6">
            {[
              { step: '01', title: 'Add TGGuard to Your Group', desc: 'Add @YourBotUsername as an administrator with the permissions you need.' },
              { step: '02', title: 'Get Your Dashboard Link', desc: 'The bot will DM you a unique link to manage your group. No password needed.' },
              { step: '03', title: 'Manage Everything', desc: 'Open your personal dashboard and configure protection, games, analytics, and more.' },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="flex items-start gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass flex items-center justify-center">
                  <span className="text-xl font-bold text-white/60 font-mono">{item.step}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-white/40 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ... rest of landing page stays the same ... */}

      <section className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4 font-mono">01 / FEATURES</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Everything You Need</h2>
            <p className="text-white/40 max-w-xl mx-auto">Powerful moderation tools for modern Telegram communities</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <AnimatedCard key={feature.title} delay={i * 0.1}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto glass-strong p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.01]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Ready to Protect Your Community?</h2>
            <p className="text-white/40 max-w-xl mx-auto mb-8">Add TGGuard to your group and get instant protection.</p>
            <a 
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GlassButton variant="primary" size="lg">
                <Bot className="w-5 h-5" />
                Add to Telegram
                <ChevronRight className="w-5 h-5" />
              </GlassButton>
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 py-12 px-4 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center"><Shield className="w-4 h-4 text-black" /></div>
            <span className="font-bold text-lg text-white">TGGuard</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
          </div>
          <p className="text-xs text-white/20 font-mono">© 2026 TGGuard</p>
        </div>
      </footer>
    </div>
  )
}
