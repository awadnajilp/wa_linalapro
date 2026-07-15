import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, users, plans } from "../../shared/schema";

/**
 * Checks if the user is a superadmin or has the utilityCategoryHelperEnabled permission active.
 */
export async function checkUtilityHelperPermission(userId: string): Promise<boolean> {
  try {
    // 1. Fetch user role and parent user ID if team member
    const [user] = await db
      .select({ role: users.role, createdBy: users.createdBy })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    if (user.role === "superadmin") {
      return true;
    }

    const targetOwnerId = (user.role === "team" && user.createdBy) ? user.createdBy : userId;

    // 2. Fetch active subscription joined with plans
    const [result] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, targetOwnerId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (!result || !result.subscription) return false;

    // Check if subscription has expired
    if (new Date(result.subscription.endDate) < new Date()) {
      return false;
    }

    // Merge planData dynamically
    const subscription = result.subscription;
    const plan = result.plan;
    const mergedPlanData = {
      ...(subscription.planData as any || {}),
      permissions: {
        ...((subscription.planData as any || {}).permissions || {}),
        ...(plan?.permissions || {}),
      }
    };

    return mergedPlanData.permissions?.utilityCategoryHelperEnabled === "true";
  } catch (error) {
    console.error("Error checking plan permissions:", error);
    return false;
  }
}
