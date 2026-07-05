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
import * as conversationsController from "../controllers/conversations.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { insertConversationSchema,PERMISSIONS } from "@shared/schema";
import { extractChannelId } from "../middlewares/channel.middleware";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { cancelConversationAutomation, getConversationAutomationStatus } from "server/controllers/webhooks.controller";

export function registerConversationRoutes(app: Express) {
  // Get unread count
  app.get('/api/conversations/unread-count', async (req, res) => {
    try {
      const activeChannel = await storage.getActiveChannel();
      if (!activeChannel) {
        return res.json({ count: 0 });
      }
      
      const conversations = await storage.getConversationsByChannel(activeChannel.id);
      const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      
      res.json({ count: unreadCount });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.json({ count: 0 });
    }
  });
  
  // Get all conversations
  app.get("/api/conversations",
    extractChannelId,
    conversationsController.getConversations
  );

  // Get single conversation
  app.get("/api/conversations/:id", conversationsController.getConversation);

  // Create conversation
  app.post("/api/conversations",
    validateRequest(insertConversationSchema),
    conversationsController.createConversation
  );

  // Quick start a conversation by phone number
  app.post("/api/conversations/quick-start",
    requireAuth,
    conversationsController.quickStartConversation
  );

  // Update conversation
  app.put("/api/conversations/:id",    requireAuth,
  requirePermission(PERMISSIONS.INBOX_ASSIGN), conversationsController.updateConversation);

  // Delete conversation
  app.delete("/api/conversations/:id", conversationsController.deleteConversation);

  // Mark conversation as read
  app.put("/api/conversations/:id/read", conversationsController.markAsRead);

  // Update conversation status
  app.patch("/api/conversations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['open', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status. Must be open, resolved, or closed' 
        });
      }
      
      await storage.updateConversation(id, { status });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating conversation status:', error);
      res.status(500).json({ message: 'Failed to update conversation status' });
    }
  });



  app.get('/api/conversations/:conversationId/automation-status', getConversationAutomationStatus);
  app.post('/api/conversations/:conversationId/cancel-automation', cancelConversationAutomation);

  // Get conversation-specific AI settings
  app.get('/api/conversations/:id/ai-settings', requireAuth, async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const { id } = req.params;
      const conv = await storage.getConversation(id);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({
        aiEnabled: conv.aiEnabled ?? false,
        aiSettings: conv.aiSettings ?? {},
      });
    } catch (error: any) {
      console.error("Error getting conversation AI settings:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // Update conversation-specific AI settings
  app.post('/api/conversations/:id/ai-settings', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { aiEnabled, aiSettings } = req.body;
      
      const oldConv = await storage.getConversation(id);
      const updated = await storage.updateConversation(id, {
        aiEnabled,
        aiSettings,
      });
      if (!updated) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // If AI is newly enabled and sendWelcome is active, send it!
      if (aiEnabled && (!oldConv || !oldConv.aiEnabled)) {
        const welcomeText = aiSettings?.welcomeMessage || "";
        const sendWelcome = aiSettings?.sendWelcome === true;
        if (sendWelcome && welcomeText.trim()) {
          try {
            const channel = await storage.getChannel(updated.channelId);
            if (channel) {
              const { WhatsAppApiService } = await import("../services/whatsapp-api");
              const whatsappApi = new WhatsAppApiService(channel);
              const result = await whatsappApi.sendTextMessage(updated.contactPhone, welcomeText);
              
              // Store as an outbound message in database
              const createdMessage = await storage.createMessage({
                conversationId: updated.id,
                content: welcomeText,
                fromUser: true,
                direction: "outbound",
                status: "sent",
                whatsappMessageId: result.messages?.[0]?.id,
                messageType: "text",
                timestamp: new Date(),
              });

              // Notify the frontend via socket
              if ((global as any).broadcastToConversation) {
                (global as any).broadcastToConversation(updated.id, {
                  type: "new-message",
                  message: createdMessage,
                });
              }

              console.log(`[Inbox AI Welcome] Sent welcome message to ${updated.contactPhone} for conversation ${updated.id}`);
            }
          } catch (err: any) {
            console.error("[Inbox AI Welcome] Error sending welcome message:", err);
          }
        }
      }

      res.json({ success: true, aiEnabled: updated.aiEnabled, aiSettings: updated.aiSettings });
    } catch (error: any) {
      console.error("Error updating conversation AI settings:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });
}