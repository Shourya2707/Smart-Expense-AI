const { env, validate } = require("./config/env");
const { connectDB } = require("./config/db");
const app = require("./app");

try {
  validate();
} catch (error) {
  console.error(`\n❌ Startup failed: ${error.message}\n`);
  process.exit(1);
}

connectDB()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`\n🚀 SmartExpense AI Server running on http://localhost:${env.port}`);
      console.log(`   Mode: ${env.nodeEnv} | AI: ${env.groqApiKey ? "Groq (" + env.groqTextModel + ")" : "offline fallback"}\n`);
    });
  })
  .catch((error) => {
    console.error("Database init failed:", error);
    process.exit(1);
  });
