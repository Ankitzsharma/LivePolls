# Real‑Time Polls

Create polls, share a link, vote, and see results update live across all connected clients.

## Features
- Create a poll with any number of options
- Live results via Socket.IO (WebSockets)
- Clean, centered card UI (desktop, tablet, mobile)
- Duplicate voting protection using a persistent browserId in localStorage

## Tech Stack
- Frontend: React (Vite), Axios, Socket.IO Client, CSS
- Backend: Node.js, Express, Socket.IO, Mongoose
- Database: MongoDB

## Architecture Overview
- REST API for initial data and actions
  - `POST /api/polls` → create poll
  - `GET /api/polls/:id` → fetch poll
  - `POST /api/polls/:id/vote` → cast vote (requires `x-browser-id`)
- Real‑time channel for updates
  - Client emits `join_poll` with pollId
  - Server emits `update_poll` with updated poll payload to the room
- Fairness
  - One vote per `browserId` per poll
  - IP stored for moderation/monitoring

## Quick Start
### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend
```bash
cd server
npm install
# .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/poll-app
CLIENT_URL=http://localhost:5173
npm start
```

### Frontend
```bash
cd client
npm install
# .env.local
VITE_SERVER_URL=http://localhost:5000
npm run dev
```

## Client Configuration
- Use `VITE_SERVER_URL` (or `VITE_API_URL`) to point the frontend at the backend.
- Lint with `npm run lint` (inside `client`).

## Deployment
- Backend (Render/Railway): set `MONGO_URI`, `CLIENT_URL`; start server on `PORT`.
- Frontend (Vercel/Netlify): set `VITE_SERVER_URL`; build with `npm run build`; output `dist/`.

## Usage Flow
1. Create Poll → copies the link.
2. Share the link → users open poll page.
3. Users vote → server broadcasts `update_poll` → all clients update in real time.

## License
MIT
