const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const { nanoid } = require('nanoid');

// Create a new Poll
router.post('/', async (req, res) => {
  try {
    const { question, options } = req.body;
    const q = (question || '').trim();
    const rawOptions = Array.isArray(options) ? options : [];
    const trimmedOptions = rawOptions.map(o => String(o || '').trim()).filter(o => o.length > 0);
    const uniqueOptions = [...new Set(trimmedOptions)];

    if (!q) {
      return res.status(400).json({ error: 'Question is required.' });
    }
    if (uniqueOptions.length < 2) {
      return res.status(400).json({ error: 'Provide at least two non-empty options.' });
    }
    if (uniqueOptions.length > 50) {
      return res.status(400).json({ error: 'Too many options.' });
    }
    if (q.length > 200) {
      return res.status(400).json({ error: 'Question is too long.' });
    }

    const newPoll = new Poll({
      _id: nanoid(8),
      question: q,
      options: uniqueOptions.map((opt, index) => ({
        id: index,
        text: opt,
        votes: 0
      })),
      voters: []
    });

    await newPoll.save();
    res.status(201).json(newPoll);
  } catch (err) {
    const message = err?.message || 'Server error';
    console.error('Error creating poll:', message);
    res.status(500).json({ error: message });
  }
});

// Get Poll by ID
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Fairness Check: Only check browserId for "hasVoted" state
    // We do NOT check IP here anymore to allow multiple users on same network
    const browserId = req.headers['x-browser-id'];
    const hasVoted = browserId ? poll.voters.some(v => v.browserId === browserId) : false;

    res.json({
      ...poll.toObject(),
      hasVoted
    });
  } catch (err) {
    console.error('Error fetching poll:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on a Poll
router.post('/:id/vote', async (req, res) => {
  try {
    const { optionId } = req.body;
    const pollId = req.params.id;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const browserId = req.headers['x-browser-id'];

    if (!browserId) {
      return res.status(400).json({ error: 'Browser ID is required.' });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Fairness Mechanism #1: Browser-based Unique Voter ID
    const browserVoted = poll.voters.some(v => v.browserId === browserId);
    if (browserVoted) {
      return res.status(403).json({ error: 'You have already voted from this browser.' });
    }

    // Fairness Mechanism #2: IP-based Rate Limiting (Soft Protection)
    // Allow multiple votes from same IP, but prevent spamming (e.g., max 1 vote per 5 seconds)
    const recentIpVotes = poll.voters
      .filter(v => v.ip === clientIp)
      .sort((a, b) => b.votedAt - a.votedAt); // Newest first

    if (recentIpVotes.length > 0) {
      const lastVoteTime = new Date(recentIpVotes[0].votedAt).getTime();
      const now = Date.now();
      const timeDiff = now - lastVoteTime;

      if (timeDiff < 5000) { // 5000ms = 5 seconds
        return res.status(429).json({ error: 'Too many votes from this IP. Please wait a moment.' });
      }
    }

    // Update Vote
    const optionIndex = poll.options.findIndex(o => o.id === optionId);
    if (optionIndex === -1) {
      return res.status(400).json({ error: 'Invalid option.' });
    }

    poll.options[optionIndex].votes += 1;
    // Explicitly set votedAt to ensure it's current
    poll.voters.push({ ip: clientIp, browserId, votedAt: new Date() });
    await poll.save();

    // Real-time Update
    const io = req.app.get('io');
    io.to(pollId).emit('update_poll', poll);

    res.json(poll);
  } catch (err) {
    console.error('Error voting:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
