require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pollRoutes = require('./routes/pollRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  }
});

// Attach io to app for use in routes
app.set('io', io);

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/poll-app', {
      serverSelectionTimeoutMS: 5000, // Fail quickly if no connection
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    // Don't exit process, allow retry or server to stay up for health checks
  }
};

connectDB();

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Disconnected');
});

// Routes
app.use('/api/polls', pollRoutes);

// Health Check
app.get('/health', (req, res) => {
  const mongoState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({
    status: 'ok',
    mongo: mongoState,
    clientUrl: process.env.CLIENT_URL || null,
  });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_poll', (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll: ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
