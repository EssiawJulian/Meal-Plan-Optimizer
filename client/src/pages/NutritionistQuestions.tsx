import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnansweredQuestions, replyToQuestion } from '../api';
import type { Question } from '../types';
import '../styles/global.css';

const NutritionistQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      setLoading(true);
      const data = await getUnansweredQuestions();
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  async function handleReplySubmit(questionId: number) {
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await replyToQuestion(questionId, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  }

  function startReply(questionId: number) {
    setReplyingTo(questionId);
    setReplyText('');
    setError(null);
  }

  function cancelReply() {
    setReplyingTo(null);
    setReplyText('');
    setError(null);
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/nutritionist')}
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
        <h1 style={{ margin: 0 }}>User Questions</h1>
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

      {loading ? (
        <p>Loading questions...</p>
      ) : questions.length === 0 ? (
        <div style={{
          padding: '30px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center',
          color: '#666'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No unanswered questions at this time</p>
          <p style={{ margin: 0 }}>All user questions have been answered!</p>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            You have <strong>{questions.length}</strong> unanswered question{questions.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '15px'
                }}>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#333' }}>
                      Question from {question.FirstName} {question.LastName}
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                      {question.Email}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    border: '1px solid #ffeaa7'
                  }}>
                    Pending
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
                    {question.UserMessage}
                  </p>
                </div>

                {replyingTo === question.QuestionID ? (
                  <div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid #ced4da',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        marginBottom: '10px'
                      }}
                      disabled={submitting}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleReplySubmit(question.QuestionID)}
                        disabled={submitting || !replyText.trim()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          backgroundColor: submitting || !replyText.trim() ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: submitting || !replyText.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {submitting ? 'Sending...' : 'Send Reply'}
                      </button>
                      <button
                        onClick={cancelReply}
                        disabled={submitting}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#6c757d',
                          border: '1px solid #6c757d',
                          borderRadius: '4px',
                          cursor: submitting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startReply(question.QuestionID)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Reply to Question
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionistQuestions;
