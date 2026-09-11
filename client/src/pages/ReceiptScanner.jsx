import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Receipt,
  X,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatInputDate } from "../utils/formatters";

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

const ReceiptScanner = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  // Extracted verified data form
  const [scannedData, setScannedData] = useState(null);
  const [verifiedForm, setVerifiedForm] = useState({
    description: "",
    amount: "",
    category: "Food",
    date: formatInputDate(new Date()),
  });
  const [isSaving, setIsSaving] = useState(false);

  // File handling
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be under 5MB.");
      return;
    }

    setError("");
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScannedData(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScannedData(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Process Receipt with Groq vision model
  const handleScan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    setError("");

    const formData = new FormData();
    formData.append("receipt", selectedFile);

    try {
      const { data } = await API.post("/api/ai/scan-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success && data.data) {
        const res = data.data;
        setScannedData(res);
        setVerifiedForm({
          description: res.merchant || res.description || "Vendor Receipt",
          amount: res.amount || "",
          category: CATEGORIES.includes(res.category) ? res.category : "Food",
          date: formatInputDate(res.date),
        });
        toast.success("Receipt parsed successfully");
      } else {
        setError(data.message || "Could not extract receipt fields.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to scan receipt. Please ensure image clarity.";
      setError(msg);
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  // Save verified expense to ledger
  const handleSaveToExpenses = async (e) => {
    e.preventDefault();
    if (!verifiedForm.description || !verifiedForm.amount) {
      toast.error("Please fill in description and amount.");
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await API.post("/api/expenses", {
        description: verifiedForm.description.trim(),
        amount: parseFloat(verifiedForm.amount),
        category: verifiedForm.category,
        date: verifiedForm.date,
      });

      if (data.success) {
        toast.success("Receipt expense logged to ledger!");
        navigate("/expenses");
      }
    } catch {
      toast.error("Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--ink)" }}>
          Autonomous Receipt Scanner
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--ink-3)", marginTop: "2px" }}>
          Drop physical or digital vendor invoices. Vision models extract amounts, dates, and classifications.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Two-Panel Suite */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: "24px",
        alignItems: "start",
      }}>
        {/* Left Panel: Dropzone & Receipt Preview */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span className="section-label">Source Document</span>
            {selectedFile && !scanning && (
              <button
                onClick={handleClear}
                className="btn btn-ghost"
                style={{ height: "28px", padding: "0 8px", fontSize: "12px" }}
              >
                <X size={13} /> Remove
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: "none" }}
          />

          {!previewUrl ? (
            <div
              className={`dropzone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                height: "300px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 20px",
                textAlign: "center",
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink)",
                marginBottom: "14px",
                boxShadow: "var(--shadow-xs)",
              }}>
                <UploadCloud size={24} />
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
                Click to upload or drag &amp; drop
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--ink-4)", maxWidth: "260px", lineHeight: 1.4 }}>
                Supports PNG, JPEG, WebP up to 5MB. Clear vendor slips yield optimal extraction.
              </p>
            </div>
          ) : (
            <div style={{ position: "relative", borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--border)", background: "#0f172a" }}>
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{
                  width: "100%",
                  maxHeight: "360px",
                  objectFit: "contain",
                  display: "block",
                  opacity: scanning ? 0.75 : 1,
                }}
              />
              {/* Mechanical laser scanning line */}
              {scanning && <div className="laser-line" />}
            </div>
          )}

          {/* Action Trigger */}
          <div style={{ marginTop: "20px" }}>
            <button
              onClick={handleScan}
              disabled={!selectedFile || scanning}
              className="btn btn-primary"
              style={{ width: "100%", height: "42px" }}
            >
              {scanning ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="spinner spinner-white" />
                  Running Vision Analysis...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <ScanLine size={16} /> Extract Receipt Data
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Extraction Results & Verification Form */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <span className="section-label">Verified Data Output</span>
            {scannedData && (
              <span className="badge badge-green" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Extracted
              </span>
            )}
          </div>

          {scanning ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
              <div className="skeleton" style={{ height: "40px" }} />
              <div className="skeleton" style={{ height: "40px" }} />
              <div className="skeleton" style={{ height: "40px" }} />
              <div className="skeleton" style={{ height: "100px" }} />
            </div>
          ) : scannedData ? (
            <form onSubmit={handleSaveToExpenses} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Description / Merchant */}
              <div>
                <label className="label" htmlFor="rec-desc">Merchant / Vendor</label>
                <input
                  id="rec-desc"
                  type="text"
                  required
                  className="input"
                  value={verifiedForm.description}
                  onChange={(e) => setVerifiedForm({ ...verifiedForm, description: e.target.value })}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="label" htmlFor="rec-amount">Extracted Total (₹)</label>
                <input
                  id="rec-amount"
                  type="number"
                  step="any"
                  required
                  className="input font-mono"
                  style={{ fontSize: "16px", fontWeight: "700" }}
                  value={verifiedForm.amount}
                  onChange={(e) => setVerifiedForm({ ...verifiedForm, amount: e.target.value })}
                />
              </div>

              {/* Grid: Category & Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label" htmlFor="rec-cat">Category</label>
                  <select
                    id="rec-cat"
                    className="input"
                    value={verifiedForm.category}
                    onChange={(e) => setVerifiedForm({ ...verifiedForm, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="rec-date">Date</label>
                  <input
                    id="rec-date"
                    type="date"
                    required
                    className="input"
                    value={verifiedForm.date}
                    onChange={(e) => setVerifiedForm({ ...verifiedForm, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Line items if extracted */}
              {scannedData.items && scannedData.items.length > 0 && (
                <div style={{ background: "var(--bg-subtle)", padding: "12px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", display: "block", marginBottom: "8px" }}>
                    Detected Line Items
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {scannedData.items.map((it, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "var(--ink-2)" }}>{it.name || it.item || "Item"}</span>
                        <span className="font-mono" style={{ color: "var(--ink)", fontWeight: "600" }}>
                          {formatCurrency(it.price || it.amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Scan Another
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="spinner spinner-white" /> Saving...
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={15} /> Log to Expenses
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state" style={{ height: "300px" }}>
              <Receipt size={32} style={{ marginBottom: "10px", opacity: 0.4 }} />
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
                Awaiting receipt ingestion
              </h4>
              <p style={{ fontSize: "12.5px", color: "var(--ink-3)", maxWidth: "240px" }}>
                Select or drag a receipt on the left to extract invoice totals and vendor fields.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;
