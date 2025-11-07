type Props = {
  user: { firstName: string; lastName: string }
  onLogout: () => void
}

export default function NutritionistDashboard({ user, onLogout }: Props) {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1>Nutritionist Dashboard</h1>
          <p style={{ color: "#666", margin: "8px 0", fontSize: 18 }}>
            Hello, {user.firstName} {user.lastName}!
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>

      <div style={{
        padding: 24,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        border: "1px solid #ddd"
      }}>
        <p style={{ fontSize: 16, marginBottom: 12 }}>
          Welcome to your nutritionist dashboard. Additional features will be implemented here later.
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8 }}>
          <li>View user questions and provide guidance</li>
          <li>Review meal plans and provide recommendations</li>
          <li>Access nutrition analysis tools</li>
          <li>Manage client consultations</li>
        </ul>
      </div>
    </div>
  )
}
