import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../api"
import type { Role } from "../type"

type Props = {
  onLoginSuccess: (sessionId: string, role: Role, user: { id: number; firstName: string; lastName: string; email: string }) => void
}

export default function Login({ onLoginSuccess }: Props) {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole) {
      setError("Please select a role")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await login(email, password, selectedRole)
      onLoginSuccess(response.sessionId, response.role, response.user)
    } catch (err: any) {
      setError(err?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  function handleRoleSelect(role: Role) {
    setSelectedRole(role)
    setError(null)
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
        <h1 style={{ marginBottom: 32, textAlign: "center", color: "#333" }}>Meal Plan Optimizer</h1>

        {!selectedRole ? (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16, color: "#333" }}>Select your role to login:</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleButton role="user" label="User Login" onClick={() => handleRoleSelect("user")} />
              <RoleButton role="admin" label="Admin Login" onClick={() => handleRoleSelect("admin")} />
              <RoleButton role="nutritionist" label="Nutritionist Login" onClick={() => handleRoleSelect("nutritionist")} />
            </div>

            <div style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: "1px solid #eee",
              textAlign: "center",
              fontSize: 14
            }}>
              <span style={{ color: "#666" }}>Don't have a user account? </span>
              <button
                onClick={() => navigate("/signup")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0066cc",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: 14,
                  padding: 0,
                  fontFamily: "inherit"
                }}
              >
                Sign up
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedRole(null)}
              style={{
                marginBottom: 16,
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ddd",
                background: "white",
                cursor: "pointer",
                borderRadius: 4,
                color: "#333"
              }}
            >
              ← Back
            </button>

            <h2 style={{ fontSize: 18, marginBottom: 16, textTransform: "capitalize", color: "#333" }}>
              {selectedRole} Login
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    color: "#333",
                    backgroundColor: "white"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    color: "#333",
                    backgroundColor: "white"
                  }}
                />
              </div>

              {error && (
                <div style={{ color: "crimson", fontSize: 14, padding: 8, backgroundColor: "#fee", borderRadius: 4 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 12,
                  backgroundColor: "#0066cc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div style={{ marginTop: 16, fontSize: 12, color: "#666", backgroundColor: "#f9f9f9", padding: 12, borderRadius: 4 }}>
              <strong>Test credentials:</strong>
              <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                {selectedRole === "user" && <li>alice.smith@example.com / notrealpassword</li>}
                {selectedRole === "admin" && <li>admin1@vt.edu / notrealpassword</li>}
                {selectedRole === "nutritionist" && <li>oblack@vt.edu / notrealpassword</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RoleButton({ role, label, onClick }: { role: Role; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 16,
        fontSize: 16,
        border: "2px solid #0066cc",
        backgroundColor: "white",
        color: "#0066cc",
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#0066cc"
        e.currentTarget.style.color = "white"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "white"
        e.currentTarget.style.color = "#0066cc"
      }}
    >
      {label}
    </button>
  )
}
