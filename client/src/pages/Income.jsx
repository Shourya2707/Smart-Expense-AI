import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Wallet } from "lucide-react";
import API from "../services/api";
import IncomeModal from "../components/IncomeModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../utils/formatters";

const SOURCES = ["All Sources", "Salary", "Freelancing", "Business", "Investments", "Gift", "Other"];

const SOURCE_STYLES = {
  Salary:       { bg: "#f0fdf4", color: "#14532d", border: "rgba(34,197,94,0.2)" },
  Freelancing:  { bg: "#eff6ff", color: "#1e40af", border: "rgba(59,130,246,0.2)" },
  Business:     { bg: "#faf5ff", color: "#6b21a8", border: "rgba(168,85,247,0.2)" },
  Investments:  { bg: "#fffbeb", color: "#78350f", border: "rgba(245,158,11,0.2)" },
  Gift:         { bg: "#fdf2f8", color: "#9d174d", border: "rgba(236,72,153,0.2)" },
  Other:        { bg: "#f5f5f7", color: "#6e6e73", border: "rgba(0,0,0,0.1)" },
};

const getSourceBadge = (source) => {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES.Other;
  return (
    <span
      className="source-badge px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {source}
    </span>
  );
};

const Income = () => {
  const toast = useToast();
  const [incomeList, setIncomeList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState(null);
  const [incomeToDelete, setIncomeToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");

  const fetchIncome = useCallback(async () => {
    try {
      const { data } = await API.get("/api/income");
      if (data.success) setIncomeList(data.data);
    } catch (error) {
      console.error("Failed to fetch income:", error);
      toast.error("Failed to load income list.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchIncome(); }, [fetchIncome]);

  const handleSaveIncome = async (incomeData) => {
    try {
      if (incomeToEdit) {
        await API.put(`/api/income/${incomeToEdit._id}`, incomeData);
        toast.success("Income record updated successfully");
      } else {
        await API.post("/api/income", incomeData);
        toast.success("Income record added successfully");
      }
      setIsIncomeModalOpen(false);
      setIncomeToEdit(null);
      fetchIncome();
    } catch (error) {
      console.error("Failed to save income:", error);
      toast.error(error.response?.data?.message || "Failed to save income record");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!incomeToDelete) return;
    try {
      await API.delete(`/api/income/${incomeToDelete._id}`);
      toast.success("Income record deleted successfully");
      setIsDeleteModalOpen(false);
      setIncomeToDelete(null);
      fetchIncome();
    } catch (error) {
      console.error("Failed to delete income:", error);
      toast.error("Failed to delete income record");
    }
  };

  const filteredIncome = incomeList.filter((inc) => {
    const matchesSearch = String(inc.source || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === "All Sources" || inc.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const totalFilteredAmount = filteredIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="app-page flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1
            className="text-2xl sm:text-[28px] font-black flex items-center gap-2.5"
            style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
          >
            <Wallet size={24} style={{ color: "#059669" }} />
            Income Streams
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
            Log earnings, salaries, dividends, and cash inflow.
          </p>
        </div>

        <button
          onClick={() => { setIncomeToEdit(null); setIsIncomeModalOpen(true); }}
          className="app-action-income flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-500/20 active-press cursor-pointer"
          style={{ background: "#059669" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#047857")}
          onMouseLeave={e => (e.currentTarget.style.background = "#059669")}
        >
          <Plus size={16} />
          Add Income
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search income by source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input px-4 py-2.5 pl-10 rounded-xl text-sm"
              style={{ color: "#1d1d1f" }}
            />
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#aeaeb2" }} />
          </div>

          {/* Source Filter */}
          <div className="w-full sm:w-44">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ color: "#1d1d1f" }}
            >
              {SOURCES.map((src) => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total */}
        <div
          className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
          style={{ background: "#f0fdf4", color: "#047857", border: "1px solid rgba(5,150,105,0.15)" }}
        >
          Inflow:{" "}
          <span className="font-mono font-bold">+{formatCurrency(totalFilteredAmount)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="app-data-table w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {["Date", "Income Source", "Amount", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className="py-3.5 px-5 text-[11px] font-bold uppercase tracking-widest"
                    style={{
                      color: "#aeaeb2",
                      background: "#fafafa",
                      textAlign: i === 3 ? "right" : "left",
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
                  <td colSpan="4" className="p-10 text-center text-sm" style={{ color: "#aeaeb2" }}>
                    <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading income records...
                  </td>
                </tr>
              ) : filteredIncome.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <Wallet size={32} className="mx-auto mb-3" style={{ color: "#e5e5ea" }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: "#1d1d1f" }}>No income records found</p>
                    <p className="text-xs" style={{ color: "#aeaeb2" }}>
                      Start by recording your monthly salary or earnings.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncome.map((inc) => (
                  <tr
                    key={inc._id}
                    className="data-row group transition-colors"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="date-cell py-3.5 px-5 text-xs font-mono" style={{ color: "#aeaeb2" }}>
                      {formatDate(inc.date)}
                    </td>
                    <td className="py-3.5 px-5">
                      {getSourceBadge(inc.source)}
                    </td>
                    <td className="amount-cell is-income py-3.5 px-5 text-sm font-bold font-mono" style={{ color: "#059669" }}>
                      +{formatCurrency(inc.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setIncomeToEdit(inc); setIsIncomeModalOpen(true); }}
                          className="table-icon-button p-1.5 rounded-lg active-press cursor-pointer transition-colors"
                          style={{ color: "#aeaeb2" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#059669"; e.currentTarget.style.background = "#f0fdf4"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#aeaeb2"; e.currentTarget.style.background = "transparent"; }}
                          title="Edit income"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { setIncomeToDelete(inc); setIsDeleteModalOpen(true); }}
                          className="table-icon-button p-1.5 rounded-lg active-press cursor-pointer transition-colors"
                          style={{ color: "#aeaeb2" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#aeaeb2"; e.currentTarget.style.background = "transparent"; }}
                          title="Delete income"
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

      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleSaveIncome}
        incomeToEdit={incomeToEdit}
      />
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Income Record"
        message="Are you sure you want to delete this income record? This will adjust your total balance calculation."
      />
    </div>
  );
};

export default Income;
