# 🏏 IPL Fantasy Auction

A **real-time multiplayer** IPL Fantasy Auction game where up to 10 players compete to build the best team. Join a room, bid on 100 IPL players with a live countdown timer, and compete for the highest PowerScore!

---

## Features

- **Real-time Multiplayer** — Up to 10 players in one auction room
- **₹100 Crore Budget** — Manage your budget strategically
- **Dynamic Timer** — Every bid extends the countdown by 2 seconds
- **Smart Scoring** — Players ranked by total PowerScore
- **Beautiful UI** — Smooth animations with Framer Motion
- **WebSocket-Powered** — Instant updates via Socket.io
- **Responsive Design** — Works on desktop and mobile
- **Team Composition Rules** — Must have min. 1 WK, 3 batters, 2 bowlers
- **Auto-bid Mode** — Set a max price and let the system bid for you
- **Auction History** — Full log of every bid and sold price

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| UI Components | shadcn/ui + Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io (WebSocket) |
| Database | PostgreSQL + Drizzle ORM |

---

## How to Run

### Step 1 — Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (open new terminal)
cd frontend
npm install
```

### Step 2 — Set up environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL=postgresql://localhost:5432/ipl_auction
PORT=8080
NODE_ENV=development
```

### Step 3 — Set up database

Make sure PostgreSQL is running, then:

```bash
cd backend
npm run db:push
npm run db:seed
```

### Step 4 — Start backend (Terminal 1)

```bash
cd backend
npm run dev
```

Backend runs at: **http://localhost:8080**

### Step 5 — Start frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## How to Play

1. Open **http://localhost:5173**
2. Create a room or join with a room code
3. Share the room code with friends (up to 10 players)
4. Host starts the auction
5. Bid on IPL players before the timer runs out
6. Each bid adds 2 seconds to the timer
7. Highest bidder wins the player
8. Game ends when all players are auctioned
9. Player with highest PowerScore wins!

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Database connection error | Check `DATABASE_URL` in `backend/.env` |
| Port already in use | Change `PORT` in `backend/.env` |
| Players not loading | Run `npm run db:seed` in `backend/` |
| PostgreSQL not running | Run `brew services start postgresql@14` |
