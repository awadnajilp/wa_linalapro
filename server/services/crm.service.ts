import { db } from "../db";
import { crmDeals } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Automatically increments the contactedCount for a CRM deal when an automated message is sent.
 */
export async function incrementCrmDealContactCount(contactId: string, channelId: string) {
  try {
    await db
      .update(crmDeals)
      .set({
        contactedCount: sql`${crmDeals.contactedCount} + 1`,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmDeals.contactId, contactId),
        eq(crmDeals.channelId, channelId),
        eq(crmDeals.status, "open") // only increment for active/open deals
      ));
  } catch (err) {
    console.error("Failed to auto-increment CRM deal contacted count:", err);
  }
}
