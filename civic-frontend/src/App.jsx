import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ReportIssue from './pages/ReportIssue'
import Dashboard from './pages/Dashboard'
import AuthorityDashboard from './pages/AuthorityDashboard'
import IssueDetail from './pages/IssueDetail'
import Accountability from './pages/Accountability'
import Landing from './pages/Landing'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p>Loading...</p>
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
      <Route path="/authority" element={<ProtectedRoute><AuthorityDashboard /></ProtectedRoute>} />
      <Route path="/issue/:id" element={<ProtectedRoute><IssueDetail /></ProtectedRoute>} />
      <Route path="/accountability" element={<Accountability />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}