import { useState } from "react"
import type { NewFood } from "../type"

type Props = {
  onCreate: (f: NewFood) => Promise<void>
}

const empty: NewFood = {
  HallID: null,
  FoodName: "",
  Calories: 0,
  Fat: 0,
  Protein: 0,
  Carbs: 0,
  ServingSize: "",
  HallName: undefined,
}

export default function AddFoodForm({ onCreate }: Props) {
  const [form, setForm] = useState<NewFood>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof NewFood>(key: K, value: NewFood[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!form.FoodName || !form.ServingSize) {
        throw new Error("FoodName and ServingSize are required.")
      }
      await onCreate(form)
      setForm(empty)
    } catch (err: any) {
      setError(err?.message ?? "Failed to add")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 560 }}>
      <h3>Add Food</h3>
      <input
        placeholder="Food Name"
        value={form.FoodName}
        onChange={e => update("FoodName", e.target.value)}
        required
      />
      <input
        placeholder="Serving Size (e.g., 1 Cup)"
        value={form.ServingSize}
        onChange={e => update("ServingSize", e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Calories"
        value={form.Calories}
        onChange={e => update("Calories", Number(e.target.value))}
        required
      />
      <input
        type="number"
        placeholder="Fat (g)"
        value={form.Fat}
        onChange={e => update("Fat", Number(e.target.value))}
        required
      />
      <input
        type="number"
        placeholder="Protein (g)"
        value={form.Protein}
        onChange={e => update("Protein", Number(e.target.value))}
        required
      />
      <input
        type="number"
        placeholder="Carbs (g)"
        value={form.Carbs}
        onChange={e => update("Carbs", Number(e.target.value))}
        required
      />
      <input
        type="number"
        placeholder="HallID (optional)"
        value={form.HallID ?? ""}
        onChange={e => update("HallID", e.target.value === "" ? null : Number(e.target.value))}
      />
      <button disabled={busy}>{busy ? "Adding…" : "Add"}</button>
      {error && <div style={{ color: "crimson" }}>{error}</div>}
    </form>
  )
}
