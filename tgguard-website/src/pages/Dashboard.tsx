import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
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

export default function Dashboard() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* ─── NEW: Mobile hamburger button ─── */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl glass flex items-center justify-center"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* ─── NEW: Mobile sidebar overlay ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-64 z-50"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/protection" element={<ProtectionPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
