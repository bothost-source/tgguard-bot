import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Shield, MessageSquare, Lock, AlertTriangle, Users, ScrollText, Gamepad2, BarChart3, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GroupSelector from './GroupSelector'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: Shield, label: 'Protection', path: '/dashboard/protection' },
  { icon: MessageSquare, label: 'Welcome', path: '/dashboard/welcome' },
  { icon: Lock, label: 'Verification', path: '/dashboard/verification' },
  { icon: AlertTriangle, label: 'Reports', path: '/dashboard/reports' },
  { icon: Users, label: 'Members', path: '/dashboard/members' },
  { icon: ScrollText, label: 'Logs', path: '/dashboard/logs' },
  { icon: Gamepad2, label: 'Games', path: '/dashboard/games' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 glass border-r border-white/[0.04]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-white">TGGuard</span>
      </div>

      <div className="px-4 py-3 border-b border-white/[0.04]">
        <GroupSelector />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
          return (
            <Link key={item.path} to={item.path} className={isActive ? 'nav-item-active' : 'nav-item'}>
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.04]">
        <button onClick={logout} className="nav-item w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/5">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
