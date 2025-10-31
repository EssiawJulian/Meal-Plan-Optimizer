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
