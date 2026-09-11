/**
 * Seeds a demo account with ~3 months of hardcoded transactions so the UI,
 * analytics and AI tools can be exercised without touching real user data.
 *
 *   npm run seed
 *
 * Login afterwards with: demo@smartexpense.app / Demo@12345
 * Re-running is safe: existing demo transactions are replaced, not duplicated.
 */
const bcrypt = require("bcrypt");
const { db, connectDB } = require("../config/db");

const DEMO_EMAIL = "demo@smartexpense.app";
const DEMO_PASSWORD = "Demo@12345";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const startOfMonth = (offset) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return iso(d);
};

// ---- Hardcoded dataset -----------------------------------------------------
// Salary on the 1st of each of the last 3 months, plus varied expenses.
const INCOME = [
  { amount: 65000, source: "Salary", date: startOfMonth(2) },
  { amount: 65000, source: "Salary", date: startOfMonth(1) },
  { amount: 65000, source: "Salary", date: startOfMonth(0) },
  { amount: 12000, source: "Freelancing", date: startOfMonth(1).slice(0, 8) + "15" },
  { amount: 8000, source: "Freelancing", date: daysAgo(6) },
  { amount: 5000, source: "Investments", date: startOfMonth(0).slice(0, 8) + "10" },
];

const EXPENSES = [
  // Month -3
  { amount: 1450.5, category: "Food", description: "Big Bazaar groceries", date: daysAgo(85) },
  { amount: 1200, category: "Bills", description: "Electricity bill", date: daysAgo(84) },
  { amount: 450, category: "Travel", description: "Uber to office", date: daysAgo(83) },
  { amount: 899, category: "Entertainment", description: "Netflix subscription", date: daysAgo(82) },
  { amount: 2300, category: "Shopping", description: "Amazon — kitchen supplies", date: daysAgo(80) },
  // Month -2
  { amount: 2100.75, category: "Food", description: "Monthly groceries — Reliance Fresh", date: daysAgo(55) },
  { amount: 150, category: "Food", description: "Blue Tokai coffee", date: daysAgo(54) },
  { amount: 1450, category: "Bills", description: "Electricity bill", date: daysAgo(53) },
  { amount: 799, category: "Bills", description: "Airtel broadband", date: daysAgo(52) },
  { amount: 1850, category: "Travel", description: "IRCTC — weekend trip", date: daysAgo(50) },
  { amount: 320, category: "Food", description: "Swiggy dinner", date: daysAgo(48) },
  { amount: 1500, category: "Health", description: "Apollo pharmacy — vitamins", date: daysAgo(45) },
  { amount: 4999, category: "Shopping", description: "Myntra — winter jacket", date: daysAgo(42) },
  { amount: 600, category: "Entertainment", description: "PVR — movie night", date: daysAgo(40) },
  { amount: 2500, category: "Education", description: "Udemy — React course", date: daysAgo(38) },
  // Month -1
  { amount: 1950.25, category: "Food", description: "Monthly groceries", date: daysAgo(25) },
  { amount: 1380, category: "Bills", description: "Electricity bill", date: daysAgo(24) },
  { amount: 799, category: "Bills", description: "Airtel broadband", date: daysAgo(23) },
  { amount: 950, category: "Travel", description: "Ola airport ride", date: daysAgo(21) },
  { amount: 420, category: "Food", description: "Zomato lunch", date: daysAgo(20) },
  { amount: 1200, category: "Entertainment", description: "Concert tickets", date: daysAgo(18) },
  { amount: 780, category: "Health", description: "Gym membership", date: daysAgo(16) },
  { amount: 2999, category: "Shopping", description: "Decathlon — running shoes", date: daysAgo(14) },
  { amount: 1100.5, category: "Food", description: "Domino's party order", date: daysAgo(12) },
  // Current month
  { amount: 1650, category: "Food", description: "Monthly groceries", date: daysAgo(9) },
  { amount: 1420, category: "Bills", description: "Electricity bill", date: daysAgo(8) },
  { amount: 799, category: "Bills", description: "Airtel broadband", date: daysAgo(7) },
  { amount: 350, category: "Travel", description: "Metro card recharge", date: daysAgo(6) },
  { amount: 540, category: "Food", description: "Zomato dinner", date: daysAgo(5) },
  { amount: 1250, category: "Shopping", description: "Crocs — sandals", date: daysAgo(4) },
  { amount: 285.75, category: "Food", description: "Starbucks latte", date: daysAgo(3) },
  { amount: 640, category: "Entertainment", description: "BookMyShow — movie", date: daysAgo(2) },
  { amount: 750, category: "Health", description: "Pharmacy — cold medicine", date: daysAgo(1) },
  { amount: 199.5, category: "Food", description: "Chai Point evening snack", date: daysAgo(0) },
];
// -----------------------------------------------------------------------------

function seed() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);
  const hashed = bcrypt.hashSync(DEMO_PASSWORD, 10);
  let userId;

  if (existing) {
    userId = existing.id;
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, userId);
    db.prepare("DELETE FROM expenses WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM income WHERE user_id = ?").run(userId);
    console.log(`Reset existing demo user #${userId}.`);
  } else {
    const result = db.prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)")
      .run("Demo User", DEMO_EMAIL, hashed);
    userId = result.lastInsertRowid;
    console.log(`Created demo user #${userId}.`);
  }

  const insertExpense = db.prepare("INSERT INTO expenses (user_id, amount, category, description, date) VALUES (?, ?, ?, ?, ?)");
  const insertIncome = db.prepare("INSERT INTO income (user_id, amount, source, date) VALUES (?, ?, ?, ?)");
  const insertAll = db.transaction(() => {
    EXPENSES.forEach((e) => insertExpense.run(userId, e.amount, e.category, e.description, e.date));
    INCOME.forEach((i) => insertIncome.run(userId, i.amount, i.source, i.date));
  });
  insertAll();

  console.log(`Seeded ${EXPENSES.length} expenses and ${INCOME.length} income records.`);
  console.log(`\nLogin: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
  return userId;
}

connectDB().then(() => {
  try {
    seed();
  } finally {
    db.close();
  }
});
