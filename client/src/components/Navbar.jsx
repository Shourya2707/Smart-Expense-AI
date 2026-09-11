import { Link } from "react-router-dom";
import { Menu, ShieldCheck, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const initials = (name) => {
  if (!name) return "U";
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
};

const Navbar = ({ onToggleMobile }) => {
  const { user } = useAuth();

  return (
    <header style={{
      height: 56,
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      padding: "0 20px",
      position: "sticky",
      top: 0,
      zIndex: 30,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onToggleMobile}
          className="btn-icon"
          aria-label="Open navigation"
          style={{ display: "none" }}
          id="nav-menu-btn"
        >
          <Menu size={18} />
        </button>

        {/* Status pill — desktop only */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink-3)",
        }} className="status-pill">
          <ShieldCheck size={12} style={{ color: "var(--fin-green)" }} />
          Encrypted workspace
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn-icon" aria-label="Notifications" style={{ position: "relative" }}>
          <Bell size={16} />
          <span style={{
            position: "absolute", top: 7, right: 7,
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--fin-red)", border: "1.5px solid white",
          }} />
        </button>

        <Link
          to="/profile"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "5px 10px 5px 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            textDecoration: "none",
            transition: "background 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--border-md)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div style={{ textAlign: "right" }} className="name-col">
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
              {user?.fullName || "Account"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
              {user?.email || ""}
            </div>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--brand)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(user?.fullName)}
          </div>
        </Link>
      </div>

      <style>{`
        @media (max-width: 767px) {
          #nav-menu-btn { display: flex !important; }
          .name-col { display: none; }
          .status-pill { display: none !important; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
