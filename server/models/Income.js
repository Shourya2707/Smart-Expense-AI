const { db, income } = require("../config/db");

module.exports = {
  list: async (userId) => db.prepare("SELECT * FROM income WHERE user_id = ? ORDER BY date DESC, id DESC").all(userId).map(income),
  create: async (data) => {
    const result = db.prepare("INSERT INTO income (user_id, amount, source, date) VALUES (?, ?, ?, ?)")
      .run(data.userId, data.amount, data.source, data.date);
    return income(db.prepare("SELECT * FROM income WHERE id = ?").get(result.lastInsertRowid));
  },
  findById: async (id) => income(db.prepare("SELECT * FROM income WHERE id = ?").get(id)),
  update: async (id, fields) => {
    const keys = Object.keys(fields);
    if (keys.length) {
      const assigns = keys.map((key) => `${key === "userId" ? "user_id" : key} = @${key}`).join(", ");
      db.prepare(`UPDATE income SET ${assigns} WHERE id = @id`).run({ ...fields, id });
    }
    return income(db.prepare("SELECT * FROM income WHERE id = ?").get(id));
  },
  remove: (id) => db.prepare("DELETE FROM income WHERE id = ?").run(id),
};
