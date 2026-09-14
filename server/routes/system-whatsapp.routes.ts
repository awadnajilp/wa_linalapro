/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * System WhatsApp Notification Routes
 * ============================================================
 */

import { Router } from "express";
import {
  getSystemWhatsappSettings,
  updateSystemWhatsappSettings,
  sendTestWhatsappNotification,
} from "../controllers/system-whatsapp.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get("/config", requireAuth, requireRole("superadmin"), getSystemWhatsappSettings);
router.post("/config", requireAuth, requireRole("superadmin"), updateSystemWhatsappSettings);
router.post("/test", requireAuth, requireRole("superadmin"), sendTestWhatsappNotification);

export default router;

