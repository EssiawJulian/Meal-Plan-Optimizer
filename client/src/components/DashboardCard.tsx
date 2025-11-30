import React from 'react';

interface Props {
    title: string;
    subtitle: string;
    onClick: () => void;
    color: string;
    icon: string;
}

const DashboardCard: React.FC<Props> = ({ title, subtitle, onClick, color, icon }) => {
    return (
        <div
            onClick={onClick}
            style={{
                backgroundColor: color,
                padding: '30px',
                borderRadius: '16px',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
        >
            <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold' }}>{title}</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>{subtitle}</p>
            </div>

            <div style={{
                fontSize: '80px',
                position: 'absolute',
                bottom: '-10px',
                right: '10px',
                opacity: 0.2,
                transform: 'rotate(-10deg)'
            }}>
                {icon}
            </div>
        </div>
    );
};

export default DashboardCard;
