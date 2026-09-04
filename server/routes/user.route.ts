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

import { requireAuth, requireRole } from "server/middlewares/auth.middleware";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  bulkUpdateUserStatus,
  verifyEmailOTP,
  createUserSuperadmin,
  exportAllUsers,
  registerFcmToken
} from "../controllers/user.controller";
import type { Express } from "express";

export function userRoutes(app: Express) {
  app.get("/api/admin/users/export", requireAuth, requireRole("superadmin"), exportAllUsers);
  app.get("/api/admin/users", requireAuth, requireRole("superadmin"), getAllUsers);
  app.get("/api/admin/users/:id", requireAuth, requireRole("superadmin"), getUserById);
  app.post("/api/users/create", createUser);
  app.post("/api/admin/users/create", requireAuth, requireRole("superadmin"), createUserSuperadmin);
  app.post("/api/users/verifyEmail", verifyEmailOTP);
  app.post("/api/users/fcm-token", requireAuth, registerFcmToken);
  app.put("/api/admin/users/bulk-status", requireAuth, requireRole("superadmin"), bulkUpdateUserStatus);
  app.put("/api/users/:id", requireAuth, updateUser);
  app.put("/api/user/status/:id", requireAuth, requireRole("superadmin"), updateUserStatus);
  app.delete("/api/admin/users/:id", requireAuth, requireRole("superadmin"), deleteUser);
}
