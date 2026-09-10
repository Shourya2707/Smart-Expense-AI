import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Code-split route components for optimal initial bundle performance
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Income = lazy(() => import("./pages/Income"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ReceiptScanner = lazy(() => import("./pages/ReceiptScanner"));
const Profile = lazy(() => import("./pages/Profile"));

const PageLoader = () => (
  <div className="page-loader min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-2.5">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#aeaeb2" }}>Loading...</span>
    </div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Dashboard Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/income" element={<Income />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/receipt-scanner" element={<ReceiptScanner />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
