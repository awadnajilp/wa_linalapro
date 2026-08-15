import { db } from "./db";
import { sql } from "drizzle-orm";

async function runAlter() {
  console.log("Adding notification_channel_id to users table...");
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_channel_id varchar;`);
  
  console.log("Adding is_follow_up_reminder_sent to crm_deals table...");
  await db.execute(sql`ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS is_follow_up_reminder_sent boolean DEFAULT false;`);
  
  console.log("Database schema altered successfully!");
  process.exit(0);
}

runAlter().catch((err) => {
  console.error("Alter Error:", err);
  process.exit(1);
});
