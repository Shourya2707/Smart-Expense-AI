import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, X, Mic, MicOff, Send, Trash2, Volume2, VolumeX,
  Plus, TrendingUp, PieChart, CalendarRange, RefreshCw, Check, AlertCircle,
} from "lucide-react";
import { streamChat, fetchChatHistory, resetChat } from "../services/api";
import { useSpeech } from "../hooks/useSpeech";
import { emitDataChanged } from "../utils/dataEvents";

const SUGGESTIONS = [
  { icon: Plus, text: "Spent 250 on groceries yesterday" },
  { icon: PieChart, text: "How much did I spend on Food this month?" },
  { icon: TrendingUp, text: "How am I doing this month?" },
  { icon: CalendarRange, text: "Show my recent transactions" },
];

const TOOL_LABELS = {
  add_expense: { label: "Expense added", Icon: Plus },
  add_income: { label: "Income added", Icon: TrendingUp },
  get_summary: { label: "Checked summary", Icon: TrendingUp },
  category_breakdown: { label: "Category breakdown", Icon: PieChart },
  monthly_trend: { label: "Monthly trend", Icon: CalendarRange },
  search_transactions: { label: "Searched", Icon: RefreshCw },
  list_recent_transactions: { label: "Recent transactions", Icon: CalendarRange },
};

const spring = { type: "spring", stiffness: 420, damping: 32 };

const AssistantPanel = ({ open, onClose }) => {
  const [messages, setMessages] = useState([]); // {role:"user"|"assistant", text, tools?, streaming?}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const handleTranscript = useCallback((text) => setInput((prev) => text || prev), []);
  const { listening, speaking, voiceSupported, startListening, stopListening, speak, stopSpeaking } = useSpeech({ onTranscript: handleTranscript });

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 350);
    setError("");
    fetchChatHistory()
      .then(({ data }) => {
        if (data.success) {
          setMessages(data.data.map((m) => ({ role: m.role, text: m.content })));
          scrollToBottom();
        }
      })
      .catch(() => { /* first visit — empty chat is fine */ });
  }, [open]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  const send = async (raw) => {
    const message = (raw ?? input).trim();
    if (!message || busy) return;

    setInput("");
    setError("");
    stopSpeaking();
    setMessages((prev) => [...prev, { role: "user", text: message }, { role: "assistant", text: "", tools: [], streaming: true }]);
    setBusy(true);
    scrollToBottom();

    const patchLast = (patch) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return next;
      });
    const appendTool = (tool) =>
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, tools: [...(last.tools || []), tool] };
        return next;
      });

    try {
      let streamed = "";
      const full = await streamChat({
        message,
        onEvent: (event) => {
          if (event.type === "token") {
            streamed += event.text || "";
            patchLast({ text: streamed });
          }
          if (event.type === "tool") {
            appendTool({ name: event.name, ok: event.result?.ok !== false });
            if (["add_expense", "add_income"].includes(event.name)) emitDataChanged("assistant");
            scrollToBottom();
          }
          if (event.type === "error") setError(event.message || "The assistant hit an error.");
        },
      });
      patchLast({ text: full || streamed || "I didn't catch a reply — try rephrasing that.", streaming: false });
      if (ttsOn && full) speak(full);
      scrollToBottom();
    } catch (err) {
      patchLast({ streaming: false, text: "" });
      setError(err.message || "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    try {
      await resetChat();
      setMessages([]);
      stopSpeaking();
    } catch { setError("Could not clear the conversation."); }
  };

  const toggleTts = () => {
    if (ttsOn) stopSpeaking();
    setTtsOn((v) => !v);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="assistant-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(15,23,42,0.24)",
            backdropFilter: "blur(2px)",
          }}
          onClick={onClose}
          aria-hidden
        />
      )}
      {open && (
        <motion.section
          key="assistant-panel"
          role="dialog"
          aria-label="AI Finance Assistant"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={spring}
          style={{
            position: "fixed", zIndex: 91,
            right: "max(16px, env(safe-area-inset-right))",
            bottom: "max(16px, env(safe-area-inset-bottom))",
            width: "min(410px, calc(100vw - 24px))",
            height: "min(600px, calc(100vh - 90px))",
            display: "flex", flexDirection: "column",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <header style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
            background: "var(--surface)", flexShrink: 0,
          }}>
            <motion.div
              animate={busy ? { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] } : { rotate: 0 }}
              transition={busy ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : spring}
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: "var(--brand)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Sparkles size={15} />
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>AI Finance Assistant</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {busy ? "Thinking…" : speaking ? "Speaking…" : "Tools · Memory · Voice"}
              </div>
            </div>
            <button className="btn-icon" onClick={toggleTts} title={ttsOn ? "Mute voice replies" : "Read replies aloud"} aria-pressed={ttsOn} style={{ color: ttsOn ? "var(--brand)" : "var(--ink-4)" }}>
              {ttsOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button className="btn-icon" onClick={handleClear} title="Clear conversation" style={{ color: "var(--ink-4)" }}>
              <Trash2 size={15} />
            </button>
            <button className="btn-icon" onClick={onClose} aria-label="Close assistant">
              <X size={15} />
            </button>
          </header>

          {/* Messages */}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, background: "var(--bg)" }}>
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ textAlign: "center", padding: "18px 8px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <Sparkles size={19} style={{ color: "var(--ink-3)" }} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Your money, in plain English</div>
                <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55, margin: "0 auto", maxWidth: 280 }}>
                  Log transactions, ask about spending, and get instant answers. Everything is saved to your ledger for real.
                </p>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={spring}
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                >
                  <div style={{ maxWidth: "86%", display: "flex", flexDirection: "column", gap: 6 }}>
                    {m.tools?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {m.tools.map((tool, toolIdx) => {
                          const meta = TOOL_LABELS[tool.name] || { label: tool.name, Icon: RefreshCw };
                          const { Icon } = meta;
                          return (
                            <motion.span
                              key={toolIdx}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={spring}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 10.5, fontWeight: 600,
                                padding: "3px 8px", borderRadius: "var(--r-full)",
                                background: tool.ok ? "var(--fin-green-bg)" : "var(--fin-red-bg)",
                                color: tool.ok ? "var(--fin-green)" : "var(--fin-red)",
                                border: `1px solid ${tool.ok ? "var(--fin-green-border)" : "var(--fin-red-border)"}`,
                              }}
                            >
                              {tool.ok ? <Check size={10} /> : <AlertCircle size={10} />}
                              <Icon size={10} />
                              {meta.label}
                            </motion.span>
                          );
                        })}
                      </div>
                    )}
                    <div style={{
                      padding: "9px 13px",
                      borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: m.role === "user" ? "var(--brand)" : "var(--surface)",
                      color: m.role === "user" ? "white" : "var(--ink)",
                      border: m.role === "user" ? "none" : "1px solid var(--border)",
                      fontSize: 12.8, lineHeight: 1.55,
                      boxShadow: "var(--shadow-xs)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {m.text}
                      {m.streaming && (!m.text || m.tools?.length > 0) && <TypingDots />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="alert alert-error" style={{ fontSize: 12, padding: "8px 12px" }}>
                {error}
              </motion.div>
            )}

            {!busy && messages.length <= 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {SUGGESTIONS.map(({ icon: Icon, text }, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.05 * idx }}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => send(text)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--r-full)", padding: "6px 11px", cursor: "pointer",
                    }}
                  >
                    <Icon size={11} style={{ color: "var(--ink-4)" }} />
                    {text}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <footer style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
            >
              {voiceSupported && (
                <motion.button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  title={listening ? "Stop listening" : "Voice input"}
                  animate={listening ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={listening ? { repeat: Infinity, duration: 1.1 } : spring}
                  className="btn-icon"
                  style={{
                    height: 36, width: 36,
                    background: listening ? "var(--fin-red)" : "var(--bg-subtle)",
                    color: listening ? "white" : "var(--ink-2)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                >
                  {listening ? <MicOff size={15} /> : <Mic size={15} />}
                </motion.button>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={listening ? "Listening…" : "e.g. spent 250 on groceries yesterday"}
                style={{
                  flex: 1, resize: "none", maxHeight: 96,
                  border: "1.5px solid var(--border)", borderRadius: 12,
                  padding: "8px 12px", fontSize: 12.8, fontFamily: "inherit",
                  background: "var(--bg)", color: "var(--ink)", outline: "none",
                }}
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || busy}
                whileHover={{ scale: input.trim() && !busy ? 1.05 : 1 }}
                whileTap={{ scale: 0.95 }}
                className="btn-icon"
                style={{
                  height: 36, width: 36,
                  background: "var(--brand)", color: "white",
                  opacity: !input.trim() || busy ? 0.4 : 1,
                  cursor: !input.trim() || busy ? "not-allowed" : "pointer",
                  borderRadius: 10,
                }}
                aria-label="Send message"
              >
                <Send size={14} />
              </motion.button>
            </form>
            <div style={{ fontSize: 10, color: "var(--ink-5)", marginTop: 6, textAlign: "center" }}>
              {voiceSupported ? "Enter to send · Shift+Enter for a new line" : "Enter to send"}
            </div>
          </footer>
        </motion.section>
      )}
    </AnimatePresence>,
    document.body
  );
};

const TypingDots = () => (
  <span style={{ display: "inline-flex", gap: 3, marginLeft: 6, verticalAlign: "middle" }}>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
        style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink-4)", display: "inline-block" }}
      />
    ))}
  </span>
);

export default AssistantPanel;
