import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login       from './pages/Login'
import Dashboard   from './pages/Dashboard'
import Upload      from './pages/Upload'
import Review      from './pages/Review'
import Progress    from './pages/Progress'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload"    element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/review/:deckId" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/progress/:deckId" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}