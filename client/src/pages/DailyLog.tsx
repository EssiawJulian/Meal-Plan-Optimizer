import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeals, deleteMeal, updateMeal } from '../api';
import type { MealLog } from '../api';
import '../styles/global.css';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DailyLog = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [meals, setMeals] = useState<MealLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedMealId, setDraggedMealId] = useState<number | null>(null);

    useEffect(() => {
        fetchMeals();
    }, [selectedDate]);

    const fetchMeals = async () => {
        try {
            setLoading(true);
            const storedSession = localStorage.getItem('authSession');
            if (!storedSession) return;
            const { sessionId } = JSON.parse(storedSession);
            const data = await getMeals(sessionId, selectedDate);
            setMeals(data);
        } catch (err) {
            console.error("Failed to fetch meals", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (mealId: number) => {
        if (!confirm("Are you sure you want to remove this item?")) return;
        try {
            await deleteMeal(mealId);
            setMeals(meals.filter(m => m.MealID !== mealId));
        } catch (err) {
            alert("Failed to delete meal");
        }
    };

    const handleDragStart = (e: React.DragEvent, mealId: number) => {
        setDraggedMealId(mealId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newType: string) => {
        e.preventDefault();
        if (!draggedMealId) return;

        const meal = meals.find(m => m.MealID === draggedMealId);
        if (!meal || meal.MealType === newType) return;

        // Optimistic update
        const updatedMeals = meals.map(m =>
            m.MealID === draggedMealId ? { ...m, MealType: newType } : m
        );
        setMeals(updatedMeals);

        try {
            await updateMeal(draggedMealId, { mealType: newType });
        } catch (err) {
            console.error("Failed to update meal type", err);
            // Revert on failure
            fetchMeals();
        } finally {
            setDraggedMealId(null);
        }
    };

    const getMealsByType = (type: string) => meals.filter(m => m.MealType === type);

    const calculateTotal = (nutrient: keyof MealLog) =>
        meals.reduce((sum, m) => sum + (Number(m[nutrient]) || 0), 0);

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: 0, fontSize: '32px', color: '#2c3e50' }}>Daily Food Log</h1>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                        padding: '10px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: '1px solid #ced4da'
                    }}
                />
            </div>

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '40px',
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Calories</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{calculateTotal('Calories')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Protein</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{calculateTotal('Protein')}g</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Carbs</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>{calculateTotal('Carbs')}g</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Fat</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c0392b' }}>{calculateTotal('Fat')}g</div>
                </div>
            </div>

            {/* Kanban Board */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                alignItems: 'start'
            }}>
                {MEAL_TYPES.map(type => (
                    <div
                        key={type}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, type)}
                        style={{
                            backgroundColor: '#f1f3f5',
                            borderRadius: '12px',
                            padding: '20px',
                            minHeight: '200px'
                        }}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
                            {type}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {getMealsByType(type).map(meal => (
                                <div
                                    key={meal.MealID}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, meal.MealID)}
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        cursor: 'grab',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>{meal.FoodName}</div>
                                    <div style={{ fontSize: '12px', color: '#868e96' }}>
                                        {meal.Calories} kcal • {meal.Protein}g P • {meal.Carbs}g C • {meal.Fat}g F
                                    </div>
                                    <button
                                        onClick={() => handleDelete(meal.MealID)}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: 'none',
                                            border: 'none',
                                            color: '#adb5bd',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '0 5px'
                                        }}
                                        title="Remove item"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {getMealsByType(type).length === 0 && (
                                <div style={{ textAlign: 'center', color: '#adb5bd', padding: '20px', fontSize: '14px', fontStyle: 'italic' }}>
                                    Drop items here
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailyLog;
