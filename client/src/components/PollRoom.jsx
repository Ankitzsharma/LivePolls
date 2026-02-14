import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../App.css'; // Assume basic styles

const PollRoom = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'info'|'error', text: string }
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure browserId exists
    let browserId = localStorage.getItem('browserId');
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem('browserId', browserId);
    }

    // Initialize Socket
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Fetch Poll Data
    const fetchPoll = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || serverUrl;
        const res = await axios.get(`${apiUrl}/api/polls/${id}`, {
          headers: { 'x-browser-id': browserId }
        });
        setPoll(res.data);
        setHasVoted(res.data.hasVoted);
        if (res.data.hasVoted) {
          setMessage({ type: 'info', text: 'You have already voted in this poll.' });
        } else {
          setMessage({ type: 'info', text: 'Results update live' });
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Poll not found or server error.');
        setLoading(false);
      }
    };

    fetchPoll();

    // Socket Setup
    newSocket.emit('join_poll', id);

    newSocket.on('update_poll', (updatedPoll) => {
      setPoll((prev) => ({
        ...prev,
        options: updatedPoll.options,
        voters: updatedPoll.voters // To keep consistency
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  const handleVote = async (optionId) => {
    if (hasVoted) return;
    if (isVoting) return;

    try {
      const serverUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      const browserId = localStorage.getItem('browserId');
      setIsVoting(true);
      setMessage(null);
      setSelectedOptionId(optionId);

      await axios.post(`${serverUrl}/api/polls/${id}/vote`, {
        optionId
      }, {
        headers: { 'x-browser-id': browserId }
      });
      
      setHasVoted(true);
      setMessage({ type: 'info', text: 'Vote recorded. Results update live.' });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to vote';
      setMessage({ type: 'error', text: msg });
    }
    setIsVoting(false);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="poll-card">
          <div className="skeleton title" />
          <div className="skeleton line" />
          <div className="skeleton line" />
          <div className="skeleton line" />
          <div className="skeleton line" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="poll-card">
          <div className="banner error">{error}</div>
          <button onClick={() => navigate('/')} className="btn ghost" style={{ marginTop: '1rem' }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }
  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="page">
      <div className="poll-card">
        <div className="header-row">
          <h1 className="poll-title">{poll.question}</h1>
          <span className="badge badge-live">Live Results</span>
        </div>

        {message && (
          <div className={message.type === 'error' ? 'banner error' : 'banner info'}>
            {message.text}
          </div>
        )}
        
        <div className="poll-options">
          {poll.options.map((option) => {
            const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
            const isDimmed = hasVoted && selectedOptionId !== null && selectedOptionId !== option.id;
            
            return (
              <div
                key={option.id}
                className={`option-card ${hasVoted ? 'result-mode' : ''} ${selectedOptionId === option.id ? 'selected' : ''} ${isDimmed ? 'dim' : ''}`}
                onClick={() => (!hasVoted && !isVoting) && handleVote(option.id)}
                role="button"
                tabIndex={!hasVoted ? 0 : -1}
                aria-disabled={hasVoted || isVoting}
              >
                <div className="option-header">
                  <span className="option-text">{option.text}</span>
                  {hasVoted && <span className="vote-count">{percentage}%</span>}
                </div>
                
                {hasVoted ? (
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                     <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                        Tap to Vote
                     </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
  
        <div className="poll-footer">
          <p className="totals">
            Total Votes: {totalVotes} {totalVotes === 0 && <span className="no-votes">No votes yet</span>}
          </p>
          <div className="actions-row">
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="btn secondary">
              Copy Link
            </button>
            <button onClick={() => navigate('/')} className="btn ghost">
              Create New Poll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollRoom;
