/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * Subscription Renewal Requests Routes
 * ============================================================
 */

import { Express } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import {
  getRenewalRequests,
  createRenewalRequest,
  approveRenewalRequest,
  rejectRenewalRequest,
  cancelRenewalRequest,
} from "../controllers/renewal-requests.controller";

export function registerRenewalRequestsRoutes(app: Express) {
  // Get all renewal requests (Superadmin, Manager, Accountant)
  app.get(
    "/api/subscription-renewal-requests",
    requireAuth,
    requireRole("superadmin", "manager", "accountant"),
    getRenewalRequests
  );

  // Submit new renewal request (Manager, Superadmin)
  app.post(
    "/api/subscription-renewal-requests",
    requireAuth,
    requireRole("superadmin", "manager"),
    createRenewalRequest
  );

  // Approve renewal request (Accountant, Superadmin)
  app.post(
    "/api/subscription-renewal-requests/:id/approve",
    requireAuth,
    requireRole("superadmin", "accountant"),
    approveRenewalRequest
  );

  // Reject renewal request (Accountant, Superadmin)
  app.post(
    "/api/subscription-renewal-requests/:id/reject",
    requireAuth,
    requireRole("superadmin", "accountant"),
    rejectRenewalRequest
  );

  // Cancel renewal request (Requester, Superadmin)
  app.delete(
    "/api/subscription-renewal-requests/:id",
    requireAuth,
    requireRole("superadmin", "manager"),
    cancelRenewalRequest
  );
}
