const { db, expense } = require("../config/db");

module.exports = {
  list: async (userId) => db.prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC").all(userId).map(expense),
  create: async (data) => {
    const result = db.prepare("INSERT INTO expenses (user_id, amount, category, description, date) VALUES (?, ?, ?, ?, ?)")
      .run(data.userId, data.amount, data.category, data.description, data.date);
    return expense(db.prepare("SELECT * FROM expenses WHERE id = ?").get(result.lastInsertRowid));
  },
  findById: async (id) => expense(db.prepare("SELECT * FROM expenses WHERE id = ?").get(id)),
  update: async (id, fields) => {
    const keys = Object.keys(fields);
    if (keys.length) {
      // Column names come from the controller whitelist, never from user input directly.
      const assigns = keys.map((key) => `${key === "userId" ? "user_id" : key} = @${key}`).join(", ");
      db.prepare(`UPDATE expenses SET ${assigns} WHERE id = @id`).run({ ...fields, id });
    }
    return expense(db.prepare("SELECT * FROM expenses WHERE id = ?").get(id));
  },
  remove: (id) => db.prepare("DELETE FROM expenses WHERE id = ?").run(id),
};
