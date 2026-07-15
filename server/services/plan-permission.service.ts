import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, users } from "../../shared/schema";

/**
 * Checks if the user is a superadmin or has the utilityCategoryHelperEnabled permission active.
 */
export async function checkUtilityHelperPermission(userId: string): Promise<boolean> {
  try {
    // 1. Fetch user role
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.role === "superadmin") {
      return true;
    }

    // 2. Fetch active subscription
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (!sub) return false;

    // Check if subscription has expired
    if (new Date(sub.endDate) < new Date()) {
      return false;
    }

    const planData = sub.planData as any;
    return planData?.permissions?.utilityCategoryHelperEnabled === "true";
  } catch (error) {
    console.error("Error checking plan permissions:", error);
    return false;
  }
}
