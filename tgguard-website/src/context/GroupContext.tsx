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

  const refreshGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/groups')
      setGroups(data)
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0])
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => { refreshGroups() }, [refreshGroups])

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
