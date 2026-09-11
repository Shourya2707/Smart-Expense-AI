import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Check,
  X,
  Receipt,
  Download,
  Filter,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatInputDate } from "../utils/formatters";
import { onDataChanged } from "../utils/dataEvents";
import ExpenseModal from "../components/ExpenseModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

const CATEGORIES = [
  "All",
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Others",
];

const Expenses = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, sorting
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortField, setSortField] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc"); // asc | desc

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState({
    description: "",
    amount: "",
    category: "",
    date: "",
  });
  const [isSavingInline, setIsSavingInline] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/expenses");
      if (data.success && Array.isArray(data.data)) {
        setExpenses(data.data);
      }
    } catch {
      toast.error("Failed to load expenses list.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSaveExpense = async (payload) => {
    const request = editingExpense
      ? API.put(`/api/expenses/${editingExpense._id}`, payload)
      : API.post("/api/expenses", payload);
    const { data } = await request;
    if (!data.success) throw new Error(data.message || "Expense could not be saved.");
    setModalOpen(false);
    setEditingExpense(null);
    await fetchExpenses();
    toast.success(editingExpense ? "Expense updated" : "Expense added to ledger");
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // The AI assistant can add expenses — refresh silently when data changes.
  useEffect(() => onDataChanged(() => fetchExpenses()), [fetchExpenses]);

  // Sort toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filtered & Sorted items
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((item) => {
        const matchesSearch =
          (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.category || "").toLowerCase().includes(search.toLowerCase());
        const matchesCategory =
          categoryFilter === "All" || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "amount") {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else if (sortField === "date") {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else {
          valA = (valA || "").toString().toLowerCase();
          valB = (valB || "").toString().toLowerCase();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [expenses, search, categoryFilter, sortField, sortOrder]);

  // Total amount of currently visible filtered rows
  const visibleTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  // Start inline edit
  const startInlineEdit = (item) => {
    setInlineEditingId(item._id);
    setInlineForm({
      description: item.description || "",
      amount: item.amount,
      category: item.category || "Others",
      date: formatInputDate(item.date),
    });
  };

  // Cancel inline edit
  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineForm({ description: "", amount: "", category: "", date: "" });
  };

  // Save inline edit
  const saveInlineEdit = async (id) => {
    if (!inlineForm.description || !inlineForm.amount || !inlineForm.category) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSavingInline(true);
    try {
      const { data } = await API.put(`/api/expenses/${id}`, {
        description: inlineForm.description.trim(),
        amount: parseFloat(inlineForm.amount),
        category: inlineForm.category,
        date: inlineForm.date,
      });

      if (data.success) {
        setExpenses((prev) =>
          prev.map((item) => (item._id === id ? data.data : item))
        );
        toast.success("Expense updated successfully");
        cancelInlineEdit();
      }
    } catch {
      toast.error("Failed to update expense");
    } finally {
      setIsSavingInline(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data } = await API.delete(`/api/expenses/${deleteTarget._id}`);
      if (data.success) {
        setExpenses((prev) => prev.filter((item) => item._id !== deleteTarget._id));
        toast.success("Expense removed from ledger");
        setDeleteTarget(null);
      }
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.info("No expense data to export.");
      return;
    }
    const headers = ["Date", "Description", "Category", "Amount (INR)"];
    const rows = filteredExpenses.map((e) => [
      formatDate(e.date),
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${e.category || ""}"`,
      e.amount,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smartexpense_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded");
  };

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
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
            Expense Ledger
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
            Granular breakdown and classification of all operational outflows
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ height: "38px" }}
            title="Download CSV report"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ height: "38px" }}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Control Strip (Search, Filter, Total) */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}>
          {/* Search bar */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
            <input
              type="text"
              placeholder="Search description or category..."
              className="input"
              style={{ paddingLeft: "36px", height: "36px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={14} style={{ color: "var(--ink-3)" }} />
            <select
              className="input"
              style={{ width: "160px", height: "36px", padding: "0 10px", fontSize: "13px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Visible Sum Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-subtle)", padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)" }}>
              Visible Outflow:
            </span>
            <span className="font-mono" style={{ fontSize: "14px", fontWeight: "700", color: "var(--fin-red)" }}>
              - {formatCurrency(visibleTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="skeleton" style={{ height: "42px" }} />
            <div className="skeleton" style={{ height: "42px" }} />
            <div className="skeleton" style={{ height: "42px" }} />
            <div className="skeleton" style={{ height: "42px" }} />
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("date")} style={{ width: "130px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Date <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort("description")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Description <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort("category")} style={{ width: "150px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Category <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort("amount")} style={{ textAlign: "right", width: "150px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                      Amount <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: "right", width: "110px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => {
                  const isInline = inlineEditingId === item._id;

                  if (isInline) {
                    return (
                      <tr key={item._id} style={{ background: "#f1f5f9" }}>
                        <td>
                          <input
                            type="date"
                            className="input"
                            style={{ height: "32px", fontSize: "12px", padding: "0 6px" }}
                            value={inlineForm.date}
                            onChange={(e) => setInlineForm({ ...inlineForm, date: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            style={{ height: "32px", fontSize: "12.5px" }}
                            value={inlineForm.description}
                            onChange={(e) => setInlineForm({ ...inlineForm, description: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInlineEdit(item._id);
                              if (e.key === "Escape") cancelInlineEdit();
                            }}
                            autoFocus
                          />
                        </td>
                        <td>
                          <select
                            className="input"
                            style={{ height: "32px", fontSize: "12px", padding: "0 6px" }}
                            value={inlineForm.category}
                            onChange={(e) => setInlineForm({ ...inlineForm, category: e.target.value })}
                          >
                            {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            step="any"
                            className="input font-mono"
                            style={{ height: "32px", fontSize: "12.5px", textAlign: "right", width: "120px", marginLeft: "auto" }}
                            value={inlineForm.amount}
                            onChange={(e) => setInlineForm({ ...inlineForm, amount: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInlineEdit(item._id);
                              if (e.key === "Escape") cancelInlineEdit();
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "4px" }}>
                            <button
                              onClick={() => saveInlineEdit(item._id)}
                              className="btn btn-primary"
                              style={{ width: "28px", height: "28px", padding: 0 }}
                              disabled={isSavingInline}
                              title="Save changes (Enter)"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="btn btn-secondary"
                              style={{ width: "28px", height: "28px", padding: 0 }}
                              title="Cancel (Esc)"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item._id}
                      onDoubleClick={() => startInlineEdit(item)}
                      title="Double-click to inline edit"
                    >
                      <td style={{ color: "var(--ink-3)", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {formatDate(item.date)}
                      </td>
                      <td style={{ fontWeight: "600" }}>
                        {item.description}
                      </td>
                      <td>
                        <span className="badge">
                          {item.category || "General"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="font-mono" style={{ fontWeight: "600", color: "var(--fin-red)" }}>
                          - {formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          <button
                            onClick={() => startInlineEdit(item)}
                            className="btn-icon"
                            title="Inline edit row"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="btn-icon"
                            style={{ color: "var(--fin-red)" }}
                            title="Delete expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "50px 20px" }}>
            <Receipt size={32} style={{ marginBottom: "10px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
              No matching expense records
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-3)", marginBottom: "16px" }}>
              {search || categoryFilter !== "All"
                ? "Try adjusting your search criteria or category filter."
                : "No expenses have been recorded yet. Click below to add your first expense."}
            </p>
            <button
              onClick={() => {
                setEditingExpense(null);
                setModalOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={14} /> Add First Expense
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog for Add / Edit */}
      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        expenseToEdit={editingExpense}
        onSave={handleSaveExpense}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        message={`Are you sure you want to permanently delete "${deleteTarget?.description || "this expense"}" of ${formatCurrency(deleteTarget?.amount || 0)}? This action cannot be undone.`}
        loading={isDeleting}
      />
    </div>
  );
};

export default Expenses;
