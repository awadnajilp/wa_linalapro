/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * Subscription Renewal Requests Controller (2-Step Workflow)
 * Step 1: Manager requests renewal for a customer/tenant
 * Step 2: Accountant approves with payment method & description
 * (Offline manual verification — NO automated gateway charge)
 * ============================================================
 */

import type { Request, Response } from "express";
import { db } from "../db";
import {
  subscriptionRenewalRequests,
  users,
  plans,
  subscriptions,
  transactions,
  paymentProviders,
  channels,
  automations,
} from "@shared/schema";
import { eq, desc, and, or, sql, like } from "drizzle-orm";

export const getRenewalRequests = async (req: Request, res: Response) => {
  try {
    const user = (req.session as any)?.user || req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = (req.query.status as string) || "all";
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (status && status !== "all") {
      conditions.push(eq(subscriptionRenewalRequests.status, status));
    }

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          like(users.username, s),
          like(users.email, s),
          like(plans.name, s),
          like(subscriptionRenewalRequests.paymentDescription, s),
          like(subscriptionRenewalRequests.requestNotes, s)
        )
      );
    }

    const query = db
      .select({
        id: subscriptionRenewalRequests.id,
        userId: subscriptionRenewalRequests.userId,
        tenantUsername: users.username,
        tenantEmail: users.email,
        tenantFirstName: users.firstName,
        tenantLastName: users.lastName,
        planId: subscriptionRenewalRequests.planId,
        planName: plans.name,
        planPrice: plans.price,
        billingCycle: subscriptionRenewalRequests.billingCycle,
        amount: subscriptionRenewalRequests.amount,
        currency: subscriptionRenewalRequests.currency,
        requestedBy: subscriptionRenewalRequests.requestedBy,
        requestedAt: subscriptionRenewalRequests.requestedAt,
        requestNotes: subscriptionRenewalRequests.requestNotes,
        status: subscriptionRenewalRequests.status,
        approvedBy: subscriptionRenewalRequests.approvedBy,
        approvedAt: subscriptionRenewalRequests.approvedAt,
        paymentMethod: subscriptionRenewalRequests.paymentMethod,
        paymentDescription: subscriptionRenewalRequests.paymentDescription,
        rejectionReason: subscriptionRenewalRequests.rejectionReason,
        subscriptionId: subscriptionRenewalRequests.subscriptionId,
        createdAt: subscriptionRenewalRequests.createdAt,
        updatedAt: subscriptionRenewalRequests.updatedAt,
      })
      .from(subscriptionRenewalRequests)
      .innerJoin(users, eq(subscriptionRenewalRequests.userId, users.id))
      .innerJoin(plans, eq(subscriptionRenewalRequests.planId, plans.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(subscriptionRenewalRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [rows, totalCountRes, statsRes] = await Promise.all([
      query,
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subscriptionRenewalRequests)
        .innerJoin(users, eq(subscriptionRenewalRequests.userId, users.id))
        .innerJoin(plans, eq(subscriptionRenewalRequests.planId, plans.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({
          total: sql<number>`COUNT(*)`,
          pending: sql<number>`COUNT(CASE WHEN ${subscriptionRenewalRequests.status} = 'pending' THEN 1 END)`,
          approved: sql<number>`COUNT(CASE WHEN ${subscriptionRenewalRequests.status} = 'approved' THEN 1 END)`,
          rejected: sql<number>`COUNT(CASE WHEN ${subscriptionRenewalRequests.status} = 'rejected' THEN 1 END)`,
        })
        .from(subscriptionRenewalRequests),
    ]);

    // Fetch requester and approver user details for the returned rows
    const requesterIds = [...new Set(rows.map((r) => r.requestedBy).filter(Boolean))];
    const approverIds = [...new Set(rows.map((r) => r.approvedBy).filter(Boolean))] as string[];
    const allUserIds = [...new Set([...requesterIds, ...approverIds])];

    let userMap = new Map<string, { username: string; email: string; role: string }>();
    if (allUserIds.length > 0) {
      const userRecords = await db
        .select({ id: users.id, username: users.username, email: users.email, role: users.role })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(allUserIds.map((id) => sql`${id}`), sql`, `)})`);

      userRecords.forEach((u) => userMap.set(u.id, u));
    }

    const enhancedRows = rows.map((r) => {
      const reqUser = userMap.get(r.requestedBy);
      const appUser = r.approvedBy ? userMap.get(r.approvedBy) : null;
      return {
        ...r,
        requesterUsername: reqUser?.username || "Unknown",
        requesterEmail: reqUser?.email || "",
        requesterRole: reqUser?.role || "manager",
        approverUsername: appUser?.username || (r.approvedBy ? "Accountant" : null),
        approverEmail: appUser?.email || "",
        approverRole: appUser?.role || (r.approvedBy ? "accountant" : null),
      };
    });

    const total = Number(totalCountRes[0]?.count ?? 0);
    const stats = {
      total: Number(statsRes[0]?.total ?? 0),
      pending: Number(statsRes[0]?.pending ?? 0),
      approved: Number(statsRes[0]?.approved ?? 0),
      rejected: Number(statsRes[0]?.rejected ?? 0),
    };

    res.json({
      success: true,
      data: enhancedRows,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("Error in getRenewalRequests:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch renewal requests" });
  }
};

export const createRenewalRequest = async (req: Request, res: Response) => {
  try {
    const user = (req.session as any)?.user || req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Must be manager or superadmin
    if (user.role !== "manager" && user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only managers or superadmins can submit renewal requests" });
    }

    const { userId, planId, billingCycle = "monthly", amount, currency = "USD", requestNotes } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ success: false, message: "Tenant user ID and Plan ID are required" });
    }

    // Verify tenant user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Tenant user not found" });
    }

    // Verify plan exists
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    // Calculate plan amount if not explicitly given
    const finalAmount = amount !== undefined && amount !== null && amount !== ""
      ? String(amount)
      : (billingCycle === "annual" && (plan as any).annualPrice ? String((plan as any).annualPrice) : String(plan.price));

    const [newRequest] = await db
      .insert(subscriptionRenewalRequests)
      .values({
        userId,
        planId,
        billingCycle,
        amount: finalAmount,
        currency,
        requestedBy: user.id,
        requestNotes: requestNotes || null,
        status: "pending",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRequest,
      message: `Renewal request for '${targetUser.username}' submitted successfully. Pending accountant approval.`,
    });
  } catch (error: any) {
    console.error("Error in createRenewalRequest:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create renewal request" });
  }
};

export const approveRenewalRequest = async (req: Request, res: Response) => {
  try {
    const approver = (req.session as any)?.user || req.user;
    if (!approver) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Must be accountant or superadmin
    if (approver.role !== "accountant" && approver.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only accountants or superadmins can approve renewal requests" });
    }

    const { id } = req.params;
    const { paymentMethod, paymentDescription, amount } = req.body;

    if (!paymentMethod || !paymentDescription) {
      return res.status(400).json({
        success: false,
        message: "Payment method and payment description/reference are required for accountant approval",
      });
    }

    const [request] = await db
      .select()
      .from(subscriptionRenewalRequests)
      .where(eq(subscriptionRenewalRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ success: false, message: "Renewal request not found" });
    }

    if (request.status === "approved") {
      return res.status(400).json({ success: false, message: "This renewal request is already approved" });
    }

    if (request.status === "rejected" || request.status === "cancelled") {
      return res.status(400).json({ success: false, message: `Cannot approve a ${request.status} request` });
    }

    // Fetch plan
    const [plan] = await db.select().from(plans).where(eq(plans.id, request.planId)).limit(1);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan associated with request not found" });
    }

    const now = new Date();
    const durationDays = request.billingCycle === "annual" ? 365 : 30;

    // Check if user has an existing active subscription
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, request.userId), eq(subscriptions.status, "active")))
      .orderBy(desc(subscriptions.endDate))
      .limit(1);

    let startDate = now;
    let endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // If existing subscription is still active and in future, extend from existing endDate!
    if (existingSub && new Date(existingSub.endDate).getTime() > now.getTime()) {
      startDate = new Date(existingSub.startDate);
      endDate = new Date(new Date(existingSub.endDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // 1. Mark previous active subscriptions as expired/replaced
    await db
      .update(subscriptions)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(subscriptions.userId, request.userId), eq(subscriptions.status, "active")));

    // 2. Create new active subscription (Offline Manual)
    const [newSub] = await db
      .insert(subscriptions)
      .values({
        userId: request.userId,
        planId: plan.id,
        planData: plan,
        status: "active",
        billingCycle: request.billingCycle,
        startDate: startDate,
        endDate: endDate,
        autoRenew: false,
        gatewayProvider: "accountant_approval",
        gatewaySubscriptionId: `RENEWAL-${request.id.substring(0, 8).toUpperCase()}`,
        gatewayStatus: "active",
      })
      .returning();

    // 3. Find or create an offline payment provider for transaction record
    let provider = (await db.select().from(paymentProviders).where(eq(paymentProviders.providerName, "offline")).limit(1))[0];
    if (!provider) {
      const allProviders = await db.select().from(paymentProviders).limit(1);
      provider = allProviders[0];
    }

    if (provider) {
      try {
        await db.insert(transactions).values({
          userId: request.userId,
          planId: plan.id,
          subscriptionId: newSub.id,
          paymentProviderId: provider.id,
          amount: amount ? String(amount) : request.amount,
          currency: request.currency || "USD",
          billingCycle: request.billingCycle,
          providerPaymentId: `MANUAL-${paymentMethod.toUpperCase()}-${request.id.substring(0, 8)}`,
          status: "completed",
          paymentMethod: paymentMethod,
          metadata: {
            approvedBy: approver.id,
            approvedByUsername: approver.username,
            paymentMethod,
            paymentDescription,
            renewalRequestId: request.id,
          },
          paidAt: now,
        });
      } catch (txnErr) {
        console.warn("Could not insert transaction log for renewal approval:", txnErr);
      }
    }

    // 4. Update renewal request status to approved
    const [updatedRequest] = await db
      .update(subscriptionRenewalRequests)
      .set({
        status: "approved",
        approvedBy: approver.id,
        approvedAt: now,
        paymentMethod: paymentMethod,
        paymentDescription: paymentDescription,
        amount: amount ? String(amount) : request.amount,
        subscriptionId: newSub.id,
        updatedAt: now,
      })
      .where(eq(subscriptionRenewalRequests.id, id))
      .returning();

    // 5. Reactivate any paused Cloud API channels for this user
    await db
      .update(channels)
      .set({
        status: "active",
        isActive: true,
        updatedAt: now,
      })
      .where(
        and(
          or(eq(channels.createdBy, request.userId), eq(channels.userId, request.userId)),
          eq(channels.status, "paused")
        )
      );

    // 6. Reactivate paused automations
    await db
      .update(automations)
      .set({
        isActive: true,
        status: "active",
        updatedAt: now,
      })
      .where(eq(automations.userId, request.userId));

    res.status(200).json({
      success: true,
      data: updatedRequest,
      subscription: newSub,
      message: `Renewal request approved successfully. Subscription activated until ${endDate.toLocaleDateString()}.`,
    });
  } catch (error: any) {
    console.error("Error in approveRenewalRequest:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to approve renewal request" });
  }
};

export const rejectRenewalRequest = async (req: Request, res: Response) => {
  try {
    const rejector = (req.session as any)?.user || req.user;
    if (!rejector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (rejector.role !== "accountant" && rejector.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only accountants or superadmins can reject renewal requests" });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const [request] = await db
      .select()
      .from(subscriptionRenewalRequests)
      .where(eq(subscriptionRenewalRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ success: false, message: "Renewal request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: `Cannot reject a request that is already ${request.status}` });
    }

    const now = new Date();
    const [updated] = await db
      .update(subscriptionRenewalRequests)
      .set({
        status: "rejected",
        rejectionReason: rejectionReason || "Rejected by accountant",
        approvedBy: rejector.id,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptionRenewalRequests.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: updated,
      message: "Renewal request rejected.",
    });
  } catch (error: any) {
    console.error("Error in rejectRenewalRequest:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reject renewal request" });
  }
};

export const cancelRenewalRequest = async (req: Request, res: Response) => {
  try {
    const user = (req.session as any)?.user || req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const [request] = await db
      .select()
      .from(subscriptionRenewalRequests)
      .where(eq(subscriptionRenewalRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json({ success: false, message: "Renewal request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: `Cannot cancel a request that is already ${request.status}` });
    }

    // Only requester or superadmin can cancel
    if (request.requestedBy !== user.id && user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this renewal request" });
    }

    const now = new Date();
    await db
      .update(subscriptionRenewalRequests)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(subscriptionRenewalRequests.id, id));

    res.status(200).json({
      success: true,
      message: "Renewal request cancelled successfully.",
    });
  } catch (error: any) {
    console.error("Error in cancelRenewalRequest:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to cancel renewal request" });
  }
};
