# System Design: Real-Time Poll Application

## 1. High-Level Architecture
- **Frontend (Client):** React (Vite) Single Page Application.
  - Handles user interactions (Create Poll, View Poll, Vote).
  - Connects to Backend via REST API for initial data and actions.
  - Connects to Backend via WebSocket (Socket.IO) for real-time updates.
- **Backend (Server):** Node.js + Express.
  - Serves API endpoints.
  - Manages WebSocket connections (Socket.IO).
  - Connects to MongoDB database.
- **Database:** MongoDB (Atlas/Local).
  - Stores Poll data (Question, Options, Votes).
  - Stores Metadata for fairness checks (IPs, Browser Fingerprints).

## 2. Database Schema (MongoDB)
**Collection: `polls`**
```javascript
{
  _id: String,           // Unique Poll ID (shortid/nanoid)
  question: String,      // The poll question
  options: [
    {
      id: Number,        // 0, 1, 2... index or unique ID
      text: String,      // Option text
      votes: Number      // Vote count (default 0)
    }
  ],
  createdAt: Date,       // Timestamp
  voters: [              // Array to track who voted (for fairness)
    {
      ip: String,        // IP Address
      browserId: String  // Unique browser identifier (from localStorage/cookie)
    }
  ]
}
```

## 3. API Endpoints
- **POST /api/polls**
  - Body: `{ question: string, options: string[] }`
  - Logic: Validate input, create poll document, return `{ id }`.
- **GET /api/polls/:id**
  - Logic: Fetch poll by ID. Return `{ question, options, hasVoted }`.
  - `hasVoted` is calculated based on request IP and browserId.
- **POST /api/polls/:id/vote**
  - Body: `{ optionId: number, browserId: string }`
  - Logic:
    1. Check if Poll exists.
    2. **Fairness Check 1:** Check if IP has already voted in this poll.
    3. **Fairness Check 2:** Check if `browserId` has already voted.
    4. If valid, increment vote count for the option.
    5. Add voter info to `voters` array.
    6. **Real-Time:** Emit `update_poll` event via Socket.IO to room `poll_:id`.
    7. Return success/updated poll.

## 4. Real-Time Strategy (Socket.IO)
- **Events:**
  - `join_poll`: Client emits this with `pollId` to join a specific room.
  - `update_poll`: Server emits this to the room when a vote occurs. Payload: Updated poll data (options + votes).
  - `connect_error`: Handle connection issues.

## 5. Fairness & Anti-Abuse Mechanisms
1.  **IP Address Tracking:**
    - **Mechanism:** Store the IP address of every voter in the poll document.
    - **Check:** Before accepting a vote, query if `req.ip` is in the `voters` list.
    - **Limitation:** Users behind NAT (e.g., corporate/school wifi) share IPs; might block legitimate users. VPNs can bypass.
2.  **Browser Fingerprint / Persistent Token:**
    - **Mechanism:** Frontend generates a UUID and stores it in `localStorage`. This is sent with the vote request as `browserId`.
    - **Check:** Server verifies if `browserId` exists in `voters` list.
    - **Limitation:** User can clear `localStorage` or use Incognito mode to bypass.
    - **Why both?** Combining them raises the bar. IP stops mass-voting scripts from one machine. Browser ID stops casual users from just refreshing or opening new tabs if they share an IP.

## 6. Deployment Strategy
- **Frontend:** Vercel (Static hosting).
- **Backend:** Render/Railway (Node.js service).
- **Database:** MongoDB Atlas (Cloud).

## 7. Folder Structure
```
/client       # React Frontend
  /src
    /components
    /pages
    /socket.js
/server       # Node Backend
  /models
  /routes
  /controllers
  index.js
```
