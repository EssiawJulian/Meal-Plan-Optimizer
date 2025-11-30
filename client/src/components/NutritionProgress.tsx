import React from 'react';
import type { UserGoals } from '../type';

interface Props {
    goals: UserGoals;
    current?: UserGoals; // Optional for now, defaults to 0
}

import { useNavigate } from 'react-router-dom';

const NutritionProgress: React.FC<Props> = ({ goals, current }) => {
    const navigate = useNavigate();
    const nutrients = [
        { label: 'Calories', key: 'Calories', unit: 'kcal', color: '#343a40' },
        { label: 'Protein', key: 'Protein', unit: 'g', color: '#28a745' },
        { label: 'Carbs', key: 'Carbs', unit: 'g', color: '#007bff' },
        { label: 'Fat', key: 'Fat', unit: 'g', color: '#ffc107' },
    ] as const;

    return (
        <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #eee'
        }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#333' }}>Daily Targets</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {nutrients.map((item) => {
                    const goalValue = goals[item.key] || 0;
                    const currentValue = current?.[item.key] || 0;
                    const percentage = goalValue > 0 ? Math.min((currentValue / goalValue) * 100, 100) : 0;

                    return (
                        <div key={item.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                                <span style={{ fontWeight: 500 }}>{item.label}</span>
                                <span style={{ color: '#666' }}>
                                    {currentValue} / {goalValue} {item.unit}
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: item.color,
                                    transition: 'width 0.5s ease-in-out'
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={() => navigate('/user/log')}
                style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    color: '#495057',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            >
                View Full Log →
            </button>
        </div>
    );
};

export default NutritionProgress;
