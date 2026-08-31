import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Check } from 'lucide-react'
import GlassButton from './GlassButton'

interface Group {
  id: string
  name: string
  chat_id: string
  member_count: number
  is_active: boolean
  avatar?: string
}

interface Props {
  groups: Group[]
  selectedGroup: Group | null
  onSelect: (group: Group) => void
  onAddGroup: () => void
}

export default function GroupSelector({ groups, selectedGroup, onSelect, onAddGroup }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl glass hover:bg-white/10 transition-all w-full"
      >
        <div className={`
          w-3 h-3 rounded-full
          ${selectedGroup?.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}
        `} />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">{selectedGroup?.name || 'Select Group'}</p>
          <p className="text-xs text-white/50">
            {selectedGroup ? `${selectedGroup.member_count.toLocaleString()} members` : 'No group selected'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full mt-2 left-0 right-0 glass rounded-xl border border-white/10 overflow-hidden z-20"
            >
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => { onSelect(group); setOpen(false) }}
                    className={`
                      flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all
                      ${selectedGroup?.id === group.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/70 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    <div className={`
                      w-2 h-2 rounded-full
                      ${group.is_active ? 'bg-green-500' : 'bg-red-500'}
                    `} />
                    <span className="text-sm font-medium flex-1 text-left">{group.name}</span>
                    {selectedGroup?.id === group.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-white/5">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => { onAddGroup(); setOpen(false) }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Telegram Group
                </GlassButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
