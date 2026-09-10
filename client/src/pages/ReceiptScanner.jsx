import { useState, useRef, useEffect } from "react";
import {
  Upload, Scan, AlertTriangle, FileText, Sparkles, RefreshCw, Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatInputDate } from "../utils/formatters";

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Others"];

const ReceiptScanner = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");

    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Please upload an image smaller than 5MB.");
      toast.error("File exceeds 5MB limit");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      toast.error("Invalid image format");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return URL.createObjectURL(file);
    });
    setExtractedData(null);
  };

  const handleAnalyzeReceipt = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError("");
    const formData = new FormData();
    formData.append("receipt", selectedFile);
    try {
      const { data } = await API.post("/api/ai/scan-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success && data.data) {
        setExtractedData({
          amount: data.data.amount || "",
          category: data.data.category || "Food",
          description: data.data.description || data.data.merchant || "Receipt expense",
          date: formatInputDate(data.data.date),
          merchant: data.data.merchant || "",
        });
        toast.success("Receipt analyzed successfully! Review details below.");
      }
    } catch (err) {
      console.error("Receipt Analysis Error:", err);
      const errMsg = err.response?.data?.message || "Failed to analyze receipt. You can still enter details manually.";
      setError(errMsg);
      toast.error(errMsg);
      setExtractedData({ amount: "", category: "Food", description: "", date: formatInputDate(), merchant: "" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!extractedData) return;
    const parsed = parseFloat(extractedData.amount);
    if (!extractedData.amount || isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!extractedData.description) {
      toast.error("Please provide an expense description");
      return;
    }
    setSaving(true);
    try {
      const { data } = await API.post("/api/expenses", {
        amount: parsed,
        category: extractedData.category,
        description: extractedData.description,
        date: extractedData.date,
      });
      if (data.success) {
        toast.success("Expense saved to your records!");
        navigate("/expenses");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return null;
    });
    setExtractedData(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const labelClass = "block text-[11px] font-bold uppercase tracking-widest mb-1.5";

  return (
    <div className="app-page flex flex-col gap-6 max-w-5xl mx-auto pb-12 animate-slide-up">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-[28px] font-black flex items-center gap-2.5"
          style={{ color: "#1d1d1f", letterSpacing: "-0.03em" }}
        >
          <Scan size={24} style={{ color: "#4f46e5" }} />
          Smart Receipt Scanner
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#6e6e73" }}>
          Upload any paper or digital receipt. Gemini Vision AI automatically extracts merchant, amount, category, and date.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm flex items-center justify-between"
          style={{
            background: "#fef2f2",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "#dc2626",
          }}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="flex-shrink-0" />
            {error}
          </span>
          <button
            onClick={() => setError("")}
            className="text-xs underline hover:opacity-70 cursor-pointer ml-4 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left — Upload Zone */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex-1">
            {/* Step label */}
            <div className="flex items-center gap-2.5 mb-4">
              <span
                className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white"
                style={{ background: "#4f46e5" }}
              >
                1
              </span>
              <h2 className="text-[15px] font-bold" style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}>
                Upload Receipt Image
              </h2>
            </div>

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="receipt-dropzone border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px] active-press group transition-colors"
                style={{
                  borderColor: "rgba(0,0,0,0.12)",
                  background: "#fafafa",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f5f5ff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.background = "#fafafa"; }}
              >
                <div
                  className="receipt-upload-icon w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ background: "#eef2ff", color: "#4f46e5" }}
                >
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: "#1d1d1f" }}>
                  Click to select receipt
                </p>
                <p className="text-xs mb-5" style={{ color: "#aeaeb2" }}>PNG, JPG, or WebP up to 5MB</p>
                <span
                  className="receipt-browse-button px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: "#ffffff",
                    color: "#6e6e73",
                    border: "1px solid rgba(0,0,0,0.10)",
                  }}
                >
                  Browse Files
                </span>
              </div>
            ) : (
              <div
                className="receipt-preview relative rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center"
                style={{ background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.07)" }}
              >
                <img src={previewUrl} alt="Receipt preview" className="max-h-[320px] object-contain w-full p-3" />

                {/* Scanning overlay */}
                {analyzing && (
                  <div
                    className="receipt-analysis-overlay absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div
                      className="receipt-analysis-icon relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
                      style={{ background: "#eef2ff", color: "#4f46e5" }}
                    >
                      <Sparkles size={28} className="animate-pulse" />
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-radar" />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: "#1d1d1f" }}>Gemini AI Analyzing...</p>
                    <p className="text-xs" style={{ color: "#6e6e73" }}>
                      Extracting merchant, amount, category, and date
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Action buttons */}
          {previewUrl && !extractedData && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleReset}
                className="modal-cancel flex-1 py-3 px-4 font-semibold text-sm rounded-xl active-press cursor-pointer"
                style={{ background: "#f5f5f7", color: "#6e6e73", border: "1px solid rgba(0,0,0,0.08)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#ebebeb")}
                onMouseLeave={e => (e.currentTarget.style.background = "#f5f5f7")}
              >
                Choose Another
              </button>
              <button
                onClick={handleAnalyzeReceipt}
                disabled={analyzing}
                className="modal-primary flex-1 py-3 px-4 text-white font-semibold text-sm rounded-xl shadow-sm shadow-indigo-500/20 active-press disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "#4f46e5" }}
                onMouseEnter={e => !analyzing && (e.currentTarget.style.background = "#3730a3")}
                onMouseLeave={e => !analyzing && (e.currentTarget.style.background = "#4f46e5")}
              >
                {analyzing ? "Processing..." : <><Sparkles size={15} /> Analyze with AI</>}
              </button>
            </div>
          )}

          {extractedData && (
            <button
              onClick={handleReset}
              className="modal-cancel mt-5 py-2.5 px-4 font-semibold text-sm rounded-xl active-press flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: "#f5f5f7", color: "#6e6e73", border: "1px solid rgba(0,0,0,0.08)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#ebebeb")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f5f5f7")}
            >
              <RefreshCw size={14} /> Scan Another Receipt
            </button>
          )}
        </div>

        {/* Right — Review Form */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white"
              style={{ background: extractedData ? "#059669" : "#aeaeb2" }}
            >
              2
            </span>
            <h2 className="text-[15px] font-bold" style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}>
              Review Extracted Details
            </h2>
          </div>

          {!extractedData ? (
            <div
              className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl min-h-[300px]"
              style={{ border: "1.5px dashed rgba(0,0,0,0.10)" }}
            >
              <FileText size={36} className="mb-3" style={{ color: "#e5e5ea" }} />
              <p className="text-sm font-semibold mb-1.5" style={{ color: "#1d1d1f" }}>
                No receipt data extracted yet
              </p>
              <p className="text-xs max-w-xs" style={{ color: "#aeaeb2" }}>
                Upload an image on the left and click "Analyze with AI" to populate this form automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveExpense} className="flex flex-col flex-1 space-y-4">
              {/* AI notice */}
              <div
                className="p-3 rounded-xl text-xs flex items-start gap-2"
                style={{ background: "#eef2ff", color: "#4f46e5", border: "1px solid rgba(79,70,229,0.15)" }}
              >
                <Sparkles size={14} className="shrink-0 mt-0.5" />
                <span>AI extracted the information below. Review and adjust before saving.</span>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass} style={{ color: "#aeaeb2" }}>Description / Merchant</label>
                <input
                  type="text"
                  value={extractedData.description}
                  onChange={(e) => setExtractedData({ ...extractedData, description: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl text-sm"
                  style={{ color: "#1d1d1f" }}
                  placeholder="e.g. Target Supermarket"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className={labelClass} style={{ color: "#aeaeb2" }}>Total Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.amount}
                  onChange={(e) => setExtractedData({ ...extractedData, amount: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl font-mono text-base font-bold"
                  style={{ color: "#1d1d1f" }}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className={labelClass} style={{ color: "#aeaeb2" }}>Category</label>
                <select
                  value={extractedData.category}
                  onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl text-sm cursor-pointer"
                  style={{ color: "#1d1d1f" }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className={labelClass} style={{ color: "#aeaeb2" }}>Receipt Date</label>
                <input
                  type="date"
                  value={extractedData.date}
                  onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl text-sm"
                  style={{ color: "#1d1d1f" }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="modal-income w-full py-3.5 px-4 mt-auto text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-500/20 active-press disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "#059669" }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = "#047857")}
                onMouseLeave={e => !saving && (e.currentTarget.style.background = "#059669")}
              >
                {saving ? "Saving Record..." : <><Save size={15} /><span>Confirm & Save Expense</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;
