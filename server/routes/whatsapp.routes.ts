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
import { storage } from "../storage";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { channelHealthMonitor } from "server/cron/channel-health-monitor";
import { handleDigitalOceanUpload, upload } from "../middlewares/upload.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireSubscription } from "../middlewares/requireSubscription";
import { insertWhatsappChannelSchema } from "@shared/schema";
import fs from "fs";
import { db } from "../db";
import { subscriptions, plans, channels, warmerConfigs, warmerMessages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaileysManager } from "../services/baileys-manager";

const qrSessions = new Map<string, {
  userId: string;
  name: string;
  phoneNumber: string;
  status: "pending" | "authenticated" | "expired";
  createdAt: number;
}>();

export function registerWhatsAppRoutes(app: Express) {
  // Initiate QR code channel setup session
  app.post("/api/whatsapp/channels/qr/initiate", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if plan allows QR code channel login
      const userId = user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id;
      if (user.role !== "superadmin") {
        const activeSubs = await db
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
        if (activeSubs.length === 0) {
          return res.status(403).json({ error: "Active subscription required." });
        }
        const [plan] = await db.select().from(plans).where(eq(plans.id, activeSubs[0].planId));
        if (!plan || plan.permissions?.qrCodeChannelEnabled !== 'true') {
          return res.status(403).json({ error: "Your plan package does not support QR code based channels. Please upgrade." });
        }
      }

      const { name = "QR Channel", phoneNumber = "" } = req.body;

      // 1. Insert channel into DB (starts inactive, will scan to activate)
      const [newChannel] = await db.insert(channels).values({
        name,
        phoneNumberId: `qr_phone_${randomUUID().substring(0, 8)}`,
        accessToken: `qr_token_${randomUUID().substring(0, 8)}`,
        whatsappBusinessAccountId: `qr_waba_${randomUUID().substring(0, 8)}`,
        phoneNumber: phoneNumber || null,
        connectionMethod: "qr_code",
        isActive: false,
        createdBy: userId,
        appId: `qr_app_${randomUUID().substring(0, 8)}`
      }).returning();

      // 2. Start a real Baileys session
      BaileysManager.createSession(newChannel.id, name, phoneNumber);

      // Wait briefly for the initial QR generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const qrState = BaileysManager.getSessionStatus(newChannel.id);

      res.json({
        success: true,
        sessionId: newChannel.id,
        qrCodeUrl: qrState.qrCodeUrl || null,
        status: qrState.status
      });

    } catch (err: any) {
      console.error("Error initiating QR session:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get status of QR session
  app.get("/api/whatsapp/channels/qr/status/:sessionId", requireAuth, async (req, res) => {
    const { sessionId } = req.params;
    const qrState = BaileysManager.getSessionStatus(sessionId);

    res.json({
      success: true,
      status: qrState.status,
      qrCodeUrl: qrState.qrCodeUrl || null
    });
  });

  // Simulate scanning of QR code (authenticates immediately)
  app.post("/api/whatsapp/channels/qr/simulate-scan/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [channel] = await db.select().from(channels).where(eq(channels.id, sessionId)).limit(1);
      if (!channel) {
        return res.status(404).json({ error: "Channel session not found" });
      }

      // Close the active Baileys session for simulation
      await BaileysManager.deleteSession(sessionId);

      // Manually set status to authenticated
      BaileysManager.setSessionStatus(sessionId, "authenticated");

      // Update channel into DB to active
      const [updatedChannel] = await db
        .update(channels)
        .set({
          isActive: true,
          healthStatus: "healthy",
          updatedAt: new Date()
        })
        .where(eq(channels.id, sessionId))
        .returning();

      // Create a default warmer config for the new channel
      const [warmerConfig] = await db.insert(warmerConfigs).values({
        channelId: updatedChannel.id,
        isActive: false,
        minDelay: 10,
        maxDelay: 60,
        createdBy: user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id
      }).returning();

      // Insert pre-made warmer messages (15 messages)
      const premadeMessages = [
        "Hello! How are you doing today?",
        "Just checking in to see if you have any questions.",
        "Hey! Are you available for a quick chat?",
        "Hi there! Hope you are having a wonderful week.",
        "Good morning! Let me know if you need anything.",
        "Hello, hope you're having a productive day!",
        "Hi, just wanted to say hello and see how things are going.",
        "Hey, are you free to connect later today?",
        "Greetings! Wishing you a great day ahead.",
        "Hello! Let's touch base whenever you have a moment.",
        "Hi! Hope everything is going well on your end.",
        "Good afternoon! Let me know if you have some free time.",
        "Hey, just following up on our last conversation.",
        "Hi there! Just wanted to share a quick update.",
        "Hello! Hope you have a great weekend ahead!"
      ];

      for (const text of premadeMessages) {
        await db.insert(warmerMessages).values({
          warmerConfigId: warmerConfig.id,
          messageText: text
        });
      }

      res.json({
        success: true,
        message: "Successfully connected QR Code channel and initialized default warmer settings via simulated scan.",
        channel: updatedChannel
      });
    } catch (err: any) {
      console.error("Error simulating scan:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get warmer configuration and messages
  app.get("/api/whatsapp/warmer/:channelId", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      let config = await storage.getWarmerConfig(channelId);
      if (!config) {
        // Create one if it doesn't exist
        const userId = req.user.role === "team" && (req.user as any).createdBy ? (req.user as any).createdBy : req.user.id;
        config = await storage.createWarmerConfig({
          channelId,
          isActive: false,
          minDelay: 10,
          maxDelay: 60,
          createdBy: userId
        });
      }
      const messagesList = await storage.getWarmerMessages(config.id);
      res.json({
        success: true,
        config,
        messages: messagesList
      });
    } catch (err: any) {
      console.error("Error fetching warmer settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update warmer configuration
  app.post("/api/whatsapp/warmer/:channelId", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { isActive, minDelay, maxDelay } = req.body;
      let config = await storage.getWarmerConfig(channelId);
      if (!config) {
        const userId = req.user.role === "team" && (req.user as any).createdBy ? (req.user as any).createdBy : req.user.id;
        config = await storage.createWarmerConfig({
          channelId,
          isActive: isActive ?? false,
          minDelay: minDelay ?? 10,
          maxDelay: maxDelay ?? 60,
          createdBy: userId
        });
      } else {
        config = await storage.updateWarmerConfig(config.id, {
          isActive: isActive !== undefined ? isActive : config.isActive,
          minDelay: minDelay !== undefined ? Number(minDelay) : config.minDelay,
          maxDelay: maxDelay !== undefined ? Number(maxDelay) : config.maxDelay
        });
      }
      res.json({
        success: true,
        config
      });
    } catch (err: any) {
      console.error("Error updating warmer config:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Add warmer message
  app.post("/api/whatsapp/warmer/:channelId/messages", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { messageText } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: "Message text is required" });
      }
      let config = await storage.getWarmerConfig(channelId);
      if (!config) {
        const userId = req.user.role === "team" && (req.user as any).createdBy ? (req.user as any).createdBy : req.user.id;
        config = await storage.createWarmerConfig({
          channelId,
          isActive: false,
          minDelay: 10,
          maxDelay: 60,
          createdBy: userId
        });
      }
      const newMessage = await storage.addWarmerMessage({
        warmerConfigId: config.id,
        messageText
      });
      res.json({
        success: true,
        message: newMessage
      });
    } catch (err: any) {
      console.error("Error adding warmer message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update warmer message
  app.put("/api/whatsapp/warmer/:channelId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const { messageId } = req.params;
      const { messageText } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: "Message text is required" });
      }
      const updated = await storage.updateWarmerMessage(messageId, messageText);
      if (!updated) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json({
        success: true,
        message: updated
      });
    } catch (err: any) {
      console.error("Error updating warmer message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete warmer message
  app.delete("/api/whatsapp/warmer/:channelId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await storage.deleteWarmerMessage(messageId);
      if (!deleted) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json({
        success: true,
        message: "Message deleted successfully"
      });
    } catch (err: any) {
      console.error("Error deleting warmer message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all WhatsApp channels
  app.get("/api/whatsapp/channels", async (req, res) => {
    try {
      const channels = await storage.getWhatsappChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching WhatsApp channels:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp channels" });
    }
  });

  // Get single WhatsApp channel
  app.get("/api/whatsapp/channels/:id", async (req, res) => {
    try {
      const channel = await storage.getWhatsappChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ message: "WhatsApp channel not found" });
      }
      res.json(channel);
    } catch (error) {
      console.error("Error fetching WhatsApp channel:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp channel" });
    }
  });

  // Create WhatsApp channel
  app.post("/api/whatsapp/channels", requireAuth, requireSubscription("channel"), async (req, res) => {
    try {
      const data = insertWhatsappChannelSchema.parse(req.body);
      const channel = await storage.createWhatsappChannel(data);
      res.status(201).json(channel);
    } catch (error) {
      console.error("Error creating WhatsApp channel:", error);
      res.status(500).json({ message: "Failed to create WhatsApp channel" });
    }
  });

  // Update WhatsApp channel
  app.put("/api/whatsapp/channels/:id", async (req, res) => {
    try {
      const channel = await storage.updateWhatsappChannel(req.params.id, req.body);
      if (!channel) {
        return res.status(404).json({ message: "WhatsApp channel not found" });
      }
      res.json(channel);
    } catch (error) {
      console.error("Error updating WhatsApp channel:", error);
      res.status(500).json({ message: "Failed to update WhatsApp channel" });
    }
  });

  // Delete WhatsApp channel
  app.delete("/api/whatsapp/channels/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChannel(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "WhatsApp channel not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting WhatsApp channel:", error);
      res.status(500).json({ message: "Failed to delete WhatsApp channel" });
    }
  });

  // Send WhatsApp message
  // app.post("/api/whatsapp/channels/:id/send", async (req, res) => {
  //   try {


  //     console.log("Req params.id : ===> "  , req.params.id)

  //     // Get the regular channel first
  //     const channel = await storage.getChannel(req.params.id);
  //     if (!channel) {
  //       return res.status(404).json({ message: "Channel not found" });
  //     }
      
  //     // Ensure channel has WhatsApp credentials
  //     if (!channel.phoneNumberId || !channel.accessToken) {
  //       return res.status(400).json({ message: "Channel is not configured for WhatsApp" });
  //     }

  //     const { to, type, message, templateName, templateLanguage, templateVariables } = req.body;
      

  //     console.log("Req body : ===> "  , req.body)


  //     // Build WhatsApp message payload
  //     let payload: any;

  //     let newMsg = null

  //     if (type === "template") {
  //       payload = {
  //         to,
  //         type: "template",
  //         template: {
  //           name: templateName,
  //           language: {
  //             code: templateLanguage || "en"
  //           }
  //         }
  //       };

  //       newMsg =  (await storage.getTemplatesByName(templateName))[0] ?? null

  //     // return  console.log("New msg ==>" , newMsg?.body)
        
  //       // Add template parameters if provided
  //       if (templateVariables && templateVariables.length > 0) {
  //         payload.template.components = [
  //           {
  //             type: "body",
  //             parameters: templateVariables.map((value: string) => ({
  //               type: "text",
  //               text: value
  //             }))
  //           }
  //         ];
  //       }
  //     } else {
  //       payload = {
  //         to,
  //         type: "text",
  //         text: {
  //           body: message
  //         }
  //       };
  //     }
      
  //     // Send message using WhatsApp API service instance
  //     const whatsappApi = new WhatsAppApiService(channel);
  //     const result = await whatsappApi.sendDirectMessage(payload);

  //     if (result.success && result.data) {
  //       // Save the message to database
  //       const messageId = result.data.messages?.[0]?.id;
        
  //       // Find or create contact
  //       const contacts = await storage.searchContacts(to);
  //       let contact = contacts.find(c => c.phone === to);
        
  //       if (!contact) {
  //         // Create new contact if doesn't exist
  //         contact = await storage.createContact({
  //           name: to,
  //           phone: to,
  //           email: "",
  //           channelId: channel.id,
  //           status: "active",
  //         });
  //       }
        
  //       console.log("conversation start ===> "  , req.body)

        
  //       // Find or create conversation
  //       let conversation = await storage.getConversationByPhone(to);
  //       console.log("conversation mid ===> "  ,conversation)
  //       if (!conversation) {
  //         conversation = await storage.createConversation({
  //           channelId: channel.id,
  //           contactId: contact.id,
  //           contactPhone: to,
  //           contactName: contact.name,
  //           status: "active",
  //           lastMessageAt: new Date(),
  //           lastMessageText: newMsg?.body || null
  //         });
  //       }
  //       console.log("conversation end ===> ")
        
  //       // Create message record
  //       await storage.createMessage({
  //         conversationId: conversation.id,
  //         content: type === "text" ? message : newMsg?.body,
  //         direction: "outgoing",
  //         type: type,
  //         status: "sent",
  //         whatsappMessageId: messageId || undefined,
  //       });
        
  //       console.log("updateConversation : ===> "  , {lastMessageAt: new Date(),
  //         lastMessageText:  newMsg?.body})


  //       // Update conversation last message time
  //       await storage.updateConversation(conversation.id, {
  //         lastMessageAt: new Date(),
  //         lastMessageText:  newMsg?.body || null
  //       });
        
  //       res.json({ 
  //         success: true, 
  //         messageId: messageId,
  //         message: "Message sent successfully" 
  //       });
  //     } else {
  //       res.status(400).json({ 
  //         success: false, 
  //         message: result.error || "Failed to send message" 
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error sending WhatsApp message:", error);
  //     res.status(500).json({ message: "Failed to send WhatsApp message" });
  //   }
  // });



//   app.post("/api/whatsapp/channels/:id/send", async (req, res) => {
//   try {
//     console.log("Req params.id : ===>", req.params.id);
//     console.log("Req body : ===>", req.body);

//     const channel = await storage.getChannel(req.params.id);
//     if (!channel) {
//       return res.status(404).json({ message: "Channel not found" });
//     }

//     if (!channel.phoneNumberId || !channel.accessToken) {
//       return res
//         .status(400)
//         .json({ message: "Channel is not configured for WhatsApp" });
//     }

//     let {
//       to,
//       type,
//       message,
//       templateName,
//       templateLanguage,
//       templateVariables,
//     } = req.body;

//     // 🔥 STATIC FALLBACK (IMPORTANT)
//     if (type === "template") {
//       if (!Array.isArray(templateVariables) || templateVariables.length === 0) {
//         templateVariables = ["Ram"]; // 👈 static value
//       }
//     }

//     let payload: any;
//     let newMsg = null;

//     const whatsappApi = new WhatsAppApiService(channel);

//     // ================= TEMPLATE =================
//     if (type === "template") {
//       payload = {
//         messaging_product: "whatsapp",
//         to,
//         type: "template",
//         template: {
//           name: templateName,
//           language: {
//             code: templateLanguage || "en_US",
//           },
//           components: [
//             {
//               type: "body",
//               parameters: templateVariables.map((value: string) => ({
//                 type: "text",
//                 text: value,
//               })),
//             },
//           ],
//         },
//       };

//       // optional preview text
//       newMsg = templateVariables.join(" ");
//     }

//     // ================= TEXT =================
//     else {
//       payload = {
//         messaging_product: "whatsapp",
//         to,
//         type: "text",
//         text: { body: message },
//       };

//       newMsg = message;
//     }

//     console.log(
//       "📤 Sending WhatsApp payload:",
//       JSON.stringify(payload, null, 2)
//     );

//     // ================= SEND =================
//     const result = await whatsappApi.sendDirectMessage(payload);

//     if (!result.success || !result.data) {
//       return res.status(400).json({
//         success: false,
//         message: result.error || "Failed to send message",
//       });
//     }

//     const messageId = result.data.messages?.[0]?.id;

//     // ================= CONTACT =================
//     const contacts = await storage.searchContacts(to);
//     let contact = contacts.find((c) => c.phone === to);

//     if (!contact) {
//       contact = await storage.createContact({
//         name: to,
//         phone: to,
//         email: "",
//         channelId: channel.id,
//         status: "active",
//       });
//     }

//     // ================= CONVERSATION =================
//     let conversation = await storage.getConversationByPhone(to);

//     if (!conversation) {
//       conversation = await storage.createConversation({
//         channelId: channel.id,
//         contactId: contact.id,
//         contactPhone: to,
//         contactName: contact.name,
//         status: "active",
//         lastMessageAt: new Date(),
//         lastMessageText: newMsg,
//       });
//     }

//     await storage.createMessage({
//       conversationId: conversation.id,
//       content: newMsg,
//       direction: "outgoing",
//       type,
//       status: "sent",
//       whatsappMessageId: messageId,
//     });

//     await storage.updateConversation(conversation.id, {
//       lastMessageAt: new Date(),
//       lastMessageText: newMsg,
//     });

//     return res.json({
//       success: true, 
//       messageId,
//       message: "Message sent successfully",
//     });
//   } catch (error: any) {
//     console.error("❌ Error sending WhatsApp message:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Failed to send WhatsApp message",
//     });
//   }
// });


app.post("/api/whatsapp/channels/:id/send", async (req, res) => {
  try {
    console.log("🚀 SEND MESSAGE REQUEST");
    console.log("📝 Req params.id:", req.params.id);
    console.log("📦 Req body:", JSON.stringify(req.body, null, 2));

    const channel = await storage.getChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!channel.phoneNumberId || !channel.accessToken) {
      return res.status(400).json({
        message: "Channel is not configured for WhatsApp",
      });
    }

    const {
      to,
      type,
      message,
      templateName,
      templateLanguage = "en_US",
      templateVariables = [],
      headerMediaId,
      headerType,
      buttonParameters = [],
    } = req.body;

    console.log("🖼️ Header Media ID from request:", headerMediaId);

    const whatsappApi = new WhatsAppApiService(channel);

    let payload: any;
    let newMsg: string | null = null;


    // ================= TEMPLATE =================
if (type === "template") {
  if (!templateName) {
    return res.status(400).json({
      success: false,
      message: "Template name is required",
    });
  }

  // 🔑 Resolve contact FIRST (needed for fullName / phone)
  const contact =
    (await storage.searchContacts(to)).find((c) => c.phone === to) ||
    (await storage.createContact({
      name: to,
      phone: to,
      email: "",
      channelId: channel.id,
      status: "active",
    }));

  const components: any[] = [];

  // 🔹 HEADER (IMAGE)
  if (headerMediaId && headerType == 'video') {
    components.push({
      type: "header",
      parameters: [
        {
          type: "video",
          video: { id: headerMediaId },
        },
      ],
    });
  }

   if (headerMediaId && headerType == 'image') {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: { id: headerMediaId },
        },
      ],
    });
  }

  // 🔹 BODY VARIABLES
  let resolvedParams: any[] = [];

  if (Array.isArray(templateVariables) && templateVariables.length > 0) {
    resolvedParams = templateVariables.map(
      (v: { type: string; value?: string }) => {
        let text = "";

        if (v.type === "fullName") text = contact.name;
        else if (v.type === "phone") text = contact.phone;
        else if (v.type === "custom") text = v.value || "";

        return {
          type: "text",
          text,
        };
      }
    );

    // 🔐 Safety check
    if (resolvedParams.some((p) => !p.text.trim())) {
      return res.status(400).json({
        success: false,
        message: "Template variables resolved to empty values",
      });
    }

    components.push({
      type: "body",
      parameters: resolvedParams,
    });
  }

  // 🔹 BUTTON PARAMETERS (COPY_CODE / dynamic URL)
  if (Array.isArray(buttonParameters) && buttonParameters.length > 0) {
    const templateRecord =
      (await storage.getTemplateByNameAndChannel(templateName, channel.id)) ||
      (await storage.getTemplatesByName(templateName))[0];

    if (templateRecord?.buttons) {
      let templateButtons: any[] = [];
      if (typeof templateRecord.buttons === "string") {
        try { templateButtons = JSON.parse(templateRecord.buttons); } catch { templateButtons = []; }
      } else if (Array.isArray(templateRecord.buttons)) {
        templateButtons = templateRecord.buttons;
      }

      let dynBtnIdx = 0;
      templateButtons.forEach((btn: any, index: number) => {
        if (btn.type === "URL" && btn.url?.includes("{{")) {
          const paramValue = buttonParameters[dynBtnIdx] || "";
          if (paramValue) {
            components.push({
              type: "button",
              sub_type: "url",
              index: index.toString(),
              parameters: [{ type: "text", text: paramValue }],
            });
          }
          dynBtnIdx++;
        } else if (btn.type === "COPY_CODE") {
          const couponCode = buttonParameters[dynBtnIdx] || btn.example?.[0] || "";
          if (couponCode) {
            components.push({
              type: "button",
              sub_type: "copy_code",
              index: index.toString(),
              parameters: [{ type: "coupon_code", coupon_code: couponCode }],
            });
          }
          dynBtnIdx++;
        }
      });
    }
  }

  payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      ...(components.length > 0 && { components }),
    },
  };

  // 🧾 Store readable message in DB
  const templateRecord =
    (await storage.getTemplateByNameAndChannel(templateName, channel.id)) ||
    (await storage.getTemplatesByName(templateName))[0];

  if (templateRecord) {
    let bodyText = templateRecord.body;
    resolvedParams.forEach((p: any, idx: number) => {
      bodyText = bodyText.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), p.text);
    });
    newMsg = bodyText;
  } else {
    newMsg =
      resolvedParams.length > 0
        ? resolvedParams.map((p) => p.text).join(" ")
        : templateName;
  }
}


    // ================= TEXT =================
    else {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      };
      newMsg = message;
    }

    console.log(
      "📤 FINAL WHATSAPP PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );

    // ================= SEND =================
    const result = await whatsappApi.sendDirectMessage(payload);

    if (!result || !result.messages) {
      console.error("❌ WhatsApp API error:", result);
      return res.status(400).json({
        success: false,
        message: "Failed to send message",
      });
    }

    console.log("✅ WhatsApp message sent:", result);

    const messageId = result.messages?.[0]?.id;

    // ================= CONTACT =================
    let contact =
      (await storage.searchContacts(to)).find((c) => c.phone === to) ||
      (await storage.createContact({
        name: to,
        phone: to,
        email: "",
        channelId: channel.id,
        status: "active",
      }));

    // ================= CONVERSATION =================
    let conversation = await storage.getConversationByPhone(to);

    if (!conversation) {
      conversation = await storage.createConversation({
        channelId: channel.id,
        contactId: contact.id,
        contactPhone: to,
        contactName: contact.name,
        status: "active",
        lastMessageAt: new Date(),
        lastMessageText: newMsg,
      });
    }

    const createdMsg = await storage.createMessage({
      conversationId: conversation.id,
      content: newMsg,
      direction: "outgoing",
      type,
      status: "sent",
      whatsappMessageId: messageId,
    });

    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageText: newMsg,
    });

    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversation.id, {
        type: "new-message",
        message: createdMsg,
      });
    }

    return res.json({
      success: true,
      messageId,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("❌ Error sending WhatsApp message:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send WhatsApp message",
    });
  }
});


app.get(
  "/api/whatsapp/templates/:templateId/meta",
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const channelId = req.query.channelId as string;

      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const response = await fetch(
        `https://graph.facebook.com/v24.0/${templateId}`,
        {
          headers: {
            Authorization: `Bearer ${channel.accessToken}`,
          },
        }
      );

      const meta = await response.json();

      // 🔥 Extract REQUIRED INFO
      let headerType: string | null = null;
      let bodyText = "";
      let bodyVariables = 0;

      let hasLimitedTimeOffer = false;

      for (const c of meta.components || []) {
        if (c.type === "HEADER") {
          headerType = c.format; // IMAGE / TEXT
        }

        if (c.type === "BODY") {
          bodyText = c.text || "";
          bodyVariables =
            (bodyText.match(/\{\{\d+\}\}/g) || []).length;
        }

        if (c.type === "LIMITED_TIME_OFFER") {
          hasLimitedTimeOffer = true;
        }
      }

      return res.json({
        id: meta.id,
        name: meta.name,
        headerType,
        hasLimitedTimeOffer,
        body: bodyText,
        bodyVariables,
        language: meta.language,
        status: meta.status,
        category: meta.category,
      });
    } catch (err) {
      console.error("Template meta error:", err);
      res.status(500).json({ message: "Failed to fetch template meta" });
    }
  }
);




// image upload for header

app.post(
  "/api/whatsapp/channels/:id/upload-image",
  upload.fields([{ name: "mediaFile", maxCount: 1 }]),
  async (req, res) => {
    try {
      console.log("📥 Upload image request");

      const channelId = req.params.id;
      const { templateId } = req.body; // ✅ BODY se

      if (!templateId) {
        return res.status(400).json({
          message: "templateId is required in body",
        });
      }

      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      if (!channel.phoneNumberId || !channel.accessToken) {
        return res.status(400).json({
          message: "Channel is not configured for WhatsApp",
        });
      }

      const mediaFile = Array.isArray(req.files?.mediaFile)
        ? req.files.mediaFile[0]
        : null;

      if (!mediaFile) {
        return res.status(400).json({
          message: "mediaFile (image) is required",
        });
      }

      const buffer = fs.readFileSync(mediaFile.path);

      const whatsappApi = new WhatsAppApiService(channel);

      const mediaId = await whatsappApi.uploadMediaBufferHeader(
        buffer,
        mediaFile.mimetype,
        mediaFile.originalname
      );

      fs.unlinkSync(mediaFile.path);

      // ✅ Template update
      await storage.updateTemplate(templateId, {
        mediaUrl: mediaId,
        mediaType: "image",
      });

      return res.json({
        success: true,
        mediaId,
        message: "Image uploaded and saved to template successfully",
      });
    } catch (error: any) {
      console.error("❌ Image upload error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image",
      });
    }
  }
);



app.post(
  "/api/whatsapp/channels/:id/upload-media",
  upload.fields([{ name: "mediaFile", maxCount: 1 }]),
  async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const channelId = req.params.id;
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      if (user.role !== "superadmin") {
        const ownerId = user.role === "team" ? user.createdBy : user.id;
        if (channel.createdBy !== ownerId) {
          return res.status(403).json({ message: "Not authorized for this channel" });
        }
      }

      if (!channel.phoneNumberId || !channel.accessToken) {
        return res.status(400).json({ message: "Channel is not configured for WhatsApp" });
      }

      const mediaFile = Array.isArray(req.files?.mediaFile)
        ? req.files.mediaFile[0]
        : null;

      if (!mediaFile) {
        const filterError = (req as any).fileFilterError;
        return res.status(400).json({
          message: filterError || "mediaFile is required",
        });
      }

      const maxSizes: Record<string, number> = {
        image: 5 * 1024 * 1024,
        video: 16 * 1024 * 1024,
        audio: 16 * 1024 * 1024,
        document: 100 * 1024 * 1024,
      };
      const mediaType = req.body.mediaType || "image";
      const maxSize = maxSizes[mediaType] || 16 * 1024 * 1024;
      if (mediaFile.size > maxSize) {
        fs.unlinkSync(mediaFile.path);
        return res.status(400).json({ message: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB for ${mediaType}` });
      }

      const buffer = fs.readFileSync(mediaFile.path);
      const whatsappApi = new WhatsAppApiService(channel);
      const mediaId = await whatsappApi.uploadMediaBuffer(buffer, mediaFile.mimetype, mediaFile.originalname);
      fs.unlinkSync(mediaFile.path);

      return res.json({ success: true, mediaId });
    } catch (error: any) {
      console.error("Media upload error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to upload media" });
    }
  }
);

app.post(
  "/api/whatsapp/channels/:id/upload-imageOLLd",
  upload.fields([{ name: "mediaFile", maxCount: 1 }]),
  async (req, res) => {
    try {
      console.log("📥 Upload image request");

      const channel = await storage.getChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      if (!channel.phoneNumberId || !channel.accessToken) {
        return res.status(400).json({
          message: "Channel is not configured for WhatsApp",
        });
      }

      // 🔥 multer.fields output handling
      const mediaFile =
        Array.isArray(req.files?.mediaFile)
          ? req.files.mediaFile[0]
          : null;

      if (!mediaFile) {
        return res.status(400).json({
          message: "mediaFile (image) is required",
        });
      }

      console.log("📁 Image:", mediaFile.originalname);

      const buffer = fs.readFileSync(mediaFile.path);

      const whatsappApi = new WhatsAppApiService(channel);

      // 🔥 Upload image to WhatsApp Media API
      const mediaId = await whatsappApi.uploadMediaBufferHeader(
        buffer,
        mediaFile.mimetype,
        mediaFile.originalname
      );

      // optional cleanup
      fs.unlinkSync(mediaFile.path);

      return res.json({
        success: true,
        mediaId, // 👈 TEMPLATE HEADER IMAGE ID
        message: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("❌ Image upload error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image",
      });
    }
  }
);


// image upload for header



  // Test WhatsApp connection
  app.post("/api/whatsapp/channels/:id/test", async (req, res) => {
    try {
      const channel = await storage.getChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      if (!channel.phoneNumberId || !channel.accessToken) {
        return res.status(400).json({ message: "Channel is not configured for WhatsApp" });
      }

      let testPhone = (req.body.phoneNumber || "919310797700").replace(/\D/g, '');
      const testMessage = req.body.message || "Hello! This is a test message from LINALA.";

      const apiVersion = process.env.WHATSAPP_API_VERSION || "v24.0";

      const requestBody = {
        messaging_product: "whatsapp",
        to: testPhone,
        type: "text",
        text: { body: testMessage },
      };

      const startTime = Date.now();
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${channel.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${channel.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();
      const duration = Date.now() - startTime;

      await storage.createApiLog({
        channelId: channel.id,
        requestType: "test_connection",
        endpoint: `https://graph.facebook.com/${apiVersion}/${channel.phoneNumberId}/messages`,
        method: "POST",
        requestBody,
        responseStatus: response.status,
        responseBody: result,
        duration,
      });

      if (!response.ok) {
        const errorMsg = result.error?.error_user_msg || result.error?.message || "Failed to send test message";
        return res.status(response.status).json({ message: errorMsg });
      }

      res.json({ success: true, message: "Test message sent successfully", result });
    } catch (error: any) {
      console.error("Error testing WhatsApp connection:", error);
      res.status(500).json({ message: error.message || "Failed to test WhatsApp connection" });
    }
  });

  // Get WhatsApp channel health
  // app.get("/api/whatsapp/channels/:id/health", async (req, res) => {
  //   try {
  //     const channel = await storage.getWhatsappChannel(req.params.id);
  //     if (!channel) {
  //       return res.status(404).json({ message: "Channel not found" });
  //     }

  //     const result = await channelHealthMonitor.checkChannelHealth(channel);
      
  //     // Update last health check time if health check succeeded
  //     if ('status' in result && result.status === 'active') {
  //       await storage.updateWhatsappChannel(req.params.id, {
  //         lastHealthCheck: new Date(),
  //         status: "active"
  //       });
  //     }

  //     res.json(result);
  //   } catch (error) {
  //     console.error("Error checking WhatsApp channel health:", error);
  //     res.status(500).json({ message: "Failed to check channel health" });
  //   }
  // });

  // Get API logs
  app.get("/api/whatsapp/api-logs", async (req, res) => {
    try {
      const channelId = req.query.channelId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
  
      if (!channelId) {
        return res.status(400).json({ message: "Missing required query parameter: channelId" });
      }
  
      const logs = await storage.getApiLogs(channelId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching API logs:", error);
      res.status(500).json({ message: "Failed to fetch API logs" });
    }
  });  
}