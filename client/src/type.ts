// Mirrors the fields your API returns from /api/foods (JOINs HallName)
export type Food = {
  FoodID: number
  HallID: number | null
  HallName?: string | null
  FoodName: string
  Calories: number
  Fat: number
  Protein: number
  Carbs: number
  ServingSize: string
}

// For creating new foods (server generates FoodID)
export type NewFood = Omit<Food, "FoodID">

// Optional helper for a halls dropdown
export type Hall = {
  HallID: number
  HallName: string
}

// Authentication types
export type Role = "user" | "admin" | "nutritionist"

export type User = {
  id: number
  firstName: string
  lastName: string
  email: string
}

export type AuthResponse = {
  sessionId: string
  role: Role
  user: User
}

export type AuthSession = {
  sessionId: string
  role: Role
  user: User
} | null

// Question types
export type Question = {
  QuestionID: number
  UserID: number
  UserMessage: string
  MessageReply: string | null
  MessageStatus: boolean
  FirstName?: string
  LastName?: string
  Email?: string
}

export type NewQuestion = {
  userId: number
  userMessage: string
}
