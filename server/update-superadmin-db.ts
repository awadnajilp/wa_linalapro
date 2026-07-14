import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";

async function main() {
  console.log("Updating superadmin credentials in the database...");
  const hashedPassword = await bcrypt.hash("9394Jzn!", 10);
  
  // 1. Try to find user by username or email
  const existingUsers = await db.select().from(users).where(
    or(
      eq(users.username, "awad@linalapro.com"),
      eq(users.email, "awad@linalapro.com")
    )
  );
  
  if (existingUsers.length > 0) {
    // Update the existing user's credentials and make them superadmin
    const userToUpdate = existingUsers[0];
    await db.update(users)
      .set({
        username: "awad@linalapro.com",
        email: "awad@linalapro.com",
        password: hashedPassword,
        role: "superadmin",
        status: "active"
      })
      .where(eq(users.id, userToUpdate.id));
    console.log(`Updated existing user to superadmin. ID: ${userToUpdate.id}`);
  } else {
    // 2. Otherwise find any existing superadmin
    const superadmins = await db.select().from(users).where(eq(users.role, "superadmin"));
    
    if (superadmins.length > 0) {
      // Update the first superadmin
      const firstSa = superadmins[0];
      await db.update(users)
        .set({
          username: "awad@linalapro.com",
          email: "awad@linalapro.com",
          password: hashedPassword,
          status: "active"
        })
        .where(eq(users.id, firstSa.id));
      console.log(`Updated first superadmin to new credentials. ID: ${firstSa.id}`);
    } else {
      // 3. Create a new superadmin
      const permissions = [
        'dashboard:view',
        'campaigns:view', 'campaigns:create', 'campaigns:edit', 'campaigns:delete', 'campaigns:export',
        'templates:view', 'templates:create', 'templates:edit', 'templates:delete', 'templates:export',
        'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete', 'contacts:export',
        'chathub:view', 'chathub:send', 'chathub:assign', 'chathub:delete',
        'botflow:view', 'botflow:create', 'botflow:edit', 'botflow:delete',
        'workflows:view', 'workflows:create', 'workflows:edit', 'workflows:delete',
        'aiassistant:use', 'aiassistant:configure',
        'autoresponses:view', 'autoresponses:create', 'autoresponses:edit', 'autoresponses:delete',
        'waba:view', 'waba:connect', 'waba:disconnect',
        'multi_number:view', 'multi_number:add', 'multi_number:edit', 'multi_number:delete',
        'webhooks:view', 'webhooks:create', 'webhooks:edit', 'webhooks:delete',
        'qrcodes:view', 'qrcodes:generate', 'qrcodes:delete',
        'crm:view',
        'leads:view', 'leads:create', 'leads:edit', 'leads:delete',
        'bulk_import:leads',
        'segmentation:view', 'segmentation:create', 'segmentation:edit', 'segmentation:delete',
        'analytics:view', 'message_logs:view', 'health_monitor:view',
        'reports:view', 'reports:export',
        'team:view', 'team:create', 'team:edit', 'team:delete',
        'support_tickets:view', 'support_tickets:create', 'support_tickets:edit', 'support_tickets:close',
        'notifications:view', 'notifications:send',
        'settings:view', 'settings:edit',
      ];
      await db.insert(users).values({
        username: "awad@linalapro.com",
        password: hashedPassword,
        email: "awad@linalapro.com",
        firstName: "Super",
        lastName: "Admin",
        role: "superadmin",
        status: "active",
        permissions,
        isEmailVerified: true
      });
      console.log("Created a new superadmin user.");
    }
  }
  
  console.log("Done!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
