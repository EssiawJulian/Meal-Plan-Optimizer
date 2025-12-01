import { useState, useMemo } from "react"
import type { Food } from "../type"

type Props = {
  items: Food[]
  onDelete: (id: number) => Promise<void>
}

type SortConfig = {
  key: keyof Food | null
  direction: 'asc' | 'desc'
}

export default function FoodTable({ items, onDelete }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' })

  // 1. Filter
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const lowerQuery = searchQuery.toLowerCase()
    return items.filter(item =>
      item.FoodName.toLowerCase().includes(lowerQuery)
    )
  }, [items, searchQuery])

  // 2. Sort
  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems]
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        // Handle nulls/undefined safely
        const aValue = a[sortConfig.key!] ?? ""
        const bValue = b[sortConfig.key!] ?? ""

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [filteredItems, sortConfig])

  // 3. Paginate
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)

  const requestSort = (key: keyof Food) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  if (items.length === 0) return <p>No foods yet.</p>

  return (
    <div>
      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search foods..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1) // Reset to page 1 on search
          }}
          style={{
            padding: '10px',
            width: '100%',
            maxWidth: '400px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Table */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: '20px' }}>
        <thead>
          <tr>
            <Th onClick={() => requestSort('FoodID')} sortable>ID {sortConfig.key === 'FoodID' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('FoodName')} sortable>Name {sortConfig.key === 'FoodName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('ServingSize')} sortable>Serving {sortConfig.key === 'ServingSize' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('Calories')} sortable>Cal {sortConfig.key === 'Calories' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('Fat')} sortable>Fat {sortConfig.key === 'Fat' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('Protein')} sortable>Protein {sortConfig.key === 'Protein' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('Carbs')} sortable>Carbs {sortConfig.key === 'Carbs' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th onClick={() => requestSort('HallName')} sortable>Hall {sortConfig.key === 'HallName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(f => (
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
                <button
                  onClick={() => onDelete(f.FoodID)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '8px 16px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1
          }}
        >
          Prev
        </button>
        <span>Page {currentPage} of {totalPages || 1}</span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: '8px 16px',
            cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
            opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function Th({ children, onClick, sortable }: { children: React.ReactNode, onClick?: () => void, sortable?: boolean }) {
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: "left",
        borderBottom: "1px solid #ddd",
        padding: 6,
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
        backgroundColor: sortable ? '#f8f9fa' : 'transparent'
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{children}</td>
}
