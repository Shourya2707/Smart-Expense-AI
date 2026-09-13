# 🧠 SmartExpense AI

> **Track Smarter. Spend Wiser.**

An AI-powered expense tracking and personal finance app with a LangChain agent that actually *acts* on your ledger — add transactions and query your spending in plain English, by text or voice. Built with React 19 + Vite, Express 5, SQLite, and Groq (free tier).

---

## ✨ Features

- **🤖 Agentic AI Assistant** — a LangChain tool-calling agent (Groq, `llama-3.1-8b-instant`) with 7 tools: `add_expense`, `add_income`, `get_summary`, `category_breakdown`, `monthly_trend`, `search_transactions`, `list_recent_transactions`. Type or *speak* `"spent 250 on groceries yesterday"` and it writes to your ledger for real. Tool runs show up as live chips in the chat; dashboards refresh instantly.
- **🎙️ Voice, zero cost** — browser Web Speech API for dictation and spoken replies. No paid STT/TTS APIs.
- **🧾 Receipt Scanner** — Groq vision model (`llama-4-scout`) extracts merchant, amount, date, and category from receipt photos for confirmation before saving.
- **📊 Verified Analytics** — totals, category breakdown, monthly inflow/outflow, and net trajectory computed with timezone-safe date handling, with an independent verification script (`npm run verify`).
- **📈 Observability for admins** — per-day request traffic, p95 latency, AI token usage, per-tool success rates, and recent errors at `/admin` (users listed in `ADMIN_EMAILS`).
- **🔐 Auth** — bcrypt passwords plus revocable, hashed server sessions in HttpOnly cookies; Google OAuth uses state, PKCE, and verified ID tokens.
- **💾 Zero-infra persistence** — SQLite (WAL mode) at `DATA_DIR`; mount a volume in production and you're done.
- **🎞️ Fluid UI** — spring-physics chat panel (framer-motion), staggered messages, tool-trace chips, typing dots, pulsing mic — consistent with the existing slate/glassmorphism design system.

---

## 📁 Project Structure

```
SmartExpense-AI/
├── client/                      # React 19 + Vite + Tailwind 4
│   └── src/
│       ├── components/          # AssistantPanel/FAB (chat), modals, sidebar…
│       ├── hooks/useSpeech.js   # Web Speech API (STT + TTS)
│       ├── pages/               # Dashboard, Expenses, Income, Analytics,
│       │                        # ReceiptScanner, Profile, AdminDashboard
│       ├── services/api.js      # Axios instance + SSE chat streaming
│       └── utils/               # formatters (timezone-safe), data event bus
├── server/                      # Express 5 + better-sqlite3 (CommonJS)
│   ├── config/                  # env.js (validated env), db.js (schema + mappers)
│   ├── models/                  # User, Expense, Income, ChatMessage, AiEvent, RequestLog
│   ├── services/
│   │   ├── ai/                  # agent.js (LangChain loop), tools.js, fallback.js, insights.js
│   │   └── analyticsService.js  # all financial math (single source of truth)
│   ├── controllers/ routes/ middleware/
│   ├── scripts/                 # seed.js, verify-analytics.js
│   └── data/                    # smartexpense.sqlite (gitignored)
├── Dockerfile                   # Render/any-container deploy
└── README.md
```

## ⚙️ Environment Variables

Copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env`, then fill in:

| Variable (server) | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | ✅ in production | Session-cookie signing and OAuth state protection |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth only | Google OAuth application credentials |
| `GOOGLE_CALLBACK_URL` | OAuth only | Exact registered Google callback URL |
| `GROQ_API_KEY` | for AI | Free key from [console.groq.com](https://console.groq.com/keys). Without it the assistant runs in deterministic offline mode |
| `GROQ_TEXT_MODEL` / `GROQ_VISION_MODEL` | — | Model overrides (defaults: `llama-3.1-8b-instant`, `llama-4-scout`) |
| `ADMIN_EMAILS` | — | Comma-separated emails that can access `/admin` |
| `CLIENT_URL` | prod | Allowed CORS origin(s), comma-separated |
| `DATA_DIR` | prod | SQLite location (mount a volume here) |

## 🚀 Local Development

```bash
# 1. Backend
cd server && npm install && npm run dev        # → http://localhost:5001

# 2. Frontend (new terminal)
cd client && npm install && npm run dev        # → http://localhost:5173 (proxies /api)

# 3. Demo data + verification
cd server
npm run seed      # demo@smartexpense.app / Demo@12345 (~3 months of transactions)
npm run verify    # independently re-checks every analytics metric ✅
```

## 📡 API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` · `/api/auth/logout` | Public | Cookie-backed session auth |
| GET | `/api/auth/me` · PUT `/api/auth/profile` | Private | Profile |
| GET | `/api/auth/google` · `/api/auth/google/callback` | Public | Google OAuth authorization-code + PKCE |
| GET | `/api/auth/google/link` | Private | Link verified Google email to the signed-in account |
| POST | `/api/auth/forgot-password` · `/api/auth/reset-password` | Public | Provider-backed password reset |
| GET/POST | `/api/expenses` | Private | List / create |
| PUT/DELETE | `/api/expenses/:id` | Private | Update / delete |
| GET/POST | `/api/income` | Private | List / create |
| PUT/DELETE | `/api/income/:id` | Private | Update / delete |
| GET | `/api/analytics` | Private | All computed metrics |
| POST | `/api/ai/chat` | Private | SSE agent stream (tokens + tool events) |
| GET/POST | `/api/ai/chat/history` · `/chat/reset` | Private | Conversation memory |
| GET | `/api/ai/insights` | Private | Local + Groq-enhanced insights |
| POST | `/api/ai/scan-receipt` | Private | Vision extraction (multipart `receipt`) |
| GET | `/api/admin/overview` · `/series` · `/tools` · `/errors` | Admin | Observability |

## 🌐 Deployment (Render)

The included `Dockerfile` builds the client and serves it from Express in one process — a single free-tier service, no managed DB needed.

1. Deploy the repo as a web service with the Dockerfile; set `NODE_ENV=production`, a strong `SESSION_SECRET`, `CLIENT_URL=https://<your-render-domain>`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://<your-render-domain>/api/auth/google/callback`, `GROQ_API_KEY`, and `ADMIN_EMAILS`.
2. Attach a Render persistent disk mounted at `/app/server/data` so SQLite survives restarts and redeploys.
3. Register the exact callback URL in Google Cloud Console. Password reset delivery remains disabled until `PASSWORD_RESET_WEBHOOK_URL` points at a trusted email provider.

### How the AI stays free
- **LLM**: Groq free tier (rate-limited but generous; the agent caps tool loops at 5 and truncates context to the last 12 messages to conserve tokens).
- **STT/TTS**: browser Web Speech API — nothing leaves your budget.
- **Fallback**: no key or API failure → a deterministic responder still logs "spent X on Y" commands and answers summary questions, so the app degrades, never dies.

## 📄 License
ISC
