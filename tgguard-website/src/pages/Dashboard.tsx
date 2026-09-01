import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import GroupSelector from '../components/GroupSelector'
import OverviewPage from './dashboard/OverviewPage'
import ProtectionPage from './dashboard/ProtectionPage'
import WelcomePage from './dashboard/WelcomePage'
import VerificationPage from './dashboard/VerificationPage'
import ReportsPage from './dashboard/ReportsPage'
import MembersPage from './dashboard/MembersPage'
import LogsPage from './dashboard/LogsPage'
import GamesPage from './dashboard/GamesPage'
import AnalyticsPage from './dashboard/AnalyticsPage'
import SettingsPage from './dashboard/SettingsPage'
import AddGroupModal from './dashboard/AddGroupModal'

interface Group {
  id: string
  name: string
  chat_id: string
  member_count: number
  is_active: boolean
}

export default function Dashboard() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${localStorage.getItem('tgguard_token')}` }
      })
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
        if (data.length > 0 && !selectedGroup) setSelectedGroup(data[0])
      }
    } catch (e) { console.error(e) }
  }

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group)
  }

  return (
    <div className="min-h-screen bg-tgg-dark flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="glass border-b border-white/5 px-6 py-4 sticky top-0 z-30">
          <div className="max-w-4xl">
            <GroupSelector
              groups={groups}
              selectedGroup={selectedGroup}
              onSelect={handleSelectGroup}
              onAddGroup={() => setShowAddModal(true)}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<OverviewPage group={selectedGroup} />} />
              <Route path="/protection" element={<ProtectionPage group={selectedGroup} />} />
              <Route path="/welcome" element={<WelcomePage group={selectedGroup} />} />
              <Route path="/verification" element={<VerificationPage group={selectedGroup} />} />
              <Route path="/reports" element={<ReportsPage group={selectedGroup} />} />
              <Route path="/members" element={<MembersPage group={selectedGroup} />} />
              <Route path="/logs" element={<LogsPage group={selectedGroup} />} />
              <Route path="/games" element={<GamesPage group={selectedGroup} />} />
              <Route path="/analytics" element={<AnalyticsPage group={selectedGroup} />} />
              <Route path="/settings" element={<SettingsPage group={selectedGroup} />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {showAddModal && (
        <AddGroupModal onClose={() => setShowAddModal(false)} onAdded={fetchGroups} />
      )}
    </div>
  )
}
