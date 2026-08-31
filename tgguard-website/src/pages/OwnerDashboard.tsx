import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UsersRound, Gamepad2, Star, MessageSquare,
  BarChart3, AlertTriangle, Wrench, Settings, LogOut, Menu, X, Shield
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import OwnerOverview from './owner/OwnerOverview'
import OwnerUsers from './owner/OwnerUsers'
import OwnerGroups from './owner/OwnerGroups'
import OwnerGames from './owner/OwnerGames'
import OwnerRatings from './owner/OwnerRatings'
import OwnerFeedback from './owner/OwnerFeedback'
import OwnerAnalytics from './owner/OwnerAnalytics'
import OwnerReports from './owner/OwnerReports'
import OwnerSystem from './owner/OwnerSystem'
import OwnerSettings from './owner/OwnerSettings'

const ownerNav = [
  { icon: LayoutDashboard, label: 'Overview', path: '/owner/dashboard' },
  { icon: Users, label: 'Users', path: '/owner/dashboard/users' },
  { icon: UsersRound, label: 'Groups', path: '/owner/dashboard/groups' },
  { icon: Gamepad2, label: 'Games', path: '/owner/dashboard/games' },
  { icon: Star, label: 'Ratings', path: '/owner/dashboard/ratings' },
  { icon: MessageSquare, label: 'Feedback', path: '/owner/dashboard/feedback' },
  { icon: BarChart3, label: 'Analytics', path: '/owner/dashboard/analytics' },
  { icon: AlertTriangle, label: 'Reports', path: '/owner/dashboard/reports' },
  { icon: Wrench, label: 'System', path: '/owner/dashboard/system' },
  { icon: Settings, label: 'Settings', path: '/owner/dashboard/settings' },
]

export default function OwnerDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg gradient-text">TGGuard</span>
          <p className="text-xs text-white/40">Owner Panel</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {ownerNav.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-tgg-dark flex">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl glass flex items-center justify-center"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 glass border-r border-white/5">
        <NavContent />
      </aside>

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
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-64 glass border-r border-white/5 z-50 flex flex-col"
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<OwnerOverview />} />
            <Route path="/users" element={<OwnerUsers />} />
            <Route path="/groups" element={<OwnerGroups />} />
            <Route path="/games" element={<OwnerGames />} />
            <Route path="/ratings" element={<OwnerRatings />} />
            <Route path="/feedback" element={<OwnerFeedback />} />
            <Route path="/analytics" element={<OwnerAnalytics />} />
            <Route path="/reports" element={<OwnerReports />} />
            <Route path="/system" element={<OwnerSystem />} />
            <Route path="/settings" element={<OwnerSettings />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
