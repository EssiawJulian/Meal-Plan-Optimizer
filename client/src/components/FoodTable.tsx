import type { Food } from "../types"

type Props = {
  items: Food[]
  onDelete: (id: number) => Promise<void>
}

export default function FoodTable({ items, onDelete }: Props) {
  if (items.length === 0) return <p>No foods yet.</p>

  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <Th>ID</Th>
          <Th>Name</Th>
          <Th>Serving</Th>
          <Th>Cal</Th>
          <Th>Fat</Th>
          <Th>Protein</Th>
          <Th>Carbs</Th>
          <Th>Hall</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {items.map(f => (
          <tr key={f.FoodID}>
            <Td>{f.FoodID}</Td>
            <Td>{f.FoodName}</Td>
            <Td>{f.ServingSize}</Td>
            <Td>{f.Calories}</Td>
            <Td>{f.Fat}</Td>
            <Td>{f.Protein}</Td>
            <Td>{f.Carbs}</Td>
            <Td>{f.HallName ?? f.HallID ?? ""}</Td>
            <Td>
              <button onClick={() => onDelete(f.FoodID)}>Delete</button>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{children}</td>
}
