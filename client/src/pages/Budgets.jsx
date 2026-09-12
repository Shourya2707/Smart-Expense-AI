import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Plus,
  Target,
  Pencil,
  Trash2,
  X,
  TrendingDown,
  Gauge,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/formatters";
import { onDataChanged } from "../utils/dataEvents";

const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Others",
];

const STATUS_META = {
  ok:      { label: "On track",    badgeClass: "badge-green", color: "var(--fin-green)" },
  warning: { label: "Warning",     badgeClass: "badge-amber", color: "var(--fin-amber)" },
  over:    { label: "Over budget", badgeClass: "badge-red",   color: "var(--fin-red)" },
};

const statusMeta = (status) => STATUS_META[status] || STATUS_META.ok;

const FIELD = ({ label, required, children }) => (
  <div>
    <label className="label">
      {label}
      {required && <span style={{ color: "var(--fin-red)", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Budgets = () => {
  const toast = useToast();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set-budget modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [form, setForm] = useState({ category: "Food", monthlyLimit: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Two-step delete (click trash -> "Confirm?" for 3s -> delete)
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmTimerRef = useRef(null);

  const hasBudget = useCallback(
    (category) => budgets.some((b) => b.category === category),
    [budgets]
  );

  const fetchBudgets = useCallback(
    async (isSilent = false) => {
      if (isSilent) setRefreshing(true);
      else setLoading(true);

      try {
        const { data } = await API.get("/api/budgets");
        if (data.success && Array.isArray(data.data)) {
          setBudgets(data.data);
        }
      } catch {
        toast.error("Failed to load budgets.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // The AI assistant (and other surfaces) can mutate data — refresh silently.
  useEffect(() => onDataChanged(() => fetchBudgets(true)), [fetchBudgets]);

  // Clear any pending delete-confirmation timer on unmount
  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBudget(null);
    setFormError("");
  }, []);

  // Escape closes the modal (same pattern as ExpenseModal)
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape" && modalOpen) closeModal();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modalOpen, closeModal]);

  const openCreate = () => {
    const available = CATEGORIES.find((cat) => !hasBudget(cat));
    setEditingBudget(null);
    setForm({ category: available || CATEGORIES[0], monthlyLimit: "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (budget) => {
    setEditingBudget(budget);
    setForm({ category: budget.category, monthlyLimit: budget.monthlyLimit });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(form.monthlyLimit);
    if (!form.category) {
      setFormError("Choose a category.");
      return;
    }
    if (!form.monthlyLimit || isNaN(parsed) || parsed <= 0) {
      setFormError("Enter a monthly limit greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await API.post("/api/budgets", {
        category: form.category,
        monthlyLimit: parsed,
      });
      if (!data.success) throw new Error(data.message || "Budget could not be saved.");
      setModalOpen(false);
      setEditingBudget(null);
      await fetchBudgets(true);
      toast.success("Budget saved");
    } catch (saveError) {
      setFormError(
        saveError.response?.data?.message || saveError.message || "Could not save this budget."
      );
    } finally {
      setSaving(false);
    }
  };

  const startConfirmDelete = (category) => {
    clearTimeout(confirmTimerRef.current);
    setConfirmDelete(category);
    confirmTimerRef.current = setTimeout(() => setConfirmDelete(null), 3000);
  };

  const handleDelete = async (category) => {
    clearTimeout(confirmTimerRef.current);
    setConfirmDelete(null);
    setIsDeleting(true);
    try {
      const { data } = await API.delete(`/api/budgets/${encodeURIComponent(category)}`);
      if (data.success) {
        await fetchBudgets(true);
        toast.info("Budget removed");
      } else {
        toast.error("Failed to delete budget.");
      }
    } catch {
      toast.error("Failed to delete budget.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary metrics
  const totals = useMemo(() => {
    const totalBudgeted = budgets.reduce((sum, b) => sum + (Number(b.monthlyLimit) || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
    const pacePct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
    return { totalBudgeted, totalSpent, pacePct };
  }, [budgets]);

  const paceColor =
    totals.pacePct > 100
      ? "var(--fin-red)"
      : totals.pacePct >= 75
        ? "var(--fin-amber)"
        : "var(--fin-green)";

  const allBudgeted = budgets.length >= CATEGORIES.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header & Main Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
              Budgets &amp; Limits
            </h1>
            <button
              onClick={() => fetchBudgets(true)}
              className="btn-icon"
              title="Refresh budgets"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            </button>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
            Monthly spending guardrails per category
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn btn-primary"
          style={{ height: "38px" }}
          disabled={allBudgeted}
          title={allBudgeted ? "Every category already has a budget — edit one instead." : undefined}
        >
          <Plus size={15} />
          <span>Set Budget</span>
        </button>
      </div>

      {loading ? (
        /* Loading skeletons */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: "18px 20px", height: "128px" }}>
              <div className="skeleton" style={{ height: "14px", width: "45%", marginBottom: "14px" }} />
              <div className="skeleton" style={{ height: "20px", width: "70%", marginBottom: "16px" }} />
              <div className="skeleton" style={{ height: "8px", width: "100%" }} />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        /* Empty state */
        <div className="card">
          <div className="empty-state" style={{ padding: "50px 20px" }}>
            <Target size={32} style={{ marginBottom: "10px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
              No budgets yet
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-3)", marginBottom: "16px" }}>
              Set a monthly limit to track your pacing.
            </p>
            <button onClick={openCreate} className="btn btn-primary">
              <Plus size={14} /> Set Your First Budget
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="section-label">Total Budgeted</span>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: "var(--bg-subtle)", color: "var(--ink-2)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Target size={16} />
                </div>
              </div>
              <div className="metric-value">{formatCurrency(totals.totalBudgeted)}</div>
            </div>

            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="section-label">Spent This Month</span>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: "var(--fin-red-bg)", color: "var(--fin-red)",
                  border: "1px solid var(--fin-red-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <TrendingDown size={16} />
                </div>
              </div>
              <div className="metric-value">{formatCurrency(totals.totalSpent)}</div>
            </div>

            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="section-label">Overall Pace</span>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: "var(--bg-subtle)", color: "var(--ink-2)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Gauge size={16} />
                </div>
              </div>
              <div className="metric-value" style={{ color: paceColor }}>
                {totals.pacePct}%
                <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--ink-4)", marginLeft: 6 }}>
                  of budget used
                </span>
              </div>
            </div>
          </div>

          {/* Budget cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {budgets.map((budget) => {
              const meta = statusMeta(budget.status);
              const spent = Number(budget.spent) || 0;
              const limit = Number(budget.monthlyLimit) || 0;
              const remaining = Number(budget.remaining ?? limit - spent);
              const pct = Math.round(Number(budget.pct) || 0);
              const isOver = budget.status === "over";

              return (
                <div
                  key={budget.category}
                  className="card"
                  style={{
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    ...(isOver ? { border: "1px solid var(--fin-red-border)" } : {}),
                  }}
                >
                  {/* Category + status badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>
                      {budget.category}
                    </span>
                    <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                  </div>

                  {/* Spent of limit */}
                  <div className="font-mono" style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink-2)" }}>
                    {formatCurrency(spent)}{" "}
                    <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>
                      of {formatCurrency(limit)}
                    </span>
                  </div>

                  {/* Animated progress bar */}
                  <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      style={{ height: "100%", borderRadius: "var(--r-full)", background: meta.color }}
                    />
                  </div>

                  {/* Remaining / over + pct + actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontSize: "12.5px",
                      fontWeight: "600",
                      color: remaining < 0 ? "var(--fin-red)" : "var(--ink-2)",
                    }}>
                      {remaining >= 0
                        ? `${formatCurrency(remaining)} left`
                        : `${formatCurrency(Math.abs(remaining))} over budget`}
                    </span>
                    <span className="font-mono" style={{ marginLeft: "auto", fontSize: "11.5px", fontWeight: "600", color: meta.color }}>
                      {pct}% used
                    </span>
                    <button onClick={() => openEdit(budget)} className="btn-icon" title="Edit budget">
                      <Pencil size={13} />
                    </button>
                    {confirmDelete === budget.category ? (
                      <button
                        onClick={() => handleDelete(budget.category)}
                        className="btn btn-secondary"
                        style={{
                          height: 28,
                          padding: "0 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--fin-red)",
                          background: "var(--fin-red-bg)",
                          borderColor: "var(--fin-red-border)",
                        }}
                        disabled={isDeleting}
                        title="Click again to confirm"
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        onClick={() => startConfirmDelete(budget.category)}
                        className="btn-icon"
                        style={{ color: "var(--fin-red)" }}
                        title="Delete budget"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Set / Edit Budget Modal */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-modal-title"
        >
          <div className="modal-panel" style={{ padding: "24px 26px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-subtle)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                  <Target size={15} />
                </div>
                <div>
                  <h2 id="budget-modal-title" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>
                    {editingBudget ? "Edit Budget" : "Set Budget"}
                  </h2>
                  <p style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>Monthly limit per category</p>
                </div>
              </div>
              <button className="btn-icon" onClick={closeModal} aria-label="Close"><X size={15} /></button>
            </div>

            {formError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{formError}</div>}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FIELD label="Category" required>
                <select
                  className="input"
                  style={{ cursor: "pointer" }}
                  value={form.category}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, category: e.target.value }));
                    setFormError("");
                  }}
                >
                  {CATEGORIES.map((cat) => {
                    const taken = hasBudget(cat) && !(editingBudget && editingBudget.category === cat);
                    return (
                      <option key={cat} value={cat} disabled={taken}>
                        {cat}{taken ? " (already budgeted)" : ""}
                      </option>
                    );
                  })}
                </select>
              </FIELD>

              <FIELD label="Monthly Limit (₹)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                  value={form.monthlyLimit}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, monthlyLimit: e.target.value }));
                    setFormError("");
                  }}
                  placeholder="0.00"
                  required
                />
              </FIELD>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? "Saving…" : editingBudget ? "Update Budget" : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
