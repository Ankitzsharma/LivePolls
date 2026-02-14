const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const PollSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => nanoid(8), // Generate short ID
  },
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: [{
    id: { type: Number, required: true },
    text: { type: String, required: true },
    votes: { type: Number, default: 0 }
  }],
  voters: [{
    ip: String,
    browserId: String,
    votedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Poll', PollSchema);
