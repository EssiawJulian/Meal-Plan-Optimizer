import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { AuthSession, UserGoals } from "../type"

type Props = {
    authSession: AuthSession
    onLogout: () => void
}

export default function Settings({ authSession, onLogout }: Props) {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<"profile" | "password" | "goals">("profile")

    // Profile State
    const user = authSession?.user

    // Password State
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordMessage, setPasswordMessage] = useState("")
    const [passwordError, setPasswordError] = useState("")

    // Goals State
    const [goals, setGoals] = useState<UserGoals>({
        Calories: 0,
        Fat: 0,
        Protein: 0,
        Carbs: 0,
    })
    const [goalsMessage, setGoalsMessage] = useState("")
    const [goalsError, setGoalsError] = useState("")

    useEffect(() => {
        if (!authSession) {
            navigate("/")
            return
        }

        if (authSession.role === "user") {
            fetchGoals()
        }
    }, [authSession, navigate])

    async function fetchGoals() {
        try {
            const res = await fetch(`http://localhost:3000/api/user/goals?sessionId=${authSession?.sessionId}`)
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setGoals(data)
                }
            }
        } catch (err) {
            console.error("Failed to fetch goals", err)
        }
    }

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault()
        setPasswordMessage("")
        setPasswordError("")

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match")
            return
        }

        try {
            const res = await fetch("http://localhost:3000/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: authSession?.sessionId,
                    role: authSession?.role,
                    currentPassword: oldPassword,
                    newPassword,
                    newPasswordConfirm: confirmPassword,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setPasswordMessage("Password updated successfully")
                setOldPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                setPasswordError(data.error || "Failed to update password")
            }
        } catch (err) {
            setPasswordError("An error occurred")
        }
    }

    async function handleGoalsUpdate(e: React.FormEvent) {
        e.preventDefault()
        setGoalsMessage("")
        setGoalsError("")

        try {
            const res = await fetch("http://localhost:3000/api/user/goals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: authSession?.sessionId,
                    goals,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setGoalsMessage("Goals updated successfully")
            } else {
                setGoalsError(data.error || "Failed to update goals")
            }
        } catch (err) {
            setGoalsError("An error occurred")
        }
    }

    if (!authSession) return null

    return (
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>Settings</h1>
                <button onClick={() => navigate(-1)} style={{ padding: "0.5rem 1rem" }}>
                    Back to Dashboard
                </button>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid #ccc" }}>
                <button
                    onClick={() => setActiveTab("profile")}
                    style={{
                        padding: "0.5rem 1rem",
                        background: activeTab === "profile" ? "#eee" : "transparent",
                        border: "none",
                        borderBottom: activeTab === "profile" ? "2px solid #333" : "none",
                        cursor: "pointer",
                    }}
                >
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab("password")}
                    style={{
                        padding: "0.5rem 1rem",
                        background: activeTab === "password" ? "#eee" : "transparent",
                        border: "none",
                        borderBottom: activeTab === "password" ? "2px solid #333" : "none",
                        cursor: "pointer",
                    }}
                >
                    Change Password
                </button>
                {authSession.role === "user" && (
                    <button
                        onClick={() => setActiveTab("goals")}
                        style={{
                            padding: "0.5rem 1rem",
                            background: activeTab === "goals" ? "#eee" : "transparent",
                            border: "none",
                            borderBottom: activeTab === "goals" ? "2px solid #333" : "none",
                            cursor: "pointer",
                        }}
                    >
                        Nutritional Goals
                    </button>
                )}
            </div>

            {activeTab === "profile" && (
                <div style={{ background: "#f9f9f9", padding: "1.5rem", borderRadius: "8px" }}>
                    <h2>Profile Information</h2>
                    <div style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>First Name</label>
                            <div style={{ padding: "0.5rem", background: "#fff", border: "1px solid #ddd", borderRadius: "4px" }}>
                                {user?.firstName}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Last Name</label>
                            <div style={{ padding: "0.5rem", background: "#fff", border: "1px solid #ddd", borderRadius: "4px" }}>
                                {user?.lastName}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Email</label>
                            <div style={{ padding: "0.5rem", background: "#fff", border: "1px solid #ddd", borderRadius: "4px" }}>
                                {user?.email}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Role</label>
                            <div style={{ padding: "0.5rem", background: "#fff", border: "1px solid #ddd", borderRadius: "4px", textTransform: "capitalize" }}>
                                {authSession.role}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "password" && (
                <div style={{ background: "#f9f9f9", padding: "1.5rem", borderRadius: "8px" }}>
                    <h2>Change Password</h2>
                    <form onSubmit={handlePasswordChange} style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <button type="submit" style={{ padding: "0.75rem", background: "#333", color: "#fff", border: "none", cursor: "pointer" }}>
                            Update Password
                        </button>
                        {passwordMessage && <p style={{ color: "green" }}>{passwordMessage}</p>}
                        {passwordError && <p style={{ color: "red" }}>{passwordError}</p>}
                    </form>
                </div>
            )}

            {activeTab === "goals" && authSession.role === "user" && (
                <div style={{ background: "#f9f9f9", padding: "1.5rem", borderRadius: "8px" }}>
                    <h2>Nutritional Goals (Daily)</h2>
                    <form onSubmit={handleGoalsUpdate} style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Calories</label>
                            <input
                                type="number"
                                value={goals.Calories}
                                onChange={(e) => setGoals({ ...goals, Calories: parseInt(e.target.value) || 0 })}
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Protein (g)</label>
                            <input
                                type="number"
                                value={goals.Protein}
                                onChange={(e) => setGoals({ ...goals, Protein: parseInt(e.target.value) || 0 })}
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Carbs (g)</label>
                            <input
                                type="number"
                                value={goals.Carbs}
                                onChange={(e) => setGoals({ ...goals, Carbs: parseInt(e.target.value) || 0 })}
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem" }}>Fat (g)</label>
                            <input
                                type="number"
                                value={goals.Fat}
                                onChange={(e) => setGoals({ ...goals, Fat: parseInt(e.target.value) || 0 })}
                                style={{ width: "100%", padding: "0.5rem" }}
                            />
                        </div>
                        <button type="submit" style={{ padding: "0.75rem", background: "#333", color: "#fff", border: "none", cursor: "pointer" }}>
                            Save Goals
                        </button>
                        {goalsMessage && <p style={{ color: "green" }}>{goalsMessage}</p>}
                        {goalsError && <p style={{ color: "red" }}>{goalsError}</p>}
                    </form>
                </div>
            )}
        </div>
    )
}
