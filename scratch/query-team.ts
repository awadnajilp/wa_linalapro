import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== INSPECT CREATOR USER ===");
  const creatorUser = await db.select().from(users).where(eq(users.id, "7d40d226-8332-4610-9dad-7337c6f5f804")).limit(1);
  console.log(JSON.stringify(creatorUser, null, 2));
}

main().catch(console.error);
