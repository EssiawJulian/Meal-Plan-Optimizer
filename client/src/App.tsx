import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { logout as logoutApi } from "./api"
import type { Role, AuthSession } from "./type"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import AdminDashboard from "./pages/AdminDashboard"
import NutritionistDashboard from "./pages/NutritionistDashboard"
import UserDashboard from "./pages/UserDashboard"
import BrowseMenus from './pages/BrowseMenus';
import UserQuestions from './pages/UserQuestions';
import NutritionistQuestions from './pages/NutritionistQuestions';
import ManageAccounts from './pages/ManageAccounts';
import ChangePassword from './pages/ChangePassword';

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession>(null)
  const [loading, setLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("authSession")
    if (savedSession) {
      try {
        setAuthSession(JSON.parse(savedSession))
      } catch {
        localStorage.removeItem("authSession")
      }
    }
    setLoading(false)
  }, [])

  function handleLoginSuccess(
    sessionId: string,
    role: Role,
    user: { id: number; firstName: string; lastName: string; email: string }
  ) {
    const session = { sessionId, role, user }
    setAuthSession(session)
    localStorage.setItem("authSession", JSON.stringify(session))
  }

  async function handleLogout() {
    if (authSession) {
      try {
        await logoutApi(authSession.sessionId, authSession.role)
      } catch (err) {
        console.error("Logout error:", err)
      }
    }
    setAuthSession(null)
    localStorage.removeItem("authSession")
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            authSession ? (
              <Navigate to={`/${authSession.role}`} replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        <Route
          path="/signup"
          element={
            authSession ? (
              <Navigate to={`/${authSession.role}`} replace />
            ) : (
              <Signup />
            )
          }
        />

        <Route
          path="/admin"
          element={
            authSession && authSession.role === "admin" ? (
              <AdminDashboard user={authSession.user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/nutritionist"
          element={
            authSession && authSession.role === "nutritionist" ? (
              <NutritionistDashboard user={authSession.user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/user"
          element={
            authSession && authSession.role === "user" ? (
              <UserDashboard user={authSession.user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/user/browse-menus"
          element={
            authSession && authSession.role === "user" ? (
              <BrowseMenus />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/user/questions"
          element={
            authSession && authSession.role === "user" ? (
              <UserQuestions user={authSession.user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/nutritionist/questions"
          element={
            authSession && authSession.role === "nutritionist" ? (
              <NutritionistQuestions />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/manage-accounts"
          element={
            authSession && authSession.role === "admin" ? (
              <ManageAccounts sessionId={authSession.sessionId} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/user/change-password"
          element={
            authSession && authSession.role === "user" ? (
              <ChangePassword sessionId={authSession.sessionId} role={authSession.role} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/change-password"
          element={
            authSession && authSession.role === "admin" ? (
              <ChangePassword sessionId={authSession.sessionId} role={authSession.role} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/nutritionist/change-password"
          element={
            authSession && authSession.role === "nutritionist" ? (
              <ChangePassword sessionId={authSession.sessionId} role={authSession.role} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
