import { motion } from 'framer-motion'
import { BookOpen, Shield, Lock, MessageSquare, Gamepad2, BarChart3, AlertTriangle } from 'lucide-react'
import AnimatedCard from '../components/AnimatedCard'

const docs = [
  {
    icon: Shield,
    title: 'Anti-Spam',
    desc: 'What it does: Monitors message activity and detects spam based on configured sensitivity.',
    permissions: 'Delete messages, restrict users',
    howTo: 'Go to Protection → Anti-Spam. Toggle ON. Choose sensitivity (Low/Medium/High) and action.',
    trigger: 'When a user sends messages faster than the configured threshold.',
    limitations: 'Requires "Delete messages" and "Restrict users" permissions.',
  },
  {
    icon: Lock,
    title: 'Anti-Link',
    desc: 'What it does: Checks all messages for URLs and blocks or allows them based on your configuration.',
    permissions: 'Delete messages',
    howTo: 'Go to Protection → Anti-Link. Toggle ON. Choose "Block All" or "Allow Approved Domains". Add approved domains if needed.',
    trigger: 'When a message contains a URL.',
    limitations: 'Cannot detect links in images or forwarded messages without caption.',
  },
  {
    icon: MessageSquare,
    title: 'Word Filter',
    desc: 'What it does: Scans messages for banned words or phrases and takes configured action.',
    permissions: 'Delete messages, restrict/ban users',
    howTo: 'Go to Protection → Word Filter. Toggle ON. Add words/phrases (one per line). Choose action.',
    trigger: 'When a message contains a filtered word or phrase.',
    limitations: 'Exact match or substring depending on configuration.',
  },
  {
    icon: Lock,
    title: 'Verification',
    desc: 'What it does: Requires new members to complete a human-verification challenge before participating.',
    permissions: 'Restrict users, send messages',
    howTo: 'Go to Verification. Toggle ON. Set timeout (seconds) and timeout action.',
    trigger: 'When a new member joins the group.',
    limitations: 'Requires "Restrict users" permission. Bot must be able to send messages to new members.',
  },
  {
    icon: MessageSquare,
    title: 'Welcome Messages',
    desc: 'What it does: Sends a welcome message to new members when they join.',
    permissions: 'Send messages',
    howTo: 'Go to Welcome. Toggle ON. Choose Default or Custom mode. Edit text, add media/buttons if custom. Set cleanup if desired.',
    trigger: 'When a new member joins the group.',
    limitations: 'Requires "Send messages" permission. Cleanup requires "Delete messages" permission.',
  },
  {
    icon: AlertTriangle,
    title: 'Reports',
    desc: 'What it does: Allows members to privately report messages or users to administrators.',
    permissions: 'None (bot receives reports via private message)',
    howTo: 'Reports are automatically available when TGGuard is in the group. Members use the report button on messages.',
    trigger: 'When a member submits a report.',
    limitations: 'Reports are stored per-group. Only group admins can view them.',
  },
  {
    icon: Gamepad2,
    title: 'Games',
    desc: 'What it does: Provides interactive games for community engagement.',
    permissions: 'Send messages, pin messages (optional)',
    howTo: 'Go to Games. Toggle ON. Set permissions (Admins only / Members / Admin approval).',
    trigger: 'When an authorized user starts a game.',
    limitations: 'Scores are validated server-side. Frontend cannot submit arbitrary scores.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'What it does: Tracks group activity, moderation events, and game participation.',
    permissions: 'None (reads from bot activity)',
    howTo: 'Go to Analytics. Select time period (7/30/90 days). View statistics.',
    trigger: 'N/A — passive tracking.',
    limitations: 'Member counts depend on Telegram API availability. Some metrics require bot to have been active during the period.',
  },
]

export default function Documentation() {
  return (
    <div className="min-h-screen bg-tgg-dark">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <BookOpen className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
          <p className="text-white/50">How each TGGuard feature works</p>
        </motion.div>

        <div className="space-y-6">
          {docs.map((doc, i) => (
            <AnimatedCard key={i} delay={i * 0.05}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <doc.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{doc.title}</h3>
                  <p className="text-sm text-white/60 mb-3">{doc.desc}</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-white/40">Permissions needed: </span>
                      <span className="text-white/70">{doc.permissions}</span>
                    </div>
                    <div>
                      <span className="text-white/40">How to enable: </span>
                      <span className="text-white/70">{doc.howTo}</span>
                    </div>
                    <div>
                      <span className="text-white/40">When triggered: </span>
                      <span className="text-white/70">{doc.trigger}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Limitations: </span>
                      <span className="text-white/70">{doc.limitations}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </div>
  )
}
