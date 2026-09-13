import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const API = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// On 401, return the user to login. Authentication itself lives in the
// HttpOnly session cookie and is never copied into JavaScript storage.
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      const requestUrl = err.config?.url || "";
      if (!requestUrl.includes("/api/auth/me") && !path.includes("/login") && !path.includes("/signup")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Streaming chat with the AI assistant (SSE). Server events:
 * {type:"start"} | {type:"token",text} | {type:"tool",name,args,result}
 * | {type:"done",messageId} | {type:"error",message}
 */
export const streamChat = ({ message, sessionId = "default", signal, onEvent }) =>
  new Promise((resolve, reject) => {
    fetch(`${apiBaseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message, sessionId }),
      signal,
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) {
        let messageText = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          messageText = body.message || messageText;
        } catch { /* not JSON */ }
        if (response.status === 401) window.location.href = "/login";
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

export const googleAuthUrl = `${apiBaseUrl}/api/auth/google`;
export const googleLinkUrl = `${apiBaseUrl}/api/auth/google/link`;

export default API;
