import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";

async function main() {
  const channels = await db.select().from(schema.channels);
  console.log("=== Registered Channels ===");
  for (const c of channels) {
    console.log(`ID: ${c.id}`);
    console.log(`Name: ${c.name}`);
    console.log(`Phone: ${c.phoneNumber}`);
    console.log(`CreatedBy (Tenant): ${c.createdBy}`);
    console.log("------------------------");
  }
}

main().catch(console.error);
