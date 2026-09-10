import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Receipt } from "lucide-react";
import API from "../services/api";
import ExpenseModal from "../components/ExpenseModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../utils/formatters";

const CATEGORIES = ["All Categories", "Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Others"];

const CATEGORY_STYLES = {
  Food: { bg: "#fffbeb", color: "#92400e", border: "rgba(251,191,36,0.25)" },
  Travel: { bg: "#eff6ff", color: "#1e40af", border: "rgba(59,130,246,0.2)" },
  Shopping: { bg: "#faf5ff", color: "#6b21a8", border: "rgba(168,85,247,0.2)" },
  Bills: { bg: "#fef2f2", color: "#991b1b", border: "rgba(239,68,68,0.2)" },
  Entertainment: { bg: "#fdf2f8", color: "#9d174d", border: "rgba(236,72,153,0.2)" },
  Health: { bg: "#f0fdf4", color: "#14532d", border: "rgba(34,197,94,0.2)" },
  Education: { bg: "#eef2ff", color: "#3730a3", border: "rgba(99,102,241,0.2)" },
  Others: { bg: "#f5f5f7", color: "#6e6e73", border: "rgba(0,0,0,0.1)" },
};

const getCategoryBadge = (category) => {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Others;
  return (
    <span
      className="category-badge px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {category}
    </span>
  );
};

const Expenses = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const fetchExpenses = useCallback(async () => {
    try {
      const { data } = await API.get("/api/expenses");
      if (data.success) setExpenses(data.data);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast.error("Failed to load expenses list.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleSaveExpense = async (expenseData) => {
    try {
      if (expenseToEdit) {
        await API.put(`/api/expenses/${expenseToEdit._id}`, expenseData);
        toast.success("Expense updated successfully");
      } else {
        await API.post("/api/expenses", expenseData);
        toast.success("Expense added successfully");
      }
      setIsExpenseModalOpen(false);
      setExpenseToEdit(null);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense:", error);
      toast.error(error.response?.data?.message || "Failed to save expense");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    try {
      await API.delete(`/api/expenses/${expenseToDelete._id}`);
      toast.success("Expense deleted successfully");
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = String(exp.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="app-page flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1
            className="text-2xl sm:text-[28px] font-black flex items-center gap-2.5"
            style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
          >
            <Receipt size={24} style={{ color: "#4f46e5" }} />
            Expenses
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
            Track, filter, and control every transaction out of your account.
          </p>
        </div>

        <button
          onClick={() => { setExpenseToEdit(null); setIsExpenseModalOpen(true); }}
          className="app-action-primary flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl shadow-sm shadow-indigo-500/20 active-press cursor-pointer"
          style={{ background: "#4f46e5" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#3730a3")}
          onMouseLeave={e => (e.currentTarget.style.background = "#4f46e5")}
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Filter & Summary Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input px-4 py-2.5 pl-10 rounded-xl text-sm"
              style={{ color: "#1d1d1f" }}
            />
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#aeaeb2" }} />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ color: "#1d1d1f" }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total */}
        <div
          className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
          style={{ background: "#f5f5f7", color: "#6e6e73", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          Filtered:{" "}
          <span className="font-mono font-bold" style={{ color: "#1d1d1f" }}>
            {formatCurrency(totalFilteredAmount)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="app-data-table w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {["Date", "Description", "Category", "Amount", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className="py-3.5 px-5 text-[11px] font-bold uppercase tracking-widest"
                    style={{
                      color: "#aeaeb2",
                      background: "#fafafa",
                      textAlign: i === 4 ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-sm" style={{ color: "#aeaeb2" }}>
                    <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <Receipt size={32} className="mx-auto mb-3" style={{ color: "#e5e5ea" }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: "#1d1d1f" }}>No expenses found</p>
                    <p className="text-xs" style={{ color: "#aeaeb2" }}>
                      Try adjusting your search or add a new expense.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp._id}
                    className="data-row group transition-colors"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="date-cell py-3.5 px-5 text-xs font-mono" style={{ color: "#aeaeb2" }}>
                      {formatDate(exp.date)}
                    </td>
                    <td className="primary-cell py-3.5 px-5 text-sm font-medium" style={{ color: "#1d1d1f" }}>
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-5">
                      {getCategoryBadge(exp.category)}
                    </td>
                    <td className="amount-cell py-3.5 px-5 text-sm font-bold font-mono" style={{ color: "#1d1d1f" }}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setExpenseToEdit(exp); setIsExpenseModalOpen(true); }}
                          className="table-icon-button p-1.5 rounded-lg active-press cursor-pointer transition-colors"
                          style={{ color: "#aeaeb2" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#4f46e5"; e.currentTarget.style.background = "#eef2ff"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#aeaeb2"; e.currentTarget.style.background = "transparent"; }}
                          title="Edit expense"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { setExpenseToDelete(exp); setIsDeleteModalOpen(true); }}
                          className="table-icon-button p-1.5 rounded-lg active-press cursor-pointer transition-colors"
                          style={{ color: "#aeaeb2" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#aeaeb2"; e.currentTarget.style.background = "transparent"; }}
                          title="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
      />
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be reversed."
      />
    </div>
  );
};

export default Expenses;
