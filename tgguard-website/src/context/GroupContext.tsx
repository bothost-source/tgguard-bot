import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '../lib/api'

export interface Group {
  id: string
  name: string
  chat_id: string
  member_count: number
  is_active: boolean
  bot_is_admin: boolean
  is_verified: boolean
  avatar_url?: string
}

interface GroupContextType {
  groups: Group[]
  selectedGroup: Group | null
  isLoading: boolean
  error: string | null
  selectGroup: (group: Group) => void
  refreshGroups: () => Promise<void>
}

const GroupContext = createContext<GroupContextType>({
  groups: [],
  selectedGroup: null,
  isLoading: false,
  error: null,
  selectGroup: () => {},
  refreshGroups: async () => {},
})

export const useGroup = () => useContext(GroupContext)

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)  // ─── NEW: prevent refetch loop ───

  const refreshGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/groups')
      setGroups(data)
      
      // Check if there's a groupId from magic link to auto-select
      const magicGroupId = localStorage.getItem('tgguard_magic_group_id')
      if (magicGroupId) {
        const matched = data.find((g: Group) => g.chat_id === magicGroupId || g.id === magicGroupId)
        if (matched) {
          setSelectedGroup(matched)
          localStorage.setItem('tgguard_selected_group', matched.id)
          localStorage.removeItem('tgguard_magic_group_id')
          setIsLoading(false)
          return
        }
      }
      
      // Restore from localStorage or select first
      const savedId = localStorage.getItem('tgguard_selected_group')
      if (savedId) {
        const saved = data.find((g: Group) => g.id === savedId)
        if (saved) {
          setSelectedGroup(saved)
          setIsLoading(false)
          return
        }
      }
      if (data.length > 0) {
        setSelectedGroup(data[0])
        localStorage.setItem('tgguard_selected_group', data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }, [])  // ─── FIXED: removed selectedGroup dependency ───

  useEffect(() => {
    if (!hasFetched) {  // ─── NEW: only fetch once on mount ───
      setHasFetched(true)
      refreshGroups()
    }
  }, [hasFetched, refreshGroups])

  const selectGroup = useCallback((group: Group) => {
    setSelectedGroup(group)
    localStorage.setItem('tgguard_selected_group', group.id)
  }, [])

  return (
    <GroupContext.Provider value={{ groups, selectedGroup, isLoading, error, selectGroup, refreshGroups }}>
      {children}
    </GroupContext.Provider>
  )
}
