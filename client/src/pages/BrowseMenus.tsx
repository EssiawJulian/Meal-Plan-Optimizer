import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listHalls, listFoods, logMeal } from '../api';
import '../styles/global.css';

interface DiningHall {
  HallID: number;
  HallName: string;
}

interface FoodItem {
  FoodID: number;
  FoodName: string;
  Calories: number;
  Fat: number;
  Protein: number;
  Carbs: number;
  ServingSize: string;
  HallName?: string | null;
}

const BrowseMenus = () => {
  const navigate = useNavigate();
  const [diningHalls, setDiningHalls] = useState<DiningHall[]>([]);
  const [selectedHall, setSelectedHall] = useState<number | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingId, setLoggingId] = useState<number | null>(null);

  // Fetch dining halls on component mount
  useEffect(() => {
    fetchDiningHalls();
  }, []);

  // Fetch food items when a hall is selected
  useEffect(() => {
    if (selectedHall) {
      fetchFoodItems(selectedHall);
    }
  }, [selectedHall]);

  const fetchDiningHalls = async () => {
    try {
      const data = await listHalls();
      setDiningHalls(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dining halls');
      setLoading(false);
      console.error(err);
    }
  };

  const fetchFoodItems = async (hallId: number) => {
    try {
      setLoading(true);
      const data = await listFoods({ hallId });
      setFoodItems(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load food items');
      setLoading(false);
      console.error(err);
    }
  };

  const handleLogMeal = async (food: FoodItem) => {
    const storedSession = localStorage.getItem('authSession');
    if (!storedSession) {
      alert("Please login to log meals");
      return;
    }

    try {
      setLoggingId(food.FoodID);
      const { sessionId } = JSON.parse(storedSession);
      await logMeal(sessionId, food.FoodID, "Snack"); // Defaulting to Snack for now
      alert(`Added ${food.FoodName} to your daily log!`);
    } catch (err: any) {
      if (err.message === "Invalid session") {
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem('authSession');
        navigate('/');
      } else {
        alert(err.message || "Failed to log meal");
      }
    } finally {
      setLoggingId(null);
    }
  };

  const filteredFoods = foodItems.filter(food =>
    food.FoodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && diningHalls.length === 0) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading dining halls...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/user')}
        style={{
          marginBottom: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ marginBottom: '10px' }}>Browse Dining Hall Menus</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Select a dining hall to view available food items and their nutritional information
      </p>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Dining Hall Selection */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '24px' }}>Select a Dining Hall</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px'
        }}>
          {diningHalls.map(hall => (
            <button
              key={hall.HallID}
              onClick={() => setSelectedHall(hall.HallID)}
              style={{
                padding: '20px',
                fontSize: '16px',
                backgroundColor: selectedHall === hall.HallID ? '#007bff' : '#f8f9fa',
                color: selectedHall === hall.HallID ? 'white' : '#333',
                border: selectedHall === hall.HallID ? '2px solid #007bff' : '2px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: selectedHall === hall.HallID ? 'bold' : 'normal',
              }}
              onMouseEnter={(e) => {
                if (selectedHall !== hall.HallID) {
                  e.currentTarget.style.borderColor = '#007bff';
                  e.currentTarget.style.backgroundColor = '#e7f3ff';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedHall !== hall.HallID) {
                  e.currentTarget.style.borderColor = '#dee2e6';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
            >
              {hall.HallName}
            </button>
          ))}
        </div>
      </div>

      {/* Food Items Display */}
      {selectedHall && (
        <div>
          <h2 style={{ marginBottom: '15px', fontSize: '24px' }}>
            Menu Items
          </h2>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search for food items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              marginBottom: '20px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading menu items...
            </div>
          ) : filteredFoods.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}>
              {searchTerm ? `No food items found matching "${searchTerm}"` : 'No food items available for this dining hall'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {filteredFoods.map(food => (
                <div
                  key={food.FoodID}
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'box-shadow 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#007bff', fontSize: '20px' }}>
                      {food.FoodName}
                    </h3>
                    <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                      <strong>Serving Size:</strong> {food.ServingSize}
                    </p>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                      gap: '10px',
                      marginTop: '15px',
                      paddingTop: '15px',
                      borderTop: '1px solid #e9ecef'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>CALORIES</div>
                        <div style={{ fontSize: '18px', color: '#007bff', fontWeight: 'bold' }}>{food.Calories}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>PROTEIN</div>
                        <div style={{ fontSize: '18px', color: '#28a745', fontWeight: 'bold' }}>{food.Protein}g</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>CARBS</div>
                        <div style={{ fontSize: '18px', color: '#ffc107', fontWeight: 'bold' }}>{food.Carbs}g</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>FAT</div>
                        <div style={{ fontSize: '18px', color: '#dc3545', fontWeight: 'bold' }}>{food.Fat}g</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLogMeal(food)}
                    disabled={loggingId === food.FoodID}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981', // Modern emerald green
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: loggingId === food.FoodID ? 'wait' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      opacity: loggingId === food.FoodID ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (loggingId !== food.FoodID) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loggingId !== food.FoodID) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                      }
                    }}
                  >
                    <span>{loggingId === food.FoodID ? 'Adding...' : 'Add'}</span>
                    {loggingId !== food.FoodID && <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrowseMenus;