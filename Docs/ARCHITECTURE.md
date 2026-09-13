# Architecture

## Data flow
Client (React 19/Vite, port 5173) → Axios/SSE with credentials → Express 5 API (port 5001) → better-sqlite3 (WAL).

## Authentication and sessions

Email/password and Google OAuth authenticate into opaque sessions. Only a
cryptographically random session token is sent to the browser, in an HttpOnly
SameSite=Lax cookie. SQLite stores its SHA-256 hash, expiry, last-use time, and
revocation time. The auth middleware checks the database on every protected
request, so logout and password changes invalidate sessions immediately.

Google authorization uses a signed, short-lived state cookie and PKCE. Google
ID tokens are validated for issuer, audience, subject, and verified email. A
Google email that matches an existing local account is not silently linked;
the user must first sign in and use the explicit Profile linking flow.

Password reset tokens are random, single-use, hashed in SQLite, and only
created when `PASSWORD_RESET_WEBHOOK_URL` is configured. The public request
response is intentionally identical for existing and unknown email addresses.

All financial math lives in `server/services/analyticsService.js` — the REST
controller, AI tools, and seed verification all call the same functions, so
numbers can never disagree between surfaces.

Dates are stored as `YYYY-MM-DD` strings and bucketed by string slicing (never
`new Date("YYYY-MM-DD")`, which parses as UTC and shifts months on non-UTC
timezones). The client formats dates with local calendar parts.

## AI agent
`server/services/ai/agent.js` runs a bounded tool-calling loop on LangChain +
`@langchain/groq`:

1. System prompt pins today's date, categories, and rules (never invent numbers).
2. Chat history: last 12 messages from `chat_messages` (SQLite) are replayed for memory.
3. `bindTools` exposes 7 validated tools (`server/services/ai/tools.js`), each
   closed over the authenticated `userId` — cross-user access is impossible.
4. Max 5 iterations; the final iteration strips tools to force a text answer.
5. Final answer streams token-by-token to the client over SSE; tool runs emit
   `{type:"tool"}` events rendered as chips in the UI.

If `GROQ_API_KEY` is missing or Groq fails repeatedly, `fallback.js` answers
with deterministic regex parsing (add expense/income, period summaries).

## Telemetry
- `request_log`: one row per API request (middleware, fire-and-forget).
- `ai_events`: one row per LLM/tool run — tokens, latency, success, errors.
- `/admin` (email allow-list via `ADMIN_EMAILS`) renders traffic + AI usage
  charts, tool health, and recent errors from these tables.
