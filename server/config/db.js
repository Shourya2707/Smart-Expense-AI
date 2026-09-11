const path = require("path");
const fs = require("fs");
const { env } = require("./env");

fs.mkdirSync(env.dataDir, { recursive: true });

const Database = require("better-sqlite3");
const db = new Database(path.join(env.dataDir, "smartexpense.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount > 0),
    source TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL DEFAULT 'default',
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ai_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    feature TEXT NOT NULL,
    model TEXT NOT NULL,
    tool_name TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER NOT NULL,
    success INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses(user_id, date DESC);
  CREATE INDEX IF NOT EXISTS income_user_date ON income(user_id, date DESC);
  CREATE INDEX IF NOT EXISTS chat_user_session ON chat_messages(user_id, session_id, id);
  CREATE INDEX IF NOT EXISTS ai_events_created ON ai_events(created_at DESC);
  CREATE INDEX IF NOT EXISTS request_log_created ON request_log(created_at DESC);
`;

const connectDB = async () => {
  db.exec(SCHEMA);
  console.log(`SQLite ready: ${path.join(env.dataDir, "smartexpense.sqlite")}`);
};

// Row → API object mappers. `user` keeps the hash (auth needs it); `safeUser` is for req.user/responses.
const user = (row) => row && { _id: row.id, id: row.id, fullName: row.full_name, email: row.email, password: row.password, createdAt: row.created_at };
const safeUser = (row) => row && { _id: row.id, id: row.id, fullName: row.full_name, email: row.email, createdAt: row.created_at };
const expense = (row) => row && { _id: row.id, id: row.id, userId: row.user_id, amount: row.amount, category: row.category, description: row.description, date: row.date, createdAt: row.created_at };
const income = (row) => row && { _id: row.id, id: row.id, userId: row.user_id, amount: row.amount, source: row.source, date: row.date, createdAt: row.created_at };
const chatMessage = (row) => row && { _id: row.id, id: row.id, role: row.role, content: row.content, createdAt: row.created_at };

module.exports = { db, connectDB, user, safeUser, expense, income, chatMessage };
