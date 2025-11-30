import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { listFoods, createFood, deleteFood } from "../api"
import type { Food, NewFood } from "../type"
import AddFoodForm from "../components/AddFoodForm"
import FoodTable from "../components/FoodTable"

type Props = {
  user: { firstName: string; lastName: string }
  onLogout: () => void
}

export default function AdminDashboard({ user, onLogout }: Props) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await listFoods({ limit: 200 })
      setItems(data)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load foods")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function handleCreate(newItem: NewFood) {
    await createFood(newItem)
    await refresh()
  }

  async function handleDelete(id: number) {
    await deleteFood(id)
    await refresh()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: "#666", margin: "8px 0" }}>
            Welcome, {user.firstName} {user.lastName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{
        padding: 24,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        border: "1px solid #ddd",
        marginBottom: 24
      }}>
        <h3 style={{ marginTop: 0 }}>Account Management</h3>
        <p style={{ color: "#666", marginBottom: 16 }}>
          Create and manage admin and nutritionist accounts
        </p>
        <button
          onClick={() => navigate('/admin/manage-accounts')}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007bff"
          }}
        >
          Manage Accounts
        </button>
      </div>

      <h2>Food Catalogue — Add & Delete</h2>
      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      <AddFoodForm onCreate={handleCreate} />
      <hr style={{ margin: "16px 0" }} />
      {loading ? <p>Loading…</p> : <FoodTable items={items} onDelete={handleDelete} />}
    </div>
  )
}
