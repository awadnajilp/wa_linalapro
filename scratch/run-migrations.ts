import "dotenv/config";
import { pool } from "../server/db";
import { runStartupMigration } from "../server/startup-migration";

async function main() {
  console.log("🚀 Running startup migrations...");
  await runStartupMigration(pool);
  console.log("✅ Startup migrations completed!");
  await pool.end();
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await pool.end();
});
