import type { Food, NewFood, Hall, Role, AuthResponse, Question, NewQuestion } from "./types"

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

// ===== AUTH API =====

// POST /api/auth/signup
export async function signup(firstName: string, lastName: string, email: string, password: string) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Signup failed")
  }
  return (await res.json()) as { message: string; user: { id: number; firstName: string; lastName: string; email: string } }
}

// POST /api/auth/login
export async function login(email: string, password: string, role: Role) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Login failed")
  }
  return (await res.json()) as AuthResponse
}

// POST /api/auth/logout
export async function logout(sessionId: string, role: Role) {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Logout failed")
  }
}

// GET /api/auth/me
export async function getCurrentUser(sessionId: string, role: Role) {
  const res = await fetch(`${BASE}/auth/me?sessionId=${sessionId}&role=${role}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to get user info")
  }
  return (await res.json()) as { role: Role; user: { id: number; firstName: string; lastName: string; email: string } }
}

// ===== QUESTIONS API =====

// POST /api/questions
export async function createQuestion(question: NewQuestion) {
  const res = await fetch(`${BASE}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to create question")
  }
  return (await res.json()) as Question
}

// GET /api/questions/user/:userId
export async function getUserQuestions(userId: number) {
  const res = await fetch(`${BASE}/questions/user/${userId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load questions")
  }
  return (await res.json()) as Question[]
}

// GET /api/questions/unanswered
export async function getUnansweredQuestions() {
  const res = await fetch(`${BASE}/questions/unanswered`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load unanswered questions")
  }
  return (await res.json()) as Question[]
}

// PUT /api/questions/:questionId/reply
export async function replyToQuestion(questionId: number, messageReply: string) {
  const res = await fetch(`${BASE}/questions/${questionId}/reply`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageReply }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to reply to question")
  }
  return (await res.json()) as Question
}
