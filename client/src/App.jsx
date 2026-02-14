import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreatePoll from './components/CreatePoll';
import PollRoom from './components/PollRoom';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <main>
          <Routes>
            <Route path="/" element={<CreatePoll />} />
            <Route path="/poll/:id" element={<PollRoom />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
