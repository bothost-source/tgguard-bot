import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

interface Props { toasts: Toast[]; onRemove: (id: string) => void }

export default function ToastContainer({ toasts, onRemove }: Props) {
  const icons = { success: CheckCircle, error: AlertCircle, info: Info }
  const colors = { success: 'text-green-400 border-green-500/20 bg-green-500/10', error: 'text-red-400 border-red-500/20 bg-red-500/10', info: 'text-blue-400 border-blue-500/20 bg-blue-500/10' }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.9 }} className={`glass p-4 pr-10 min-w-[300px] max-w-[400px] ${colors[toast.type]}`}>
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{toast.message}</p>
              </div>
              <button onClick={() => onRemove(toast.id)} className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
