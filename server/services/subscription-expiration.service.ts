/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Subscription Expiration Lifecycle & Enforcement Service
 * ============================================================
 */

import { db } from "../db";
import { subscriptions, users, plans, channels, automations } from "@shared/schema";
import { eq, and, or, lt, gte, sql } from "drizzle-orm";
import { BaileysManager } from "./baileys-manager";

export interface SubscriptionStatusResult {
  isActive: boolean;
  isExpired: boolean;
  isSuperadmin: boolean;
  daysLeft: number;
  subscription?: any;
  plan?: any;
}

/**
 * Check if a user/tenant has an active and non-expired subscription.
 * Superadmins are always active and never expire.
 */
export async function isUserSubscriptionActive(userId: string): Promise<SubscriptionStatusResult> {
  if (!userId) {
    return { isActive: false, isExpired: true, isSuperadmin: false, daysLeft: 0 };
  }

  // 1. Check if user is superadmin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.role === "superadmin") {
    return {
      isActive: true,
      isExpired: false,
      isSuperadmin: true,
      daysLeft: 9999,
    };
  }

  const now = new Date();

  // 2. Query user's subscriptions
  const userSubs = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(sql`${subscriptions.createdAt} DESC`);

  if (!userSubs || userSubs.length === 0) {
    return {
      isActive: false,
      isExpired: true,
      isSuperadmin: false,
      daysLeft: 0,
    };
  }

  // Find active subscription that has not passed endDate
  const activeSub = userSubs.find((s) => {
    if (!s.subscription) return false;
    const endDate = new Date(s.subscription.endDate);
    return s.subscription.status === "active" && endDate >= now;
  });

  if (activeSub && activeSub.subscription) {
    const endDate = new Date(activeSub.subscription.endDate);
    const msDiff = endDate.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    return {
      isActive: true,
      isExpired: false,
      isSuperadmin: false,
      daysLeft,
      subscription: activeSub.subscription,
      plan: activeSub.plan,
    };
  }

  // If no active valid subscription, tenant is expired
  const latestSub = userSubs[0];
  const endDate = latestSub?.subscription?.endDate ? new Date(latestSub.subscription.endDate) : now;
  const msDiff = endDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  return {
    isActive: false,
    isExpired: true,
    isSuperadmin: false,
    daysLeft: Math.min(0, daysLeft),
    subscription: latestSub?.subscription,
    plan: latestSub?.plan,
  };
}

/**
 * Handle complete expiration cleanup for a tenant:
 * 1. Mark subscription rows as "expired"
 * 2. Deactivate all automation flows
 * 3. Disconnect QR code (Baileys) sessions
 * 4. Hold/pause Cloud API channels
 */
export async function processTenantSubscriptionExpired(userId: string): Promise<void> {
  if (!userId) return;

  const now = new Date();

  // 1. Mark expired subscriptions in DB
  await db
    .update(subscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        lt(subscriptions.endDate, now)
      )
    );

  // 2. Fetch all channels owned by or created by this user
  const tenantChannels = await db
    .select()
    .from(channels)
    .where(or(eq(channels.createdBy, userId), eq(channels.userId, userId)));

  const channelIds = tenantChannels.map((c) => c.id);

  // 3. Deactivate all automations / flows for this tenant
  if (channelIds.length > 0) {
    await db
      .update(automations)
      .set({
        isActive: false,
        status: "inactive",
        updatedAt: now,
      })
      .where(
        or(
          eq(automations.userId, userId),
          sql`${automations.channelId} IN (${sql.join(channelIds, sql`, `)})`
        )
      );
  } else {
    await db
      .update(automations)
      .set({
        isActive: false,
        status: "inactive",
        updatedAt: now,
      })
      .where(eq(automations.userId, userId));
  }

  // 4. Handle channels: Disconnect QR, Pause Cloud API
  for (const ch of tenantChannels) {
    if (ch.connectionMethod === "qr_code") {
      try {
        console.log(`[Subscription Expiration] Disconnecting QR Channel ${ch.id} (${ch.name}) due to expired subscription...`);
        await BaileysManager.deleteSession(ch.id);
        await db
          .update(channels)
          .set({
            status: "disconnected",
            isActive: false,
            updatedAt: now,
          })
          .where(eq(channels.id, ch.id));
      } catch (err) {
        console.warn(`[Subscription Expiration] Error disconnecting QR channel ${ch.id}:`, err);
      }
    } else {
      // Cloud API: Hold/pause usage
      try {
        console.log(`[Subscription Expiration] Pausing Cloud API Channel ${ch.id} (${ch.name}) due to expired subscription...`);
        await db
          .update(channels)
          .set({
            status: "paused",
            isActive: false,
            updatedAt: now,
          })
          .where(eq(channels.id, ch.id));
      } catch (err) {
        console.warn(`[Subscription Expiration] Error pausing Cloud API channel ${ch.id}:`, err);
      }
    }
  }

  console.log(`🔒 [Subscription Expiration] Tenant ${userId} locked out successfully (automations deactivated, channels disconnected/paused).`);
}

/**
 * Scan all active subscriptions in DB that have passed endDate
 * and enforce expiration across channels, automations, and sessions.
 */
export async function checkAndProcessAllExpiredSubscriptions(): Promise<{ expiredCount: number }> {
  const now = new Date();

  // Find all active subscriptions that are past their endDate
  const expiredSubs = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.endDate, now),
        sql`NOT EXISTS (
          SELECT 1 FROM subscriptions s_act
          WHERE s_act.user_id = ${subscriptions.userId}
          AND s_act.status = 'active'
          AND s_act.end_date >= ${now}
        )`
      )
    );

  const uniqueUserIds = Array.from(new Set(expiredSubs.map((s) => s.userId)));

  for (const uid of uniqueUserIds) {
    try {
      await processTenantSubscriptionExpired(uid);
    } catch (err) {
      console.error(`[Subscription Expiration] Error processing expiration for user ${uid}:`, err);
    }
  }

  return { expiredCount: uniqueUserIds.length };
}
