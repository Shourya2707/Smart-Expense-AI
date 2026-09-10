import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  LineChart,
  Scan,
  User,
  LogOut,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Expenses", path: "/expenses", icon: <Receipt size={18} /> },
    { name: "Income", path: "/income", icon: <Wallet size={18} /> },
    { name: "Analytics", path: "/analytics", icon: <LineChart size={18} /> },
    { name: "Receipt Scanner", path: "/receipt-scanner", icon: <Scan size={18} /> },
    { name: "Profile", path: "/profile", icon: <User size={18} /> },
  ];

  const sidebarContent = (
    <aside className="app-sidebar-inner h-full flex flex-col justify-between py-5 select-none">
      <div>
        {/* Brand Header */}
        <div className="app-brand-row flex items-center justify-between mb-7 px-4">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="app-brand flex items-center gap-2.5 group active-press"
          >
            <div className="brand-mark w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles size={17} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="app-brand-name text-[14px] font-extrabold tracking-tight">
                SmartExpense
              </span>
              <span className="app-brand-subtitle text-[10px] font-semibold tracking-wider uppercase mt-0.5">
                AI Financial OS
              </span>
            </div>
          </NavLink>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="app-icon-button md:hidden p-1.5 rounded-xl active-press cursor-pointer"
              title="Close menu"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Section Label */}
        <div className="px-4 mb-2">
          <span className="app-section-label text-[10px] font-bold uppercase tracking-widest">Navigation</span>
        </div>

        {/* Navigation Items */}
        <nav className="px-2 space-y-0.5" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `app-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-150 active-press ${
                  isActive
                    ? "is-active font-semibold"
                    : ""
                }`
              }
            >
              <span className="shrink-0 opacity-90">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="app-sidebar-footer px-2 pt-4">
        <button
          onClick={handleLogout}
          className="app-signout flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 active-press cursor-pointer"
        >
          <LogOut size={17} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="app-sidebar h-full hidden md:flex flex-col shrink-0 z-20"
        style={{
          background: "transparent",
          borderRight: "0",
        }}
      >
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="app-mobile-scrim fixed inset-0 transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div
            className="app-sidebar relative w-64 max-w-[82vw] h-full z-10 shadow-2xl animate-slide-up"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
