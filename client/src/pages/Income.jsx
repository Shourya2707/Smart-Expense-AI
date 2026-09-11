import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Check,
  X,
  Wallet,
  Download,
  Filter,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatInputDate } from "../utils/formatters";
import { onDataChanged } from "../utils/dataEvents";
import IncomeModal from "../components/IncomeModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

const SOURCES = [
  "All",
  "Salary",
  "Freelancing",
  "Business",
  "Investments",
  "Gift",
  "Other",
];

const Income = () => {
  const toast = useToast();
  const [incomeList, setIncomeList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, sorting
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [sortField, setSortField] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState({
    source: "",
    amount: "",
    date: "",
  });
  const [isSavingInline, setIsSavingInline] = useState(false);

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/income");
      if (data.success && Array.isArray(data.data)) {
        setIncomeList(data.data);
      }
    } catch {
      toast.error("Failed to load income records.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  // The AI assistant can add income — refresh silently when data changes.
  useEffect(() => onDataChanged(() => fetchIncome()), [fetchIncome]);

  const handleSaveIncome = async (payload) => {
    const request = editingIncome
      ? API.put(`/api/income/${editingIncome._id}`, payload)
      : API.post("/api/income", payload);
    const { data } = await request;
    if (!data.success) throw new Error(data.message || "Income could not be saved.");
    setModalOpen(false);
    setEditingIncome(null);
    await fetchIncome();
    toast.success(editingIncome ? "Income updated" : "Income added to ledger");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredIncome = useMemo(() => {
    return incomeList
      .filter((item) => {
        const matchesSearch = (item.source || "")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesSource =
          sourceFilter === "All" || item.source === sourceFilter;
        return matchesSearch && matchesSource;
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
  }, [incomeList, search, sourceFilter, sortField, sortOrder]);

  const visibleTotal = useMemo(() => {
    return filteredIncome.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredIncome]);

  const startInlineEdit = (item) => {
    setInlineEditingId(item._id);
    setInlineForm({
      source: item.source || "Salary",
      amount: item.amount,
      date: formatInputDate(item.date),
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineForm({ source: "", amount: "", date: "" });
  };

  const saveInlineEdit = async (id) => {
    if (!inlineForm.source || !inlineForm.amount) {
      toast.error("Please fill in source and amount.");
      return;
    }
    setIsSavingInline(true);
    try {
      const { data } = await API.put(`/api/income/${id}`, {
        source: inlineForm.source,
        amount: parseFloat(inlineForm.amount),
        date: inlineForm.date,
      });

      if (data.success) {
        setIncomeList((prev) =>
          prev.map((item) => (item._id === id ? data.data : item))
        );
        toast.success("Income record updated successfully");
        cancelInlineEdit();
      }
    } catch {
      toast.error("Failed to update income record");
    } finally {
      setIsSavingInline(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data } = await API.delete(`/api/income/${deleteTarget._id}`);
      if (data.success) {
        setIncomeList((prev) =>
          prev.filter((item) => item._id !== deleteTarget._id)
        );
        toast.success("Income record removed");
        setDeleteTarget(null);
      }
    } catch {
      toast.error("Failed to delete income record");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (incomeList.length === 0) {
      toast.info("No income data to export.");
      return;
    }
    const headers = ["Date", "Source", "Amount (INR)"];
    const rows = filteredIncome.map((i) => [
      formatDate(i.date),
      `"${(i.source || "").replace(/"/g, '""')}"`,
      i.amount,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `income_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
            Income Ledger
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
            Verified record of capital receipts, salary, dividends, and cash inflows
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
              setEditingIncome(null);
              setModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ height: "38px" }}
          >
            <Plus size={15} />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Control Strip */}
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
              placeholder="Search source..."
              className="input"
              style={{ paddingLeft: "36px", height: "36px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          </div>

          {/* Source Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={14} style={{ color: "var(--ink-3)" }} />
            <select
              className="input"
              style={{ width: "160px", height: "36px", padding: "0 10px", fontSize: "13px" }}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src === "All" ? "All Sources" : src}
                </option>
              ))}
            </select>
          </div>

          {/* Visible Sum Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--fin-green-bg)", padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--fin-green-border)" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fin-green)" }}>
              Visible Inflow:
            </span>
            <span className="font-mono" style={{ fontSize: "14px", fontWeight: "700", color: "var(--fin-green)" }}>
              + {formatCurrency(visibleTotal)}
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
          </div>
        ) : filteredIncome.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("date")} style={{ width: "140px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Date <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort("source")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Source <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort("amount")} style={{ textAlign: "right", width: "180px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                      Amount Received <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: "right", width: "110px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncome.map((item) => {
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
                          <select
                            className="input"
                            style={{ height: "32px", fontSize: "12.5px" }}
                            value={inlineForm.source}
                            onChange={(e) => setInlineForm({ ...inlineForm, source: e.target.value })}
                          >
                            {SOURCES.filter((s) => s !== "All").map((src) => (
                              <option key={src} value={src}>{src}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            step="any"
                            className="input font-mono"
                            style={{ height: "32px", fontSize: "12.5px", textAlign: "right", width: "130px", marginLeft: "auto" }}
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
                        <span className="badge badge-green" style={{ fontSize: "12px", padding: "3px 8px" }}>
                          {item.source}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="font-mono" style={{ fontWeight: "600", color: "var(--fin-green)" }}>
                          + {formatCurrency(item.amount)}
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
                            title="Delete record"
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
            <Wallet size={32} style={{ marginBottom: "10px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
              No matching income records
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-3)", marginBottom: "16px" }}>
              {search || sourceFilter !== "All"
                ? "Try adjusting your search criteria or source filter."
                : "No income recorded yet. Click below to add your first revenue inflow."}
            </p>
            <button
              onClick={() => {
                setEditingIncome(null);
                setModalOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={14} /> Add First Income
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <IncomeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingIncome(null);
        }}
        incomeToEdit={editingIncome}
        onSave={handleSaveIncome}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Income Record"
        message={`Are you sure you want to permanently delete this ${deleteTarget?.source || "income"} entry of ${formatCurrency(deleteTarget?.amount || 0)}?`}
        loading={isDeleting}
      />
    </div>
  );
};

export default Income;
