import { useEffect, useState } from "react"
import { listFoods, createFood, deleteFood } from "./api"
import type { Food, NewFood } from "./types"
import AddFoodForm from "./components/AddFoodForm"
import FoodTable from "./components/FoodTable"

export default function App() {
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
      <h2>Food Catalogue — Add & Delete</h2>
      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      <AddFoodForm onCreate={handleCreate} />
      <hr style={{ margin: "16px 0" }} />
      {loading ? <p>Loading…</p> : <FoodTable items={items} onDelete={handleDelete} />}
    </div>
  )
}
