const { db, user, safeUser } = require("../config/db");

module.exports = {
  findOne: async (email) => user(db.prepare("SELECT * FROM users WHERE email = ?").get(email)),
  findById: async (id) => user(db.prepare("SELECT * FROM users WHERE id = ?").get(id)),
  findSafeById: async (id) => safeUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)),
  create: async (data) => {
    const result = db.prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)").run(data.fullName, data.email, data.password);
    return user(db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid));
  },
  update: async (id, { fullName, password }) => {
    db.prepare("UPDATE users SET full_name = COALESCE(?, full_name), password = COALESCE(?, password) WHERE id = ?")
      .run(fullName ?? null, password ?? null, id);
    return user(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },
};
