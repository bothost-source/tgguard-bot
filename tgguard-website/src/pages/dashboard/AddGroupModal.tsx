import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, RefreshCw } from 'lucide-react'
import GlassButton from '../../components/GlassButton'

interface Props {
  onClose: () => void
  onAdded: () => void
}

export default function AddGroupModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<'add' | 'verify' | 'checking' | 'success'>('add')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass rounded-3xl p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Connect Telegram Group</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {step === 'add' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-sm text-white/70">Add TGGuard to your Telegram group as an administrator</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm text-white/70">Give TGGuard the required administrator permissions</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-sm text-white/70">Return here and verify the group connection</p>
                </div>
              </div>

              <GlassButton variant="primary" className="w-full justify-center" onClick={() => window.open('https://t.me/TGGuardBot?startgroup=true', '_blank')}>
                <Plus className="w-5 h-5 mr-2" />Add TGGuard to Group
              </GlassButton>

              <GlassButton variant="secondary" className="w-full justify-center" onClick={() => setStep('verify')}>
                <RefreshCw className="w-4 h-4 mr-2" />I Already Added TGGuard
              </GlassButton>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-white/5">
                <label className="text-sm text-white/70 mb-2 block">Group Link or Chat ID (optional)</label>
                <input
                  placeholder="https://t.me/yourgroup or -1001234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-white/30 mt-2">A link alone does not prove ownership. We verify via Telegram API.</p>
              </div>

              <GlassButton variant="primary" className="w-full justify-center" onClick={() => setStep('checking')}>
                <RefreshCw className="w-4 h-4 mr-2" />Check Group
              </GlassButton>

              <button onClick={() => setStep('add')} className="text-sm text-white/40 hover:text-white transition-colors w-full text-center">
                ← Go Back
              </button>
            </div>
          )}

          {step === 'checking' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Verifying group...</p>
              <p className="text-sm text-white/40 mt-2">Checking bot membership and permissions</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-white font-medium text-lg">Group Connected!</p>
              <p className="text-sm text-white/40 mt-2">Your group is now protected by TGGuard</p>
              <GlassButton variant="primary" className="mt-6 w-full justify-center" onClick={() => { onAdded(); onClose(); }}>
                Go to Dashboard
              </GlassButton>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
