import { useState } from 'react'
import { ChevronDown, Plus, Check, Group } from 'lucide-react'
import { useGroup, type Group as GroupType } from '../context/GroupContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function GroupSelector() {
  const { groups, selectedGroup, selectGroup, isLoading } = useGroup()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return <div className="h-10 w-48 bg-white/[0.04] rounded-xl animate-pulse" />
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Group className="w-4 h-4" />
        <span>No groups connected</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-3 px-4 py-2.5 glass hover:bg-white/[0.06] transition-colors min-w-[200px]">
        <div className={`w-2 h-2 rounded-full ${selectedGroup?.is_active ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <span className="text-sm text-white font-medium flex-1 text-left truncate">{selectedGroup?.name || 'Select Group'}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 mt-2 w-full min-w-[280px] glass-strong z-50 py-2">
              <div className="px-3 py-2 flex items-center gap-2 text-xs text-white/30 uppercase tracking-wider font-mono">
                <Group className="w-3.5 h-3.5" />
                My Groups
              </div>
              {groups.map((group) => (
                <button key={group.id} onClick={() => { selectGroup(group); setOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors ${selectedGroup?.id === group.id ? 'bg-white/[0.06]' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${group.is_active ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{group.name}</p>
                    <p className="text-xs text-white/30">{group.member_count.toLocaleString()} members</p>
                  </div>
                  {selectedGroup?.id === group.id && <Check className="w-4 h-4 text-white/60" />}
                </button>
              ))}
              <div className="border-t border-white/[0.06] mt-2 pt-2 px-3">
                <button className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors py-2">
                  <Plus className="w-4 h-4" />
                  Add Telegram Group
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
