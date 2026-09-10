import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, duration) => addToast(msg, "success", duration),
    error: (msg, duration) => addToast(msg, "error", duration),
    warning: (msg, duration) => addToast(msg, "warning", duration),
    info: (msg, duration) => addToast(msg, "info", duration),
  }), [addToast]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
      case "error":
        return <AlertCircle size={18} className="text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
      default:
        return <Info size={18} className="text-indigo-400 shrink-0" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-emerald-950/80 shadow-emerald-500/10";
      case "error":
        return "border-rose-500/30 bg-rose-950/80 shadow-rose-500/10";
      case "warning":
        return "border-amber-500/30 bg-amber-950/80 shadow-amber-500/10";
      default:
        return "border-indigo-500/30 bg-indigo-950/80 shadow-indigo-500/10";
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Viewport Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-sm font-medium text-white transition-all duration-300 animate-slide-up ${getBadgeStyle(
              t.type
            )}`}
          >
            <div className="flex items-center gap-3">
              {getIcon(t.type)}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
