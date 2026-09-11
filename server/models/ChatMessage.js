const { db, chatMessage } = require("../config/db");

const CONTEXT_MESSAGES = 12; // recent turns replayed into the LLM context

module.exports = {
  list: async (userId, sessionId = "default", limit = 50) =>
    db.prepare("SELECT * FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY id DESC LIMIT ?")
      .all(userId, sessionId, limit)
      .map(chatMessage)
      .reverse(),
  recentForContext: async (userId, sessionId = "default") =>
    db.prepare("SELECT * FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY id DESC LIMIT ?")
      .all(userId, sessionId, CONTEXT_MESSAGES)
      .map(chatMessage)
      .reverse(),
  append: (userId, role, content, sessionId = "default") => {
    const result = db.prepare("INSERT INTO chat_messages (user_id, session_id, role, content) VALUES (?, ?, ?, ?)")
      .run(userId, sessionId, role, content);
    return chatMessage(db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(result.lastInsertRowid));
  },
  clear: (userId, sessionId = "default") =>
    db.prepare("DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?").run(userId, sessionId),
};
