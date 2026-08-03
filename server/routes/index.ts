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

import type { Express } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { createServer, type Server } from "http";

// Import all route modules
import { registerChannelRoutes } from "./channels.routes";
import { registerDashboardRoutes } from "./dashboard.routes";
import { registerAnalyticsRoutes } from "./analytics.routes";
import { registerContactRoutes } from "./contacts.routes";
import { registerContactCampaignRoutes } from "./contact-campaigns.routes";
import { registerCampaignRoutes } from "./campaigns.routes";
import { registerTemplateRoutes } from "./templates.routes";
import { registerMediaRoutes } from "./media.routes";
import { registerConversationRoutes } from "./conversations.routes";
import { registerAutomationRoutes } from "./automation.routes";
// import { registerAutomationsRoutes } from "./automations.routes";
import { registerWhatsAppRoutes } from "./whatsapp.routes";
import { registerWhatsappConfigRoutes } from "./whatsappConfig.routes";
import { registerWebhookRoutes } from "./webhooks.routes";
import { registerMessageRoutes } from "./messages.routes";
import { registerPaymentsRoutes } from "./payment.routes";
import { registerMessageLogsRoutes } from "./messages.logs.routes";
import { registerPlansRoutes } from "./plans.routes";
import { registerSubscriptionsRoutes } from "./subscriptions.routes";
import {userRoutes} from "./user.route"
import teamRoutes from "./team.routes";
import authRoutes from "./auth.routes";
import { registerSMTPRoutes } from "./smtp.route";
import { registerVoiceRoutes } from "./voice.routes";
import { registerAiProfileRoutes } from "./ai-profile.routes";
import { registerCRMRoutes } from "./crm.routes";

// Import error handler middleware
import { errorHandler } from "../middlewares/error.middleware";
import { registerPanelConfigRoutes } from "./panel.config.routes";
import { registerStorageSettingsRoutes } from "./storage.settings.route";
import { registerAISettingsRoutes } from "./ai.settings.routes";
import { registerFirebaseSettingsRoutes } from "./firebase.settings.routes";
import { registerWidgetRoutes } from "./chatbot.routes";
import { registerTicketsRoutes } from "./support.tickets.routes";
import { registerNotificationsRoutes } from "./notifications.routes";
import { requireAuth } from "../middlewares/auth.middleware";

import { registerGroupRoutes } from "./group.routes";
import { registerTrainingRoutes } from "./training.routes";
import { registerLanguageRoutes } from "./language.routes";
import { registerClientApiRoutes } from "./client-api.routes";
import { registerRestApiV1Routes } from "./rest-api-v1.routes";
import { registerTagsRoutes } from "./tags.routes";

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  // Auth routes (no authentication required)
  app.use("/api/auth", authRoutes);

  // Register all route modules
  registerWidgetRoutes(app);
  registerGroupRoutes(app);
  registerPlansRoutes(app);
  registerNotificationsRoutes(app);

  userRoutes(app);
  registerSMTPRoutes(app);
  registerVoiceRoutes(app);
  registerStorageSettingsRoutes(app);
  registerAISettingsRoutes(app);
  registerFirebaseSettingsRoutes(app);
  registerChannelRoutes(app);
  registerDashboardRoutes(app);
  registerAnalyticsRoutes(app); // Legacy - kept for compatibility
  registerContactRoutes(app);
  registerContactCampaignRoutes(app);
  registerCampaignRoutes(app);
  registerTemplateRoutes(app);
  registerMediaRoutes(app);
  registerConversationRoutes(app);
  registerAutomationRoutes(app);
  // registerAutomationsRoutes(app);
  registerWhatsAppRoutes(app);
  registerWhatsappConfigRoutes(app);
  registerWebhookRoutes(app);
  registerMessageRoutes(app);
  registerMessageLogsRoutes(app);
  registerPanelConfigRoutes(app)
  registerPaymentsRoutes(app);
  registerTicketsRoutes(app);
  registerSubscriptionsRoutes(app);
  registerTrainingRoutes(app);
  registerLanguageRoutes(app);
  registerClientApiRoutes(app);
  registerRestApiV1Routes(app);
  registerTagsRoutes(app);
  registerAiProfileRoutes(app);
  registerCRMRoutes(app);
  
  // Team management routes
  app.use("/api/team", teamRoutes);
  
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const { storage } = await import("../storage");
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Use the existing HTTP server if provided, otherwise create a new one
  const httpServer = existingServer || createServer(app);

  // Export broadcast function for use in message routes using Socket.io
  (global as any).broadcastToConversation = (conversationId: string, data: any) => {
    const io = (global as any).io;
    if (io) {
      Promise.resolve().then(async () => {
        let channelId = data.channelId;
        if (!channelId) {
          try {
            const { storage } = await import("../storage");
            const conv = await storage.getConversation(conversationId);
            if (conv) {
              channelId = conv.channelId;
            }
          } catch (dbErr) {
            console.error("❌ [broadcastToConversation] Database lookup error:", dbErr);
          }
        }
        
        const payload = { ...data, conversationId, channelId };
        console.log(`📡 [broadcastToConversation] Broadcasting to conversation:${conversationId} (channelId: ${channelId}):`, payload);
        
        // Send to clients joined to this specific conversation room (Socket.io handles this)
        io.to(`conversation:${conversationId}`).emit("new-message", payload);
        io.to(`conversation_${conversationId}`).emit("new-message", payload);
        io.to(`conversation:${conversationId}`).emit("new_message", payload);
        io.to(`conversation_${conversationId}`).emit("new_message", payload);
        
        // Send to all clients (for real-time updates in sidebar and unread notifications)
        io.emit("new-message", payload);
        io.emit("new_message", payload);
      });
    } else {
      console.error("❌ [broadcastToConversation] Socket.io not initialized");
    }
  };

  // Error handling middleware - must be registered last
  app.use(errorHandler);

  return httpServer;
}