import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { changePassword } from "../api"
import type { Role } from "../type"

type Props = {
  sessionId: string
  role: Role
}

export default function ChangePassword({ sessionId, role }: Props) {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await changePassword(sessionId, role, currentPassword, newPassword, newPasswordConfirm)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setNewPasswordConfirm("")

      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        if (role === "user") navigate("/user-dashboard")
        else if (role === "admin") navigate("/admin-dashboard")
        else if (role === "nutritionist") navigate("/nutritionist-dashboard")
      }, 2000)
    } catch (err: any) {
      setError(err?.message || "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    if (role === "user") navigate("/user-dashboard")
    else if (role === "admin") navigate("/admin-dashboard")
    else if (role === "nutritionist") navigate("/nutritionist-dashboard")
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: 40,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: 400,
        color: "#333"
      }}>
        <h1 style={{ marginBottom: 32, textAlign: "center", color: "#333" }}>Change Password</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 4,
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 4,
                boxSizing: "border-box"
              }}
            />
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Must be at least 6 characters
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 4,
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: 4,
              color: "#c33",
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#efe",
              border: "1px solid #cfc",
              borderRadius: 4,
              color: "#3c3",
              fontSize: 14
            }}>
              Password changed successfully! Redirecting...
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                borderRadius: 4,
                backgroundColor: loading ? "#ccc" : "#007bff",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Changing..." : "Change Password"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                border: "1px solid #ddd",
                borderRadius: 4,
                backgroundColor: "white",
                color: "#333",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
