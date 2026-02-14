import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const CreatePoll = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);

    if (!question.trim()) {
      setError('Question is required.');
      return;
    }
    if (options.some(opt => !opt.trim())) {
      setError('All options must be filled.');
      return;
    }
    if (options.length < 2) {
      setError('At least 2 options are required.');
      return;
    }

    try {
      const serverUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_SERVER_URL ||
        'http://localhost:5000';

      const res = await axios.post(`${serverUrl}/api/polls`, {
        question,
        options
      });

      setMessage({ type: 'info', text: 'Poll created. Share the link to collect votes.' });
      navigate(`/poll/${res.data._id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create poll. Please try again.');
    }
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

      <button type="submit" className="submit-btn">
        Create Poll
      </button>
    </form>
  </div>
);


};

export default CreatePoll;
