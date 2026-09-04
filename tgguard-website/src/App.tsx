import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import FAQ from './pages/FAQ'
import Documentation from './pages/Documentation'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ToastContainer'
import AuthHandler from './components/AuthHandler'
import { useToast } from './hooks/useToast'

function App() {
  const location = useLocation()
  const { toasts, removeToast } = useToast()

  return (
    <>
      <AuthHandler />
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />  {/* ─── REMOVED: redirect to home ─── */}
          <Route path="/faq" element={<FAQ />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRoles={['community_admin', 'owner']}>  {/* ─── FIXED: allow owner too ─── */}
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/owner/dashboard/*" element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AnimatePresence>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default App
