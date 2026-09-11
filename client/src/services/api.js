import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/** Attach JWT from localStorage on every request */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

/** On 401, clear session and redirect to login */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const path = window.location.pathname;
      if (!path.includes("/login") && !path.includes("/signup")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Streaming chat with the AI assistant (SSE). Server events:
 *   {type:"start"} | {type:"token",text} | {type:"tool",name,args,result}
 *   | {type:"done",messageId} | {type:"error",message}
 * onEvent is called for each parsed event; resolves with the full text.
 */
export const streamChat = ({ message, sessionId = "default", signal, onEvent }) =>
  new Promise((resolve, reject) => {
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ message, sessionId }),
      signal,
    }).then(async (response) => {
      if (!response.ok) {
        let messageText = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          messageText = body.message || messageText;
        } catch { /* not JSON */ }
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        reject(new Error(messageText));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "token") full += event.text;
            onEvent?.(event);
          } catch { /* partial JSON — ignore */ }
        }
      }
      resolve(full);
    }).catch((error) => {
      if (error.name === "AbortError") resolve("");
      else reject(error);
    });
  });

export const fetchChatHistory = (sessionId = "default") =>
  API.get(`/api/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`);

export const resetChat = (sessionId = "default") =>
  API.post("/api/ai/chat/reset", { sessionId });

export default API;
