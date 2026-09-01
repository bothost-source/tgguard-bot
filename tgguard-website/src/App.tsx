import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import FAQ from './pages/FAQ'
import Documentation from './pages/Documentation'

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/dashboard/*" element={
          <ProtectedRoute allowedRoles={['community_admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/owner/dashboard/*" element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  )
}

