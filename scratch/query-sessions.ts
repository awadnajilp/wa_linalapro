import "dotenv/config";
import { db } from "../server/db";
import { ecommerceSessions } from "../shared/schema";

async function main() {
  console.log("=== ACTIVE ECOMMERCE SESSIONS ===");
  const sessions = await db.select().from(ecommerceSessions);
  console.log(JSON.stringify(sessions, null, 2));
}

main().catch(console.error);
