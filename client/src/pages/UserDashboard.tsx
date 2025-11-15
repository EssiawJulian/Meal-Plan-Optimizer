import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>User Dashboard</h1>
        <button
          onClick={onLogout}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
        Hello, {user.firstName} {user.lastName}!
      </p>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
          Welcome to your meal planning dashboard. Additional features will be implemented here later.
        </p>

        <ul style={{ fontSize: '16px', lineHeight: '2' }}>
          <li>View and manage your meal plans</li>
          <li>Track your nutrition goals</li>
          <li>
            <button
              onClick={() => navigate('/user/browse-menus')}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
                padding: 0,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0056b3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#007bff';
              }}
            >
              Browse dining hall menus
            </button>
          </li>
          <li>Ask nutritionists questions</li>
        </ul>
      </div>
    </div>
  );
};

export default UserDashboard;