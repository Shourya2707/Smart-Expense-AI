const Groq = require("groq-sdk").default || require("groq-sdk");
const { env } = require("../config/env");
const ChatMessage = require("../models/ChatMessage");
const AiEvent = require("../models/AiEvent");
const { runAgent } = require("../services/ai/agent");
const { getInsights } = require("../services/ai/insights");
const { CATEGORIES } = require("../services/analyticsService");

function extractJSON(text) {
  if (typeof text !== "string") {
    text = Array.isArray(text)
      ? text.filter((part) => typeof part === "string").join("\n")
      : String(text || "");
  }
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
  // res "close" fires on both normal completion and premature client disconnect;
  // req "close" can fire as soon as the JSON body is consumed.
  res.on("close", () => { closed = !res.writableEnded; });

  try {
    send({ type: "start" });
    const history = await ChatMessage.recentForContext(req.user._id, sessionId);
    let answer = "";
    let streamedAny = false;
    const finalAnswer = await runAgent({
      userId: req.user._id,
      userMessage: message,
      history,
      onEvent: (event) => {
        if (closed) return;
        if (event.type === "token") { answer += event.text; streamedAny = true; }
        send(event);
      },
    });
    const text = finalAnswer || answer || "I couldn't generate a reply. Please try again.";
    // Fallback mode returns the full answer without streaming tokens.
    if (!streamedAny && !closed) send({ type: "token", text });

    ChatMessage.append(req.user._id, "user", message, sessionId);
    const saved = ChatMessage.append(req.user._id, "assistant", text, sessionId);
    if (!closed) {
      // Authoritative final text — the client replaces whatever it streamed with this.
      send({ type: "answer", text });
      send({ type: "done", messageId: saved._id });
    }
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

  // Vision provider preference: NVIDIA NIM (has real free vision models) → Groq (if a vision model returns to its catalog).
  const useNvidia = Boolean(env.nvidiaApiKey && env.nvidiaVisionModel);
  const useGroq = Boolean(env.groqApiKey && env.groqVisionModel);
  if (!useNvidia && !useGroq) {
    return res.status(503).json({
      success: false,
      message: "No vision provider is configured. Set NVIDIA_API_KEY in server/.env (free credits at build.nvidia.com), or add the expense manually.",
    });
  }

  const started = Date.now();
  const prompt = `Read this receipt and return JSON only with merchant, amount (number, the grand total paid), date (YYYY-MM-DD), category (one of ${CATEGORIES.join(", ")}), description (short), and items (array of {name, price}). Use null for unreadable fields.`;
  const imagePart = { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` } };

  try {
    let content = "";
    let usage = {};
    let provider = "";
    let lastError;

    // Try the configured providers in order. A stale/temporarily unavailable
    // NVIDIA model should not make receipt scanning fail when Groq is ready.
    const providers = [
      useNvidia && { name: "NVIDIA", run: async () => {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.nvidiaApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.nvidiaVisionModel,
            temperature: 0,
            max_tokens: 1024,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, imagePart] }],
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(`NVIDIA ${response.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`);
        }
        return { content: body.choices?.[0]?.message?.content || "", usage: body.usage || {} };
      } },
      useGroq && { name: "Groq", run: async () => {
        const groq = new Groq({ apiKey: env.groqApiKey });
        const response = await groq.chat.completions.create({
          model: env.groqVisionModel,
          temperature: 0,
          max_tokens: 600,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, imagePart] }],
        });
        return { content: response.choices?.[0]?.message?.content || "", usage: response.usage || {} };
      } },
    ].filter(Boolean);

    for (const candidate of providers) {
      try {
        const result = await candidate.run();
        const parsed = extractJSON(result.content || "{}");
        if (!Number.isFinite(Number(parsed?.amount)) || Number(parsed.amount) <= 0) {
          throw new Error(`${candidate.name} returned an unreadable receipt response.`);
        }
        ({ content, usage } = result);
        provider = candidate.name;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Receipt scan ${candidate.name} provider failed:`, error.message);
      }
    }
    if (!provider) throw lastError || new Error("No vision provider completed the request.");

    const model = provider === "NVIDIA" ? env.nvidiaVisionModel : env.groqVisionModel;
    logAiEvent(req, { feature: "receipt", model, latencyMs: Date.now() - started, usage, success: true });

    const raw = extractJSON(content || "{}");
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
    logAiEvent(req, { feature: "receipt", model: useNvidia ? env.nvidiaVisionModel : env.groqVisionModel, latencyMs: Date.now() - started, success: false, error: error.message });
    console.error("Receipt scan error:", error.message);
    const modelMissing = /model_not_found|does not exist/i.test(error.message);
    const creditExhausted = /402|403|quota|credit|unauthorized/i.test(error.message);
    res.status(modelMissing || creditExhausted ? 503 : 502).json({
      success: false,
      message: modelMissing
        ? `The configured vision model is unavailable. Update NVIDIA_VISION_MODEL in server/.env — model catalog: https://build.nvidia.com/models`
        : creditExhausted
          ? "The vision provider rejected the request (quota/credits). NVIDIA free trial credits may be exhausted — see build.nvidia.com, or add the expense manually."
          : "The vision model could not read this receipt. Try a sharper, well-lit image.",
    });
  }
};

function logAiEvent(req, { feature, model = null, latencyMs, usage = {}, success, error = null }) {
  try {
    AiEvent.insert({
      userId: req.user?._id ?? null,
      feature,
      model: model || env.groqVisionModel || env.nvidiaVisionModel,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      latencyMs,
      success,
      error,
    });
  } catch { /* telemetry must never break the request */ }
}
