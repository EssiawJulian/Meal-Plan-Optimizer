import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuestion, getUserQuestions } from '../api';
import type { Question } from '../types';
import '../styles/global.css';

interface UserQuestionsProps {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const UserQuestions = ({ user }: UserQuestionsProps) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [user.id]);

  async function loadQuestions() {
    try {
      setLoading(true);
      const data = await getUserQuestions(user.id);
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createQuestion({
        userId: user.id,
        userMessage: newQuestion.trim()
      });
      setNewQuestion('');
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/user')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '20px'
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ margin: 0 }}>Ask Nutritionist Questions</h1>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Ask Question Form */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '20px' }}>Ask a New Question</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your nutrition question here..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: submitting || !newQuestion.trim() ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting || !newQuestion.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Question'}
          </button>
        </form>
      </div>

      {/* Questions List */}
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Your Questions</h2>
        {loading ? (
          <p>Loading your questions...</p>
        ) : questions.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            textAlign: 'center',
            color: '#666'
          }}>
            You haven't asked any questions yet. Use the form above to ask your first question!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {questions.map((question) => (
              <div
                key={question.QuestionID}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <strong style={{ fontSize: '16px', color: '#333' }}>Your Question:</strong>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: question.MessageStatus ? '#d4edda' : '#fff3cd',
                      color: question.MessageStatus ? '#155724' : '#856404',
                      border: `1px solid ${question.MessageStatus ? '#c3e6cb' : '#ffeaa7'}`
                    }}>
                      {question.MessageStatus ? 'Answered' : 'Pending'}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0', fontSize: '15px', lineHeight: '1.5' }}>
                    {question.UserMessage}
                  </p>
                </div>

                {question.MessageStatus && question.MessageReply && (
                  <div style={{
                    backgroundColor: '#e7f3ff',
                    padding: '15px',
                    borderRadius: '6px',
                    border: '1px solid #b3d9ff'
                  }}>
                    <strong style={{ fontSize: '15px', color: '#004085' }}>
                      Nutritionist's Reply:
                    </strong>
                    <p style={{ margin: '8px 0 0 0', fontSize: '15px', lineHeight: '1.5', color: '#004085' }}>
                      {question.MessageReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserQuestions;
