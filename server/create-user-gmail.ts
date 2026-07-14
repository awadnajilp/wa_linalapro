import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";

async function main() {
  console.log("Upserting user awadnajilp@gmail.com in the local database...");
  const hashedPassword = await bcrypt.hash("9394Jzn!", 10);
  const targetEmail = "awadnajilp@gmail.com";
  
  // 1. Try to find user by email or username
  const existing = await db.select().from(users).where(
    or(
      eq(users.username, targetEmail),
      eq(users.email, targetEmail)
    )
  );
  
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

  if (existing.length > 0) {
    const userToUpdate = existing[0];
    await db.update(users)
      .set({
        username: targetEmail,
        email: targetEmail,
        password: hashedPassword,
        role: "superadmin",
        status: "active",
        permissions,
        isEmailVerified: true
      })
      .where(eq(users.id, userToUpdate.id));
    console.log(`Updated existing user ${targetEmail} (ID: ${userToUpdate.id}) to superadmin with password "9394Jzn!".`);
  } else {
    await db.insert(users).values({
      username: targetEmail,
      password: hashedPassword,
      email: targetEmail,
      firstName: "Awad",
      lastName: "Najil",
      role: "superadmin",
      status: "active",
      permissions,
      isEmailVerified: true
    });
    console.log(`Created new superadmin user ${targetEmail} with password "9394Jzn!".`);
  }
  
  console.log("Done!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
