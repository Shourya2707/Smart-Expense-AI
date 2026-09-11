const Groq = require("groq-sdk").default || require("groq-sdk");
const { env } = require("../config/env");
const ChatMessage = require("../models/ChatMessage");
const AiEvent = require("../models/AiEvent");
const { runAgent } = require("../services/ai/agent");
const { getInsights } = require("../services/ai/insights");
const { CATEGORIES } = require("../services/analyticsService");

function extractJSON(text) {
  try {
    return JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
  } catch {
    const start = text.search(/[\[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    try {
      return start >= 0 ? JSON.parse(text.slice(start, end + 1)) : null;
    } catch {
      return null;
    }
  }
}

/** POST /api/ai/chat — SSE stream: tool runs, answer tokens, then done. */
exports.chat = async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim().slice(0, 500) : "";
  const sessionId = typeof req.body.sessionId === "string" ? req.body.sessionId.slice(0, 40) : "default";
  if (!message) return res.status(400).json({ success: false, message: "Message is required." });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  res.flushHeaders?.();

  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    send({ type: "start" });
    const history = await ChatMessage.recentForContext(req.user._id, sessionId);
    let answer = "";
    const finalAnswer = await runAgent({
      userId: req.user._id,
      userMessage: message,
      history,
      onEvent: (event) => {
        if (closed) return;
        if (event.type === "token") answer += event.text;
        send(event);
      },
    });
    const text = finalAnswer || answer || "I couldn't generate a reply. Please try again.";

    ChatMessage.append(req.user._id, "user", message, sessionId);
    const saved = ChatMessage.append(req.user._id, "assistant", text, sessionId);
    send({ type: "done", messageId: saved._id });
  } catch (error) {
    console.error("Chat error:", error.message);
    if (!closed) send({ type: "error", message: "The assistant hit an error. Please try again." });
  } finally {
    if (!closed) res.end();
  }
};

/** GET /api/ai/chat/history */
exports.chatHistory = async (req, res) => {
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.slice(0, 40) : "default";
  res.json({ success: true, data: await ChatMessage.list(req.user._id, sessionId, 50) });
};

/** POST /api/ai/chat/reset */
exports.chatReset = async (req, res) => {
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.slice(0, 40) : "default";
  ChatMessage.clear(req.user._id, sessionId);
  res.json({ success: true, message: "Conversation cleared." });
};

/** GET /api/ai/insights */
exports.getInsights = async (req, res) => {
  try {
    const { insights, source } = await getInsights(req.user._id);
    res.json({ success: true, data: insights, source });
  } catch (error) {
    console.error("Insights error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** POST /api/ai/scan-receipt — vision model reads merchant/amount/date/category. */
exports.scanReceipt = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Choose a receipt image first." });
  if (!env.groqApiKey) return res.status(503).json({ success: false, message: "Receipt AI needs GROQ_API_KEY in the server environment." });

  const started = Date.now();
  try {
    const groq = new Groq({ apiKey: env.groqApiKey });
    const content = [
      {
        type: "text",
        text: `Read this receipt and return JSON only with merchant, amount, date (YYYY-MM-DD), category (one of ${CATEGORIES.join(", ")}), description, and items (array of {name, price}). Use null when unreadable.`,
      },
      { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` } },
    ];
    const response = await groq.chat.completions.create({
      model: env.groqVisionModel,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    });
    const usage = response.usage || {};
    logAiEvent(req, { feature: "receipt", latencyMs: Date.now() - started, usage, success: true });

    const raw = extractJSON(response.choices[0]?.message?.content || "{}");
    const amount = Number(raw?.amount);
    const category = CATEGORIES.find((item) => item.toLowerCase() === String(raw?.category).toLowerCase()) || "Others";
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({ success: false, message: "The receipt amount could not be read. Try a clearer image." });
    }
    res.json({
      success: true,
      data: {
        merchant: raw.merchant || "",
        amount,
        date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : new Date().toISOString().slice(0, 10),
        category,
        description: raw.description || raw.merchant || "Receipt expense",
        items: Array.isArray(raw.items) ? raw.items : [],
      },
      message: "Receipt parsed. Review the fields before saving.",
    });
  } catch (error) {
    logAiEvent(req, { feature: "receipt", latencyMs: Date.now() - started, success: false, error: error.message });
    console.error("Receipt scan error:", error.message);
    res.status(502).json({ success: false, message: "Groq could not read this receipt. Try a sharper, well-lit image." });
  }
};

function logAiEvent(req, { feature, latencyMs, usage = {}, success, error = null }) {
  try {
    AiEvent.insert({
      userId: req.user?._id ?? null,
      feature,
      model: env.groqVisionModel,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      latencyMs,
      success,
      error,
    });
  } catch { /* telemetry must never break the request */ }
}
