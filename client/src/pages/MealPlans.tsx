import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { AuthSession } from "../type"

type FoodItem = {
    foodId: number
    foodName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    servingSize: string
    hallName: string
    sectionType: string
}

type MealPlan = {
    mealId: number
    mealType: string
    foods: FoodItem[]
    totals: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}

type DiningHall = {
    HallID: number
    HallName: string
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

    // New state for dining halls
    const [halls, setHalls] = useState<DiningHall[]>([])
    const [selectedHalls, setSelectedHalls] = useState<number[]>([])

    useEffect(() => {
        if (!authSession || authSession.role !== "user") {
            navigate("/")
            return
        }
        fetchMealPlans()
        fetchHalls()
    }, [authSession, navigate])

    async function fetchHalls() {
        try {
            const res = await fetch("http://localhost:3000/api/halls")
            if (res.ok) {
                const data = await res.json()
                setHalls(data)
                // Default select all
                setSelectedHalls(data.map((h: DiningHall) => h.HallID))
            }
        } catch (err) {
            console.error("Failed to fetch halls", err)
        }
    }

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

    function handleHallToggle(hallId: number) {
        setSelectedHalls(prev =>
            prev.includes(hallId)
                ? prev.filter(id => id !== hallId)
                : [...prev, hallId]
        )
    }

    async function handleGenerateMeal(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (selectedHalls.length === 0) {
            setError("Please select at least one dining hall")
            return
        }

        setGenerating(true)

        try {
            const res = await fetch("http://localhost:3000/api/meal-plans/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: authSession?.sessionId,
                    hallIds: selectedHalls
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess("Successfully generated full day meal plan!")
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

    // Helper to calculate section totals
    function getSectionTotals(foods: FoodItem[]) {
        return foods.reduce((acc, food) => ({
            calories: acc.calories + food.calories,
            protein: acc.protein + food.protein,
            carbs: acc.carbs + food.carbs,
            fat: acc.fat + food.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
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
                <h2 style={{ marginBottom: "1rem" }}>Generate Full Day Plan</h2>
                <form onSubmit={handleGenerateMeal}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            Select Dining Halls:
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                            {halls.map(hall => (
                                <label key={hall.HallID} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedHalls.includes(hall.HallID)}
                                        onChange={() => handleHallToggle(hall.HallID)}
                                    />
                                    {hall.HallName}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={generating}
                        style={{
                            padding: "0.75rem 2rem",
                            background: generating ? "#999" : "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: generating ? "not-allowed" : "pointer",
                            fontSize: "1rem",
                            fontWeight: "bold"
                        }}
                    >
                        {generating ? "Generating Full Day Plan..." : "Generate Plan with AI"}
                    </button>
                </form>
                <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
                    AI will create a balanced Breakfast, Lunch, Dinner, and Snack plan based on your nutrition goals.
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
                <div style={{ display: "grid", gap: "2rem" }}>
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
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
                                <div>
                                    <h3 style={{ margin: 0, color: "#333" }}>
                                        {plan.mealType}
                                        <span style={{ fontSize: "0.8rem", color: "#999", marginLeft: "1rem" }}>
                                            Plan #{plan.mealId}
                                        </span>
                                    </h3>
                                </div>
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
                                    Delete Plan
                                </button>
                            </div>

                            {/* Sections */}
                            {["Breakfast", "Lunch", "Dinner", "Snack"].map(section => {
                                const sectionFoods = plan.foods.filter(f => f.sectionType === section)
                                if (sectionFoods.length === 0) return null
                                const sectionTotals = getSectionTotals(sectionFoods)

                                return (
                                    <div key={section} style={{ marginBottom: "1.5rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", background: "#f0f0f0", padding: "0.5rem", borderRadius: "4px" }}>
                                            <h4 style={{ margin: 0, color: "#444" }}>{section}</h4>
                                            <div style={{ fontSize: "0.85rem", color: "#666" }}>
                                                {sectionTotals.calories} cal | P: {sectionTotals.protein}g | C: {sectionTotals.carbs}g | F: {sectionTotals.fat}g
                                            </div>
                                        </div>

                                        {sectionFoods.map((food, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: "0.5rem 0.75rem",
                                                    borderBottom: "1px solid #f0f0f0",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center"
                                                }}
                                            >
                                                <div>
                                                    <strong>{food.foodName}</strong>
                                                    <span style={{ color: "#666", marginLeft: "0.5rem", fontSize: "0.9rem" }}>
                                                        ({food.servingSize})
                                                    </span>
                                                    {food.hallName && (
                                                        <span style={{ color: "#999", marginLeft: "0.5rem", fontSize: "0.8rem", fontStyle: "italic" }}>
                                                            - {food.hallName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "0.85rem", color: "#888" }}>
                                                    {food.calories} cal
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}

                            <div
                                style={{
                                    background: "#e3f2fd",
                                    padding: "1rem",
                                    borderRadius: "4px",
                                    borderLeft: "4px solid #2196F3",
                                    marginTop: "1rem"
                                }}
                            >
                                <h4 style={{ margin: "0 0 0.5rem 0", color: "#1976D2" }}>Daily Total:</h4>
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
