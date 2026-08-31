import { motion } from 'framer-motion'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function ToggleSwitch({ checked, onChange, label, disabled = false }: Props) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-white/70">{label}</span>}
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-12 h-6 rounded-full transition-colors duration-300
          ${checked ? 'bg-cyan-500' : 'bg-white/20'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <motion.div
          animate={{ x: checked ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
        />
      </button>
    </div>
  )
}
