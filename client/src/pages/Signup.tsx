import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signup } from "../api"

export default function Signup() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)

    try {
      await signup(firstName.trim(), lastName.trim(), email, password)
      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/")
      }, 2000)
    } catch (err: any) {
      setError(err?.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
          textAlign: "center"
        }}>
          <div style={{
            fontSize: 48,
            color: "#28a745",
            marginBottom: 16
          }}>
            ✓
          </div>
          <h2 style={{ color: "#28a745", marginBottom: 8 }}>Account Created!</h2>
          <p style={{ color: "#666" }}>Redirecting to login...</p>
        </div>
      </div>
    )
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
        <h1 style={{ marginBottom: 8, textAlign: "center", color: "#333" }}>Create Account</h1>
        <p style={{ textAlign: "center", color: "#666", fontSize: 14, marginBottom: 24 }}>
          Sign up for a user account
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                color: "#333",
                backgroundColor: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                color: "#333",
                backgroundColor: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>
              Email
            </label>
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
                backgroundColor: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                color: "#333",
                backgroundColor: "white",
                boxSizing: "border-box"
              }}
            />
            <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0 0" }}>
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, color: "#333" }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                color: "#333",
                backgroundColor: "white",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              color: "crimson",
              fontSize: 14,
              padding: 8,
              backgroundColor: "#fee",
              borderRadius: 4
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginTop: 8
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid #eee",
          textAlign: "center",
          fontSize: 14
        }}>
          <span style={{ color: "#666" }}>Already have an account? </span>
          <button
            onClick={() => navigate("/")}
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
            Login
          </button>
        </div>
      </div>
    </div>
  )
}
