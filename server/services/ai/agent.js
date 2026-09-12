const { ChatGroq } = require("@langchain/groq");
const { SystemMessage, HumanMessage, ToolMessage } = require("@langchain/core/messages");
const { env } = require("../../config/env");
const { buildTools } = require("./tools");
const AiEvent = require("../../models/AiEvent");
const { CATEGORIES, SOURCES, todayISO } = require("../analyticsService");
const { runFallback } = require("./fallback");

const MAX_STEPS = 5; // tool-calling iterations before we force a final answer

function systemPrompt() {
  return [
    "You are the SmartExpense AI assistant — a personal finance copilot for an Indian user (currency: ₹ INR).",
    `Today's date is ${todayISO()}. Resolve relative dates yourself: 'yesterday' = ${todayISO()} minus 1 day, 'last month' = the previous calendar month.`,
    "",
    "RULES:",
    `- To record a transaction or answer any question about the user's money, ALWAYS use a tool. Never invent numbers.`,
    `- Expense categories: ${CATEGORIES.join(", ")}. Income sources: ${SOURCES.join(", ")}.`,
    `- If a tool returns ok:false, tell the user what was wrong and how to fix it (e.g. valid categories).`,
    "- After a successful add_expense or add_income, confirm in one short sentence with the amount, category/source and date.",
    "- When answering questions, quote exact numbers from tool results, add one short insight, and keep the whole reply under 120 words.",
    "- Be warm but concise. No markdown headers. Plain text or simple dashes only.",
  ].join("\n");
}

function chunkText(chunk) {
  return typeof chunk.content === "string" ? chunk.content : "";
}

/**
 * Tool-calling agent loop on LangChain + Groq.
 * Streams final-answer tokens through onEvent({type:"token", text}) and tool
 * executions through onEvent({type:"tool", name, args, result}).
 * Returns the final answer string.
 */
async function runAgent({ userId, userMessage, history = [], onEvent }) {
  if (!env.groqApiKey) {
    return runFallback({ userId, userMessage, onEvent });
  }

  const tools = buildTools(userId);
  const model = new ChatGroq({ apiKey: env.groqApiKey, model: env.groqTextModel, temperature: 0.2, maxTokens: 800 });
  const bound = model.bindTools(tools);

  const messages = [
    new SystemMessage(systemPrompt()),
    ...history.map((m) => (m.role === "user" ? new HumanMessage(m.content) : new SystemMessage(`Previous assistant reply: ${m.content}`))),
    new HumanMessage(userMessage),
  ];

  const started = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let mutatingToolRan = false; // if we fail after a write, fallback must not re-write

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const lastTurn = step === MAX_STEPS - 1;
      // Last turn: answer without tools so the loop always terminates.
      const responder = lastTurn ? model : bound;
      let merged = null;

      const stream = await responder.stream(messages);
      for await (const chunk of stream) {
        merged = merged ? merged.concat(chunk) : chunk;
        const delta = chunkText(chunk);
        if (delta) onEvent?.({ type: "token", text: delta });
      }
      if (!merged) throw new Error("Empty response from Groq");

      promptTokens += merged.usage_metadata?.input_tokens ?? 0;
      completionTokens += merged.usage_metadata?.output_tokens ?? 0;

      messages.push(merged);
      const calls = merged.tool_calls || [];
      if (!calls.length) {
        const text = typeof merged.content === "string" ? merged.content : String(merged.content ?? "");
        AiEvent.insert({ userId, feature: "chat", model: env.groqTextModel, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, latencyMs: Date.now() - started, success: true });
        return text;
      }

      for (const call of calls) {
        const toolStarted = Date.now();
        const target = tools.find((t) => t.name === call.name);
        let result;
        try {
          result = target ? await target.invoke(call.args) : { ok: false, error: `Unknown tool: ${call.name}` };
        } catch (error) {
          result = { ok: false, error: error.message };
        }
        if (["add_expense", "add_income"].includes(call.name)) mutatingToolRan = true;
        onEvent?.({ type: "tool", name: call.name, args: call.args, result });
        AiEvent.insert({
          userId,
          feature: "tool",
          model: env.groqTextModel,
          toolName: call.name,
          latencyMs: Date.now() - toolStarted,
          success: Boolean(result?.ok ?? true),
          error: result?.ok === false ? String(result.error || "tool error") : null,
        });
        messages.push(new ToolMessage({ content: JSON.stringify(result), tool_call_id: call.id }));
      }
    }
    throw new Error("Agent exceeded max tool iterations");
  } catch (error) {
    console.warn("Agent error, falling back:", error.message);
    AiEvent.insert({ userId, feature: "chat", model: env.groqTextModel, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, latencyMs: Date.now() - started, success: false, error: error.message });
    return runFallback({ userId, userMessage, onEvent, skipAdds: mutatingToolRan });
  }
}

module.exports = { runAgent, systemPrompt };
