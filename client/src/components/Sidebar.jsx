import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Receipt, Wallet, LineChart, ScanLine, User, LogOut, X, Zap, Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const NAV = [
  { path: "/dashboard",       label: "Dashboard",        Icon: LayoutDashboard },
  { path: "/expenses",        label: "Expenses",         Icon: Receipt },
  { path: "/income",          label: "Income",           Icon: Wallet },
  { path: "/analytics",       label: "Analytics",        Icon: LineChart },
  { path: "/receipt-scanner", label: "Receipt Scanner",  Icon: ScanLine },
  { path: "/profile",         label: "Profile",          Icon: User },
];

const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.info("Signed out.");
    navigate("/login");
  };

  const Content = () => (
    <aside style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "20px 12px",
      gap: 0,
      background: "var(--surface)",
      overflowY: "auto",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "0 4px" }}>
        <NavLink to="/dashboard" onClick={onCloseMobile} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--brand)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "var(--shadow-sm)",
          }}>
            <Zap size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>SmartExpense</div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1 }}>AI Workspace</div>
          </div>
        </NavLink>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="btn-icon" style={{ display: "flex", marginLeft: 8 }} aria-label="Close">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav label */}
      <div className="section-label" style={{ padding: "0 6px", marginBottom: 6 }}>Navigation</div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }} aria-label="Main navigation">
        {NAV.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onCloseMobile}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={16} style={{ flexShrink: 0, opacity: 0.85 }} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.isAdmin && (
          <NavLink
            to="/admin"
            onClick={onCloseMobile}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Shield size={16} style={{ flexShrink: 0, opacity: 0.85 }} />
            <span>Observability</span>
          </NavLink>
        )}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sign out */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button
          onClick={handleLogout}
          className="nav-link"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--ink-2)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--fin-red)";
            e.currentTarget.style.background = "var(--fin-red-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--ink-2)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div style={{
        width: 220,
        flexShrink: 0,
        height: "100%",
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        display: "none",
      }} className="sidebar-desktop">
        <Content />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex",
        }}>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.28)", backdropFilter: "blur(3px)" }}
            onClick={onCloseMobile}
            aria-hidden
          />
          <div style={{
            position: "relative", width: 240, maxWidth: "80vw",
            height: "100%", zIndex: 10,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            boxShadow: "4px 0 24px rgba(15,23,42,0.10)",
          }}
            className="animate-slide-right"
          >
            <Content />
          </div>
        </div>
      )}

      {/* Force desktop show via style tag */}
      <style>{`
        @media (min-width: 768px) { .sidebar-desktop { display: block !important; } }
      `}</style>
    </>
  );
};

export default Sidebar;
