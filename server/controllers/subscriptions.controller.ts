/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from "../db";
import { subscriptions, users, plans, tenantAddons } from "@shared/schema";
import { eq, and, or, desc, lt, gte, lte, sql, ilike } from "drizzle-orm";
import { sendSubscriptionRenewalEmail } from "../services/email.service";
import {
  cancelStripeSubscription,
  cancelRazorpaySubscription,
  cancelPayPalSubscription,
  cancelPaystackSubscription,
  cancelMercadoPagoSubscription,
  upgradeOrDowngradeStripe,
  upgradeOrDowngradeRazorpay,
  createStripeSubscription,
  createRazorpaySubscription,
} from "../services/payment-gateway.service";

export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : "";
    const tab = req.query.tab ? String(req.query.tab).trim() : "all";
    const status = req.query.status ? String(req.query.status).trim() : "";
    const userId = req.query.userId ? String(req.query.userId).trim() : "";

    const now = new Date();
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(subscriptions.userId, userId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(plans.name, `%${search}%`),
          ilike(subscriptions.gatewaySubscriptionId, `%${search}%`)
        )
      );
    }

    const effectiveTab = tab || status;
    if (effectiveTab === "active") {
      conditions.push(and(eq(subscriptions.status, "active"), gte(subscriptions.endDate, now)));
    } else if (effectiveTab === "expiring_soon") {
      conditions.push(
        and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.endDate, now),
          lte(subscriptions.endDate, sevenDaysLater)
        )
      );
    } else if (effectiveTab === "expired") {
      conditions.push(
        sql`(${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${now})
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s_act
            WHERE s_act.user_id = ${subscriptions.userId}
            AND s_act.status = 'active'
            AND s_act.end_date >= ${now}
          )
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s_new
            WHERE s_new.user_id = ${subscriptions.userId}
            AND (${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${now})
            AND s_new.created_at > ${subscriptions.createdAt}
          )`
      );
    } else if (effectiveTab === "cancelled") {
      conditions.push(
        and(
          eq(subscriptions.status, "cancelled"),
          sql`NOT EXISTS (
            SELECT 1 FROM subscriptions s_act
            WHERE s_act.user_id = ${subscriptions.userId}
            AND s_act.status = 'active'
            AND s_act.end_date >= ${now}
          )`
        )
      );
    } else if (status && status !== "all") {
      conditions.push(eq(subscriptions.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id));

    const [{ count }] = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // Fetch tab counts for quick stats
    const [statsResult] = await db
      .select({
        totalCount: sql<number>`COUNT(*)`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${subscriptions.status} = 'active' AND ${subscriptions.endDate} >= ${now})`,
        expiringSoonCount: sql<number>`COUNT(*) FILTER (WHERE ${subscriptions.status} = 'active' AND ${subscriptions.endDate} >= ${now} AND ${subscriptions.endDate} <= ${sevenDaysLater})`,
        expiredCount: sql<number>`COUNT(*) FILTER (
          WHERE (${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${now})
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s_act
            WHERE s_act.user_id = ${subscriptions.userId}
            AND s_act.status = 'active'
            AND s_act.end_date >= ${now}
          )
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s_new
            WHERE s_new.user_id = ${subscriptions.userId}
            AND (${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${now})
            AND s_new.created_at > ${subscriptions.createdAt}
          )
        )`,
        cancelledCount: sql<number>`COUNT(*) FILTER (
          WHERE ${subscriptions.status} = 'cancelled'
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s_act
            WHERE s_act.user_id = ${subscriptions.userId}
            AND s_act.status = 'active'
            AND s_act.end_date >= ${now}
          )
        )`,
      })
      .from(subscriptions);

    const baseQuery = db
      .select({
        subscription: subscriptions,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phoneNumber,
        },
        plan: {
          id: plans.id,
          name: plans.name,
          description: plans.description,
          icon: plans.icon,
          monthlyPrice: plans.monthlyPrice,
          annualPrice: plans.annualPrice,
          features: plans.features,
          permissions: plans.permissions,
        },
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset);

    const paginatedSubscriptions = whereClause
      ? await baseQuery.where(whereClause)
      : await baseQuery;

    res.status(200).json({
      success: true,
      data: paginatedSubscriptions,
      stats: {
        total: Number(statsResult?.totalCount || 0),
        active: Number(statsResult?.activeCount || 0),
        expiringSoon: Number(statsResult?.expiringSoonCount || 0),
        expired: Number(statsResult?.expiredCount || 0),
        cancelled: Number(statsResult?.cancelledCount || 0),
      },
      pagination: { total, totalPages, page, limit },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriptions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const sendRenewalReminder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [subRecord] = await db
      .select({
        subscription: subscriptions,
        user: users,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (!subRecord || !subRecord.user || !subRecord.subscription) {
      return res.status(404).json({ success: false, message: "Subscription or user not found" });
    }

    if (!subRecord.user.email) {
      return res.status(400).json({ success: false, message: "User does not have an email address configured." });
    }

    const now = new Date();
    const endDate = new Date(subRecord.subscription.endDate);
    const msDiff = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft <= 0 || subRecord.subscription.status === "expired";

    // If subscription is expired, verify that the user has not already renewed
    if (isExpired) {
      const [activeRenewedSub] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, subRecord.subscription.userId),
            eq(subscriptions.status, "active"),
            gte(subscriptions.endDate, now)
          )
        )
        .limit(1);

      if (activeRenewedSub) {
        return res.status(400).json({
          success: false,
          message: "This customer has already renewed their account with an active subscription.",
        });
      }
    }

    const planName = subRecord.plan?.name || (subRecord.subscription.planData as any)?.name || "Plan";

    const emailResult = await sendSubscriptionRenewalEmail({
      toEmail: subRecord.user.email,
      username: subRecord.user.username || subRecord.user.firstName || "Customer",
      planName,
      endDate: subRecord.subscription.endDate.toISOString(),
      daysLeft: Math.max(0, daysLeft),
      isExpired,
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send renewal email. Please verify SMTP settings.",
        error: emailResult.error,
      });
    }

    res.status(200).json({
      success: true,
      message: `Renewal reminder email sent successfully to ${subRecord.user.email}`,
    });
  } catch (error) {
    console.error("Error sending manual renewal reminder:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while sending renewal reminder",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const triggerAutoRenewalReminders = async (req: Request, res: Response) => {
  try {
    const { runSubscriptionRenewalCron } = await import("../cron/subscription-renewal.cron");
    const result = await runSubscriptionRenewalCron();
    res.status(200).json({
      success: true,
      message: `Auto-renewal reminder check completed. Sent ${result.sentCount} reminders.`,
      result,
    });
  } catch (error) {
    console.error("Error running auto-renewal reminder check:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run auto-renewal reminders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getActivePaidUsersCount = async () => {
  const activeSubs = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return new Set(activeSubs.map((s: any) => s.userId)).size;
};

export const getSubscriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscription = await db
      .select({
        subscription: subscriptions,
        user: users,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, id));

    if (subscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const authUser = req.user as any;
    const subUserId = subscription[0].subscription.userId;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      subUserId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== subUserId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    res.status(200).json({ success: true, data: subscription[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subscription",
      error,
    });
  }
};

const mergePlanDataWithLatestPlan = (subscription: any, plan: any) => {
  if (!plan) return subscription;
  return {
    ...subscription,
    planData: {
      ...(subscription.planData || {}),
      name: plan.name,
      description: plan.description,
      price: plan.price,
      permissions: {
        ...((subscription.planData || {}).permissions || {}),
        ...(plan.permissions || {}),
      }
    }
  };
};

export const getSubscriptionsByUserId = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const userSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: {
          id: users.id,
          username: users.username,
        },
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt));

    const mapped = userSubscriptions.map((item) => ({
      subscription: mergePlanDataWithLatestPlan(item.subscription, item.plan),
      user: item.user,
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user subscriptions",
      error,
    });
  }
};

export const getActiveSubscriptionByUserId = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const activeSubscription = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSubscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No active subscription found" });
    }

    const mergedSubscription = mergePlanDataWithLatestPlan(
      activeSubscription[0].subscription,
      activeSubscription[0].plan
    );

    res.status(200).json({
      success: true,
      data: {
        subscription: mergedSubscription,
        plan: activeSubscription[0].plan,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active subscription",
      error,
    });
  }
};

export const AssignSubscription = async (req: Request, res: Response) => {
  try {
    const { userId, planId, billingCycle: requestedCycle } = req.body;

    const plan = await db.query.plans.findFirst({
      where: (p: any) => eq(p.id, planId),
    });

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      );

    const billingCycle = requestedCycle || "monthly";
    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingCycle === "semi-annual") {
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (billingCycle === "quarterly") {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    const autoRenew = true;

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        planData: {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          permissions: plan.permissions,
          features: plan.features,
        },
        status: "active",
        billingCycle,
        startDate,
        endDate,
        autoRenew,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Renew/Align all active/expired tenant addons with the new plan's endDate
    if (req.body.renewAllAddons === true) {
      await db
        .update(tenantAddons)
        .set({
          expiresAt: endDate,
          status: "active",
          updatedAt: new Date()
        })
        .where(
          eq(tenantAddons.tenantId, userId)
        );
    }

    return res.status(201).json({
      success: true,
      message: "Subscription assigned successfully",
      data: newSubscription[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error,
    });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { userId, planId, billingCycle, startDate, endDate, autoRenew } =
      req.body;

    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      );

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        billingCycle,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        autoRenew: autoRenew ?? true,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: newSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error,
    });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSubscription = await db
      .update(subscriptions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();

    if (updatedSubscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    // Auto-renew active/expired tenant addons to match platform subscription endDate
    if (updateData.endDate) {
      const sub = updatedSubscription[0];
      await db
        .update(tenantAddons)
        .set({
          expiresAt: new Date(updateData.endDate),
          status: "active",
          updatedAt: new Date()
        })
        .where(
          eq(tenantAddons.tenantId, sub.userId)
        );
    }

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updatedSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating subscription",
      error,
    });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { immediately } = req.body || {};

    const subData = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (subData.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const sub = subData[0];
    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      sub.userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== sub.userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (sub.gatewaySubscriptionId && sub.gatewayProvider) {
      try {
        if (sub.gatewayProvider === "stripe") {
          await cancelStripeSubscription(
            sub.gatewaySubscriptionId,
            immediately === true
          );
        } else if (sub.gatewayProvider === "razorpay") {
          await cancelRazorpaySubscription(
            sub.gatewaySubscriptionId,
            immediately === true
          );
        } else if (sub.gatewayProvider === "paypal") {
          await cancelPayPalSubscription(
            sub.gatewaySubscriptionId,
            immediately === true
          );
        } else if (sub.gatewayProvider === "paystack") {
          await cancelPaystackSubscription(sub.gatewaySubscriptionId);
        } else if (sub.gatewayProvider === "mercadopago") {
          await cancelMercadoPagoSubscription(sub.gatewaySubscriptionId);
        }
      } catch (err: any) {
        console.error("Gateway cancellation error:", err.message);
      }
    }

    if (immediately === true) {
      const cancelledSubscription = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          autoRenew: false,
          gatewayStatus: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();

      res.status(200).json({
        success: true,
        message: "Subscription cancelled immediately",
        data: cancelledSubscription[0],
      });
    } else {
      const cancelledSubscription = await db
        .update(subscriptions)
        .set({
          autoRenew: false,
          gatewayStatus: "cancel_at_period_end",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();

      res.status(200).json({
        success: true,
        message: `Subscription will be cancelled at the end of your billing period (${sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "end of period"})`,
        data: cancelledSubscription[0],
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
      error,
    });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  try {
    const { userId, newPlanId, billingCycle } = req.body;

    if (!userId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: "userId and newPlanId are required",
      });
    }

    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const cycle = billingCycle === "annual" ? "annual" : "monthly";

    const activeSub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const newPlanData = await db
      .select()
      .from(plans)
      .where(eq(plans.id, newPlanId))
      .limit(1);

    if (!newPlanData.length) {
      return res
        .status(404)
        .json({ success: false, message: "New plan not found" });
    }

    const newPlan = newPlanData[0];

    if (activeSub.length === 0) {
      return res.status(402).json({
        success: false,
        message: "No active subscription found. Please use the checkout to subscribe.",
      });
    }

    if (activeSub.length > 0) {
      const currentSub = activeSub[0];

      const currentMonthlyPrice = Number((currentSub.planData as any)?.monthlyPrice || 0);
      const newMonthlyPrice = Number(newPlan.monthlyPrice || 0);

      if (newMonthlyPrice >= currentMonthlyPrice) {
        return res.status(402).json({
          success: false,
          message: "Payment is required to upgrade your plan. Please use the checkout.",
        });
      }

      if (
        currentSub.gatewaySubscriptionId &&
        currentSub.gatewayProvider
      ) {
        let gatewayResult: any;

        if (currentSub.gatewayProvider === "stripe") {
          gatewayResult = await upgradeOrDowngradeStripe(
            currentSub.gatewaySubscriptionId,
            newPlanId,
            cycle
          );

          await db
            .update(subscriptions)
            .set({
              planId: newPlanId,
              billingCycle: cycle,
              planData: {
                name: newPlan.name,
                description: newPlan.description,
                monthlyPrice: newPlan.monthlyPrice,
                annualPrice: newPlan.annualPrice,
                permissions: newPlan.permissions,
                features: newPlan.features,
              },
              gatewayStatus: gatewayResult.status,
              endDate: gatewayResult.currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, currentSub.id));

          await db
            .update(users)
            .set({ planId: newPlanId, updatedAt: new Date() })
            .where(eq(users.id, userId));

          return res.status(200).json({
            success: true,
            message: "Plan changed successfully via Stripe",
            data: { subscriptionId: gatewayResult.subscriptionId },
          });
        } else if (currentSub.gatewayProvider === "razorpay") {
          gatewayResult = await upgradeOrDowngradeRazorpay(
            userId,
            currentSub.gatewaySubscriptionId,
            newPlanId,
            cycle
          );

          await db
            .update(subscriptions)
            .set({
              status: "cancelled",
              gatewayStatus: "cancelled",
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, currentSub.id));

          return res.status(200).json({
            success: true,
            message:
              "Plan change initiated via Razorpay. Complete payment to activate.",
            data: {
              subscriptionId: gatewayResult.subscriptionId,
              shortUrl: gatewayResult.shortUrl,
            },
          });
        }
      }

      await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, currentSub.id));
    }

    const startDate = new Date();
    const endDate = new Date();
    if (cycle === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: newPlanId,
        planData: {
          name: newPlan.name,
          description: newPlan.description,
          monthlyPrice: newPlan.monthlyPrice,
          annualPrice: newPlan.annualPrice,
          permissions: newPlan.permissions,
          features: newPlan.features,
        },
        status: "active",
        billingCycle: cycle,
        startDate,
        endDate,
        autoRenew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db
      .update(users)
      .set({ planId: newPlanId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return res.status(200).json({
      success: true,
      message: "Plan changed successfully",
      data: newSubscription[0],
    });
  } catch (error: any) {
    console.error("Error changing plan:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error changing plan",
    });
  }
};

export const renewSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currentSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));

    if (currentSub.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const subscription = currentSub[0];
    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      subscription.userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== subscription.userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const newStartDate = new Date();
    const newEndDate = new Date();

    if (subscription.billingCycle === "annual") {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    } else if (subscription.billingCycle === "semi-annual") {
      newEndDate.setMonth(newEndDate.getMonth() + 6);
    } else if (subscription.billingCycle === "quarterly") {
      newEndDate.setMonth(newEndDate.getMonth() + 3);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    }

    const renewedSubscription = await db
      .update(subscriptions)
      .set({
        status: "active",
        startDate: newStartDate,
        endDate: newEndDate,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Subscription renewed successfully",
      data: renewedSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error renewing subscription",
      error,
    });
  }
};

export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { autoRenew } = req.body;

    const currentSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (currentSub.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const authUser = req.user as any;
    if (
      authUser &&
      authUser.role !== "superadmin" &&
      currentSub[0].userId !== authUser.id &&
      (authUser.role !== "team" || authUser.createdBy !== currentSub[0].userId)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const updatedSubscription = await db
      .update(subscriptions)
      .set({ autoRenew, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: `Auto-renew ${autoRenew ? "enabled" : "disabled"} successfully`,
      data: updatedSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling auto-renew",
      error,
    });
  }
};

export const checkExpiredSubscriptions = async (
  req: Request,
  res: Response
) => {
  try {
    const now = new Date();

    const expiredSubscriptions = await db
      .update(subscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(eq(subscriptions.status, "active"), lt(subscriptions.endDate, now))
      )
      .returning();

    res.status(200).json({
      success: true,
      message: `${expiredSubscriptions.length} subscriptions marked as expired`,
      data: expiredSubscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking expired subscriptions",
      error,
    });
  }
};
