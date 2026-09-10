import { Link } from "react-router-dom";
import { User, Menu, Sparkles, Shield, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ onToggleMobileSidebar }) => {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className="app-navbar h-14 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30"
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="app-icon-button p-2 rounded-xl active-press md:hidden cursor-pointer"
          title="Open Navigation"
          aria-label="Open Navigation"
        >
          <Menu size={20} />
        </button>

        {/* Brand tag — mobile only */}
        <div className="md:hidden flex items-center gap-2">
          <div className="brand-mark w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Sparkles size={14} />
          </div>
          <span className="app-brand-name font-bold text-sm">
            SmartExpense
          </span>
        </div>

        {/* Status pill — desktop */}
        <div className="app-protected-pill hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Shield size={11} className="opacity-70" />
          <span>Bank-Grade Protected</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification button */}
        <button
          className="app-icon-button relative p-2 rounded-xl active-press cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"
          />
        </button>

        {/* Profile pill */}
        <Link
          to="/profile"
          className="app-profile-link flex items-center gap-2.5 pl-2 sm:pl-3 py-1.5 pr-2 rounded-2xl transition-all active-press group"
          title="View profile"
        >
          <div className="text-right hidden sm:block">
            <p className="app-profile-name text-[12.5px] font-semibold leading-tight">
              {user?.fullName || "User Account"}
            </p>
            <p className="app-profile-email text-[11px] leading-tight">
              {user?.email || "smart@expense.ai"}
            </p>
          </div>

          {/* Avatar */}
          <div className="app-avatar w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
            {user?.fullName ? getInitials(user.fullName) : <User size={15} />}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
