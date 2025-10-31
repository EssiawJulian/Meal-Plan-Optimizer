import type { Food, NewFood, Hall } from "./types"

const BASE = "/api"

// GET /api/foods?limit=200 (&hallId=optional)
export async function listFoods(opts?: { limit?: number; hallId?: number }) {
  const p = new URLSearchParams()
  if (opts?.limit) p.set("limit", String(opts.limit))
  if (opts?.hallId !== undefined) p.set("hallId", String(opts.hallId))
  const res = await fetch(`${BASE}/foods${p.toString() ? "?" + p : ""}`)
  if (!res.ok) throw new Error("Failed to load foods")
  return (await res.json()) as Food[]
}

// POST /api/foods
export async function createFood(body: NewFood) {
  const res = await fetch(`${BASE}/foods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to create food")
  }
  return (await res.json()) as Food
}

// DELETE /api/foods/:foodId
export async function deleteFood(foodId: number) {
  const res = await fetch(`${BASE}/foods/${foodId}`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to delete food")
  }
}

// GET /api/halls (optional helper for a select dropdown)
export async function listHalls() {
  const res = await fetch(`${BASE}/halls`)
  if (!res.ok) throw new Error("Failed to load halls")
  return (await res.json()) as Hall[]
}
