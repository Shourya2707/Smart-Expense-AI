import { useState, useEffect, useRef } from "react";
import { X, Wallet } from "lucide-react";
import { formatInputDate } from "../utils/formatters";

const SOURCES = ["Salary", "Freelancing", "Business", "Investments", "Gift", "Other"];

const IncomeModal = ({ isOpen, onClose, onSave, incomeToEdit }) => {
  const [formData, setFormData] = useState({
    amount: "",
    source: "Salary",
    date: formatInputDate(),
  });
  const [error, setError] = useState("");
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (incomeToEdit) {
        setFormData({
          amount: incomeToEdit.amount,
          source: incomeToEdit.source,
          date: formatInputDate(incomeToEdit.date),
        });
      } else {
        setFormData({ amount: "", source: "Salary", date: formatInputDate() });
      }
      setError("");
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [incomeToEdit, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.source || !formData.date) {
      setError("Please fill out all required fields.");
      return;
    }
    const parsed = parseFloat(formData.amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }
    onSave({ ...formData, amount: parsed });
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="income-modal-title"
    >
      <div
        className="modal-surface w-full max-w-md rounded-2xl p-6 sm:p-7 animate-modal relative"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-5 mb-5"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#f0fdf4", color: "#059669" }}
            >
              <Wallet size={18} />
            </div>
            <div>
              <h2
                id="income-modal-title"
                className="text-[16px] font-bold"
                style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
              >
                {incomeToEdit ? "Edit Income" : "Record Income"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6e6e73" }}>
                Log cash inflow and earnings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl active-press cursor-pointer"
            style={{ color: "#aeaeb2" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-xl text-sm font-medium"
              style={{ background: "#fef2f2", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
            >
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#aeaeb2" }}>
              Amount (₹) <span style={{ color: "#059669" }}>*</span>
            </label>
            <input
              ref={firstInputRef}
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full glass-input px-4 py-3 rounded-xl text-base font-semibold font-mono"
              style={{ color: "#1d1d1f" }}
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#aeaeb2" }}>
              Income Source <span style={{ color: "#059669" }}>*</span>
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm cursor-pointer"
              style={{ color: "#1d1d1f" }}
            >
              {SOURCES.map((src) => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#aeaeb2" }}>
              Date Received <span style={{ color: "#059669" }}>*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm"
              style={{ color: "#1d1d1f" }}
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel flex-1 py-3 px-4 font-semibold text-sm rounded-xl active-press cursor-pointer"
              style={{ background: "#f5f5f7", color: "#6e6e73", border: "1px solid rgba(0,0,0,0.08)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#ebebeb")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f5f5f7")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-income flex-1 py-3 px-4 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-500/20 active-press cursor-pointer"
              style={{ background: "#059669" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#047857")}
              onMouseLeave={e => (e.currentTarget.style.background = "#059669")}
            >
              {incomeToEdit ? "Update Income" : "Save Income"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeModal;
