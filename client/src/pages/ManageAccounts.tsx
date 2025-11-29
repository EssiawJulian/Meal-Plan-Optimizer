import { useState, useEffect } from "react"
import { createAdmin, createNutritionist, listAdmins, listNutritionists } from "../api"
import { useNavigate } from "react-router-dom"

type Props = {
  sessionId: string
  onLogout: () => void
}

type AccountType = "admin" | "nutritionist"

export default function ManageAccounts({ sessionId, onLogout }: Props) {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>("admin")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [admins, setAdmins] = useState<Array<{ AdminID: number; FirstName: string; LastName: string; Email: string }>>([])
  const [nutritionists, setNutritionists] = useState<Array<{ NutritionistID: number; FirstName: string; LastName: string; Email: string }>>([])
  const [listLoading, setListLoading] = useState(true)

  async function loadAccounts() {
    setListLoading(true)
    try {
      const [adminList, nutritionistList] = await Promise.all([
        listAdmins(sessionId),
        listNutritionists(sessionId)
      ])
      setAdmins(adminList)
      setNutritionists(nutritionistList)
    } catch (err: any) {
      setError(err?.message || "Failed to load accounts")
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [sessionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (accountType === "admin") {
        await createAdmin(sessionId, firstName, lastName, email, password)
        setSuccess("Admin account created successfully!")
      } else {
        await createNutritionist(sessionId, firstName, lastName, email, password)
        setSuccess("Nutritionist account created successfully!")
      }

      // Clear form
      setFirstName("")
      setLastName("")
      setEmail("")
      setPassword("")

      // Reload accounts list
      await loadAccounts()
    } catch (err: any) {
      setError(err?.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1>Manage Accounts</h1>
          <p style={{ color: "#666", margin: "8px 0" }}>
            Create and manage admin and nutritionist accounts
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Back
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Create Account Form */}
      <div style={{
        padding: 24,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        border: "1px solid #ddd",
        marginBottom: 32
      }}>
        <h2>Create New Account</h2>

        {error && (
          <div style={{
            padding: 12,
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: 4,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: 12,
            backgroundColor: "#d4edda",
            color: "#155724",
            borderRadius: 4,
            marginBottom: 16
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Account Type:
            </label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  value="admin"
                  checked={accountType === "admin"}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                />
                Admin
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  value="nutritionist"
                  checked={accountType === "nutritionist"}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                />
                Nutritionist
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                First Name:
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
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Last Name:
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
                  fontSize: 14
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Email:
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
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Password:
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
                fontSize: 14
              }}
            />
            <small style={{ color: "#666", fontSize: 12 }}>
              Minimum 6 characters
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 24px",
              backgroundColor: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 500
            }}
          >
            {loading ? "Creating..." : `Create ${accountType === "admin" ? "Admin" : "Nutritionist"}`}
          </button>
        </form>
      </div>

      {/* Lists of existing accounts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Admins List */}
        <div>
          <h2>Admins</h2>
          {listLoading ? (
            <p>Loading...</p>
          ) : (
            <div style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden"
            }}>
              {admins.length === 0 ? (
                <p style={{ padding: 16, color: "#666", textAlign: "center" }}>
                  No admins found
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
                      <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.AdminID} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 12 }}>
                          {admin.FirstName} {admin.LastName}
                        </td>
                        <td style={{ padding: 12, color: "#666" }}>
                          {admin.Email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Nutritionists List */}
        <div>
          <h2>Nutritionists</h2>
          {listLoading ? (
            <p>Loading...</p>
          ) : (
            <div style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden"
            }}>
              {nutritionists.length === 0 ? (
                <p style={{ padding: 16, color: "#666", textAlign: "center" }}>
                  No nutritionists found
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
                      <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionists.map((nutritionist) => (
                      <tr key={nutritionist.NutritionistID} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 12 }}>
                          {nutritionist.FirstName} {nutritionist.LastName}
                        </td>
                        <td style={{ padding: 12, color: "#666" }}>
                          {nutritionist.Email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
