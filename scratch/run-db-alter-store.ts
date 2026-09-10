import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== RUNNING DATABASE ALTER FOR STORE DETAILS ===");
  await db.execute(sql`ALTER TABLE ecommerce_configs ADD COLUMN IF NOT EXISTS store_name text;`);
  await db.execute(sql`ALTER TABLE ecommerce_configs ADD COLUMN IF NOT EXISTS store_address text;`);
  await db.execute(sql`ALTER TABLE ecommerce_configs ADD COLUMN IF NOT EXISTS store_website text;`);
  await db.execute(sql`ALTER TABLE ecommerce_configs ADD COLUMN IF NOT EXISTS store_logo text;`);
  console.log("✅ Store identity columns (store_name, store_address, store_website, store_logo) added successfully!");
}

main().catch(console.error);
