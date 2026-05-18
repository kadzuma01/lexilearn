import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import LevelPage from './pages/LevelPage'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import SessionComplete from './pages/SessionComplete'
import Dictionary from './pages/Dictionary'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Admin from './pages/Admin'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D0D0D' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📚</div>
          <div style={{ color:'#888', fontSize:14 }}>Loading...</div>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Guest routes */}
      <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register"       element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

      {/* Protected routes */}
      <Route path="/"               element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/level/:levelId" element={<RequireAuth><LevelPage /></RequireAuth>} />
      <Route path="/level/:levelId/flashcards" element={<RequireAuth><Flashcards /></RequireAuth>} />
      <Route path="/level/:levelId/quiz"       element={<RequireAuth><Quiz /></RequireAuth>} />
      <Route path="/session/:sessionId"        element={<RequireAuth><SessionComplete /></RequireAuth>} />
      <Route path="/dictionary"     element={<RequireAuth><Dictionary /></RequireAuth>} />
      <Route path="/progress"       element={<RequireAuth><Progress /></RequireAuth>} />
      <Route path="/profile"        element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/settings"       element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/admin"          element={<RequireAuth><Admin /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
