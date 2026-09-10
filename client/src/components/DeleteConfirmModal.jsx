import { useEffect } from "react";
import { Trash2 } from "lucide-react";

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Record",
  message = "Are you sure you want to permanently delete this item? This action cannot be undone.",
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-surface w-full max-w-sm rounded-2xl p-6 animate-modal text-center"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(220,38,38,0.15)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Danger icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#fef2f2", color: "#dc2626" }}
        >
          <Trash2 size={22} />
        </div>

        <h3
          className="text-[17px] font-bold mb-2"
          style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#6e6e73" }}>
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="modal-cancel flex-1 py-3 px-4 font-semibold text-sm rounded-xl active-press cursor-pointer"
            style={{ background: "#f5f5f7", color: "#6e6e73", border: "1px solid rgba(0,0,0,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#ebebeb")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f5f5f7")}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="modal-danger flex-1 py-3 px-4 text-white font-semibold text-sm rounded-xl shadow-sm shadow-rose-500/20 active-press cursor-pointer"
            style={{ background: "#dc2626" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#b91c1c")}
            onMouseLeave={e => (e.currentTarget.style.background = "#dc2626")}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
