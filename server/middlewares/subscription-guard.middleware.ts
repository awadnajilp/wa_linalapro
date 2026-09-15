/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Subscription Guard Middleware
 * ============================================================
 */

import { Request, Response, NextFunction } from "express";
import { isUserSubscriptionActive } from "../services/subscription-expiration.service";

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req.session as any)?.user || (req as any).user;

  if (!user || !user.id) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please log in to continue.",
    });
  }

  // Superadmins are always exempt
  if (user.role === "superadmin") {
    return next();
  }

  try {
    const targetUserId = user.role === "team" && user.createdBy ? user.createdBy : user.id;
    const status = await isUserSubscriptionActive(targetUserId);

    if (status.isExpired || !status.isActive) {
      return res.status(403).json({
        error: "Subscription expired",
        subscriptionExpired: true,
        message: "Your subscription has expired. All campaigns, inbox sending, and automation flows are paused. Please renew your plan.",
        daysLeft: status.daysLeft,
      });
    }

    next();
  } catch (error) {
    console.error("[SubscriptionGuard] Error checking subscription status:", error);
    // On unexpected DB check failure, allow non-blocking flow or fail-safe
    next();
  }
}
