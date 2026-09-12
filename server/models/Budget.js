const { db } = require("../config/db");

// Row → API object mapper (snake_case columns → camelCase fields).
const budget = (row) => row && { _id: row.id, id: row.id, userId: row.user_id, category: row.category, monthlyLimit: row.monthly_limit, createdAt: row.created_at };

module.exports = {
  list: async (userId) => db.prepare("SELECT * FROM budgets WHERE user_id = ? ORDER BY category ASC").all(userId).map(budget),
  upsert: async (userId, category, monthlyLimit) => {
    // One row per (user, category): insert or refresh the limit.
    db.prepare(`INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)
      ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit`)
      .run(userId, category, monthlyLimit);
    return budget(db.prepare("SELECT * FROM budgets WHERE user_id = ? AND category = ?").get(userId, category));
  },
  remove: (userId, category) => db.prepare("DELETE FROM budgets WHERE user_id = ? AND category = ?").run(userId, category),
};
