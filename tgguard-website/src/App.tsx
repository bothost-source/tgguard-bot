import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import FAQ from './pages/FAQ'
import Documentation from './pages/Documentation'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ToastContainer'
import AuthHandler from './components/AuthHandler'  // ─── NEW: import AuthHandler ───
import { useToast } from './hooks/useToast'

function App() {
  const location = useLocation()
  const { toasts, removeToast } = useToast()

  return (
    <>
      {/* ─── NEW: AuthHandler runs on every route to catch ?token= in URL ─── */}
      <AuthHandler />
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
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
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AnimatePresence>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default App
