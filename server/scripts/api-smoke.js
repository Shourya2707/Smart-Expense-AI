/**
 * End-to-end API smoke test for SmartExpense AI. Talks to a LIVE server over
 * HTTP only (no direct DB access) and walks the full user journey:
 * health → register → me → expenses CRUD → income → analytics → budgets →
 * AI chat (SSE) → chat history → auth/admin guards.
 *
 *   npm run smoke
 *
 * Target: process.env.SMOKE_BASE_URL || http://localhost:5001 — the dev server
 * must already be running (`npm run dev` from server/). Safe to re-run: every
 * run registers a fresh unique user, so assertions only see its own data.
 */
const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:5001";

let total = 0;
let failures = 0;
let sessionCookie = "";

function check(label, cond, detail = "") {
  total += 1;
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const approx = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

/** Compact one-line body preview for check details. */
const preview = (res) => {
  const body = res.json ? JSON.stringify(res.json) : String(res.text || "").slice(0, 120);
  return `status=${res.status} ${body.slice(0, 140)}`;
};

/** Minimal JSON fetch wrapper returning { status, json, text }. */
async function request(method, path, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (sessionCookie) headers.Cookie = sessionCookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const value of setCookies) {
    const pair = value.split(";", 1)[0];
    if (pair.startsWith("se_session=")) sessionCookie = pair.endsWith("=") ? "" : pair;
  }
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: res.status, json, text };
}

/**
 * POST /api/ai/chat and consume the SSE stream. Events arrive as blocks of
 * `data: {json}\n\n`. Returns { status, events }; aborts after 60s so a stuck
 * stream can never hang the whole run.
 */
async function chatSse(message, token) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 60000);
  const events = [];
  let status = 0;
  try {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({ message }),
      signal: ac.signal,
    });
    status = res.status;
    const decoder = new TextDecoder();
    let buffer = "";
    if (res.body) {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          for (const line of block.split("\n")) {
            if (line.startsWith("data: ")) {
              try { events.push(JSON.parse(line.slice(6))); } catch { /* ignore partial */ }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`  (chat stream ended early: ${ac.signal.aborted ? "timed out after 60s" : error.message})`);
  } finally {
    clearTimeout(timer);
  }
  return { status, events };
}

async function main() {
  console.log(`\nSmartExpense AI API smoke test — ${BASE_URL}\n`);

  // ---- 1. Health (doubles as the reachability gate) --------------------------
  let health;
  try {
    health = await request("GET", "/");
  } catch (error) {
    console.error(`\nServer not reachable at ${BASE_URL} — start it with: npm run dev (from server/)`);
    console.error(`(${error.cause?.code || error.message})\n`);
    process.exit(1);
  }
  check("Health: GET / → success true", health.status === 200 && health.json?.success === true, preview(health));

  // ---- 2-3. Auth: register + me ----------------------------------------------
  console.log("\n— Auth —");
  const email = `smoke_${Date.now()}@test.local`;
  let token = null;
  try {
    const reg = await request("POST", "/api/auth/register", {
      body: { fullName: "Smoke Test", email, password: "Smoke@12345" },
    });
    check("Register returns 201 with session cookie + user.id", reg.status === 201 && Boolean(sessionCookie) && Boolean(reg.json?.user?.id), preview(reg));
    token = sessionCookie || null;

    if (token) {
      const me = await request("GET", "/api/auth/me", { token });
      check("GET /api/auth/me → registered email", me.status === 200 && me.json?.user?.email === email, preview(me));
    } else {
      check("GET /api/auth/me → registered email", false, "skipped — no token from register");
    }
  } catch (error) {
    check("Auth", false, error.message);
  }

  // Everything below needs the token; bail per-section instead of crashing.
  const haveToken = (section) => {
    if (token) return true;
    check(section, false, "skipped — no auth token (register failed)");
    return false;
  };

  // ---- 4. Expenses CRUD -------------------------------------------------------
  console.log("\n— Expenses —");
  if (haveToken("Expenses CRUD")) {
    try {
      const first = await request("POST", "/api/expenses", {
        token,
        body: { amount: 250.5, category: "Food", description: "Smoke lunch", date: "2026-09-10" },
      });
      check("Create 250.5/Food → 201", first.status === 201 && Boolean(first.json?.data?.id), preview(first));

      const second = await request("POST", "/api/expenses", {
        token,
        body: { amount: 100, category: "Bills", description: "Smoke bill", date: "2026-09-11" },
      });
      check("Create 100/Bills → 201", second.status === 201 && Boolean(second.json?.data?.id), preview(second));

      const invalid = await request("POST", "/api/expenses", {
        token,
        body: { amount: -5, category: "Food", description: "Negative amount", date: "2026-09-10" },
      });
      check("Invalid create (amount:-5) → 400", invalid.status === 400, preview(invalid));

      const firstId = first.json?.data?.id;
      const secondId = second.json?.data?.id;

      if (firstId) {
        const updated = await request("PUT", `/api/expenses/${firstId}`, { token, body: { amount: 300 } });
        check("PUT first expense amount → 300", updated.status === 200 && approx(updated.json?.data?.amount, 300), preview(updated));
      }

      const listed = await request("GET", "/api/expenses", { token });
      check("GET /api/expenses → 2 rows", (listed.json?.data || []).length === 2, preview(listed));

      if (secondId) {
        const removed = await request("DELETE", `/api/expenses/${secondId}`, { token });
        check("DELETE second expense", removed.status === 200 && removed.json?.success === true, preview(removed));
      }

      const remaining = await request("GET", "/api/expenses", { token });
      const rows = remaining.json?.data || [];
      check("After delete → 1 row with amount 300", rows.length === 1 && approx(rows[0]?.amount, 300), preview(remaining));
    } catch (error) {
      check("Expenses CRUD", false, error.message);
    }
  }

  // ---- 5. Income ---------------------------------------------------------------
  console.log("\n— Income —");
  if (haveToken("Income")) {
    try {
      const created = await request("POST", "/api/income", {
        token,
        body: { amount: 1000, source: "Salary", date: "2026-09-10" },
      });
      check("Create 1000/Salary income → 201", created.status === 201, preview(created));

      const invalid = await request("POST", "/api/income", {
        token,
        body: { amount: 100, source: "Lottery", date: "2026-09-10" },
      });
      check("Invalid income source → 400", invalid.status === 400, preview(invalid));
    } catch (error) {
      check("Income", false, error.message);
    }
  }

  // ---- 6. Analytics --------------------------------------------------------------
  console.log("\n— Analytics —");
  if (haveToken("Analytics")) {
    try {
      const res = await request("GET", "/api/analytics", { token });
      const a = res.json?.data || {};
      check("totalExpenses === 300", approx(a.totalExpenses, 300), `got ${a.totalExpenses} — ${preview(res)}`);
      check("totalIncome === 1000", approx(a.totalIncome, 1000), `got ${a.totalIncome}`);
      check("currentBalance === 700", approx(a.currentBalance, 700), `got ${a.currentBalance}`);
      check("totalTransactions === 2", a.totalTransactions === 2, `got ${a.totalTransactions}`);
    } catch (error) {
      check("Analytics", false, error.message);
    }
  }

  // ---- 7. Budgets -----------------------------------------------------------------
  console.log("\n— Budgets —");
  if (haveToken("Budgets")) {
    try {
      const first = await request("POST", "/api/budgets", { token, body: { category: "Food", monthlyLimit: 500 } });
      check("Create Food budget 500 → 201", first.status === 201, preview(first));

      const upsert = await request("POST", "/api/budgets", { token, body: { category: "Food", monthlyLimit: 600 } });
      check("Upsert Food budget to 600", upsert.status === 200 || upsert.status === 201, preview(upsert));

      const list = await request("GET", "/api/budgets", { token });
      const budgets = Array.isArray(list.json?.data) ? list.json.data : [];
      const food = budgets.filter((b) => b?.category === "Food");
      check("Exactly one Food budget after upsert", food.length === 1, `${food.length} Food budget(s) of ${budgets.length} total — ${preview(list)}`);

      if (food[0]) {
        check("Food budget monthlyLimit === 600", Number(food[0].monthlyLimit) === 600, `got ${food[0].monthlyLimit}`);
        check("Food budget spent === 300", approx(food[0].spent, 300), `got ${food[0].spent}`);
        check("Food budget pct === 50", approx(food[0].pct, 50), `got ${food[0].pct}`);
        check("Food budget status === 'ok' (300 of 600)", food[0].status === "ok", `got ${food[0].status}`);
      }

      const removed = await request("DELETE", "/api/budgets/Food", { token });
      check("DELETE /api/budgets/Food", removed.status >= 200 && removed.status < 300, preview(removed));

      const after = await request("GET", "/api/budgets", { token });
      const remaining = Array.isArray(after.json?.data) ? after.json.data : [];
      check("Budgets empty after delete", after.status >= 200 && after.status < 300 && remaining.length === 0, preview(after));
    } catch (error) {
      check("Budgets", false, error.message);
    }
  }

  // ---- 8. AI chat over SSE ----------------------------------------------------------
  console.log("\n— AI chat (SSE) —");
  if (haveToken("AI chat")) {
    try {
      const { status, events } = await chatSse("spent 42.50 on tea stall today", token);
      const toolEvent = events.find((e) => e?.type === "tool" && e?.name === "add_expense");
      check("Chat stream returns 200", status === 200, `status=${status} events=${events.length}`);
      check("SSE got add_expense tool event with result.ok", Boolean(toolEvent?.result?.ok), `${toolEvent ? JSON.stringify(toolEvent) : "no add_expense tool event"}`);
      check("SSE got done event", events.some((e) => e?.type === "done"), `event types: ${events.map((e) => e?.type).join(",") || "none"}`);

      const list = await request("GET", "/api/expenses", { token });
      const tea = (list.json?.data || []).find((e) => approx(e?.amount, 42.5) && /tea stall/i.test(e?.description || ""));
      check("Chat logged a 42.5 'tea stall' expense", Boolean(tea), tea ? `category=${tea.category} date=${tea.date}` : preview(list));
      check("Chat expense category is Food or Others", tea?.category === "Food" || tea?.category === "Others", `got ${tea?.category}`);
    } catch (error) {
      check("AI chat", false, error.message);
    }
  }

  // ---- 9. Chat history ----------------------------------------------------------------
  console.log("\n— Chat history —");
  if (haveToken("Chat history")) {
    try {
      const res = await request("GET", "/api/ai/chat/history", { token });
      const messages = Array.isArray(res.json?.data) ? res.json.data : [];
      const roles = new Set(messages.map((m) => m?.role));
      check("History has ≥2 messages incl. user + assistant", messages.length >= 2 && roles.has("user") && roles.has("assistant"), `count=${messages.length} roles=[${[...roles].join(",")}]`);
    } catch (error) {
      check("Chat history", false, error.message);
    }
  }

  // ---- 10-11. Guards --------------------------------------------------------------------
  console.log("\n— Guards —");
  try {
    const loggedOut = await request("POST", "/api/auth/logout", { token });
    check("POST /api/auth/logout revokes session", loggedOut.status === 200 && !sessionCookie, preview(loggedOut));
    const noToken = await request("GET", "/api/expenses");
    check("GET /api/expenses with no token → 401", noToken.status === 401, preview(noToken));
    const relogin = await request("POST", "/api/auth/login", { body: { email, password: "Smoke@12345" } });
    token = sessionCookie || null;
    check("Re-login creates a fresh session", relogin.status === 200 && Boolean(token), preview(relogin));
  } catch (error) {
    check("Auth guard", false, error.message);
  }

  if (haveToken("Admin guard")) {
    try {
      const res = await request("GET", "/api/admin/overview", { token });
      check("GET /api/admin/overview as non-admin → 403", res.status === 403, preview(res));
    } catch (error) {
      check("Admin guard", false, error.message);
    }
  }

  console.log(
    failures === 0
      ? `\n🎉 ${total} checks, 0 failed — API smoke passed.\n`
      : `\n💥 ${total} checks, ${failures} failed.\n`
  );
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error("Smoke run failed:", error);
  process.exit(1);
});
