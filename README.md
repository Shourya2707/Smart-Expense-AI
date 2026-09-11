# 🧠 SmartExpense AI

> **Track Smarter. Spend Wiser.**

An AI-powered expense tracking and personal finance web application built with React, Vite, Node.js, Express, MongoDB, and Google Gemini AI.

---

## 🌟 Key Features

- **🔐 Secure Authentication**: JWT token authentication with bcrypt password hashing and user isolation.
- **📊 Real-Time Dashboard**: Connected directly to real database analytics — balance, income, expenses, and net savings.
- **🧾 Smart Receipt Scanner**: Upload paper or digital receipts; Gemini Vision extracts merchant, total amount, date, and category automatically for user confirmation before saving.
- **🤖 Gemini AI Insights**: Personalized spending trends, savings opportunities, and category concentration alerts generated directly from user financial data.
- **💸 Complete Expense & Income Management**: Full CRUD operations with categories, search filtering, and confirmation modals.
- **📈 Interactive Analytics**: Monthly Income vs. Expense bar charts and expense breakdown pie charts powered by Recharts.
- **👤 Profile Security**: Profile management with name update and mandatory current password verification before password changes.
- **🎨 Modern Fintech UI**: Dark glassmorphism interface built with Tailwind CSS v4, smooth animations, and responsive layout across desktop, tablet, and mobile.

---

## 📁 Project Architecture

```
SmartExpense-AI/
├── client/                     # React Frontend (Vite + Tailwind CSS)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Sidebar, Modals, SummaryCard)
│   │   ├── layouts/            # DashboardLayout wrapper
│   │   ├── pages/              # Home, Login, Signup, Dashboard, Expenses, Income, Analytics, ReceiptScanner, Profile
│   │   ├── services/           # Axios instance with auto-JWT request interceptor
│   │   ├── App.jsx             # React Router route registry
│   │   ├── main.jsx            # DOM entry point
│   │   └── index.css           # Custom theme tokens & Tailwind imports
│   ├── vite.config.js          # Vite config & API proxy
│   ├── .env.example            # Environment variables example
│   └── package.json
│
├── server/                     # Node.js + Express REST API Backend
│   ├── config/                 # MongoDB database connection setup
│   ├── controllers/            # Auth, Expense, Income, Analytics, and AI/Receipt logic
│   ├── middleware/              # JWT auth guard (`protect`) & Error handling
│   ├── models/                 # Mongoose schemas (User, Expense, Income)
│   ├── routes/                 # Express API routes
│   ├── app.js                  # Express setup, middleware, routes, CORS
│   ├── server.js               # HTTP server entry point
│   ├── .env.example            # Environment variables example
│   └── package.json
│
└── README.md
```

---

## ⚙️ Environment Variables Setup

Create `.env` files in both `server/` and `client/` directories based on the example templates:

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/smartexpense-ai
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Optional AI & Cloud Features
GEMINI_API_KEY=your_google_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=SmartExpense AI
```

---

## 🚀 Local Development Setup

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
Backend API will start at **http://localhost:5000**

### 2. Frontend Client
```bash
cd client
npm install
npm run dev
```
Frontend Web App will open at **http://localhost:5173**

---

## 📡 API Endpoints Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | Health Check |
| POST | `/api/auth/register` | Public | User Registration |
| POST | `/api/auth/login` | Public | User Login |
| GET | `/api/auth/me` | Private | Get Profile Details |
| PUT | `/api/auth/profile` | Private | Update Profile / Change Password |
| GET | `/api/expenses` | Private | Fetch User Expenses |
| POST | `/api/expenses` | Private | Create Expense |
| PUT | `/api/expenses/:id` | Private | Update Expense |
| DELETE | `/api/expenses/:id` | Private | Delete Expense |
| GET | `/api/income` | Private | Fetch User Income |
| POST | `/api/income` | Private | Create Income |
| PUT | `/api/income/:id` | Private | Update Income |
| DELETE | `/api/income/:id` | Private | Delete Income |
| GET | `/api/analytics` | Private | Get Aggregated Financial Data |
| GET | `/api/ai/gemini-insights` | Private | Get AI Financial Insights |
| POST | `/api/ai/scan-receipt` | Private | Extract Receipt Info via Vision AI |

---

## 🌐 Deployment Instructions

- **Frontend (Vercel)**: Build command `npm run build`, output directory `dist`. Set `VITE_API_BASE_URL` to your production backend URL.
- **Backend (Render)**: Build command `npm install`, start command `npm start`. Configure `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `CLIENT_URL` in environment variables.

---

## 📄 License
ISC
# Railway deployment

The included `Dockerfile` builds the Vite client and serves it from the Express server. Set `GROQ_API_KEY` and `JWT_SECRET` in Railway variables. SQLite is stored at `DATA_DIR` (default: `server/data`); attach a Railway Volume at `/app/server/data` if demo data must survive redeploys.
