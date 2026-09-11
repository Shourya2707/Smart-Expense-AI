import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastCtx = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={15} style={{ color: "var(--fin-green)", flexShrink: 0 }} />,
  error:   <AlertCircle  size={15} style={{ color: "var(--fin-red)",   flexShrink: 0 }} />,
  warning: <AlertTriangle size={15} style={{ color: "var(--fin-amber)", flexShrink: 0 }} />,
  info:    <Info          size={15} style={{ color: "#2563eb",          flexShrink: 0 }} />,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type = "success", duration = 3600) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((p) => [...p, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const toast = useMemo(() => ({
    success: (m, d) => add(m, "success", d),
    error:   (m, d) => add(m, "error",   d),
    warning: (m, d) => add(m, "warning", d),
    info:    (m, d) => add(m, "info",    d),
  }), [add]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          width: "320px",
          maxWidth: "calc(100vw - 32px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="status">
            {ICONS[t.type]}
            <span style={{ flex: 1, fontSize: "12.5px", lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="btn-icon"
              style={{ pointerEvents: "auto", flexShrink: 0 }}
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
};
