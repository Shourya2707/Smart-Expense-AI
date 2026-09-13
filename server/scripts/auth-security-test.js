const assert = require("assert/strict");
const app = require("../app");
const { db, connectDB } = require("../config/db");
const Session = require("../models/Session");
const PasswordResetToken = require("../models/PasswordResetToken");

const json = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const firstCookie = (response) => response.headers.getSetCookie?.()[0]?.split(";", 1)[0] || "";

async function main() {
  await connectDB();
  const server = app.listen(0);
  const baseUrl = await new Promise((resolve) => server.once("listening", () => resolve(`http://127.0.0.1:${server.address().port}`)));
  const email = `auth_test_${Date.now()}@test.local`;
  let cookie = "";
  let userId;

  try {
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Auth Security Test", email, password: "Auth@12345" }),
    });
    const registered = await json(registerResponse);
    cookie = firstCookie(registerResponse);
    userId = registered.user.id;
    const sessionCookie = registerResponse.headers.getSetCookie?.()[0] || "";
    assert.equal(registerResponse.status, 201);
    assert.equal(registered.token, undefined, "authentication token must not be returned in JSON");
    assert.match(sessionCookie, /HttpOnly/i);
    assert.match(sessionCookie, /Path=\/api/i);
    assert.match(sessionCookie, /SameSite=Lax/i);
    assert.match(sessionCookie, /Max-Age=/i);
    assert.ok(cookie, "register must set a session cookie");

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(meResponse.status, 200);
    assert.equal((await json(meResponse)).user.email, email);

    const storedSession = db.prepare("SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId);
    assert.ok(storedSession);
    assert.notEqual(storedSession.token_hash, cookie.split("=")[1], "raw session token must not be stored");

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(logoutResponse.status, 200);
    const revokedResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(revokedResponse.status, 401, "logout must revoke the server session");

    const callbackFailure = await fetch(`${baseUrl}/api/auth/google/callback?state=bad&code=bad`, { redirect: "manual" });
    assert.equal(callbackFailure.status, 302);
    assert.match(callbackFailure.headers.get("location") || "", /oauth_state_missing/);

    const reset = await PasswordResetToken.create(userId, 60);
    assert.ok(await PasswordResetToken.findValid(reset.token));
    assert.equal(await PasswordResetToken.consume((await PasswordResetToken.findValid(reset.token)).id), true);
    assert.equal(await PasswordResetToken.findValid(reset.token), null, "reset token must be single-use");
    const expired = await PasswordResetToken.create(userId, -1);
    assert.equal(await PasswordResetToken.findValid(expired.token), null, "expired reset token must be rejected");

    console.log("Auth security test passed: cookie session, revocation, OAuth failure handling, and reset-token rules.");
  } finally {
    if (userId) db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error("Auth security test failed:", error.message);
  process.exit(1);
});
