import { useRef, Suspense, lazy } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, Lock, MessageSquare, Gamepad2, BarChart3, Zap,
  ChevronRight, ArrowRight, BookOpenText
} from 'lucide-react'
import GlassButton from '../components/GlassButton'
import AnimatedCard from '../components/AnimatedCard'

const HeroScene = lazy(() => import('../3d/HeroScene'))

const features = [
  {
    icon: Shield,
    title: 'Smart Protection',
    desc: 'Anti-spam, anti-link, word filters, and auto-moderation powered by intelligent detection.',
    color: 'cyan',
  },
  {
    icon: Lock,
    title: 'New Member Verification',
    desc: 'CAPTCHA-style challenges to verify humans before they can participate in your community.',
    color: 'purple',
  },
  {
    icon: MessageSquare,
    title: 'Custom Welcome Messages',
    desc: 'Beautiful welcome messages with media, buttons, and placeholders for personalization.',
    color: 'green',
  },
  {
    icon: Zap,
    title: 'Raid Protection',
    desc: 'Instant lockdown mode for emergency situations. Protect your community from coordinated attacks.',
    color: 'red',
  },
  {
    icon: Gamepad2,
    title: 'Community Games',
    desc: 'Word Scramble, World Trivia, Speed Quiz, Missing Letters, and Emoji Challenge.',
    color: 'yellow',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track members, messages, moderation events, and game participation in beautiful dashboards.',
    color: 'cyan',
  },
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

  return (
    <div ref={containerRef} className="min-h-screen bg-tgg-dark relative overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-tgg-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <HeroScene />
        </Suspense>
      </div>

      {/* Hero Section */}
      <motion.section
        style={{ opacity, scale }}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/70">Trusted by 12,000+ Telegram communities</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight">
            <span className="gradient-text glow-text">Protect</span>
            <br />
            <span className="text-white">Your Community</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            TGGuard is the intelligent moderation platform for Telegram groups.
            Smart filters, verification, games, and analytics — all in one powerful dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <GlassButton variant="primary" size="lg" className="group">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            <a href="/docs">
              <GlassButton variant="secondary" size="lg">
                <BookOpenText className="w-5 h-5 mr-2 inline" />
                Documentation
              </GlassButton>
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Powerful moderation tools designed for modern Telegram communities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <AnimatedCard key={feature.title} delay={i * 0.1}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.desc}</p>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-white/50">Get protected in under 2 minutes</p>
          </motion.div>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Add TGGuard to Your Group', desc: 'Click the button, add the bot as an administrator with the permissions you need.' },
              { step: '02', title: 'Connect via Dashboard', desc: 'Log in with Telegram, verify your group, and configure your protection settings.' },
              { step: '03', title: 'Enjoy Smart Moderation', desc: 'TGGuard automatically protects your community 24/7 while you focus on growing it.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex items-start gap-6"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl glass flex items-center justify-center">
                  <span className="text-2xl font-bold gradient-text">{item.step}</span>
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to Protect Your Community?
            </h2>
            <p className="text-white/50 max-w-xl mx-auto mb-8">
              Join thousands of Telegram group owners who trust TGGuard to keep their communities safe.
            </p>
            <Link to="/login">
              <GlassButton variant="primary" size="lg">
                Start For Free
                <ChevronRight className="w-5 h-5 ml-2 inline" />
              </GlassButton>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">TGGuard</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
          <p className="text-sm text-white/30">© 2026 TGGuard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
