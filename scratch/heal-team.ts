import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== RUNNING DATABASE SELF-HEALING FOR TEAM CREATOR IDs ===");
  const teamUsers = await db.select().from(users).where(eq(users.role, "team"));
  
  for (const teamUser of teamUsers) {
    if (teamUser.createdBy) {
      // Find the creator user
      const [creator] = await db.select().from(users).where(eq(users.id, teamUser.createdBy)).limit(1);
      if (creator && creator.role === "team") {
        const ownerId = creator.createdBy;
        if (ownerId) {
          console.log(`🔧 Fixing user ${teamUser.username} (${teamUser.id}): changing createdBy from team user ${creator.username} (${creator.id}) to owner ID ${ownerId}`);
          await db.update(users).set({ createdBy: ownerId }).where(eq(users.id, teamUser.id));
        }
      }
    }
  }
  console.log("=== DATABASE HEAL COMPLETED ===");
}

main().catch(console.error);
