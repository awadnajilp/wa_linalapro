import { getFirebaseSettings, updateFirebaseSetting } from "../controllers/firebase.settings.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import type { Express } from "express";

export function registerFirebaseSettingsRoutes(app: Express) {
  app.get("/api/firebase-settings", requireAuth, requireRole("superadmin"), getFirebaseSettings);
  app.post("/api/firebase-settings/update", requireAuth, requireRole("superadmin"), updateFirebaseSetting);
}
