import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => cancelRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-title"
    >
      <div className="modal-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: "var(--fin-red-bg)", color: "var(--fin-red)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--fin-red-border)",
          }}>
            <AlertTriangle size={17} />
          </div>
          <div>
            <h2 id="del-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2, marginBottom: 4 }}>
              {title || "Confirm deletion"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
              {message || "This action cannot be undone."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button ref={cancelRef} className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ background: "var(--fin-red)", color: "white", border: "none" }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
