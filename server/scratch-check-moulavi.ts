import { db } from "./db";
import * as schema from "../shared/schema";
import { eq, like, and, or } from "drizzle-orm";

async function run() {
  console.log("🔍 Checking users for 'moulavi'...");
  const matchedUsers = await db.select().from(schema.users).where(
    or(
      like(schema.users.username, "%moulavi%"),
      like(schema.users.email, "%moulavi%")
    )
  );

  if (matchedUsers.length === 0) {
    console.log("❌ No user found matching 'moulavi'.");
    return;
  }

  for (const user of matchedUsers) {
    console.log(`\n👤 User found: ID=${user.id}, Username=${user.username}, Email=${user.email}`);

    // Fetch channels for this user using createdBy
    const userChannels = await db.select().from(schema.channels).where(
      eq(schema.channels.createdBy, user.id)
    );

    console.log(`   📡 Channels (${userChannels.length}):`);
    for (const channel of userChannels) {
      console.log(`      - ID=${channel.id}, Name=${channel.name}, Connection=${channel.connectionMethod}`);

      // Count CRM Lists (groups table)
      const crmLists = await db.select().from(schema.groups).where(
        eq(schema.groups.channelId, channel.id)
      );
      console.log(`         📁 CRM Lists (total = ${crmLists.length})`);

      // Filter CRM lists that were automatically created from WhatsApp sync
      // These lists have descriptions starting with "Imported from WhatsApp Group JID:"
      const syncedCrmLists = crmLists.filter(g => 
        g.description && g.description.startsWith("Imported from WhatsApp Group JID:")
      );
      console.log(`         🔄 Synced CRM Lists to clean up = ${syncedCrmLists.length}`);

      if (syncedCrmLists.length > 0) {
        console.log(`         🛠️ Cleaning up ${syncedCrmLists.length} synced CRM lists for channel ${channel.id}...`);
        
        // Let's delete them from the groups table
        for (const list of syncedCrmLists) {
          await db.delete(schema.groups).where(
            eq(schema.groups.id, list.id)
          );
          console.log(`            ✅ Deleted CRM List: "${list.name}"`);
        }
      }
    }
  }

  console.log("\n✨ Done.");
}

run().catch(console.error).finally(() => process.exit(0));
