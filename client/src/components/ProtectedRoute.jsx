import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Shows a minimal spinner while the session loads, then guards the route. */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}>
        <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2.5, color: "var(--ink-3)" }} />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
