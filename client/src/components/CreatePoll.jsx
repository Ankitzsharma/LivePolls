import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const CreatePoll = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isLongWait, setIsLongWait] = useState(false);
  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);
    setSubmitting(true);
    setIsLongWait(false);

    // UX: If request takes longer than 1s, show "Waking up server..."
    const waitTimer = setTimeout(() => setIsLongWait(true), 1500);

    if (!question.trim()) {
      setError('Question is required.');
      setSubmitting(false);
      clearTimeout(waitTimer);
      return;
    }
    const trimmed = options.map(o => o.trim()).filter(o => o.length > 0);
    const unique = Array.from(new Set(trimmed));
    if (unique.length < 2) {
      setError('At least 2 options are required.');
      setSubmitting(false);
      clearTimeout(waitTimer);
      return;
    }

    try {
      const serverUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_SERVER_URL ||
        'https://livepolls-p2z9.onrender.com';

      let attempt = 0;
      let lastErr = null;
      // Retry logic for cold starts
      while (attempt < 3) {
        try {
          const res = await axios.post(`${serverUrl}/api/polls`, {
            question: question.trim(),
            options: unique
          }, { timeout: 15000 }); // 15s timeout per request
          
          clearTimeout(waitTimer);
          setMessage({ type: 'info', text: 'Success! Redirecting...' });
          // Short delay to let user see success state
          await delay(500);
          navigate(`/poll/${res.data._id}`);
          return;
        } catch (err) {
          lastErr = err;
          // Only retry on network errors or 5xx (server errors)
          // Do NOT retry on 4xx (validation errors)
          if (err.response && err.response.status >= 400 && err.response.status < 500) {
            break; 
          }
          
          const backoff = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          await delay(backoff);
          attempt += 1;
        }
      }

      clearTimeout(waitTimer);
      const msg = lastErr?.response?.data?.error ||
                  (lastErr?.code === 'ERR_NETWORK' ? 'Network error. Server might be waking up.' : 'Server error.');
      setError(`Failed to create poll. ${msg}`);
    } catch (err) {
      clearTimeout(waitTimer);
      const msg = err?.message || 'Unknown error';
      setError(`Failed to create poll. ${msg}`);
    }
    setSubmitting(false);
    setIsLongWait(false);
  };

return (
  <div className="poll-card">
    <h1 className="app-title">Create a Real-Time Poll</h1>

    {message && (
      <div className={message.type === 'error' ? 'banner error' : 'banner info'}>
        {message.text}
      </div>
    )}
    {error && <div className="banner error">{error}</div>}

    <div className="banner info">
      Shareable link will be generated after creation.
    </div>

    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What is your favorite programming language?"
          required
        />
      </div>

      <div className="form-group">
        <label>Options</label>
        {options.map((opt, index) => (
          <div key={index} className="option-row">
            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              required
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="remove-btn"
                title="Remove option"
              >
                &times;
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addOption} className="add-btn">
          + Add Option
        </button>
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"></path>
            </svg>
            {isLongWait ? 'Waking up server...' : 'Creating...'}
          </span>
        ) : (
          'Create Poll'
        )}
      </button>
    </form>
  </div>
);


};

export default CreatePoll;
