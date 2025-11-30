import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';
import DashboardCard from '../components/DashboardCard';
import NutritionProgress from '../components/NutritionProgress';
import type { UserGoals } from '../type';
import { getMeals } from '../api';

interface UserDashboardProps {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  onLogout: () => void;
}

const UserDashboard = ({ user, onLogout }: UserDashboardProps) => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<UserGoals>({
    Calories: 0,
    Protein: 0,
    Carbs: 0,
    Fat: 0
  });
  const [currentNutrition, setCurrentNutrition] = useState<UserGoals>({
    Calories: 0,
    Protein: 0,
    Carbs: 0,
    Fat: 0
  });

  // Fetch goals and today's logs on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedSession = localStorage.getItem('authSession');
        if (storedSession) {
          const { sessionId } = JSON.parse(storedSession);

          // Fetch Goals
          const goalsRes = await fetch(`http://localhost:3000/api/user/goals?sessionId=${sessionId}`);
          if (goalsRes.ok) {
            const data = await goalsRes.json();
            if (data) setGoals(data);
          }

          // Fetch Today's Logs
          const meals = await getMeals(sessionId);
          const totals = meals.reduce((acc, meal) => ({
            Calories: acc.Calories + meal.Calories,
            Protein: acc.Protein + meal.Protein,
            Carbs: acc.Carbs + meal.Carbs,
            Fat: acc.Fat + meal.Fat
          }), { Calories: 0, Protein: 0, Carbs: 0, Fat: 0 });

          setCurrentNutrition(totals);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#2c3e50' }}>
            {getGreeting()}, {user.firstName}!
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '18px' }}>
            Ready to fuel your day?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '12px',
              fontSize: '20px',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Settings"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            ⚙️
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(255, 107, 107, 0.2)',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '30px',
        alignItems: 'start'
      }}>

        {/* Left Column: Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <DashboardCard
            title="Browse Menus"
            subtitle="See what's cooking in the dining halls today."
            onClick={() => navigate('/user/browse-menus')}
            color="#4ecdc4" // Teal
            icon="🍽️"
          />

          <DashboardCard
            title="Ask a Nutritionist"
            subtitle="Get expert advice on your diet and health."
            onClick={() => navigate('/user/questions')}
            color="#1a535c" // Dark Teal/Blue
            icon="💬"
          />

          <DashboardCard
            title="AI Meal Plans"
            subtitle="View and manage your AI-generated meal plans."
            onClick={() => navigate('/user/meal-plans')}
            color="#ff9f43" // Orange
            icon="🤖"
          />

          {/* Placeholder for future features */}
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: '#f8f9fa',
            borderRadius: '16px',
            padding: '30px',
            border: '2px dashed #dee2e6',
            textAlign: 'center',
            color: '#adb5bd'
          }}>
            <h3 style={{ margin: 0 }}>More features coming soon...</h3>
          </div>
        </div>

        {/* Right Column: Nutrition Widget */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <NutritionProgress goals={goals} current={currentNutrition} />
        </div>

      </div>
    </div>
  );
};

export default UserDashboard;