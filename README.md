# 🛡️ DrowsyGuard — AI-Powered Drowsiness Detection System

> **Real-time driver drowsiness detection** using computer vision (MediaPipe Face Mesh), a FastAPI AI microservice, Node.js/Express backend, and a React dashboard with live analytics.

---

## 📸 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                       │
│  ┌──────────────┐   WebSocket frames  ┌──────────────┐  │
│  │  Webcam Feed │ ─────────────────── │  AI Service  │  │
│  │  Live Charts │ ◄── EAR/MAR/Score── │  (FastAPI)   │  │
│  │  Alert Panel │                     └──────────────┘  │
│  └──────┬───────┘                                        │
│         │  REST API (sessions, alerts, analytics)        │
│  ┌──────▼───────┐                                        │
│  │  Node/Express│                                        │
│  │   Backend    │ ──── MongoDB Atlas ────────────────── │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

## 🧠 How Detection Works

| Metric | Formula | Threshold | Meaning |
|--------|---------|-----------|---------|
| **EAR** | `(v1+v2) / (2 × h)` | `< 0.22` for 15+ frames | Eyes closing |
| **MAR** | `(v1+v2+v3) / (3 × h)` | `> 0.65` for 10+ frames | Yawning |
| **Head Tilt** | Pitch/Yaw via `solvePnP` | Pitch >15°, Yaw >25° | Nodding off |
| **Blink Rate** | Blinks per minute (60s window) | Outside 10–20 bpm | Abnormal blinking |
| **Drowsiness Score** | Weighted composite (0–100) | ≥55 = drowsy | Overall fatigue |

**Alert Levels:**
- 🟢 **None** — Score < 30
- 🟡 **Low** — Score 30–54
- 🟠 **Medium** — Score 55–74
- 🔴 **High** — Score ≥ 75 → urgent alarm + browser notification

---

## 📁 Project Structure

```
New folder/
├── ai-service/          # Python FastAPI + MediaPipe
│   ├── main.py          # WebSocket server & REST API
│   ├── detector.py      # EAR/MAR/Head-pose engine
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── server/              # Node.js + Express + MongoDB
│   ├── index.js
│   ├── models/
│   │   ├── User.js      # Adaptive thresholds, driver score
│   │   ├── Session.js   # Per-drive metrics & EAR time-series
│   │   └── Alert.js     # Alert events with 90-day TTL
│   ├── routes/
│   │   ├── auth.js      # Register / Login / Me
│   │   ├── sessions.js  # Start / End / List sessions
│   │   ├── alerts.js    # Log / Filter / Acknowledge alerts
│   │   ├── analytics.js # Overview / Trends / Driver score
│   │   └── users.js     # Profile / Thresholds / Password
│   ├── middleware/
│   │   └── auth.js      # JWT middleware
│   ├── package.json
│   ├── Dockerfile
│   └── .env
│
├── client/              # React 18 + Tailwind CSS + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx   # Public landing page
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx # Overview + charts
│   │   │   ├── Monitor.jsx   # Live webcam + metrics
│   │   │   ├── Sessions.jsx  # Session history
│   │   │   ├── Analytics.jsx # Trend charts
│   │   │   └── Profile.jsx   # Settings & thresholds
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar navigation
│   │   │   └── ui.jsx        # Gauges, rings, badges
│   │   ├── hooks/
│   │   │   ├── useDrowsinessDetector.js  # WS + webcam
│   │   │   ├── useAlertSound.js          # Web Audio API
│   │   │   └── useSessionTimer.js        # HH:MM:SS timer
│   │   ├── context/AuthContext.jsx
│   │   └── utils/api.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env
│
└── docker-compose.yml
```

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)
- pip / virtualenv

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd drowsyguard
```

### 2. AI Service (Python)

```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

AI service will be available at `http://localhost:8001`  
WebSocket endpoint: `ws://localhost:8001/ws/{sessionId}`

### 3. Backend (Node.js)

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET
npm run dev
```

Server runs at `http://localhost:5000`

### 4. Frontend (React)

```bash
cd client
npm install
# .env is already configured for local dev
npm run dev
```

App available at `http://localhost:5173`

---

## 🐳 Docker Compose (All-in-One)

```bash
# From project root
cp server/.env.example server/.env
# Edit server/.env with your JWT_SECRET

docker compose up --build
```

| Service | URL |
|---------|-----|
| React App | http://localhost:5173 |
| Node API | http://localhost:5000 |
| AI Service | http://localhost:8001 |
| MongoDB | mongodb://localhost:27017 |

---

## ☁️ Deployment

### Frontend → Vercel

```bash
cd client
vercel --prod
# Set env vars in Vercel dashboard:
# VITE_API_URL=https://your-backend.onrender.com/api
# VITE_AI_WS_URL=wss://your-ai-service.onrender.com/ws
```

### Backend → Render

1. Create a **Web Service** → connect your repo → root: `server/`
2. Build: `npm install` · Start: `node index.js`
3. Set environment variables:
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — random 32+ char secret
   - `CLIENT_URL` — your Vercel frontend URL
   - `NODE_ENV=production`

### AI Service → Render

1. Create a **Web Service** → root: `ai-service/`
2. Environment: Python 3.11
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

> **Note:** Render free tier sleeps after 15 min inactivity. Use a paid instance or keep-alive pinging for production.

---

## 🔌 API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in (returns JWT) |
| GET  | `/api/auth/me` | Current user |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/sessions/start` | Start a new session |
| PATCH  | `/api/sessions/:id/end` | End session with metrics |
| GET    | `/api/sessions` | List user sessions |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/overview` | All-time stats |
| GET | `/api/analytics/alerts-trend?days=7` | Daily alert breakdown |
| GET | `/api/analytics/ear-history` | Last 5 session EAR data |
| GET | `/api/analytics/driver-score` | Score over time |

### AI WebSocket
```
ws://localhost:8001/ws/{sessionId}

→ Send: { "frame": "<base64-jpeg>" }
← Receive: {
    "session_id": "...",
    "face_detected": true,
    "ear": 0.285,
    "mar": 0.42,
    "pitch": -3.2,
    "yaw": 1.1,
    "roll": 0.5,
    "blink_count": 12,
    "yawn_count": 1,
    "blink_rate": 14.3,
    "drowsiness_score": 22.0,
    "alert_level": "none",
    "is_drowsy": false,
    "is_yawning": false,
    "eyes_closed": false,
    "head_tilted": false,
    "fps": 15.2,
    "frame_count": 230
  }
```

---

## ⚙️ Adaptive Thresholds

Each user can calibrate their own EAR and MAR thresholds in **Profile → Detection Thresholds**:

- **EAR** range: `0.10` (small eyes) → `0.40` (large eyes), default `0.22`
- **MAR** range: `0.40` (less sensitive) → `0.90` (very sensitive), default `0.65`

The AI service uses the default; adapt by sending calibrated values from the frontend (future: pass threshold via WebSocket handshake).

---

## 🔮 Future Extensions

- [ ] CNN / LSTM model for higher accuracy
- [ ] Mobile PWA with offline support
- [ ] IoT CAN bus integration (vehicle speed + lane drift)
- [ ] Wearable HR sensor fusion
- [ ] Fleet management multi-driver dashboard
- [ ] Twilio SMS alerts to emergency contact

---

## 📄 License

MIT © DrowsyGuard — AI Driver Safety System
