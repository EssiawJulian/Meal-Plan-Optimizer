import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { AuthSession } from "../type"

type MealPlan = {
    mealId: number
    mealType: string
    foods: Array<{
        foodId: number
        foodName: string
        calories: number
        protein: number
        carbs: number
        fat: number
        servingSize: string
        hallName: string
    }>
    totals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}

type Props = {
    authSession: AuthSession
}

export default function MealPlans({ authSession }: Props) {
    const navigate = useNavigate()
    const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [selectedMealType, setSelectedMealType] = useState("Breakfast")

    useEffect(() => {
        if (!authSession || authSession.role !== "user") {
            navigate("/")
            return
        }
        fetchMealPlans()
    }, [authSession, navigate])

    async function fetchMealPlans() {
        try {
            setLoading(true)
            const res = await fetch(`http://localhost:3000/api/meal-plans?sessionId=${authSession?.sessionId}`)
            if (res.ok) {
                const data = await res.json()
                setMealPlans(data)
            } else {
                const errorData = await res.json()
                setError(errorData.error || "Failed to fetch meal plans")
            }
        } catch (err) {
            setError("An error occurred while fetching meal plans")
        } finally {
            setLoading(false)
        }
    }

    async function handleGenerateMeal(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setSuccess("")
        setGenerating(true)

        try {
            const res = await fetch("http://localhost:3000/api/meal-plans/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: authSession?.sessionId,
                    mealType: selectedMealType,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess(`Successfully generated ${selectedMealType} plan!`)
                await fetchMealPlans()
            } else {
                setError(data.error || "Failed to generate meal plan")
            }
        } catch (err) {
            setError("An error occurred while generating meal plan")
        } finally {
            setGenerating(false)
        }
    }

    async function handleDeleteMeal(mealId: number) {
        if (!confirm("Are you sure you want to delete this meal plan?")) {
            return
        }

        try {
            const res = await fetch(`http://localhost:3000/api/meal-plans/${mealId}?sessionId=${authSession?.sessionId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                setSuccess("Meal plan deleted successfully")
                await fetchMealPlans()
            } else {
                const errorData = await res.json()
                setError(errorData.error || "Failed to delete meal plan")
            }
        } catch (err) {
            setError("An error occurred while deleting meal plan")
        }
    }

    if (!authSession) return null

    return (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>Meal Plans</h1>
                <button onClick={() => navigate(-1)} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
                    Back to Dashboard
                </button>
            </div>

            {error && (
                <div style={{ padding: "1rem", background: "#ffebee", color: "#c62828", borderRadius: "4px", marginBottom: "1rem" }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ padding: "1rem", background: "#e8f5e9", color: "#2e7d32", borderRadius: "4px", marginBottom: "1rem" }}>
                    {success}
                </div>
            )}

            <div style={{ background: "#f9f9f9", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
                <h2 style={{ marginBottom: "1rem" }}>Generate New Meal Plan</h2>
                <form onSubmit={handleGenerateMeal} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            Meal Type
                        </label>
                        <select
                            value={selectedMealType}
                            onChange={(e) => setSelectedMealType(e.target.value)}
                            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
                        >
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Dinner">Dinner</option>
                            <option value="Snack">Snack</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={generating}
                        style={{
                            padding: "0.5rem 1.5rem",
                            background: generating ? "#999" : "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: generating ? "not-allowed" : "pointer",
                            fontSize: "1rem",
                        }}
                    >
                        {generating ? "Generating..." : "Generate with AI"}
                    </button>
                </form>
                <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
                    AI will create a balanced meal plan based on your nutrition goals
                </p>
            </div>

            <h2 style={{ marginBottom: "1rem" }}>Your Meal Plans</h2>

            {loading ? (
                <p>Loading meal plans...</p>
            ) : mealPlans.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", background: "#f9f9f9", borderRadius: "8px" }}>
                    <p style={{ fontSize: "1.1rem", color: "#666" }}>
                        No meal plans yet. Generate your first meal plan above!
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "1.5rem" }}>
                    {mealPlans.map((plan) => (
                        <div
                            key={plan.mealId}
                            style={{
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                padding: "1.5rem",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                <h3 style={{ margin: 0, color: "#333" }}>
                                    {plan.mealType}
                                    <span style={{ fontSize: "0.8rem", color: "#999", marginLeft: "1rem" }}>
                                        Plan #{plan.mealId}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => handleDeleteMeal(plan.mealId)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "#f44336",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Delete
                                </button>
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                <h4 style={{ marginBottom: "0.5rem", color: "#555" }}>Foods:</h4>
                                {plan.foods.map((food, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: "0.75rem",
                                            background: "#f9f9f9",
                                            borderRadius: "4px",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <strong>{food.foodName}</strong>
                                                <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                                                    ({food.servingSize})
                                                </span>
                                                {food.hallName && (
                                                    <span style={{ color: "#999", marginLeft: "0.5rem", fontSize: "0.9rem" }}>
                                                        - {food.hallName}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                                {food.calories} cal | P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div
                                style={{
                                    background: "#e3f2fd",
                                    padding: "1rem",
                                    borderRadius: "4px",
                                    borderLeft: "4px solid #2196F3",
                                }}
                            >
                                <h4 style={{ margin: "0 0 0.5rem 0", color: "#1976D2" }}>Total Nutrition:</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                                    <div>
                                        <div style={{ fontSize: "0.85rem", color: "#666" }}>Calories</div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
                                            {plan.totals.calories}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.85rem", color: "#666" }}>Protein</div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
                                            {plan.totals.protein}g
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.85rem", color: "#666" }}>Carbs</div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
                                            {plan.totals.carbs}g
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.85rem", color: "#666" }}>Fat</div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
                                            {plan.totals.fat}g
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
