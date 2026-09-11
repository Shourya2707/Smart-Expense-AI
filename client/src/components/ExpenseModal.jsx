import { useState, useEffect, useRef } from "react";
import { X, Receipt } from "lucide-react";
import { formatInputDate } from "../utils/formatters";

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Others"];

const FIELD = ({ label, required, children }) => (
  <div>
    <label className="label">{label}{required && <span style={{ color: "var(--fin-red)", marginLeft: 2 }}>*</span>}</label>
    {children}
  </div>
);

const ExpenseModal = ({ isOpen, onClose, onSave, expenseToEdit }) => {
  const [form, setForm] = useState({ amount: "", category: "Food", description: "", date: formatInputDate() });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(expenseToEdit
      ? { amount: expenseToEdit.amount, category: expenseToEdit.category, description: expenseToEdit.description, date: formatInputDate(expenseToEdit.date) }
      : { amount: "", category: "Food", description: "", date: formatInputDate() });
    setError("");
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [isOpen, expenseToEdit]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape" && isOpen) onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(form.amount);
    if (!form.amount || isNaN(parsed) || parsed <= 0) { setError("Enter an amount greater than 0."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: parsed, description: form.description.trim() });
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Could not save this expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-labelledby="exp-modal-title">
      <div className="modal-panel" style={{ padding: "24px 26px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-subtle)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
              <Receipt size={15} />
            </div>
            <div>
              <h2 id="exp-modal-title" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>
                {expenseToEdit ? "Edit Expense" : "Add Expense"}
              </h2>
              <p style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>Log an outflow transaction</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FIELD label="Amount (₹)" required>
            <input ref={firstRef} type="number" step="0.01" min="0.01" className="input" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} value={form.amount} onChange={set("amount")} placeholder="0.00" required />
          </FIELD>

          <FIELD label="Category" required>
            <select className="input" value={form.category} onChange={set("category")} style={{ cursor: "pointer" }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FIELD>

          <FIELD label="Description / Merchant" required>
            <input type="text" className="input" value={form.description} onChange={set("description")} placeholder="e.g. Blue Bottle Coffee" required />
          </FIELD>

          <FIELD label="Date" required>
            <input type="date" className="input" style={{ fontFamily: "'JetBrains Mono', monospace" }} value={form.date} onChange={set("date")} required />
          </FIELD>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? "Saving…" : expenseToEdit ? "Update" : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
