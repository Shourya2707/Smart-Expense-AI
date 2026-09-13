const { db, user, safeUser } = require("../config/db");

const byEmail = (email) => user(db.prepare("SELECT * FROM users WHERE email = ?").get(email));

module.exports = {
  findOne: async (email) => byEmail(email),
  findByEmail: async (email) => byEmail(email),
  findByGoogleId: async (googleId) => user(db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId)),
  findById: async (id) => user(db.prepare("SELECT * FROM users WHERE id = ?").get(id)),
  findSafeById: async (id) => safeUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)),
  create: async (data) => {
    const result = db.prepare(`
      INSERT INTO users (full_name, email, password, auth_provider, google_id, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.fullName, data.email, data.password, data.authProvider || "local", data.googleId || null, data.avatarUrl || null);
    return user(db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid));
  },
  linkGoogle: async (id, { googleId, avatarUrl }) => {
    db.prepare("UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?")
      .run(googleId, avatarUrl || null, id);
    return user(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },
  update: async (id, { fullName, password, avatarUrl }) => {
    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          password = COALESCE(?, password),
          avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).run(fullName ?? null, password ?? null, avatarUrl ?? null, id);
    return user(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },
};
