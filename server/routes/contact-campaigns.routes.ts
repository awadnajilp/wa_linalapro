/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import type { Express } from "express";
import * as controller from "../controllers/contact-campaigns.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerContactCampaignRoutes(app: Express) {
  // Get all campaigns for a specific contact
  app.get("/api/contacts/:contactId/campaigns", requireAuth, controller.getContactCampaigns);

  // Get all campaigns for a specific channel
  app.get("/api/channels/:channelId/contact-campaigns", requireAuth, controller.getChannelContactCampaigns);

  // Create a contact campaign
  app.post("/api/contacts/:contactId/campaigns", requireAuth, controller.createContactCampaign);

  // Update a contact campaign
  app.put("/api/contacts/campaigns/:id", requireAuth, controller.updateContactCampaign);

  // Delete a contact campaign
  app.delete("/api/contacts/campaigns/:id", requireAuth, controller.deleteContactCampaign);

  // Send / Retry a specific contact campaign message now
  app.post("/api/contacts/campaigns/:id/send-now", requireAuth, controller.sendContactCampaignNow);

  // Retry all failed recurring campaign messages for a channel
  app.post("/api/channels/:channelId/contact-campaigns/retry-failed", requireAuth, controller.retryFailedContactCampaigns);

  // Get campaign templates for a channel
  app.get("/api/contacts/campaign-templates", requireAuth, controller.getContactCampaignTemplates);

  // Delete campaign template
  app.delete("/api/contacts/campaign-templates/:id", requireAuth, controller.deleteContactCampaignTemplate);
}
