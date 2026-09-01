import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import FAQ from './pages/FAQ'
import Documentation from './pages/Documentation'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/docs" element={<Documentation />} />

        {/* Community Admin Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute allowedRoles={['community_admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Owner Dashboard */}
        <Route
          path="/owner/dashboard/*"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App
