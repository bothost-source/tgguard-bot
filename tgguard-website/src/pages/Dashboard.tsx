import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
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
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto">
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
