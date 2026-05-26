# 🎵 Obsidian Audio — Full Stack Music Streaming Platform

> Spotify + YouTube Music inspired, audio-only streaming platform with Chrome Extension

## 🏗️ Architecture

```
obsidian-audio/
├── frontend/          # React + Vite + TailwindCSS (Web App)
├── backend/           # Node.js + Express + PostgreSQL + Redis
└── extension/         # Chrome Extension MV3
```

## ⚡ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, Zustand, Framer Motion |
| Backend   | Node.js, Express, PostgreSQL, Redis, JWT |
| Auth      | Firebase Auth (frontend) + JWT (API) |
| Streaming | ytdl-core (audio-only proxy)        |
| Extension | Chrome MV3, Offscreen API           |

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run db:migrate     # Run PostgreSQL migrations
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env   # Add Firebase config
npm install
npm run dev
```

### 3. Chrome Extension
- Open `chrome://extensions`
- Enable Developer Mode
- Click "Load unpacked" → select `extension/` folder

## 🔐 Environment Variables

### Backend `.env`
```
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/obsidian
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=./config/firebase-service-account.json
CORS_ORIGIN=http://localhost:5173
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

## 📡 API Endpoints

| Method | Route                    | Description           |
|--------|--------------------------|-----------------------|
| POST   | /auth/verify-token       | Verify Firebase token |
| GET    | /auth/me                 | Get current user      |
| GET    | /music/search?q=         | Search tracks         |
| GET    | /music/stream?id=        | Stream audio          |
| GET    | /music/info?id=          | Track metadata        |
| GET    | /playlist                | Get user playlists    |
| POST   | /playlist                | Create playlist       |
| POST   | /playlist/:id/tracks     | Add track             |
| DELETE | /playlist/:id/tracks/:tid| Remove track          |
| GET    | /history                 | Get play history      |
| POST   | /history                 | Add to history        |
| GET    | /history/search          | Get search history    |
| GET    | /library/liked           | Get liked tracks      |
| POST   | /library/liked/:id       | Like/unlike track     |
