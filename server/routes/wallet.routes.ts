/**
 * ============================================================
 * © 2026 Antigravity - Wallet Routes Configuration
 * ============================================================
 */

import type { Express } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { handleDigitalOceanUpload, upload } from "../middlewares/upload.middleware";
import {
  getMyWallet,
  getMyTransactions,
  initiateManualRecharge,
  submitTransferReceipt,
  initiateGatewayRecharge,
  verifyGatewayRecharge,
  getAdminWallets,
  toggleWalletLimit,
  adminRechargeWallet,
  getAdminWalletTransactions,
  verifyManualTransaction,
  getWalletSettings,
  updateWalletSettings,
} from "../controllers/wallet.controller";

export function registerWalletRoutes(app: Express) {
  // ==================== USER WALLET ROUTES ====================
  
  // Get current user's wallet
  app.get("/api/wallet/my-wallet", requireAuth, getMyWallet);

  // Get current user's wallet transactions
  app.get("/api/wallet/transactions", requireAuth, getMyTransactions);

  // Initiate manual recharge (UPI, account transfer, cash)
  app.post("/api/wallet/recharge/manual", requireAuth, initiateManualRecharge);

  // Submit transfer receipt for account transfer (allows uploading a file)
  app.post(
    "/api/wallet/transactions/:transactionId/submit-receipt",
    requireAuth,
    upload.single("receipt"),
    handleDigitalOceanUpload,
    submitTransferReceipt
  );

  // Initiate gateway recharge (Razorpay, PayPal, Tap, Instamojo)
  app.post("/api/wallet/recharge/gateway", requireAuth, initiateGatewayRecharge);

  // Verify gateway payment
  app.post("/api/wallet/recharge/verify", requireAuth, verifyGatewayRecharge);

  // ==================== ADMIN WALLET ROUTES ====================

  // Get all wallets (for admin)
  app.get("/api/admin/wallets", requireAuth, requireRole("superadmin"), getAdminWallets);

  // Toggle wallet restriction limit on/off for a tenant/user
  app.post("/api/admin/wallets/toggle", requireAuth, requireRole("superadmin"), toggleWalletLimit);

  // Directly adjust balance / manual adjustment (admin action)
  app.post("/api/admin/wallets/recharge-manual", requireAuth, requireRole("superadmin"), adminRechargeWallet);

  // Get all wallet transactions (for admin verification)
  app.get("/api/admin/wallet-transactions", requireAuth, requireRole("superadmin"), getAdminWalletTransactions);

  // Verify / approve / reject a manual transaction (admin action)
  app.post("/api/admin/wallet-transactions/:transactionId/verify", requireAuth, requireRole("superadmin"), verifyManualTransaction);

  // Get wallet settings (global margins, upi id, bank details, exchange rates)
  app.get("/api/admin/wallet/settings", requireAuth, requireRole("superadmin"), getWalletSettings);

  // Update wallet settings (global margins, upi id, bank details, exchange rates)
  app.put("/api/admin/wallet/settings", requireAuth, requireRole("superadmin"), updateWalletSettings);
}
