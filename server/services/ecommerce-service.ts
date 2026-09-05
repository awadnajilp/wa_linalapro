import { db } from "../db";
import { storage } from "../storage";
import * as schema from "@shared/schema";
import { eq, and, or, inArray, sql, gte, lte, desc } from "drizzle-orm";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";
import { AddonManager } from "./addon-manager";
import { WhatsAppApiService } from "./whatsapp-api";
import { getTransporter, getSystemFromAddress } from "./email.service";
import { getSMTPConfig } from "../controllers/smtp.controller";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import axios from "axios";
import Razorpay from "razorpay";
import crypto from "crypto";
import { VoiceManager } from "./voice";
import { AiBillingService } from "./ai-billing-service";

export class EcommerceService {
  /**
   * Check if ecommerce addon is active for tenant
   */
  public static async isEcommerceActive(tenantId: string): Promise<boolean> {
    return await AddonManager.isAddonActive(tenantId, "ecommerce");
  }

  /**
   * Auto-assign conversation to a team member (Permanent or Round Robin) based on ecommerce config.
   */
  public static async autoAssignConversation(
    config: schema.EcommerceConfig,
    channelRow: any,
    conversationId: string
  ): Promise<string | null> {
    try {
      if (!config.autoAssignEnabled) {
        return null;
      }

      const tenantId = channelRow?.createdBy;
      if (!tenantId) return null;

      // 1. Fetch current conversation
      const [currConv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, conversationId))
        .limit(1);

      if (!currConv) return null;

      let targetUserId: string | null = null;

      if (config.autoAssignMode === "permanent") {
        if (!config.autoAssignUserId) {
          return null;
        }
        targetUserId = config.autoAssignUserId;

        // If already assigned to target user, nothing to change
        if (currConv.assignedTo === targetUserId) {
          return targetUserId;
        }
      } else if (config.autoAssignMode === "round_robin") {
        const ownerUserId = channelRow.createdBy || tenantId;

        // 2. Fetch candidates (active team members under tenant + owner)
        const rawCandidates = await db
          .select()
          .from(schema.users)
          .where(
            and(
              eq(schema.users.status, "active"),
              or(
                eq(schema.users.id, ownerUserId),
                eq(schema.users.createdBy, ownerUserId)
              )
            )
          );

        const excludeIds: string[] = Array.isArray(config.autoAssignExcludedUserIds)
          ? (config.autoAssignExcludedUserIds as string[])
          : [];

        let candidates = rawCandidates.filter((c) => !excludeIds.includes(c.id));

        // Fallback: If all candidates are excluded, restore rawCandidates to prevent failure
        if (candidates.length === 0) {
          candidates = rawCandidates;
        }

        if (candidates.length === 0) {
          return null;
        }

        // If conversation is already assigned to an eligible candidate, keep them
        if (currConv.assignedTo && candidates.some((c) => c.id === currConv.assignedTo)) {
          return currConv.assignedTo;
        }

        const candidateIds = candidates.map((c) => c.id);

        // Find candidate with least recently assigned conversation in this channel
        const latestAssignments = await db
          .select({
            userId: schema.conversations.assignedTo,
            latestTime: sql<Date>`max(${schema.conversations.createdAt})`
          })
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.channelId, channelRow.id),
              inArray(schema.conversations.assignedTo, candidateIds)
            )
          )
          .groupBy(schema.conversations.assignedTo);

        const timeMap = new Map(
          latestAssignments.map((a) => [
            a.userId,
            a.latestTime ? new Date(a.latestTime).getTime() : 0
          ])
        );

        // Sort candidates ascending by last assignment timestamp
        candidates.sort((a, b) => {
          const timeA = timeMap.get(a.id) || 0;
          const timeB = timeMap.get(b.id) || 0;
          return timeA - timeB;
        });

        targetUserId = candidates[0].id;
      }

      if (!targetUserId) return null;

      console.log(`[EcommerceService] Auto-assigning conversation ${conversationId} to user ${targetUserId} (mode: ${config.autoAssignMode})`);

      // Update conversation
      const updatedConv = await storage.updateConversation(conversationId, {
        assignedTo: targetUserId,
        status: "assigned",
      });

      // Insert or log assignment record
      try {
        await db.insert(schema.conversationAssignments).values({
          conversationId,
          userId: targetUserId,
          status: "active",
        });
      } catch (assignErr) {
        console.warn(`[EcommerceService] Could not insert conversationAssignments log:`, assignErr);
      }

      // Broadcast update via WebSocket
      if (updatedConv && (global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversationId, {
          type: "conversation-updated",
          conversation: updatedConv,
        });
      }

      return targetUserId;
    } catch (err) {
      console.error(`[EcommerceService] Error in autoAssignConversation:`, err);
      return null;
    }
  }

  /**
   * Resolve media buffer from local path, S3/DigitalOcean bucket, or remote HTTP URL.
   */
  public static async resolveMediaBuffer(urlOrPath: string): Promise<Buffer> {
    const isLocal = !urlOrPath.startsWith("http://") && !urlOrPath.startsWith("https://");
    
    if (isLocal) {
      const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.substring(1) : urlOrPath;
      const resolvedPath = path.resolve(cleanPath);
      if (fs.existsSync(resolvedPath)) {
        console.log(`[EcommerceService.resolveMediaBuffer] Reading local file: ${resolvedPath}`);
        return fs.readFileSync(resolvedPath);
      } else {
        throw new Error(`Local file not found at path: ${resolvedPath}`);
      }
    }

    const remoteUrl = urlOrPath.replace(/ /g, "%20");

    try {
      const { createDOClient } = await import('../config/digitalOceanConfig');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const doClient = await createDOClient();
      if (doClient) {
        const { s3, bucket, endpoint } = doClient;
        const isOurBucket = remoteUrl.includes(bucket) || (endpoint && remoteUrl.includes(new URL(endpoint).host));
        
        if (isOurBucket) {
          let key = "";
          if (remoteUrl.includes(`/${bucket}/`)) {
            key = remoteUrl.substring(remoteUrl.indexOf(`/${bucket}/`) + bucket.length + 2);
          } else {
            const parsedUrl = new URL(remoteUrl);
            key = parsedUrl.pathname.replace(/^\/+/, "");
          }
          key = decodeURIComponent(key);
          
          console.log(`[EcommerceService.resolveMediaBuffer] Cloud storage match found! Downloading object: ${key}`);
          const response = await s3.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: key,
            })
          );
          if (response.Body) {
            const byteArray = await response.Body.transformToByteArray();
            return Buffer.from(byteArray);
          }
        }
      }
    } catch (err) {
      console.error("[EcommerceService.resolveMediaBuffer] Failed to download from S3, falling back to HTTP fetch:", err);
    }

    console.log(`[EcommerceService.resolveMediaBuffer] Downloading via Axios: ${remoteUrl}`);
    const response = await axios.get(remoteUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  }

  /**
   * Upload synthesized speech buffer to cloud storage or local fallback.
   */
  private static async uploadAudioBufferHelper(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const localDir = path.join(process.cwd(), "public/uploads/audio");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localPath = path.join(localDir, filename);
    fs.writeFileSync(localPath, buffer);

    let fileUrl = `/uploads/audio/${filename}`;

    try {
      const { createDOClient } = await import("../config/digitalOceanConfig");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const doClient = await createDOClient();
      if (doClient) {
        const { s3, bucket, endpoint } = doClient;
        const fileKey = `uploads/audio/${filename}`;

        try {
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket!,
              Key: fileKey,
              Body: buffer,
              ACL: "public-read",
              ContentType: mimeType,
            })
          );
        } catch (s3Error: any) {
          if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket!,
                Key: fileKey,
                Body: buffer,
                ContentType: mimeType,
              })
            );
          } else {
            throw s3Error;
          }
        }

        const endpointUrl = new URL(endpoint || "");
        fileUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;
        
        // Clean local fallback
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    } catch (err: any) {
      console.warn("[EcommerceService] Cloud voice upload failed, using local URL:", err.message);
      const appUrl = process.env.APP_URL || process.env.PUBLIC_URL || "https://wa.linalapro.com";
      fileUrl = `${appUrl.replace(/\/$/, "")}/uploads/audio/${filename}`;
    }

    return fileUrl;
  }

  /**
   * Helper to send and save outbound text messages to Postgres messages table & broadcast to live Inbox WebSocket.
   */
  public static async sendAndSaveTextMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    text: string,
    replyToWaId?: string
  ): Promise<any> {
    const waApi = new WhatsAppApiService(channelRow);
    const res = await waApi.sendTextMessage(to, text, replyToWaId);
    try {
      if (conversationId) {
        const waMsgId = res?.messages?.[0]?.id || res?.key?.id || null;
        const msg = await storage.createMessage({
          conversationId,
          content: text,
          direction: "outbound",
          fromType: "bot",
          messageType: "text",
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: {},
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: text,
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save outbound text message to DB:", e?.message);
    }
    return res;
  }

  /**
   * Helper to send and save outbound media messages to Postgres messages table & broadcast to live Inbox WebSocket.
   */
  public static async sendAndSaveMediaMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" | "audio",
    caption?: string,
    filename?: string
  ): Promise<any> {
    const waApi = new WhatsAppApiService(channelRow);
    const res = await waApi.sendMediaMessageByUrl(to, mediaUrl, mediaType, caption, filename);
    try {
      if (conversationId) {
        const waMsgId = res?.messages?.[0]?.id || res?.key?.id || null;
        const msg = await storage.createMessage({
          conversationId,
          content: caption || `[${mediaType}]`,
          direction: "outbound",
          fromType: "bot",
          messageType: mediaType,
          mediaUrl: mediaUrl,
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: { filename },
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: caption || `[${mediaType}]`,
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save outbound media message to DB:", e?.message);
    }
    return res;
  }

  /**
   * Helper to send and save outbound voice notes to Postgres messages table & broadcast to live Inbox WebSocket.
   */
  public static async sendAndSaveVoiceNote(
    channelRow: any,
    conversationId: string | null,
    to: string,
    voiceMediaUrl: string,
    caption?: string
  ): Promise<any> {
    const waApi = new WhatsAppApiService(channelRow);
    const res = await waApi.sendVoiceNote(to, voiceMediaUrl);
    try {
      if (conversationId) {
        const waMsgId = res?.messages?.[0]?.id || res?.key?.id || null;
        const msg = await storage.createMessage({
          conversationId,
          content: caption || "[Voice Note]",
          direction: "outbound",
          fromType: "bot",
          messageType: "audio",
          mediaUrl: voiceMediaUrl,
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: {},
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: caption || "[Voice Note]",
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save outbound voice note to DB:", e?.message);
    }
    return res;
  }

  /**
   * Helper to send and save document buffer to Postgres messages table & broadcast to live Inbox WebSocket.
   */
  public static async sendAndSaveDocumentBuffer(
    channelRow: any,
    conversationId: string | null,
    to: string,
    pdfBuffer: Buffer,
    filename: string,
    caption?: string
  ): Promise<any> {
    const waApi = new WhatsAppApiService(channelRow);
    const res = await waApi.sendDocumentBuffer(to, pdfBuffer, filename, caption);
    try {
      if (conversationId) {
        const waMsgId = res?.messages?.[0]?.id || res?.key?.id || null;
        const msg = await storage.createMessage({
          conversationId,
          content: caption || filename,
          direction: "outbound",
          fromType: "bot",
          messageType: "document",
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: { filename },
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: caption || `[Document: ${filename}]`,
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save outbound document buffer to DB:", e?.message);
    }
    return res;
  }

  /**
   * Calculate Delivery Fee via ZIP/PIN matching
   */
  public static async calculateDeliveryFee(
    config: any,
    pincode: string
  ): Promise<{ fee: number; state: string | null }> {
    if (!config.deliveryFeeType || config.deliveryFeeType === "flat") {
      return { fee: parseFloat(config.flatDeliveryFee || "0"), state: null };
    }

    let resolvedState: string | null = null;
    try {
      const countryCode = (config.storeCountry || "IN").toLowerCase();
      console.log(`[EcommerceService] Fetching state for zip code ${pincode} in country ${countryCode}...`);
      const response = await fetch(`https://api.zippopotam.us/${countryCode}/${encodeURIComponent(pincode)}`);
      if (response.ok) {
        const data = await response.json();
        resolvedState = data.places?.[0]?.state || null;
        console.log(`[EcommerceService] Resolved state: ${resolvedState}`);
      }
    } catch (err: any) {
      console.error(`[EcommerceService] Failed to resolve state from pincode:`, err.message);
    }

    let fee = parseFloat(config.defaultDeliveryFee || "0");
    if (resolvedState && config.stateDeliveryFees) {
      const cleanState = resolvedState.trim().toLowerCase();
      const stateFees = config.stateDeliveryFees as Record<string, string>;
      const matchingKey = Object.keys(stateFees).find(
        (key) => key.trim().toLowerCase() === cleanState
      );
      if (matchingKey) {
        const overrideFee = parseFloat(stateFees[matchingKey]);
        if (!isNaN(overrideFee)) {
          fee = overrideFee;
          console.log(`[EcommerceService] Found state-specific delivery fee override for ${resolvedState}: ${fee}`);
        }
      }
    }

    return { fee, state: resolvedState };
  }

  /**
   * Helper to derive a stable 3-digit tenant/user prefix (e.g. 101, 812)
   */
  public static getTenantOrderPrefix(tenantId?: string): string {
    if (!tenantId) return "101";
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
      hash = ((hash << 5) - hash) + tenantId.charCodeAt(i);
      hash |= 0;
    }
    const num = Math.abs(hash) % 900 + 100;
    return String(num);
  }

  /**
   * Generate sequential store/tenant based order numbers in format ORD-<prefix>-1001
   * Ensures global uniqueness against the database unique constraint
   */
  public static async generateNextOrderNumber(tenantId?: string): Promise<string> {
    const prefix = this.getTenantOrderPrefix(tenantId);
    try {
      const orders = await db
        .select({ orderNumber: schema.ecommerceOrders.orderNumber })
        .from(schema.ecommerceOrders);

      let maxNum = 1000;
      const regex = new RegExp(`^ORD-${prefix}-(\\d+)$`, 'i');
      for (const o of orders) {
        if (!o.orderNumber) continue;
        const match = o.orderNumber.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum && num < 100000) {
            maxNum = num;
          }
        }
      }

      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = `ORD-${prefix}-${maxNum + 1 + attempt}`;
        const [existing] = await db
          .select({ id: schema.ecommerceOrders.id })
          .from(schema.ecommerceOrders)
          .where(eq(schema.ecommerceOrders.orderNumber, candidate))
          .limit(1);

        if (!existing) {
          return candidate;
        }
      }
    } catch (err: any) {
      console.warn("[EcommerceService] Error computing next order number:", err?.message);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${prefix}-${randomSuffix}`;
  }

  /**
   * Intercept incoming message for Ecommerce addon
   */
  public static async interceptEcommerce(
    channelId: string,
    conversation: any[],
    contact: any[],
    message: any,
    content: string,
    isGroupMessage: boolean,
    channelRow: any
  ): Promise<boolean> {
    if (!channelId || conversation.length === 0 || isGroupMessage) {
      return false;
    }

    try {
      const tenantId = channelRow?.createdBy;
      if (!tenantId) return false;

      const isPluginActive = await this.isEcommerceActive(tenantId);
      if (!isPluginActive) return false;

      // Fetch active ecommerce config for channel
      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.channelId, channelId),
            eq(schema.ecommerceConfigs.isActive, true)
          )
        )
        .limit(1);

      if (!config) return false;

      const conversationId = conversation[0].id;
      const contactPhone = conversation[0].contactPhone;
      const cleanContent = content.trim().toLowerCase();

      // Check for trigger keywords first to allow resetting/starting fresh
      const storeKeyword = (config.storeTriggerKeyword || "").trim().toLowerCase();
      if (config.isStoreFlowActive && storeKeyword && cleanContent === storeKeyword) {
        await this.autoAssignConversation(config, channelRow, conversationId);
        // Delete any active sessions first
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
        // Create session
        await db.insert(schema.ecommerceSessions).values({
          conversationId,
          quantity: 1,
          currentStep: "waiting_for_product_selection",
          customerData: {}
        });
        await this.sendStoreCatalog(channelRow, config, conversationId, contactPhone);
        return true;
      }

      // Check individual product trigger
      const products = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(
          and(
            eq(schema.ecommerceProducts.tenantId, tenantId),
            eq(schema.ecommerceProducts.isTriggerEnabled, true)
          )
        );

      const matchedProduct = products.find(
        (p) => p.triggerKeyword && p.triggerKeyword.trim().toLowerCase() === cleanContent
      );

      if (matchedProduct) {
        await this.autoAssignConversation(config, channelRow, conversationId);
        // Delete any active sessions first
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
        await this.startIndividualProductFlow(channelRow, config, conversationId, contactPhone, matchedProduct);
        return true;
      }

      // Check interactive button clicks FIRST (always high priority)
      // 1. Interactive button replies (Buy Now, Product Info, or Ask AI)
      const buttonReplyId = message.interactive?.button_reply?.id || (message as any)?.button?.payload || (message as any)?.interactive?.buttonReply?.id;
      if (buttonReplyId) {
        if (buttonReplyId.startsWith("buy_")) {
          const productId = buttonReplyId.replace("buy_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product) {
            await this.autoAssignConversation(config, channelRow, conversationId);
            await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, product);
            return true;
          }
        } else if (buttonReplyId.startsWith("info_")) {
          const productId = buttonReplyId.replace("info_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product) {
            await this.autoAssignConversation(config, channelRow, conversationId);
            await this.sendProductDetailsInfo(channelRow, config, conversationId, contactPhone, product);
            return true;
          }
        } else if (buttonReplyId.startsWith("ai_ask_")) {
          const productId = buttonReplyId.replace("ai_ask_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product && config.aiEnabled) {
            await this.autoAssignConversation(config, channelRow, conversationId);
            // Delete active sessions
            await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
            // Create AI chat session
            await db.insert(schema.ecommerceSessions).values({
              conversationId,
              productId: product.id,
              quantity: 1,
              currentStep: "ai_chat",
              customerData: {
                aiStartTime: new Date().toISOString(),
                aiLastMessageTime: new Date().toISOString()
              }
            });
            await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${product.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
            return true;
          }
        } else if (buttonReplyId.startsWith("resume_checkout_")) {
          const cartId = buttonReplyId.replace("resume_checkout_", "");
          const [cart] = await db
            .select()
            .from(schema.ecommerceAbandonedCarts)
            .where(eq(schema.ecommerceAbandonedCarts.id, cartId))
            .limit(1);

          if (cart && cart.productId) {
            const [product] = await db
              .select()
              .from(schema.ecommerceProducts)
              .where(eq(schema.ecommerceProducts.id, cart.productId))
              .limit(1);

            if (product) {
              await this.autoAssignConversation(config, channelRow, conversationId);
              await this.resumeCheckoutFlow(channelRow, config, conversationId, contactPhone, product, cart);
              return true;
            }
          }
        } else if (buttonReplyId.startsWith("cancel_checkout_")) {
          const cartId = buttonReplyId.replace("cancel_checkout_", "");
          await db
            .update(schema.ecommerceAbandonedCarts)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(schema.ecommerceAbandonedCarts.id, cartId));
          await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
          await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, "❌ *Order cancelled.* Reply *store* anytime to browse our products again!");
          return true;
        }
      }

      // 2. Interactive list replies
      const listReplyId = message.interactive?.list_reply?.id || (message as any)?.interactive?.listReply?.id;
      if (listReplyId && listReplyId.startsWith("prod_")) {
        const productId = listReplyId.replace("prod_", "");
        const [product] = await db
          .select()
          .from(schema.ecommerceProducts)
          .where(eq(schema.ecommerceProducts.id, productId))
          .limit(1);

        if (product) {
          await this.autoAssignConversation(config, channelRow, conversationId);
          await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, product);
          return true;
        }
      }

      // Check for order tracking trigger keywords
      if (cleanContent === "track" || cleanContent === "status") {
        await this.autoAssignConversation(config, channelRow, conversationId);
        // Delete any active sessions first
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
        // Create session in tracking mode
        await db.insert(schema.ecommerceSessions).values({
          conversationId,
          quantity: 1,
          currentStep: "waiting_for_tracking_ordernumber",
          customerData: {}
        });
        await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, "🔍 *Order Tracking*\n\nPlease reply with your *Order Number* (e.g. `ORD-123456`) to check its status:");
        return true;
      }

      // Check if there is an active ecommerce session
      const [session] = await db
        .select()
        .from(schema.ecommerceSessions)
        .where(eq(schema.ecommerceSessions.conversationId, conversationId))
        .limit(1);

      if (session) {
        await this.autoAssignConversation(config, channelRow, conversationId);
        const lastUpdated = session.updatedAt || session.createdAt;
        const diffMs = Date.now() - new Date(lastUpdated).getTime();
        const timeoutMs = 15 * 60 * 1000;
        if (diffMs > timeoutMs) {
          console.log(`[EcommerceService] Inactive session ${session.id} expired after 15 mins`);
          await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        } else {
        // If it's a waiting_for_product_selection session
        if (session.currentStep === "waiting_for_product_selection") {
          if (session.productId) {
            const isBuy = cleanContent === "1" || cleanContent.includes("buy") || cleanContent.includes("order") || cleanContent === "checkout";
            const isInfo = cleanContent === "2" || cleanContent.includes("info") || cleanContent.includes("detail") || cleanContent.includes("more");
            const isAi = cleanContent === "3" || cleanContent === "ai" || cleanContent.includes("ask");

            if (isBuy) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, selectedProd);
                return true;
              }
            } else if (isInfo) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await this.sendProductDetailsInfo(channelRow, config, conversationId, contactPhone, selectedProd);
                return true;
              }
            } else if (isAi && config.aiEnabled) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await db
                  .update(schema.ecommerceSessions)
                  .set({
                    currentStep: "ai_chat",
                    customerData: {
                      aiStartTime: new Date().toISOString(),
                      aiLastMessageTime: new Date().toISOString()
                    },
                    updatedAt: new Date()
                  })
                  .where(eq(schema.ecommerceSessions.id, session.id));
                await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${selectedProd.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
                return true;
              }
            }

            // If customer typed a custom message/question and AI is enabled, transition to AI chat and answer it!
            if (config.aiEnabled) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await db
                  .update(schema.ecommerceSessions)
                  .set({
                    currentStep: "ai_chat",
                    customerData: {
                      aiStartTime: new Date().toISOString(),
                      aiLastMessageTime: new Date().toISOString()
                    },
                    updatedAt: new Date()
                  })
                  .where(eq(schema.ecommerceSessions.id, session.id));
                session.currentStep = "ai_chat";
                await this.processSessionInput(channelRow, config, session, (content || "").trim(), message);
                return true;
              }
            }

            // If AI is not enabled and option wasn't recognized, re-prompt the customer without deleting the session
            const [selectedProd] = await db
              .select()
              .from(schema.ecommerceProducts)
              .where(eq(schema.ecommerceProducts.id, session.productId))
              .limit(1);
            const prodName = selectedProd?.name || "Product";
            await this.sendAndSaveTextMessage(
              channelRow,
              conversationId,
              contactPhone,
              `⚠️ Please choose an option for *${prodName}*:\n\nReply *1* to Buy Now\nReply *2* for Full Product Details\nOr reply *cancel* to exit.`
            );
            return true;
          } else {
            const isNumber = /^\d+$/.test(cleanContent);
            if (isNumber) {
              const productIndex = parseInt(cleanContent) - 1;
              const allActiveProducts = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.tenantId, tenantId));

              if (productIndex >= 0 && productIndex < allActiveProducts.length) {
                const selectedProd = allActiveProducts[productIndex];
                await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, selectedProd);
                return true;
              }
            }

            if (cleanContent === "ai" || cleanContent.includes("ask ai")) {
              const allActiveProducts = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.tenantId, tenantId));
              if (allActiveProducts.length > 0 && config.aiEnabled) {
                const firstProd = allActiveProducts[0];
                await db
                  .update(schema.ecommerceSessions)
                  .set({
                    productId: firstProd.id,
                    currentStep: "ai_chat",
                    customerData: {
                      aiStartTime: new Date().toISOString(),
                      aiLastMessageTime: new Date().toISOString()
                    },
                    updatedAt: new Date()
                  })
                  .where(eq(schema.ecommerceSessions.id, session.id));
                await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${firstProd.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
                return true;
              }
            }

            // If invalid catalog choice, keep session and re-prompt
            await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, "⚠️ Please reply with the product number to purchase (e.g. *1*), or reply *cancel* to exit.");
            return true;
          }
        } else {
          // Process active session response (checkout steps, ai chat)
          await this.processSessionInput(channelRow, config, session, (content || "").trim(), message);
          return true;
        }
      }
    }

      return false;
    } catch (err: any) {
      console.error("[Ecommerce Interceptor] Error:", err.message);
      return false;
    }
  }

  /**
   * Send the store catalogue of products
   */
  private static async sendStoreCatalog(channelRow: any, config: any, conversationId: string, to: string) {
    const isQr = channelRow.connectionMethod === "qr_code";

    // 1. Send Welcome Message Sequence
    const sortedWelcomes = (config.welcomeMessages || [])
      .map((w: any) => ({
        text: w.text || "",
        mediaType: w.mediaType || "none",
        mediaUrl: w.mediaUrl || "",
        sortOrder: typeof w.sortOrder === "number" ? w.sortOrder : 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortedWelcomes.length === 0) {
      if (config.welcomeHeaderUrl && config.welcomeHeaderType !== "none") {
        await this.sendAndSaveMediaMessage(
          channelRow,
          conversationId,
          to,
          config.welcomeHeaderUrl,
          config.welcomeHeaderType as "image" | "video",
          config.welcomeMessage || "Welcome to our store!"
        );
      } else {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, config.welcomeMessage || "Welcome to our store!");
      }
    } else {
      for (const msg of sortedWelcomes) {
        if (msg.mediaType !== "none" && msg.mediaUrl) {
          await this.sendAndSaveMediaMessage(channelRow, conversationId, to, msg.mediaUrl, msg.mediaType as any, msg.text || "");
        } else if (msg.text) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, msg.text);
        }
      }
    }

    // 2. Fetch all products
    const products = await db
      .select()
      .from(schema.ecommerceProducts)
      .where(eq(schema.ecommerceProducts.tenantId, config.tenantId));

    if (products.length === 0) {
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, "We currently don't have any products listed in the store.");
      return;
    }

    // 3. List products one-by-one with media and details
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let photos: string[] = [];
      try {
        photos = typeof product.photos === "string" ? JSON.parse(product.photos) : (product.photos || []);
      } catch {
        photos = [];
      }

      const rawDesc = product.description || "";
      const safeDesc = rawDesc.length > 800 ? (rawDesc.substring(0, 800) + "...") : rawDesc;
      const currency = (product as any).currency || config.currency || 'INR';
      const descText = `*${product.name}*\nPrice: ${currency} ${product.price}\n\n${safeDesc}`;

      if (isQr) {
        // For QR code: send photos then details text containing numerical option
        let promptMsg = `${descText}\n\nReply with *${i + 1}* to Buy Now!\nReply with *info* for Full Product Details`;
        if (config.aiEnabled && config.aiAskButtonEnabled) {
          promptMsg += `\nOr reply with *AI* to ask questions about this product.`;
        }

        if (photos.length > 0) {
          for (let p = 0; p < photos.length; p++) {
            if (p === photos.length - 1) {
              await this.sendAndSaveMediaMessage(
                channelRow,
                conversationId,
                to,
                photos[p],
                "image",
                promptMsg
              );
            } else {
              await this.sendAndSaveMediaMessage(channelRow, conversationId, to, photos[p], "image");
            }
          }
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, promptMsg);
        }
      } else {
        // For Cloud API: send intermediate photos, and send last image / text as interactive button "Buy Now" / "Product Info" / "Ask AI"
        const buttons: { id: string; title: string }[] = [
          { id: `buy_${product.id}`, title: "Buy Now" },
          { id: `info_${product.id}`, title: "Product Info" }
        ];
        if (config.aiEnabled && config.aiAskButtonEnabled && buttons.length < 3) {
          buttons.push({ id: `ai_ask_${product.id}`, title: "Talk to Agent" });
        }

        if (photos.length > 0) {
          // Send first N-1 photos
          for (let p = 0; p < photos.length - 1; p++) {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, photos[p], "image");
          }
          // Send last photo as header of interactive message
          const lastPhoto = photos[photos.length - 1];
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, descText, lastPhoto, buttons);
        } else {
          // Send interactive message without image
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, descText, null, buttons);
        }
      }
    }

    // 4. Send Store-wide List Message / IVR listing
    if (isQr) {
      const listText = `*Product List:*\n\n` + products.map((p, idx) => `${idx + 1}. ${p.name} - ${(p as any).currency || 'INR'} ${p.price}`).join("\n") + `\n\nReply with the product number (e.g. 1) to start checkout.`;
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, listText);
    } else {
      // Cloud API: Send interactive list message
      await this.sendCloudApiListMessage(
        channelRow,
        conversationId,
        to,
        "Store Catalog",
        "Select a product from our catalog below to buy:",
        "View Products",
        [
          {
            title: "Available Products",
            rows: products.map((p) => ({
              id: `prod_${p.id}`,
              title: p.name.substring(0, 24),
              description: `Price: ${(p as any).currency || 'INR'} ${p.price}`.substring(0, 72)
            }))
          }
        ]
      );
    }
  }

  /**
   * Send detailed/long product description and navigation actions
   */
  private static async sendProductDetailsInfo(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any
  ) {
    const isQr = channelRow.connectionMethod === "qr_code";
    const showAiButton = config.aiEnabled && config.aiAskButtonEnabled;
    const currency = (product as any).currency || config.currency || 'INR';

    const fullInfo = (product.longDescription && product.longDescription.trim().length > 0)
      ? product.longDescription.trim()
      : (product.description || "No additional description available.");

    const fullText = `📖 *${product.name} — Product Details*\nPrice: ${currency} ${product.price}\n\n${fullInfo}`;

    // Send in safe chunks if > 3500 chars
    const chunkSize = 3500;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      const chunk = fullText.substring(i, i + chunkSize);
      await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, chunk);
    }

    // Send action buttons / options to order or ask AI
    if (isQr) {
      let navMsg = `👉 *Ready to place an order?*\n\nReply *1* to Buy Now!`;
      if (showAiButton) {
        navMsg += `\nReply *2* to Talk to Agent about this product.`;
      }
      await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, navMsg);
    } else {
      const navButtons = [{ id: `buy_${product.id}`, title: "Order Now" }];
      if (showAiButton) {
        navButtons.push({ id: `ai_ask_${product.id}`, title: "Talk to Agent" });
      }
      await this.sendCloudApiButtonMessage(
        channelRow,
        conversationId,
        contactPhone,
        `Ready to order *${product.name}* or need assistance?`,
        null,
        navButtons
      );
    }

    // Refresh session to waiting_for_product_selection
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: 1,
      currentStep: "waiting_for_product_selection",
      customerData: {}
    });
  }

  /**
   * Start individual product flow
   */
  private static async startIndividualProductFlow(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any
  ) {
    // Send Welcome Messages Sequence first (even if store trigger is off)
    const sortedWelcomes = (config.welcomeMessages || [])
      .map((w: any) => ({
        text: w.text || "",
        mediaType: w.mediaType || "none",
        mediaUrl: w.mediaUrl || "",
        sortOrder: typeof w.sortOrder === "number" ? w.sortOrder : 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortedWelcomes.length === 0) {
      if (config.welcomeHeaderUrl && config.welcomeHeaderType !== "none") {
        await this.sendAndSaveMediaMessage(
          channelRow,
          conversationId,
          contactPhone,
          config.welcomeHeaderUrl,
          config.welcomeHeaderType as "image" | "video",
          config.welcomeMessage || "Welcome to our store!"
        );
      } else if (config.welcomeMessage) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, config.welcomeMessage);
      }
    } else {
      for (const msg of sortedWelcomes) {
        if (msg.mediaType !== "none" && msg.mediaUrl) {
          await this.sendAndSaveMediaMessage(channelRow, conversationId, contactPhone, msg.mediaUrl, msg.mediaType as any, msg.text || "");
        } else if (msg.text) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, msg.text);
        }
      }
    }

    let photos: string[] = [];
    try {
      photos = typeof product.photos === "string" ? JSON.parse(product.photos) : (product.photos || []);
    } catch {
      photos = [];
    }

    // Send product photos one-by-one with product name as caption
    for (const photo of photos) {
      await this.sendAndSaveMediaMessage(channelRow, conversationId, contactPhone, photo, "image", product.name);
    }

    const isQr = channelRow.connectionMethod === "qr_code";
    const showAiButton = config.aiEnabled && config.aiAskButtonEnabled;
    const rawDesc = product.description || "";
    const safeDesc = rawDesc.length > 800 ? (rawDesc.substring(0, 800) + "...") : rawDesc;
    const currency = (product as any).currency || config.currency || 'INR';
    const descText = `*${product.name}*\nPrice: ${currency} ${product.price}\n\n${safeDesc}`;

    if (isQr) {
      let promptMsg = `${descText}\n\nReply *1* to Buy Now!\nReply *2* for Product Info & Details`;
      if (showAiButton) {
        promptMsg += `\nReply *3* to Talk to Agent!`;
      }
      await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, promptMsg);
    } else {
      const buttons: { id: string; title: string }[] = [
        { id: `buy_${product.id}`, title: "Buy Now" },
        { id: `info_${product.id}`, title: "Product Info" }
      ];
      if (showAiButton && buttons.length < 3) {
        buttons.push({ id: `ai_ask_${product.id}`, title: "Talk to Agent" });
      }
      await this.sendCloudApiButtonMessage(channelRow, conversationId, contactPhone, descText, null, buttons);
    }

    // Create product selection session to capture reply/button click
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: 1,
      currentStep: "waiting_for_product_selection",
      customerData: {}
    });
  }

  /**
   * Start checkout flow session
   */
  private static async startCheckoutFlow(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any
  ) {
    // Delete any active sessions for this conversation first
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));

    // Create session
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: 1,
      currentStep: "waiting_for_quantity",
      customerData: {}
    });

    // Track initial abandoned cart state
    const productPhoto = Array.isArray(product.photos)
      ? product.photos[0]
      : (typeof product.photos === "string" ? product.photos.split(",")[0] : null);

    await this.trackAbandonedCart({
      tenantId: config.tenantId,
      channelId: config.channelId || channelRow?.id,
      conversationId,
      customerPhone: contactPhone,
      productId: product.id,
      productName: product.name,
      productPrice: product.price ? String(product.price) : "0",
      productPhoto: productPhoto || null,
      quantity: 1,
      customerData: {},
      currentStep: "waiting_for_quantity"
    });

    await this.sendAndSaveTextMessage(
      channelRow,
      conversationId,
      contactPhone,
      `How many Qty? (type only number)`
    );
  }

  /**
   * Process incoming messages for active checkout session
   */
  private static async processSessionInput(
    channelRow: any,
    config: any,
    session: any,
    input: string,
    message: any
  ) {
    const conversationId = session?.conversationId;
    const contactPhone = (channelRow.connectionMethod === "qr_code" && conversationId) 
      ? conversationId.split("@")[0] 
      : (conversationId || "");
    // Actually, get contact phone from session's conversation mapping or directly
    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId))
      .limit(1);
    
    const to = conv?.contactPhone || contactPhone;

    // Tracking Step check
    if (session.currentStep === "waiting_for_tracking_ordernumber") {
      const orderNumberUpper = input.trim().toUpperCase();
      
      const allOrders = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.tenantId, config.tenantId));

      const order = allOrders.find((o) => {
        const num = (o.orderNumber || "").toUpperCase();
        return num === orderNumberUpper ||
          num === `ORD-${orderNumberUpper}` ||
          num.endsWith(`-${orderNumberUpper}`) ||
          (orderNumberUpper.length >= 4 && num.includes(orderNumberUpper));
      });

      if (order) {
        const getStatusEmoji = (status: string) => {
          switch (status.toLowerCase()) {
            case "pending": return "⏳";
            case "processing": return "⚙️";
            case "shipped": return "🚚";
            case "delivered": return "✅";
            case "cancelled": return "❌";
            default: return "📦";
          }
        };

        const statusEmoji = getStatusEmoji(order.status || "");
        const trackingMsg = `📦 *Order Tracking: ${order.orderNumber}*\nProduct: *${order.productName}* (x${order.quantity})\nTotal Amount: *${order.currency || "INR"} ${order.totalAmount}*\nPayment Mode: *${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}*\n\nOrder Status: ${statusEmoji} *${(order.status || "pending").toUpperCase()}*\nPayment Status: *${(order.paymentStatus || "pending").toUpperCase()}*\n\nCreated on: _${new Date(order.createdAt).toLocaleDateString()}_`;

        await this.sendAndSaveTextMessage(channelRow, conversationId, to, trackingMsg);
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
      } else {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, `❌ Order *${orderNumberUpper}* not found for this store. Please verify your order number and reply again, or send *exit* to cancel tracking.`);
      }
      return;
    }

    // Support cancelling/resetting active checkout session
    const cleanInput = input.trim().toLowerCase();
    if (cleanInput === "cancel" || cleanInput === "exit" || cleanInput === "reset") {
      await this.markCartCancelled(conversationId);
      await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, "❌ *Checkout cancelled.* Type *store* to open the catalog again.");
      return;
    }

    // AI Chat Step check
    if (session.currentStep === "ai_chat") {
      const buyKeywords = ["checkout", "buy", "buy now", "purchase", "1"];
      if (buyKeywords.includes(input.toLowerCase().trim())) {
        const [product] = await db
          .select()
          .from(schema.ecommerceProducts)
          .where(eq(schema.ecommerceProducts.id, session.productId))
          .limit(1);
        if (product) {
          await this.startCheckoutFlow(channelRow, config, session.conversationId, to, product);
          return;
        }
      }

      // Check timeout
      const customerData = session.customerData || {};
      const lastMsgTime = customerData.aiLastMessageTime ? new Date(customerData.aiLastMessageTime) : new Date(session.updatedAt);
      const timeoutMin = config.aiTimeoutMinutes || 30;
      const diffMs = new Date().getTime() - lastMsgTime.getTime();
      if (diffMs > timeoutMin * 60 * 1000) {
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "AI session timed out. Please send store trigger word again to browse products.");
        return;
      }

      // Update session last active time
      customerData.aiLastMessageTime = new Date().toISOString();
      await db
        .update(schema.ecommerceSessions)
        .set({ customerData, updatedAt: new Date() })
        .where(eq(schema.ecommerceSessions.id, session.id));

      // Fetch product details
      const [product] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, session.productId))
        .limit(1);

      if (!product) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Product no longer available. AI chat session closed.");
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        return;
      }

      // Determine delivery fee information text for RAG
      let deliveryInfoText = "Free Delivery";
      if (config.deliveryFeeType === "flat") {
        const flatFee = parseFloat(config.flatDeliveryFee || "0");
        deliveryInfoText = flatFee > 0 ? `${product.currency || "INR"} ${flatFee.toFixed(2)} (Flat delivery fee across India)` : "Free Delivery";
      } else if (config.deliveryFeeType === "state") {
        const stateFees = config.stateDeliveryFees || {};
        const stateList = Object.entries(stateFees).map(([st, fee]) => `${st}: ${product.currency || "INR"} ${fee}`).join(", ");
        deliveryInfoText = `State-wise delivery rates (Default: ${product.currency || "INR"} ${config.defaultDeliveryFee || "0"}${stateList ? `; ${stateList}` : ""})`;
      }

      // Determine available payment methods text for RAG
      const availablePayments: string[] = [];
      availablePayments.push(config.labelCod || "Cash On Delvry(COD)");
      if (config.upiId) availablePayments.push(config.labelUpiDirect || "GPay/PhonePe(UPI)");
      if (config.qrCodeUrl) availablePayments.push(config.labelQrPay || "Acc. Info(QR Code)");
      if ((config.razorpayKeyId && config.razorpayKeySecret) || (config.instamojoApiKey && config.instamojoAuthToken)) {
        availablePayments.push(config.labelGateway || "Online Payment Gateway");
      }

      // Fetch other available products in the store for catalog awareness
      const otherProducts = await db
        .select({ name: schema.ecommerceProducts.name, price: schema.ecommerceProducts.price, currency: schema.ecommerceProducts.currency })
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.tenantId, config.tenantId))
        .limit(10);
      const otherProductsSummary = otherProducts
        .map(p => `- ${p.name} (${p.currency || "INR"} ${p.price})`)
        .join("\n");

      // Build comprehensive RAG Store & Product Context
      const productPrice = `${product.currency || "INR"} ${product.price}`;
      const shortDesc = product.description || "N/A";
      const longDesc = product.longDescription || product.description || "N/A";

      const storeInfoSection = `
--- STORE & SHIPPING KNOWLEDGE ---
• Store Name: ${config.storeName || "Official Store"}
• Store Address / Location: ${config.storeAddress || "Available online across India"}
• Store Website: ${config.storeWebsite || "N/A"}
• Delivery / Shipping: ${deliveryInfoText}
• Accepted Payment Modes: ${availablePayments.join(", ")}
${otherProductsSummary ? `• Other Products in Store:\n${otherProductsSummary}` : ""}
`;

      const defaultSystemPrompt = `You are a knowledgeable, friendly customer sales AI assistant for this store.
You are chatting with a customer regarding this product:
- Product Name: {product_name}
- Price: {product_price}
- Overview / Short Description: {product_description}
- Detailed Product Information & Specifications: {product_long_description}

${storeInfoSection}

CRITICAL DIRECTIVE: Use the complete product specifications, description, store delivery details, and accepted payment methods above to accurately answer any customer inquiries. Keep responses concise, natural, and conversational for WhatsApp (under 120 words). Always encourage the customer to purchase when their doubts are answered, and remind them they can type 'checkout' or '1' at any time to order!`;

      const rawPrompt = config.aiSystemPrompt ? `${config.aiSystemPrompt}\n\n${storeInfoSection}` : defaultSystemPrompt;

      // Replace placeholders
      const basePrompt = rawPrompt
        .replace(/{product_name}/g, product.name)
        .replace(/{product_price}/g, productPrice)
        .replace(/{product_description}/g, shortDesc)
        .replace(/{product_long_description}/g, longDesc);

      // 1. Fetch channel-specific active AI Settings
      let aiSetting = await db
        .select()
        .from(schema.aiSettings)
        .where(and(eq(schema.aiSettings.channelId, channelRow.id), eq(schema.aiSettings.isActive, true)))
        .limit(1);

      if (aiSetting.length === 0) {
        aiSetting = await db
          .select()
          .from(schema.aiSettings)
          .where(eq(schema.aiSettings.channelId, channelRow.id))
          .limit(1);
      }

      const activeAI = aiSetting?.[0];
      const apiKeySource = (config as any).apiKeySource || "own_key";

      // 2. Resolve credentials (platform admin vs tenant own keys)
      const resolvedCreds = await AiBillingService.resolveAiCredentials(config.tenantId, apiKeySource);

      // If using platform admin key, verify tenant wallet has positive balance
      if (apiKeySource === "admin_key") {
        const walletStatus = await AiBillingService.checkTenantWallet(config.tenantId);
        if (!walletStatus.hasBalance) {
          console.warn(`[Ecommerce AI] Tenant ${config.tenantId} has zero or negative wallet balance (${walletStatus.balance} ${walletStatus.currency}). Pausing AI response.`);
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, "AI Assistant is currently unavailable due to insufficient wallet balance. Please reply with 'checkout' or select a product to buy directly.");
          return;
        }
      }

      // 3. Fetch owner user config
      const [ownerUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, config.tenantId))
        .limit(1);

      let provider = activeAI?.provider || "openai";
      let apiKey = activeAI?.apiKey || "";
      let endpoint = activeAI?.endpoint || "";
      let model = activeAI?.model || "";

      // Resolve key and model from resolvedCreds
      if (provider === "groq") {
        apiKey = apiKey || resolvedCreds.groqApiKey || "";
        endpoint = endpoint || "https://api.groq.com/openai/v1";
        model = model || "llama-3.3-70b-versatile";
      } else if (provider === "sarvam") {
        apiKey = apiKey || resolvedCreds.sarvamApiKey || "";
        endpoint = endpoint || "https://api.sarvam.ai/v1";
        model = model || "sarvam-105b-conversations";
      } else {
        apiKey = apiKey || resolvedCreds.openaiApiKey || "";
        endpoint = endpoint || "https://api.openai.com/v1";
        model = model || "gpt-4o-mini";
      }

      // Fallback if still empty
      if (!apiKey) {
        if (resolvedCreds.groqApiKey) {
          provider = "groq";
          apiKey = resolvedCreds.groqApiKey;
          endpoint = "https://api.groq.com/openai/v1";
          model = "llama-3.3-70b-versatile";
        } else if (resolvedCreds.openaiApiKey) {
          provider = "openai";
          apiKey = resolvedCreds.openaiApiKey;
          endpoint = "https://api.openai.com/v1";
          model = "gpt-4o-mini";
        } else if (resolvedCreds.sarvamApiKey) {
          provider = "sarvam";
          apiKey = resolvedCreds.sarvamApiKey;
          endpoint = "https://api.sarvam.ai/v1";
          model = "sarvam-105b-conversations";
        }
      }

      if (!apiKey) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "AI is currently offline. Please try checking out directly by typing 'checkout'.");
        return;
      }

      try {
        console.log(`🤖 [Ecommerce AI] Invoking LLM via ${provider} (${model}) [Source: ${apiKeySource}] at ${endpoint}...`);
        const aiClient = new OpenAI({
          apiKey,
          baseURL: endpoint,
        });
        
        const isIncomingAudio = message?.type === "audio" || message?.type === "voice" || Boolean(message?.audio);
        const messages: any[] = [
          { role: "system", content: basePrompt }
        ];

        // 3. Resolve Voice Profile dynamically (needed for both LLM prompt language steering and TTS synthesis)
        let voiceProfileId = config?.voiceProfileId || activeAI?.voiceProfileId || channelRow.inboxAiSettings?.voiceProfileId;
        let voiceProfile: any = null;
        if (voiceProfileId) {
          const [found] = await db
            .select()
            .from(schema.voiceProfiles)
            .where(eq(schema.voiceProfiles.id, voiceProfileId))
            .limit(1);
          voiceProfile = found;
        }
        if (!voiceProfile) {
          voiceProfile = await db.query.voiceProfiles.findFirst();
        }

        const isAutoDetect = config?.aiVoiceLanguageMode === "auto";
        const targetLangCode = voiceProfile?.languageCode || "ml-IN";
        const langMap: Record<string, string> = {
          "ml-IN": "Malayalam",
          "hi-IN": "Hindi",
          "ta-IN": "Tamil",
          "te-IN": "Telugu",
          "kn-IN": "Kannada",
          "bn-IN": "Bengali",
          "mr-IN": "Marathi",
          "gu-IN": "Gujarati",
          "pa-IN": "Punjabi",
          "ar-SA": "Arabic",
          "en-IN": "English",
          "en-US": "English"
        };
        const targetLangName = langMap[targetLangCode] || targetLangCode;

        if (isIncomingAudio) {
          const ttsProvider = voiceProfile?.provider || "sarvam";

          if (config.aiVoiceEnabled) {
            if (targetLangCode.startsWith("ml") || isAutoDetect) {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION FOR VOICE OUTPUT: The customer sent a WhatsApp voice note. The voice engine will synthesize your response into spoken audio. You MUST formulate your response in fluent, natural MANGLISH (Malayalam spoken words written using English/Latin alphabet, for example: "ABC shoe-nte price 499 rupees aanu. Ningalkku ethu vaangan '1' athallekil 'checkout' ennu type cheyyaam."). Writing in Manglish ensures 100% natural, accurate pronunciation for both Sarvam AI and OpenAI without broken accents or slurred Hindi phonetics. Keep the response conversational, warm, and under 50 words.`
              });
            } else if (targetLangCode.startsWith("hi")) {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION FOR VOICE OUTPUT: Formulate your response in fluent, natural HINGLISH (Hindi spoken words written using English/Latin alphabet, e.g. "ABC shoe ka price 499 rupees hai. Khareedne ke liye '1' type karein."). Writing in Hinglish ensures clean, accurate pronunciation. Keep the response concise, conversational, and under 50 words.`
              });
            } else if (targetLangCode.startsWith("ar")) {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION FOR VOICE OUTPUT: Formulate your response in clear Arabic. Keep the response concise and under 50 words.`
              });
            } else {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION FOR VOICE OUTPUT: Formulate your response in clear, conversational English for natural spoken voice output. Keep the response concise and under 50 words.`
              });
            }
          } else {
            // Voice response is disabled: reply in TEXT in the customer's native script
            if (isAutoDetect) {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION: The customer asked a question via a WhatsApp voice note. Formulate your answer in TEXT format in the EXACT language and script they asked in (e.g. if Malayalam, reply in Malayalam text മലയാളം; if in Hindi, reply in Hindi text, etc.). Do not hallucinate or switch to unrelated languages like Bengali. Keep the response concise, conversational, and under 80 words.`
              });
            } else {
              messages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION: The customer asked a question via a WhatsApp voice note. The store language is ${targetLangName} (${targetLangCode}). Formulate your answer in TEXT format in ${targetLangName} (using ${targetLangName} script). Keep the response concise, conversational, and under 80 words.`
              });
            }
          }
        }

        messages.push({ role: "user", content: input });

        const completion = await aiClient.chat.completions.create({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: 300
        });
        
        const aiResponse = completion.choices[0]?.message?.content || "Sorry, I am having trouble answering right now.";

        // Record & Bill LLM Usage
        const promptTokens = completion.usage?.prompt_tokens || Math.ceil(basePrompt.length / 4);
        const completionTokens = completion.usage?.completion_tokens || Math.ceil(aiResponse.length / 4);
        AiBillingService.recordAndBillUsage({
          tenantId: config.tenantId,
          channelId: channelRow.id,
          conversationId: session?.conversationId || null,
          source: "ecommerce",
          serviceType: "llm",
          provider,
          model,
          inputUnits: promptTokens,
          outputUnits: completionTokens,
          apiKeySource,
          metadata: { to, role: "customer" }
        }).catch((err) => console.error("[Ecommerce AI Billing Error - LLM]", err.message));
        
        // 4. Audio note response check (if the customer's incoming message was an audio note and config has aiVoiceEnabled true)
        let voiceMediaUrl: string | null = null;

        if (isIncomingAudio && config.aiVoiceEnabled === true) {
          try {
            const primaryProvider = voiceProfile?.provider || "sarvam";

            const trySynthesize = async (provName: string, vId?: string, lang?: string) => {
              try {
                let sKey = "";
                if (provName === "elevenlabs") {
                  sKey = resolvedCreds.elevenlabsApiKey || ownerUser?.elevenlabsApiKey || "";
                } else if (provName === "sarvam") {
                  sKey = resolvedCreds.sarvamApiKey || ownerUser?.sarvamApiKey || "";
                } else if (provName === "groq") {
                  sKey = resolvedCreds.groqApiKey || ownerUser?.groqApiKey || "";
                } else if (provName === "openai") {
                  sKey = resolvedCreds.openaiApiKey || ownerUser?.openaiApiKey || "";
                }
                if (!sKey) return null;

                const defaultSpeaker = provName === "sarvam" ? (voiceProfile?.voiceId || "rahul") : (provName === "openai" ? "alloy" : "diana");
                const pInstance = VoiceManager.getProvider(provName);
                console.log(`🎙️ [Ecommerce AI] Synthesizing speech via ${provName} (lang: ${lang || targetLangCode}, speaker: ${vId || defaultSpeaker}) [Source: ${apiKeySource}]...`);
                const audioBufferRes = await pInstance.synthesize(
                  aiResponse,
                  vId || defaultSpeaker,
                  lang || targetLangCode,
                  { apiKey: sKey }
                );

                if (audioBufferRes) {
                  // Record & Bill TTS Usage
                  AiBillingService.recordAndBillUsage({
                    tenantId: config.tenantId,
                    channelId: channelRow.id,
                    conversationId: session?.conversationId || null,
                    source: "ecommerce",
                    serviceType: "tts",
                    provider: provName,
                    model: vId || defaultSpeaker,
                    inputUnits: aiResponse.length,
                    outputUnits: 0,
                    apiKeySource,
                    metadata: { to, lang: lang || targetLangCode }
                  }).catch((err) => console.error("[Ecommerce AI Billing Error - TTS]", err.message));
                }

                return audioBufferRes;
              } catch (e: any) {
                console.warn(`[Ecommerce AI] Speech synthesis via ${provName} failed:`, e.message);
                return null;
              }
            };

            // 1. Try primary provider
            let audioBuffer = await trySynthesize(primaryProvider, voiceProfile?.voiceId, targetLangCode);

            // 2. If primary provider was Sarvam with custom/cloned voice that failed, retry Sarvam with natural speaker (kavya)
            if (!audioBuffer && primaryProvider === "sarvam") {
              console.log("[Ecommerce AI] Retrying Sarvam TTS with natural speaker (kavya)...");
              audioBuffer = await trySynthesize("sarvam", "kavya", targetLangCode);
            }

            // 3. Fallbacks if primary provider failed
            if (!audioBuffer && primaryProvider !== "openai") {
              console.log("[Ecommerce AI] Attempting OpenAI TTS fallback...");
              audioBuffer = await trySynthesize("openai", "alloy", targetLangCode);
            }
            if (!audioBuffer && primaryProvider !== "sarvam") {
              console.log("[Ecommerce AI] Attempting Sarvam TTS fallback...");
              audioBuffer = await trySynthesize("sarvam", "kavya", targetLangCode);
            }
            if (!audioBuffer && primaryProvider !== "groq") {
              console.log("[Ecommerce AI] Attempting Groq TTS fallback...");
              audioBuffer = await trySynthesize("groq", "diana", targetLangCode);
            }

            if (audioBuffer) {
              const filename = `ecommerce_ai_voice_${Date.now()}.ogg`;
              voiceMediaUrl = await this.uploadAudioBufferHelper(audioBuffer, filename, "audio/ogg");
            }
          } catch (vErr: any) {
            console.error("❌ [Ecommerce AI] Voice synthesis failed:", vErr.message);
          }
        }

        if (voiceMediaUrl) {
          console.log(`🤖 [Ecommerce AI] Sending voice note reply: ${voiceMediaUrl}`);
          await this.sendAndSaveVoiceNote(channelRow, conversationId, to, voiceMediaUrl, aiResponse);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, aiResponse);
        }
      } catch (err: any) {
        console.error("[AI Chat Session Error]", err.message);
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Sorry, I encountered an error processing your query. Please reply with 'checkout' to buy the product directly.");
      }
      return;
    }

    const rawFields = config.checkoutFields || ["name", "phone", "address", "pin"];
    // Standardize to array of { text: string, variable: string }
    const fields = rawFields.map((f: any) => {
      if (typeof f === "string") {
        return { text: `Please enter your *${this.getFieldLabel(f)}*:`, variable: f };
      }
      return { 
        text: f.text || `Please enter your *${this.getFieldLabel(f.variable)}*:`, 
        variable: f.variable || "custom_field" 
      };
    });

    // 1. STEP: WAITING FOR QUANTITY
    if (session.currentStep === "waiting_for_quantity") {
      const quantity = parseInt(input);
      if (isNaN(quantity) || quantity <= 0) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please enter a valid quantity (positive number):");
        return;
      }

      const nextStep = fields.length === 0 ? "waiting_for_payment_method" : `waiting_for_field:${fields[0].variable}`;
      await this.trackAbandonedCart({
        tenantId: config.tenantId,
        channelId: config.channelId || channelRow?.id,
        conversationId,
        customerPhone: to,
        quantity,
        currentStep: nextStep
      });

      if (fields.length === 0) {
        await db
          .update(schema.ecommerceSessions)
          .set({
            quantity,
            currentStep: "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));
      } else {
        await db
          .update(schema.ecommerceSessions)
          .set({
            quantity,
            currentStep: `waiting_for_field:${fields[0].variable}`
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        await this.sendAndSaveTextMessage(channelRow, conversationId, to, fields[0].text);
        return;
      }
    }

    // 2. STEP: WAITING FOR CUSTOM FIELDS
    if (session.currentStep.startsWith("waiting_for_field:")) {
      const currentFieldVar = session.currentStep.replace("waiting_for_field:", "");
      const customerData = session.customerData || {};
      customerData[currentFieldVar] = input;

      if (currentFieldVar === "pin") {
        const { fee, state } = await this.calculateDeliveryFee(config, input);
        customerData.resolvedState = state || "Unknown";
        customerData.deliveryFee = String(fee);
      }

      const currentIndex = fields.findIndex((f) => f.variable === currentFieldVar);
      const nextIndex = currentIndex + 1;
      const nextStep = (nextIndex < fields.length && currentIndex !== -1)
        ? `waiting_for_field:${fields[nextIndex].variable}`
        : "waiting_for_checkout_confirmation";

      await this.trackAbandonedCart({
        tenantId: config.tenantId,
        channelId: config.channelId || channelRow?.id,
        conversationId,
        customerPhone: to,
        customerName: customerData.name || customerData.fullName || undefined,
        customerData,
        currentStep: nextStep
      });

      if (nextIndex < fields.length && currentIndex !== -1) {
        const nextField = fields[nextIndex];
        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData,
            currentStep: `waiting_for_field:${nextField.variable}`
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        await this.sendAndSaveTextMessage(channelRow, conversationId, to, nextField.text);
      } else {
        // All fields collected -> Show Order Review & Confirmation step
        if (customerData.deliveryFee === undefined) {
          const pincodeVal = customerData.pin || customerData.pincode || customerData.zip || customerData.zipcode;
          if (pincodeVal) {
            const { fee, state } = await this.calculateDeliveryFee(config, pincodeVal);
            customerData.resolvedState = state || "Unknown";
            customerData.deliveryFee = String(fee);
          } else {
            customerData.deliveryFee = "0";
          }
        }

        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData,
            currentStep: "waiting_for_checkout_confirmation"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        const [product] = await db
          .select()
          .from(schema.ecommerceProducts)
          .where(eq(schema.ecommerceProducts.id, session.productId))
          .limit(1);

        const currency = (product as any)?.currency || config.currency || "INR";
        const basePrice = parseFloat(product?.price || "0");
        const qty = session.quantity || 1;
        const subtotal = basePrice * qty;
        const delFee = parseFloat(customerData.deliveryFee || "0");
        const grandTotal = subtotal + delFee;

        let fieldSummary = "";
        for (const f of fields) {
          const val = customerData[f.variable] || "N/A";
          fieldSummary += `• *${this.getFieldLabel(f.variable)}:* ${val}\n`;
        }

        const reviewText = `📋 *Please Review & Confirm Your Order Details:*\n\n` +
          `🛍️ *Product:* ${product?.name || "Item"}\n` +
          `🔢 *Quantity:* ${qty}\n` +
          `💵 *Item Price:* ${currency} ${basePrice.toFixed(2)} (Total: ${currency} ${subtotal.toFixed(2)})\n` +
          `🚚 *Delivery Fee:* ${currency} ${delFee.toFixed(2)}\n` +
          `💰 *Total Payable:* ${currency} ${grandTotal.toFixed(2)}\n\n` +
          `📍 *Shipping Details:*\n${fieldSummary}\n` +
          `Please confirm if your information is correct:`;

        if (channelRow.connectionMethod === "qr_code") {
          const qrReviewMsg = `${reviewText}\n\nReply *1* to Confirm Order\nReply *2* to Edit Details`;
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, qrReviewMsg);
        } else {
          const confirmButtons = [
            { id: "confirm_checkout", title: "Confirm Order" },
            { id: "edit_checkout", title: "Edit Details" }
          ];
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, reviewText, null, confirmButtons);
        }
      }
      return;
    }

    // 2.5 STEP: WAITING FOR CHECKOUT CONFIRMATION (CONFIRM or EDIT)
    if (session.currentStep === "waiting_for_checkout_confirmation") {
      const buttonReplyId = message.interactive?.button_reply?.id || (message as any)?.button?.payload || (message as any)?.interactive?.buttonReply?.id;
      const isConfirm = cleanInput === "1" || cleanInput === "confirm" || cleanInput.includes("confirm") || cleanInput === "yes" || buttonReplyId === "confirm_checkout";
      const isEdit = cleanInput === "2" || cleanInput === "edit" || cleanInput.includes("edit") || cleanInput === "change" || buttonReplyId === "edit_checkout";

      if (isEdit) {
        // Keep orderId / orderNumber if previously created, but reset field inputs
        const preservedOrderId = session.customerData?.orderId;
        const preservedOrderNumber = session.customerData?.orderNumber;
        const resetCustomerData: any = {};
        if (preservedOrderId) resetCustomerData.orderId = preservedOrderId;
        if (preservedOrderNumber) resetCustomerData.orderNumber = preservedOrderNumber;

        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData: resetCustomerData,
            currentStep: fields.length > 0 ? `waiting_for_field:${fields[0].variable}` : "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        if (fields.length > 0) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `🔄 *Let's re-enter your details:*\n\n${fields[0].text}`);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please proceed to select your payment method.");
        }
        return;
      }

      if (isConfirm) {
        // Recalculate totals if updating an existing order
        if (session.customerData?.orderId) {
          try {
            const [product] = await db
              .select()
              .from(schema.ecommerceProducts)
              .where(eq(schema.ecommerceProducts.id, session.productId))
              .limit(1);

            const deliveryFee = parseFloat(session.customerData?.deliveryFee || "0");
            const baseAmount = parseFloat(product?.price || "0") * session.quantity;
            const totalAmount = baseAmount + deliveryFee;

            await db
              .update(schema.ecommerceOrders)
              .set({
                customerName: session.customerData?.name || conv?.contactName || "Customer",
                customerData: session.customerData,
                deliveryFee: String(deliveryFee),
                totalAmount: String(totalAmount),
                updatedAt: new Date()
              })
              .where(eq(schema.ecommerceOrders.id, session.customerData.orderId));
          } catch (updateErr: any) {
            console.warn("[EcommerceService] Error updating existing order on review confirm:", updateErr?.message);
          }
        }

        // Proceed to payment method selection
        await db
          .update(schema.ecommerceSessions)
          .set({
            currentStep: "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        // Generate payment options
        const paymentOptions = [];
        paymentOptions.push({ id: "cod", title: config.labelCod || "Cash On Delvry(COD)" });
        if (config.upiId) {
          paymentOptions.push({ id: "upi_direct", title: config.labelUpiDirect || "GPay/PhonePe(UPI)" });
        }
        if (config.qrCodeUrl) {
          paymentOptions.push({ id: "qr_pay", title: config.labelQrPay || "Acc. Info(QR Code)" });
        }
        if (
          (config.razorpayKeyId && config.razorpayKeySecret) ||
          (config.instamojoApiKey && config.instamojoAuthToken)
        ) {
          paymentOptions.push({ id: "gateway", title: config.labelGateway || "Online Payment" });
        }

        const promptText = "Please select your preferred checkout payment method:";

        if (channelRow.connectionMethod === "qr_code" || paymentOptions.length > 3) {
          if (channelRow.connectionMethod === "qr_code") {
            const listOpts = promptText + "\n\n" + paymentOptions.map((opt, idx) => `${idx + 1}. ${opt.title}`).join("\n") + "\n\nReply with option number (e.g. 1):";
            await this.sendAndSaveTextMessage(channelRow, conversationId, to, listOpts);
          } else {
            // Cloud API: Send interactive list message since button count > 3
            await this.sendCloudApiListMessage(
              channelRow,
              conversationId,
              to,
              "Payment Options",
              promptText,
              "Select Payment",
              [
                {
                  title: "Available Options",
                  rows: paymentOptions.map(opt => ({
                    id: opt.id,
                    title: opt.title.substring(0, 24)
                  }))
                }
              ]
            );
          }
        } else {
          // Cloud API: Send interactive buttons
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, promptText, null, paymentOptions);
        }
        return;
      }

      // If invalid choice
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please select *Confirm Order* or *Edit Details* to proceed.");
      return;
    }

    // 3. STEP: WAITING FOR PAYMENT METHOD OR SWITCHING PAYMENT METHOD (while in waiting_for_qr_receipt)
    if (session.currentStep === "waiting_for_payment_method" || session.currentStep === "waiting_for_qr_receipt") {
      const buttonReplyId = message.interactive?.button_reply?.id || (message as any)?.button?.payload || (message as any)?.interactive?.buttonReply?.id;
      const listReplyId = message.interactive?.list_reply?.id || (message as any)?.interactive?.listReply?.id;

      // Check for Edit Details button or edit command
      const isEdit = cleanInput === "edit" || cleanInput === "change" || cleanInput.includes("change address") || buttonReplyId === "edit_checkout";
      if (isEdit) {
        const preservedOrderId = session.customerData?.orderId;
        const preservedOrderNumber = session.customerData?.orderNumber;
        const resetCustomerData: any = {};
        if (preservedOrderId) resetCustomerData.orderId = preservedOrderId;
        if (preservedOrderNumber) resetCustomerData.orderNumber = preservedOrderNumber;

        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData: resetCustomerData,
            currentStep: fields.length > 0 ? `waiting_for_field:${fields[0].variable}` : "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        if (fields.length > 0) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `🔄 *Let's re-enter your details:*\n\n${fields[0].text}`);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please proceed to select your payment method.");
        }
        return;
      }

      // If in waiting_for_qr_receipt and an image is received, handle receipt upload
      const mediaId = message.image?.id || message.mediaId;
      const isImage = message.type === "image" || !!mediaId;
      if (session.currentStep === "waiting_for_qr_receipt" && isImage) {
        let fileUrl = "";
        if (mediaId) {
          try {
            const waApi = new WhatsAppApiService(channelRow);
            if (channelRow.connectionMethod === "qr_code") {
              fileUrl = await waApi.fetchMediaUrl(mediaId);
            } else {
              const mimeType = message.image?.mime_type || "image/jpeg";
              const savedUrl = await this.saveIncomingMedia(mediaId, mimeType, waApi);
              fileUrl = savedUrl || (await waApi.fetchMediaUrl(mediaId));
            }
          } catch (err) {
            console.error("Failed to fetch media url for receipt:", err);
            fileUrl = `receipt_media_${mediaId}`;
          }
        }

        let order: any = null;
        let orderNumber = session.customerData?.orderNumber || "";

        if (session.customerData?.orderId) {
          const [updatedOrder] = await db
            .update(schema.ecommerceOrders)
            .set({
              receiptUrl: fileUrl || null,
              paymentStatus: "pending_verification",
              updatedAt: new Date()
            })
            .where(eq(schema.ecommerceOrders.id, session.customerData.orderId))
            .returning();
          order = updatedOrder;
          orderNumber = order?.orderNumber || orderNumber;
        }

        if (!order) {
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, session.productId))
            .limit(1);

          const deliveryFee = parseFloat(session.customerData?.deliveryFee || "0");
          const baseAmount = parseFloat(product?.price || "0") * session.quantity;
          const totalAmount = baseAmount + deliveryFee;
          orderNumber = await this.generateNextOrderNumber(config.tenantId);

          const [newOrder] = await db
            .insert(schema.ecommerceOrders)
            .values({
              orderNumber,
              tenantId: config.tenantId,
              channelId: config.channelId,
              conversationId: session.conversationId,
              customerPhone: to,
              customerName: session.customerData?.name || "Customer",
              customerData: session.customerData,
              productId: product?.id,
              productName: product?.name,
              price: product?.price,
              quantity: session.quantity,
              deliveryFee: String(deliveryFee),
              totalAmount: String(totalAmount),
              currency: config.currency || "INR",
              paymentMethod: "qr_pay",
              paymentStatus: "pending_verification",
              receiptUrl: fileUrl || null,
              status: "pending"
            })
            .returning();
          order = newOrder;
        }

        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

        await this.sendAndSaveTextMessage(
          channelRow,
          conversationId,
          to,
          `✅ *Receipt Received!*\n\nOrder Number: *${orderNumber}*\nYour payment is being verified by our team. You will receive WhatsApp notifications as your order is processed!`
        );

        if (order) {
          await this.markCartRecovered(conversationId, order.id);
          await this.sendOrderEmail(order);
        }
        return;
      }

      // Check if user selected or changed payment method
      let selectedMethod = "";
      const paymentOptions = [];
      paymentOptions.push({ id: "cod", title: config.labelCod || "Cash On Delvry(COD)" });
      if (config.upiId) {
        paymentOptions.push({ id: "upi_direct", title: config.labelUpiDirect || "GPay/PhonePe(UPI)" });
      }
      if (config.qrCodeUrl) {
        paymentOptions.push({ id: "qr_pay", title: config.labelQrPay || "Acc. Info(QR Code)" });
      }
      if (
        (config.razorpayKeyId && config.razorpayKeySecret) ||
        (config.instamojoApiKey && config.instamojoAuthToken)
      ) {
        paymentOptions.push({ id: "gateway", title: config.labelGateway || "Online Payment" });
      }

      if (buttonReplyId) {
        selectedMethod = buttonReplyId;
      } else if (listReplyId) {
        selectedMethod = listReplyId;
      } else {
        const matchIdx = parseInt(input) - 1;
        if (!isNaN(matchIdx) && matchIdx >= 0 && matchIdx < paymentOptions.length) {
          selectedMethod = paymentOptions[matchIdx].id;
        } else {
          const lowerVal = input.toLowerCase().trim();
          for (const opt of paymentOptions) {
            const optTitleLower = opt.title.toLowerCase().trim();
            const optIdLower = opt.id.toLowerCase().trim();
            if (
              lowerVal === optIdLower ||
              lowerVal === optTitleLower ||
              lowerVal.startsWith(optTitleLower.substring(0, 15)) ||
              optTitleLower.startsWith(lowerVal) ||
              optTitleLower.includes(lowerVal) ||
              lowerVal.includes(optTitleLower)
            ) {
              selectedMethod = opt.id;
              break;
            }
          }
          if (!selectedMethod) {
            if (lowerVal.includes("cod") || lowerVal.includes("cash") || (config.labelCod && lowerVal.includes(config.labelCod.toLowerCase()))) {
              selectedMethod = "cod";
            } else if (lowerVal.includes("direct") || lowerVal.includes("mobile") || lowerVal.includes("gpay") || lowerVal.includes("phonepe") || (config.labelUpiDirect && lowerVal.includes(config.labelUpiDirect.toLowerCase()))) {
              selectedMethod = "upi_direct";
            } else if (lowerVal.includes("qr") || lowerVal.includes("upi") || lowerVal.includes("acc") || lowerVal.includes("account") || (config.labelQrPay && lowerVal.includes(config.labelQrPay.toLowerCase()))) {
              selectedMethod = "qr_pay";
            } else if (lowerVal.includes("online") || lowerVal.includes("gateway") || (config.labelGateway && lowerVal.includes(config.labelGateway.toLowerCase()))) {
              selectedMethod = "gateway";
            }
          }
        }
      }

      if (!selectedMethod || !paymentOptions.find(o => o.id === selectedMethod)) {
        if (session.currentStep === "waiting_for_qr_receipt") {
          const orderNum = session.customerData?.orderNumber;
          const prompt = orderNum 
            ? `Please upload the payment receipt/screenshot as an image/photo to complete order *${orderNum}*.\n\n👉 Reply *cod* to switch to Cash on Delivery\n👉 Reply *edit* to update details\n👉 Or reply *cancel* to exit.`
            : "Please upload the payment receipt/screenshot as an image/photo to complete your order, or reply *cancel* to exit.";
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, prompt);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Invalid payment method. Please select or reply with the correct option.");
        }
        return;
      }

      const [product] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, session.productId))
        .limit(1);

      if (!product) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Sorry, the product you are ordering is no longer available.");
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        return;
      }

      const deliveryFee = parseFloat(session.customerData?.deliveryFee || "0");
      const baseAmount = parseFloat(product.price || "0") * session.quantity;
      const totalAmount = baseAmount + deliveryFee;

      let order: any = null;
      let orderNumber = session.customerData?.orderNumber;

      // Update existing order if already created in earlier step
      if (session.customerData?.orderId) {
        const [updatedOrder] = await db
          .update(schema.ecommerceOrders)
          .set({
            paymentMethod: selectedMethod,
            paymentStatus: selectedMethod === "cod" ? "pending" : (selectedMethod === "gateway" ? "pending_payment" : "pending_verification"),
            status: "pending",
            updatedAt: new Date()
          })
          .where(eq(schema.ecommerceOrders.id, session.customerData.orderId))
          .returning();
        order = updatedOrder;
        orderNumber = order?.orderNumber || orderNumber;
      }

      // If order not yet created, create it now
      if (!order) {
        orderNumber = await this.generateNextOrderNumber(config.tenantId);
        const [newOrder] = await db
          .insert(schema.ecommerceOrders)
          .values({
            orderNumber,
            tenantId: config.tenantId,
            channelId: config.channelId,
            conversationId: session.conversationId,
            customerPhone: to,
            customerName: session.customerData?.name || conv?.contactName || "Customer",
            customerData: session.customerData,
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: session.quantity,
            deliveryFee: String(deliveryFee),
            totalAmount: String(totalAmount),
            currency: config.currency || "INR",
            paymentMethod: selectedMethod,
            paymentStatus: selectedMethod === "cod" ? "pending" : (selectedMethod === "gateway" ? "pending_payment" : "pending_verification"),
            status: "pending"
          })
          .returning();
        order = newOrder;
      }

      await this.addContactToCustomersGroup(config.channelId, to, session.customerData?.name, config.tenantId);

      if (selectedMethod === "cod") {
        await this.markCartRecovered(conversationId, order.id);
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

        await this.sendAndSaveTextMessage(
          channelRow,
          conversationId,
          to,
          `🎉 *Order Placed Successfully!*\n\nOrder Number: *${orderNumber}*\nProduct: *${product.name}* (x${session.quantity})\nDelivery Fee: *${config.currency || "INR"} ${deliveryFee}*\nTotal Amount: *${config.currency || "INR"} ${totalAmount}*\nPayment Mode: *Cash On Delvry(COD)*\n\nWe will update you as soon as your order status changes!`
        );

        await this.sendOrderEmail(order);
      }
      else if (selectedMethod === "upi_direct") {
        await this.trackAbandonedCart({
          tenantId: config.tenantId,
          channelId: config.channelId || channelRow?.id,
          conversationId,
          customerPhone: to,
          customerName: session.customerData?.name,
          customerData: {
            ...(session.customerData || {}),
            orderId: order.id,
            orderNumber: order.orderNumber
          },
          currentStep: "waiting_for_qr_receipt"
        });

        await db
          .update(schema.ecommerceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt",
            customerData: {
              ...(session.customerData || {}),
              orderId: order.id,
              orderNumber: order.orderNumber
            }
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        const redirectUrl = `https://wa.linalapro.com/api/ecommerce/checkout/pay?orderId=${order.id}`;

        await this.sendAndSaveTextMessage(
          channelRow,
          conversationId,
          to,
          `📱 *UPI Mobile Direct Pay*\n\nOrder Number: *${orderNumber}*\nTo pay *${config.currency || "INR"} ${totalAmount}* (includes delivery fee: *${config.currency || "INR"} ${deliveryFee}*) directly using GPay / PhonePe / Paytm:\n\n👉 *Click here to Pay:* ${redirectUrl}\n\nOnce paid, *please send the receipt/payment screenshot here* to verify and complete your order.\n\nReply *cod* to switch to Cash on Delivery, or *edit* to update details.`
        );
      }
      else if (selectedMethod === "qr_pay") {
        await this.trackAbandonedCart({
          tenantId: config.tenantId,
          channelId: config.channelId || channelRow?.id,
          conversationId,
          customerPhone: to,
          customerName: session.customerData?.name,
          customerData: {
            ...(session.customerData || {}),
            orderId: order.id,
            orderNumber: order.orderNumber
          },
          currentStep: "waiting_for_qr_receipt"
        });

        await db
          .update(schema.ecommerceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt",
            customerData: {
              ...(session.customerData || {}),
              orderId: order.id,
              orderNumber: order.orderNumber
            }
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        if (config.qrCodeUrl) {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, config.qrCodeUrl, "image");
          } catch (mediaErr: any) {
            console.error("[EcommerceService] Failed to send QR code image:", mediaErr.message);
            await this.sendAndSaveTextMessage(channelRow, conversationId, to, `⚠️ Could not display QR code image. Please proceed with payment using details below.`);
          }
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `⚠️ No store QR code is uploaded. Please proceed using the instructions below.`);
        }
        await this.sendAndSaveTextMessage(
          channelRow,
          conversationId,
          to,
          `Please scan the QR code to pay a total of *${config.currency || "INR"} ${totalAmount}* (includes delivery fee: *${config.currency || "INR"} ${deliveryFee}*) via GPAY / PhonePe.\n\nOrder Number: *${orderNumber}*\n\nAfter completing your payment, *please send/upload your payment receipt/screenshot here* to complete your order.\n\nReply *cod* to switch to Cash on Delivery, or *edit* to update details.`
        );
      }
      else if (selectedMethod === "gateway") {
        try {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Generating your secure online checkout link, please wait...");
          const paymentLinkData = await this.createPaymentLink(config, product, session.quantity, session.customerData?.name || "Customer", to, deliveryFee);

          const [updatedGatewayOrder] = await db
            .update(schema.ecommerceOrders)
            .set({
              paymentGateway: paymentLinkData.gateway,
              paymentGatewayOrderId: paymentLinkData.orderId,
              updatedAt: new Date()
            })
            .where(eq(schema.ecommerceOrders.id, order.id))
            .returning();

          await this.markCartRecovered(conversationId, order.id);
          await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

          await this.sendAndSaveTextMessage(
            channelRow,
            conversationId,
            to,
            `🔗 *Complete Your Payment*\n\nOrder Number: *${orderNumber}*\nTotal Amount: *${config.currency || "INR"} ${totalAmount}* (includes delivery fee: *${config.currency || "INR"} ${deliveryFee}*)\n\nPlease complete your payment using this secure link:\n${paymentLinkData.url}\n\nYour order will be verified automatically once paid.`
          );

          await this.sendOrderEmail(updatedGatewayOrder || order);
        } catch (err: any) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `Error generating payment link: ${err.message}. Please try again later or select Cash on Delivery.`);
        }
      }
      return;
    }
  }

  /**
   * Create Gateway Payment Link
   */
  private static async createPaymentLink(
    config: any,
    product: any,
    quantity: number,
    customerName: string,
    customerPhone: string,
    deliveryFee: number = 0
  ): Promise<{ url: string; orderId: string; gateway: string }> {
    const totalAmount = (parseFloat(product.price || "0") * quantity) + deliveryFee;

    // Razorpay Integration
    if (config.razorpayKeyId && config.razorpayKeySecret) {
      const razorpay = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret
      });

      const payload = {
        amount: Math.round(totalAmount * 100), // INR paise
        currency: "INR",
        accept_partial: false,
        description: `Order for ${product.name} (x${quantity})`,
        customer: {
          name: customerName,
          contact: customerPhone
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        notes: {
          productName: product.name,
          quantity: String(quantity)
        }
      };

      const paymentLink: any = await razorpay.paymentLink.create(payload);
      if (!paymentLink || !paymentLink.short_url) {
        throw new Error("Razorpay link creation failed");
      }
      return {
        url: paymentLink.short_url,
        orderId: paymentLink.id,
        gateway: "razorpay"
      };
    }

    // Instamojo Integration
    if (config.instamojoApiKey && config.instamojoAuthToken) {
      const baseUrl = config.instamojoSandbox
        ? "https://test.instamojo.com/api/1.1"
        : "https://www.instamojo.com/api/1.1";

      const payload: any = {
        amount: totalAmount.toFixed(2),
        purpose: `Order: ${product.name.substring(0, 25)} (x${quantity})`,
        send_email: false,
        send_sms: false,
        buyer_name: customerName,
        phone: customerPhone,
        allow_repeated_payments: false
      };

      const serverUrl = process.env.SERVER_URL;
      if (serverUrl) {
        payload.webhook = `${serverUrl}/api/webhooks/ecommerce/instamojo`;
      }

      const response = await axios.post(`${baseUrl}/payment-requests/`, payload, {
        headers: {
          "X-Api-Key": config.instamojoApiKey,
          "X-Auth-Token": config.instamojoAuthToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        transformRequest: [
          (data) => {
            const params = new URLSearchParams();
            for (const key in data) {
              params.append(key, data[key]);
            }
            return params.toString();
          }
        ]
      });

      if (!response.data || !response.data.success || !response.data.payment_request) {
        throw new Error(`Instamojo payload failed: ${JSON.stringify(response.data)}`);
      }

      const pr = response.data.payment_request;
      return {
        url: pr.longurl,
        orderId: pr.id,
        gateway: "instamojo"
      };
    }

    throw new Error("No active online payment gateway configured for store");
  }

  /**
   * Generate Invoice PDF Kit
   */
  public static async generateOrderPdf(order: any): Promise<Buffer> {
    const [config] = await db
      .select()
      .from(schema.ecommerceConfigs)
      .where(eq(schema.ecommerceConfigs.channelId, order.channelId))
      .limit(1);

    const [merchantUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, order.tenantId))
      .limit(1);

    let logoBuffer: Buffer | null = null;
    if (config?.storeLogo) {
      try {
        logoBuffer = await this.resolveMediaBuffer(config.storeLogo);
      } catch (logoErr) {
        console.error("Failed to resolve store logo for Invoice PDF:", logoErr);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        // Render Store Logo if available
        let headerOffset = 50;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 50, 45, { fit: [60, 60] });
            headerOffset = 120;
          } catch (e) {
            console.error("Failed to render logo in Invoice PDF:", e);
          }
        }

        // Store Identity / Header info
        const storeName = config?.storeName || merchantUser?.username || "Main Store";
        const storeAddress = config?.storeAddress || "India";
        const storeWebsite = config?.storeWebsite || "";

        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18).text(storeName.toUpperCase(), headerOffset, 45);
        
        let subText = storeAddress;
        if (storeWebsite) subText += `  |  Website: ${storeWebsite}`;
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(subText, headerOffset, 68);

        // Divider
        doc.moveTo(50, 115).lineTo(562, 115).lineWidth(1).strokeColor("#E5E7EB").stroke();

        // Title
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20).text("ORDER INVOICE", 50, 135, { align: "right" });
        doc.moveDown(2);

        // Metadata block
        doc.fontSize(10).fillColor("#4B5563").font("Helvetica");
        doc.text(`Order Reference: ${order.orderNumber}`);
        doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleString()}`);
        doc.text(`Order Status: ${order.status.toUpperCase()}`);
        doc.moveDown(2);

        // Customer Card Table
        doc.fillColor("#111827").fontSize(13).text("Customer Billing Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        doc.text(`Recipient Name: ${order.customerName || "Customer"}`);
        doc.text(`Contact Phone: ${order.customerPhone}`);
        
        if (order.customerData) {
          for (const [key, value] of Object.entries(order.customerData)) {
            if (key !== "name" && key !== "phone") {
              const label = key.toUpperCase();
              doc.text(`${label}: ${value}`);
            }
          }
        }
        doc.moveDown(2);

        // Product Details Table
        doc.fillColor("#111827").fontSize(13).text("Products & Line Items", { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(10).fillColor("#1F2937");
        doc.text("Product", 50, tableTop);
        doc.text("Qty", 250, tableTop);
        doc.text("Unit Price", 320, tableTop);
        doc.text("Total", 420, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).strokeColor("#E5E7EB").stroke();
        
        const rowTop = tableTop + 25;
        doc.text(order.productName || "Unknown Product", 50, rowTop);
        doc.text(String(order.quantity || 1), 250, rowTop);
        doc.text(`${order.currency || "INR"} ${order.price || "0"}`, 320, rowTop);
        doc.text(`${order.currency || "INR"} ${order.totalAmount || "0"}`, 420, rowTop);

        doc.moveTo(50, rowTop + 15).lineTo(500, rowTop + 15).stroke();
        doc.moveDown(3);

        // Payment Summary
        doc.fillColor("#111827").fontSize(13).text("Payment Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        doc.text(`Payment Gateway / Mode: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}`);
        doc.text(`Payment Reference Status: ${order.paymentStatus ? order.paymentStatus.toUpperCase() : "N/A"}`);
        if (order.receiptUrl) {
          doc.text(`Receipt attachment URL: ${order.receiptUrl}`);
        }
        doc.moveDown(3);

        doc.fillColor("#9CA3AF").fontSize(9).text("Thank you for shopping with us! If you have questions about this order, please contact the merchant.", { align: "center" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate Standard Indian Shipping Label PDF (Shiprocket / Delhivery style)
   */
  public static async generateShippingLabelPdf(order: any, user: any): Promise<Buffer> {
    const [config] = await db
      .select()
      .from(schema.ecommerceConfigs)
      .where(eq(schema.ecommerceConfigs.channelId, order.channelId))
      .limit(1);

    let logoBuffer: Buffer | null = null;
    if (config?.storeLogo) {
      try {
        logoBuffer = await this.resolveMediaBuffer(config.storeLogo);
      } catch (logoErr) {
        console.error("Failed to resolve store logo for Label PDF:", logoErr);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: [288, 432], margin: 15 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        // Draw Outer Border
        doc.lineWidth(1).rect(10, 10, 268, 412).strokeColor("#111827").stroke();

        // Draw Store Logo if available in top-left
        let headerOffset = 15;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 15, 15, { fit: [30, 30] });
            headerOffset = 50;
          } catch (e) {
            console.error("Failed to render logo in Label PDF:", e);
          }
        }

        // Store Identity
        const storeName = config?.storeName || user?.username || "Main Store";

        // 1. Header (Delhivery / Shiprocket style routing header)
        doc.fillColor("#111827");
        doc.font("Helvetica-Bold").fontSize(11).text(storeName.toUpperCase(), headerOffset, 18);
        doc.font("Helvetica").fontSize(7).text(`Ref: ${order.orderNumber}`, headerOffset, 32);
        doc.font("Helvetica-Bold").fontSize(10).text(order.paymentMethod === "cod" ? "C.O.D." : "PREPAID", 200, 20, { align: "right", width: 70 });
        
        // Draw horizontal divider line
        doc.moveTo(10, 50).lineTo(278, 50).lineWidth(1).strokeColor("#111827").stroke();

        // 2. Barcode simulation box
        doc.rect(20, 60, 248, 40).fill("#111827");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(order.orderNumber, 20, 75, { align: "center", width: 248 });
        doc.fillColor("#111827");

        // Draw horizontal divider line
        doc.moveTo(10, 110).lineTo(278, 110).lineWidth(1).strokeColor("#111827").stroke();

        // 3. Deliver To (Customer Details - LARGE PINCODE)
        const address = order.customerData?.address || "N/A";
        const pincode = order.customerData?.pin || "N/A";
        
        doc.font("Helvetica-Bold").fontSize(9).text("DELIVER TO:", 15, 120);
        doc.font("Helvetica-Bold").fontSize(11).text(order.customerName || "Customer", 15, 132);
        doc.font("Helvetica").fontSize(9).text(address, 15, 146, { width: 258, height: 40 });
        doc.font("Helvetica-Bold").fontSize(9).text(`Phone: ${order.customerPhone}`, 15, 190);
        
        // Large Pincode Box for routing sorting
        doc.rect(15, 210, 258, 25).stroke();
        doc.font("Helvetica-Bold").fontSize(12).text(`PIN: ${pincode}`, 25, 217);

        // Draw horizontal divider line
        doc.moveTo(10, 245).lineTo(278, 245).lineWidth(1).stroke();

        // 4. Product description / SKU / Qty
        doc.font("Helvetica-Bold").fontSize(8).text("ITEM DETAILS", 15, 255);
        doc.font("Helvetica").fontSize(9).text(`${order.productName || "Product"} (x${order.quantity || 1})`, 15, 267);
        doc.font("Helvetica").fontSize(8).text(`Declared Value: ${order.currency || "INR"} ${order.totalAmount}`, 15, 280);

        // Draw horizontal divider line
        doc.moveTo(10, 295).lineTo(278, 295).lineWidth(1).stroke();

        // 5. COD Collect Amount
        if (order.paymentMethod === "cod") {
          doc.rect(15, 305, 258, 45).fill("#FFF3CD").stroke("#FFEBAA");
          doc.fillColor("#856404");
          doc.font("Helvetica-Bold").fontSize(10).text("COD - COLLECT CASH", 20, 312);
          doc.font("Helvetica-Bold").fontSize(14).text(`${order.currency || "INR"} ${order.totalAmount}`, 20, 326);
          doc.fillColor("#111827");
        } else {
          doc.rect(15, 305, 258, 45).fill("#D4EDDA").stroke("#C3E6CB");
          doc.fillColor("#155724");
          doc.font("Helvetica-Bold").fontSize(10).text("PREPAID - DO NOT COLLECT CASH", 20, 318);
          doc.fillColor("#111827");
        }

        // Draw horizontal divider line
        doc.moveTo(10, 360).lineTo(278, 360).lineWidth(1).stroke();

        // 6. Return Address (Merchant Details)
        const returnName = config?.storeName || user?.username || "Main Store Warehouse";
        const returnAddress = config?.storeAddress || "India";
        const returnWebsite = config?.storeWebsite || "";

        doc.font("Helvetica-Bold").fontSize(8).text("RETURN TO / SENDER:", 15, 370);
        doc.font("Helvetica-Bold").fontSize(8).text(returnName, 15, 380);
        
        let returnSub = returnAddress;
        if (returnWebsite) returnSub += ` | Web: ${returnWebsite}`;
        doc.font("Helvetica").fontSize(7).text(returnSub, 15, 390, { width: 258 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Email Store Owner on Completion
   */
  public static async sendOrderEmail(order: any) {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order.tenantId))
        .limit(1);

      if (!user || !user.email) return;

      const transporter = await getTransporter();
      if (!transporter) return;

      const pdfBuffer = await this.generateOrderPdf(order);

      const customerDetails = order.customerData
        ? Object.entries(order.customerData)
            .map(([k, v]) => `<li><strong>${k.toUpperCase()}:</strong> ${v}</li>`)
            .join("")
        : "";

      const { from: fromHeader } = await getSystemFromAddress(order.productName ? `${order.productName} Store` : "Store Orders");

      const mailOptions = {
        from: fromHeader,
        to: user.email,
        subject: `[New Store Order] ${order.orderNumber} - ${order.currency || "INR"} ${order.totalAmount}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h2 style="color: #10B981; margin-top: 0;">New Order Placed!</h2>
            <p>Hello Store Owner,</p>
            <p>A customer has just completed their checkout. Here are the order details:</p>
            
            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; border-color: #E5E7EB; margin-bottom: 20px;">
              <tr style="background-color: #F9FAFB;">
                <td style="font-weight: bold;">Order Number</td>
                <td>${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Product Name</td>
                <td>${order.productName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Quantity</td>
                <td>${order.quantity}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Total Amount</td>
                <td style="color: #10B981; font-weight: bold;">${order.currency || "INR"} ${order.totalAmount}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Payment Method</td>
                <td>${order.paymentMethod.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Payment Status</td>
                <td>${order.paymentStatus.toUpperCase()}</td>
              </tr>
            </table>

            <h3>Customer checkout inputs:</h3>
            <ul>
              <li><strong>Phone:</strong> ${order.customerPhone}</li>
              ${customerDetails}
            </ul>

            <p style="margin-top: 20px;">The customer invoice/order summary has been generated and attached to this email as a PDF document.</p>
          </div>
        `,
        attachments: [
          {
            filename: `order_${order.orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EcommerceService] Email sent to ${user.email} for order ${order.orderNumber}`);
    } catch (err: any) {
      console.error("[EcommerceService] Failed to send order email:", err.message);
    }
  }

  /**
   * Send WhatsApp notification when order status changes
   */
  public static async sendOrderStatusUpdateNotification(orderId: string, status: string) {
    try {
      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.id, orderId))
        .limit(1);

      if (!order) return;

      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, order.channelId || ""))
        .limit(1);

      if (!channel) return;

      const message = `🔔 *Order Status Update*\n\nDear *${order.customerName || "Customer"}*,\n\nYour order *${order.orderNumber}* status has been updated to *${status.toUpperCase()}*.\n\nThank you for shopping with us!`;

      let convId = order.conversationId || null;
      if (!convId) {
        const [conv] = await db
          .select()
          .from(schema.conversations)
          .where(and(eq(schema.conversations.channelId, channel.id), eq(schema.conversations.contactPhone, order.customerPhone)))
          .limit(1);
        convId = conv?.id || null;
      }

      await this.sendAndSaveTextMessage(channel, convId, order.customerPhone, message);
      console.log(`[EcommerceService] WhatsApp notification status sent to ${order.customerPhone} for order ${order.orderNumber}`);
    } catch (err: any) {
      console.error("[EcommerceService] Failed to send status WhatsApp update:", err.message);
    }
  }

  /**
   * Generate and send customer order invoice PDF over WhatsApp upon successful payment verification.
   */
  public static async sendInvoiceToCustomer(orderId: string): Promise<void> {
    try {
      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.id, orderId))
        .limit(1);

      if (!order) return;

      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, order.channelId || ""))
        .limit(1);

      if (!channel) return;

      console.log(`[EcommerceService] Generating and sending invoice PDF for order ${order.orderNumber}...`);
      const pdfBuffer = await this.generateOrderPdf(order);
      
      const fileName = `Invoice_${order.orderNumber}.pdf`;
      const caption = `📄 *Payment Verified!* Here is your invoice for order *${order.orderNumber}*. Thank you for shopping with us!`;

      let convId = order.conversationId || null;
      if (!convId) {
        const [conv] = await db
          .select()
          .from(schema.conversations)
          .where(and(eq(schema.conversations.channelId, channel.id), eq(schema.conversations.contactPhone, order.customerPhone)))
          .limit(1);
        convId = conv?.id || null;
      }

      await this.sendAndSaveDocumentBuffer(channel, convId, order.customerPhone, pdfBuffer, fileName, caption);
      console.log(`[EcommerceService] Invoice PDF sent successfully to ${order.customerPhone}!`);
    } catch (err: any) {
      console.error(`[EcommerceService] Failed to send invoice PDF to customer:`, err.message);
    }
  }

  /**
   * Helper to format fields
   */
  private static getFieldLabel(field: string): string {
    switch (field.toLowerCase()) {
      case "name": return "Full Name";
      case "phone": return "Contact Phone";
      case "address": return "Shipping Address";
      case "pin": return "PIN / Zip Code";
      default: return field.charAt(0).toUpperCase() + field.slice(1);
    }
  }

  /**
   * Cloud API payload helpers
   */
  private static async sendCloudApiButtonMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    bodyText: string,
    headerImageUrl: string | null,
    buttons: { id: string; title: string }[]
  ) {
    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title.substring(0, 20) }
          }))
        }
      }
    };

    if (headerImageUrl) {
      payload.interactive.header = {
        type: "image",
        image: { link: headerImageUrl }
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channelRow.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelRow.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Interactive button failed");
    }

    const resJson = await response.json();
    try {
      if (conversationId) {
        const waMsgId = resJson?.messages?.[0]?.id || null;
        const msg = await storage.createMessage({
          conversationId,
          content: bodyText,
          direction: "outbound",
          fromType: "bot",
          messageType: "interactive",
          mediaUrl: headerImageUrl || null,
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: { buttons, headerImageUrl },
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: bodyText,
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save interactive button message to DB:", e?.message);
    }
  }

  private static async sendCloudApiListMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    headerText: string,
    bodyText: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ) {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections: sections.map((sec) => ({
            title: sec.title,
            rows: sec.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description
            }))
          }))
        }
      }
    };

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channelRow.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelRow.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Interactive list failed");
    }

    const resJson = await response.json();
    try {
      if (conversationId) {
        const waMsgId = resJson?.messages?.[0]?.id || null;
        const contentText = `${headerText ? headerText + "\n" : ""}${bodyText}`;
        const msg = await storage.createMessage({
          conversationId,
          content: contentText,
          direction: "outbound",
          fromType: "bot",
          messageType: "interactive",
          status: "delivered",
          whatsappMessageId: waMsgId,
          metadata: { buttonText, sections },
          timestamp: new Date(),
        });
        await storage.updateConversation(conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: bodyText,
        });
        if ((global as any).broadcastToConversation) {
          (global as any).broadcastToConversation(conversationId, {
            type: "new-message",
            message: msg,
          });
        }
      }
    } catch (e: any) {
      console.error("[EcommerceService] Failed to save interactive list message to DB:", e?.message);
    }
  }

  private static async saveIncomingMedia(
    mediaId: string,
    mimeType: string,
    waApi: WhatsAppApiService
  ): Promise<string | null> {
    try {
      console.log(`[EcommerceService] Downloading receipt media: ${mediaId}`);
      const buffer = await waApi.getMedia(mediaId);
      if (!buffer) return null;

      const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";
      const filename = `${Date.now()}-${mediaId}.${extension}`;

      // Try cloud storage first
      const { createDOClient } = await import("../config/digitalOceanConfig");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const doClient = await createDOClient();
      if (doClient) {
        const { s3, bucket, endpoint } = doClient;
        const fileKey = `uploads/incoming/${filename}`;
        console.log(`[EcommerceService] Uploading receipt to cloud storage: ${fileKey}`);

        try {
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket!,
              Key: fileKey,
              Body: buffer,
              ACL: "public-read",
              ContentType: mimeType,
            })
          );
        } catch (s3Error: any) {
          if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
            console.warn("[EcommerceService] S3 bucket does not support ACLs. Retrying without public-read ACL...");
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket!,
                Key: fileKey,
                Body: buffer,
                ContentType: mimeType,
              })
            );
          } else {
            throw s3Error;
          }
        }

        const endpointUrl = new URL(endpoint || "");
        return `https://${bucket}.${endpointUrl.host}/${fileKey}`;
      }

      // Local storage fallback
      const uploadDir = path.join(process.cwd(), "uploads", "incoming");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, buffer);
      
      const serverUrl = process.env.SERVER_URL || "https://wa.linalapro.com";
      return `${serverUrl.replace(/\/$/, "")}/uploads/incoming/${filename}`;
    } catch (err: any) {
      console.error("[EcommerceService] Failed to download/save incoming media:", err);
      return null;
    }
  }

  private static async addContactToCustomersGroup(
    channelId: string,
    phone: string,
    name: string,
    tenantId: string
  ) {
    try {
      const [existingContact] = await db
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.channelId, channelId), eq(schema.contacts.phone, phone)))
        .limit(1);

      if (existingContact) {
        const currentGroups = existingContact.groups || [];
        if (!currentGroups.includes("Customers")) {
          await db
            .update(schema.contacts)
            .set({
              groups: [...currentGroups, "Customers"],
              name: name || existingContact.name,
              updatedAt: new Date()
            })
            .where(eq(schema.contacts.id, existingContact.id));
        } else if (name && existingContact.name !== name) {
          await db
            .update(schema.contacts)
            .set({
              name,
              updatedAt: new Date()
            })
            .where(eq(schema.contacts.id, existingContact.id));
        }
      } else {
        // Create new contact
        await db
          .insert(schema.contacts)
          .values({
            channelId,
            phone,
            name: name || phone,
            groups: ["Customers"],
            source: "chatbot",
            createdBy: tenantId || "",
          });
      }
      console.log(`[EcommerceService] Added/updated contact ${phone} in Customers group`);
    } catch (err) {
      console.error("[EcommerceService] Failed to add contact to Customers group:", err);
    }
  }

  /**
   * Generate an Excel spreadsheet buffer (.xlsx) containing the daily orders list.
   */
  public static async generateDailyOrdersExcelBuffer(
    orders: schema.EcommerceOrder[],
    config: schema.EcommerceConfig,
    storeName: string,
    reportDateStr: string
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Linala Ecommerce System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Daily Orders", {
      views: [{ showGridLines: true }]
    });

    // Define columns
    worksheet.columns = [
      { header: "Order #", key: "orderNumber", width: 22 },
      { header: "Date & Time", key: "createdAt", width: 22 },
      { header: "Customer Name", key: "customerName", width: 24 },
      { header: "Customer Phone", key: "customerPhone", width: 18 },
      { header: "Product Name", key: "productName", width: 28 },
      { header: "Qty", key: "quantity", width: 10 },
      { header: "Unit Price", key: "price", width: 14 },
      { header: "Delivery Fee", key: "deliveryFee", width: 14 },
      { header: "Total Amount", key: "totalAmount", width: 16 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Payment Mode", key: "paymentMethod", width: 16 },
      { header: "Payment Status", key: "paymentStatus", width: 16 },
      { header: "Order Status", key: "status", width: 16 },
      { header: "Shipping / Customer Details", key: "customerDetails", width: 42 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" } // Slate 800
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    headerRow.height = 28;

    let totalRevenue = 0;
    let totalItems = 0;

    // Populate rows
    orders.forEach((order, index) => {
      const numPrice = parseFloat(String(order.price || "0")) || 0;
      const numDelivery = parseFloat(String(order.deliveryFee || "0")) || 0;
      const numTotal = parseFloat(String(order.totalAmount || "0")) || 0;
      const qty = order.quantity || 1;

      totalRevenue += numTotal;
      totalItems += qty;

      let extraDetails = "";
      if (order.customerData && typeof order.customerData === "object") {
        extraDetails = Object.entries(order.customerData)
          .filter(([k]) => k !== "name" && k !== "phone")
          .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
          .join(" | ");
      }

      const row = worksheet.addRow({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString() : "",
        customerName: order.customerName || "Customer",
        customerPhone: order.customerPhone || "",
        productName: order.productName || "Unknown",
        quantity: qty,
        price: numPrice,
        deliveryFee: numDelivery,
        totalAmount: numTotal,
        currency: order.currency || "INR",
        paymentMethod: (order.paymentMethod || "").toUpperCase(),
        paymentStatus: (order.paymentStatus || "").toUpperCase(),
        status: (order.status || "").toUpperCase(),
        customerDetails: extraDetails,
      });

      row.height = 22;
      row.alignment = { vertical: "middle" };

      if (index % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" } // Slate 50
        };
      }
    });

    // Summary / Total row
    const summaryRow = worksheet.addRow({
      orderNumber: `TOTAL ORDERS: ${orders.length}`,
      createdAt: "",
      customerName: "",
      customerPhone: "",
      productName: "",
      quantity: totalItems,
      price: "",
      deliveryFee: "",
      totalAmount: totalRevenue,
      currency: config.currency || "INR",
      paymentMethod: "",
      paymentStatus: "",
      status: "",
      customerDetails: "",
    });

    summaryRow.height = 26;
    summaryRow.font = { bold: true, color: { argb: "FF0F172A" }, size: 11 };
    summaryRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" } // Slate 200
    };
    summaryRow.alignment = { vertical: "middle" };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Send the daily orders summary email report with Excel attachment.
   */
  public static async sendDailyOrdersReport(
    config: schema.EcommerceConfig,
    options?: { isManualTest?: boolean; targetEmails?: string[]; date?: Date }
  ): Promise<{ success: boolean; message: string; ordersCount: number }> {
    try {
      const recipients: string[] = options?.targetEmails && options.targetEmails.length > 0
        ? options.targetEmails
        : (Array.isArray(config.dailyReportEmails) ? config.dailyReportEmails : []).filter(e => typeof e === "string" && e.trim().length > 0);

      if (recipients.length === 0) {
        return { success: false, message: "No recipient emails configured for daily orders report.", ordersCount: 0 };
      }

      // Check date boundaries (default: today 00:00:00 to 23:59:59.999)
      const targetDate = options?.date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch orders for this channel/tenant for the target date
      const orders = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.tenantId, config.tenantId),
            eq(schema.ecommerceOrders.channelId, config.channelId),
            gte(schema.ecommerceOrders.createdAt, startOfDay),
            lte(schema.ecommerceOrders.createdAt, endOfDay)
          )
        )
        .orderBy(desc(schema.ecommerceOrders.createdAt));

      // Fetch merchant/store name
      const storeName = config.storeName || "Store";
      const dateStr = targetDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const fileDateStr = targetDate.toISOString().split("T")[0];

      // Generate Excel Buffer
      const excelBuffer = await this.generateDailyOrdersExcelBuffer(orders, config, storeName, fileDateStr);

      // Aggregate statistics
      let totalRevenue = 0;
      let paidCount = 0;
      let codCount = 0;

      orders.forEach(o => {
        totalRevenue += parseFloat(String(o.totalAmount || "0")) || 0;
        if (o.paymentStatus === "paid") paidCount++;
        if (o.paymentMethod === "cod") codCount++;
      });

      const currency = config.currency || "INR";

      // Build HTML Email
      const recentOrdersRows = orders.slice(0, 25).map(o => `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 13px;">
          <td style="padding: 10px 8px; font-weight: 600; color: #1E293B;">${o.orderNumber}</td>
          <td style="padding: 10px 8px; color: #334155;">${o.customerName || "Customer"}<br><span style="font-size: 11px; color: #64748B;">${o.customerPhone}</span></td>
          <td style="padding: 10px 8px; color: #334155;">${o.productName || "Product"} (x${o.quantity || 1})</td>
          <td style="padding: 10px 8px; font-weight: 600; color: #059669;">${currency} ${Number(o.totalAmount || 0).toFixed(2)}</td>
          <td style="padding: 10px 8px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: ${o.paymentStatus === 'paid' ? '#DEF7EC; color: #03543F' : '#FEF3C7; color: #92400E'};">
              ${(o.paymentStatus || 'PENDING').toUpperCase()}
            </span>
          </td>
          <td style="padding: 10px 8px; color: #64748B; font-size: 12px;">${(o.paymentMethod || 'N/A').toUpperCase()}</td>
        </tr>
      `).join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
            .card { max-width: 680px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color: #FFFFFF; padding: 28px 32px; }
            .content { padding: 32px; }
            .table-container { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table-container th { background: #F1F5F9; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #CBD5E1; }
            .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748B; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">📊 Daily Orders Summary Report</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.85;">${storeName} &bull; ${dateStr}</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; line-height: 1.5; margin-top: 0; color: #334155;">
                Hello, here is your daily ecommerce orders summary for <strong>${storeName}</strong> for today (<strong>${dateStr}</strong>).
              </p>

              <!-- KPI Metrics -->
              <table style="width: 100%; margin: 20px 0; border-spacing: 12px; border-collapse: separate;">
                <tr>
                  <td style="background: #EFF6FF; border-radius: 8px; padding: 16px; width: 50%; border-left: 4px solid #3B82F6;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1E40AF;">Total Orders</div>
                    <div style="font-size: 24px; font-weight: 800; color: #1E3A8A; margin-top: 4px;">${orders.length}</div>
                  </td>
                  <td style="background: #ECFDF5; border-radius: 8px; padding: 16px; width: 50%; border-left: 4px solid #10B981;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #065F46;">Total Sales Revenue</div>
                    <div style="font-size: 24px; font-weight: 800; color: #064E3B; margin-top: 4px;">${currency} ${totalRevenue.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="background: #F0FDF4; border-radius: 8px; padding: 16px; width: 50%; border-left: 4px solid #22C55E;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803D;">Paid / Verified</div>
                    <div style="font-size: 20px; font-weight: 700; color: #14532D; margin-top: 4px;">${paidCount} Orders</div>
                  </td>
                  <td style="background: #FFFBEB; border-radius: 8px; padding: 16px; width: 50%; border-left: 4px solid #F59E0B;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400E;">COD / Pending</div>
                    <div style="font-size: 20px; font-weight: 700; color: #78350F; margin-top: 4px;">${codCount} COD &bull; ${orders.length - paidCount} Pending</div>
                  </td>
                </tr>
              </table>

              <!-- Orders Table Preview -->
              <h3 style="font-size: 16px; font-weight: 700; margin: 28px 0 12px 0; color: #0F172A;">
                📋 Today's Orders Breakdown ${orders.length > 25 ? `<span style="font-size: 12px; font-weight: normal; color: #64748B;">(showing latest 25 of ${orders.length})</span>` : ''}
              </h3>

              ${orders.length === 0 ? `
                <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 24px; text-align: center; color: #64748B;">
                  No new orders were placed today.
                </div>
              ` : `
                <table class="table-container">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrdersRows}
                  </tbody>
                </table>
              `}

              <div style="margin-top: 24px; padding: 14px 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #475569;">
                📎 <strong>Excel Attachment:</strong> The complete detailed spreadsheet with customer shipping addresses and item breakdown has been attached to this email (<strong>Daily_Orders_${storeName.replace(/[^a-zA-Z0-9]/g, "_")}_${fileDateStr}.xlsx</strong>).
              </div>
            </div>
            <div class="footer">
              Sent automatically by <strong>${storeName}</strong> Ecommerce Management &bull; Linala
            </div>
          </div>
        </body>
        </html>
      `;

      // Get transporter & SMTP configuration
      const transporter = await getTransporter();
      const { from: fromHeader } = await getSystemFromAddress(storeName);

      console.log(`[Ecommerce Reports] Sending daily orders report for ${storeName} to:`, recipients.join(", "), "from:", fromHeader);

      await transporter.sendMail({
        from: fromHeader,
        to: recipients.join(", "),
        subject: `📊 [${storeName}] Daily Orders Summary Report - ${fileDateStr} (${orders.length} orders)`,
        html,
        attachments: [
          {
            filename: `Daily_Orders_${storeName.replace(/[^a-zA-Z0-9]/g, "_")}_${fileDateStr}.xlsx`,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        ]
      });

      // Update dailyReportLastSentAt if this is a live cron run
      if (!options?.isManualTest) {
        await db
          .update(schema.ecommerceConfigs)
          .set({ dailyReportLastSentAt: new Date() })
          .where(eq(schema.ecommerceConfigs.id, config.id));
      }

      // If WhatsApp daily summary report is also enabled, send it
      if (config.dailyReportWaEnabled) {
        this.sendDailyWhatsAppReport(config, options).catch((err) =>
          console.error("[Ecommerce Reports] WhatsApp report forwarding background error:", err?.message)
        );
      }

      return {
        success: true,
        message: `Successfully sent daily orders report with ${orders.length} orders to ${recipients.join(", ")}`,
        ordersCount: orders.length
      };
    } catch (err: any) {
      console.error(`[Ecommerce Reports] Error sending daily orders report for config ${config.id}:`, err);
      return {
        success: false,
        message: `Failed to send report: ${err.message}`,
        ordersCount: 0
      };
    }
  }

  /**
   * Send daily orders summary via WhatsApp to configured phone numbers.
   */
  public static async sendDailyWhatsAppReport(
    config: schema.EcommerceConfig,
    options?: { isManualTest?: boolean; targetNumbers?: string[]; targetChannelId?: string; date?: Date }
  ): Promise<{ success: boolean; message: string; ordersCount: number }> {
    try {
      const numbers: string[] = options?.targetNumbers && options.targetNumbers.length > 0
        ? options.targetNumbers
        : (Array.isArray(config.dailyReportWaNumbers) ? config.dailyReportWaNumbers : []).filter(n => typeof n === "string" && n.trim().length > 0);

      if (numbers.length === 0) {
        return { success: false, message: "No recipient WhatsApp numbers configured.", ordersCount: 0 };
      }

      const channelId = options?.targetChannelId || config.dailyReportWaChannelId || config.channelId;
      if (!channelId) {
        return { success: false, message: "No WhatsApp channel selected for sending report.", ordersCount: 0 };
      }

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId))
        .limit(1);

      if (!channelRow) {
        return { success: false, message: "Selected WhatsApp channel not found.", ordersCount: 0 };
      }

      // Check date boundaries (default: today 00:00:00 to 23:59:59.999)
      const targetDate = options?.date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch orders for this channel/tenant for the target date
      const orders = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.tenantId, config.tenantId),
            eq(schema.ecommerceOrders.channelId, config.channelId),
            gte(schema.ecommerceOrders.createdAt, startOfDay),
            lte(schema.ecommerceOrders.createdAt, endOfDay)
          )
        )
        .orderBy(desc(schema.ecommerceOrders.createdAt));

      const storeName = config.storeName || "Store";
      const dateStr = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      let totalRevenue = 0;
      let paidCount = 0;
      let codCount = 0;
      let pendingCount = 0;

      orders.forEach(o => {
        totalRevenue += parseFloat(String(o.totalAmount || "0")) || 0;
        if (o.paymentStatus === "paid") paidCount++;
        else if (o.paymentMethod === "cod") codCount++;
        else pendingCount++;
      });

      const currency = config.currency || "INR";

      // Build message text
      let ordersListText = "";
      if (orders.length === 0) {
        ordersListText = "_No orders recorded today._";
      } else {
        const previewOrders = orders.slice(0, 15);
        ordersListText = previewOrders.map((o, idx) => {
          const statusTag = (o.paymentStatus || "pending").toUpperCase();
          const modeTag = (o.paymentMethod || "cod").toUpperCase();
          return `${idx + 1}. *${o.orderNumber}* - ${o.customerName || "Customer"} (${o.customerPhone})\n   🛍️ ${o.productName || "Item"} (x${o.quantity || 1}) • *${currency} ${Number(o.totalAmount || 0).toFixed(2)}* [${statusTag} • ${modeTag}]`;
        }).join("\n\n");

        if (orders.length > 15) {
          ordersListText += `\n\n_...and ${orders.length - 15} more order(s)._`;
        }
      }

      const waMessage = `📊 *${storeName.toUpperCase()} - DAILY ORDERS SUMMARY*\n📅 Date: *${dateStr}*\n\n` +
        `📈 *Key Metrics:*\n` +
        `• 📦 *Total Orders:* ${orders.length}\n` +
        `• 💰 *Total Sales:* ${currency} ${totalRevenue.toFixed(2)}\n` +
        `• ✅ *Paid / Verified:* ${paidCount}\n` +
        `• 🚚 *Cash on Delivery:* ${codCount}\n` +
        `• ⏳ *Pending Payment:* ${pendingCount}\n\n` +
        `📋 *Today's Orders Breakdown:*\n${ordersListText}\n\n` +
        `_Sent automatically by ${storeName} Ecommerce_`;

      const waApi = new WhatsAppApiService(channelRow);
      let successCount = 0;

      for (const phone of numbers) {
        try {
          const cleanPhone = phone.replace(/[^0-9]/g, "");
          if (cleanPhone.length >= 7) {
            await waApi.sendTextMessage(cleanPhone, waMessage);
            successCount++;
          }
        } catch (phoneErr: any) {
          console.error(`[Ecommerce Reports WA] Failed to send to ${phone}:`, phoneErr.message);
        }
      }

      return {
        success: successCount > 0,
        message: `Successfully forwarded daily orders summary via WhatsApp to ${successCount} recipient(s).`,
        ordersCount: orders.length
      };
    } catch (err: any) {
      console.error(`[Ecommerce Reports WA] Error sending WhatsApp daily summary:`, err);
      return {
        success: false,
        message: `Failed to send WhatsApp report: ${err.message}`,
        ordersCount: 0
      };
    }
  }

  /**
   * Track or update an abandoned cart session.
   */
  public static async trackAbandonedCart(params: {
    tenantId: string;
    channelId?: string | null;
    conversationId: string;
    customerPhone: string;
    customerName?: string | null;
    productId?: string | null;
    productName?: string | null;
    productPrice?: string | null;
    productPhoto?: string | null;
    quantity?: number;
    customerData?: any;
    currentStep: string;
  }): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.ecommerceAbandonedCarts)
        .where(
          and(
            eq(schema.ecommerceAbandonedCarts.conversationId, params.conversationId),
            eq(schema.ecommerceAbandonedCarts.status, "abandoned")
          )
        )
        .orderBy(desc(schema.ecommerceAbandonedCarts.createdAt))
        .limit(1);

      if (existing && existing.length > 0) {
        await db
          .update(schema.ecommerceAbandonedCarts)
          .set({
            customerName: params.customerName || existing[0].customerName,
            productId: params.productId || existing[0].productId,
            productName: params.productName || existing[0].productName,
            productPrice: params.productPrice ? String(params.productPrice) : existing[0].productPrice,
            productPhoto: params.productPhoto || existing[0].productPhoto,
            quantity: params.quantity || existing[0].quantity,
            customerData: params.customerData || existing[0].customerData,
            currentStep: params.currentStep,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.ecommerceAbandonedCarts.id, existing[0].id));
      } else {
        await db.insert(schema.ecommerceAbandonedCarts).values({
          tenantId: params.tenantId,
          channelId: params.channelId || null,
          conversationId: params.conversationId,
          customerPhone: params.customerPhone,
          customerName: params.customerName || null,
          productId: params.productId || null,
          productName: params.productName || null,
          productPrice: params.productPrice ? String(params.productPrice) : "0",
          productPhoto: params.productPhoto || null,
          quantity: params.quantity || 1,
          customerData: params.customerData || {},
          currentStep: params.currentStep,
          status: "abandoned",
          followupCount: 0,
          lastActivityAt: new Date(),
        });
      }
    } catch (err: any) {
      console.error("[EcommerceService] Failed to track abandoned cart:", err?.message);
    }
  }

  /**
   * Mark active abandoned cart as recovered when an order is completed.
   */
  public static async markCartRecovered(conversationId: string, orderId: string): Promise<void> {
    try {
      await db
        .update(schema.ecommerceAbandonedCarts)
        .set({
          status: "recovered",
          recoveredOrderId: orderId,
          recoveredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.ecommerceAbandonedCarts.conversationId, conversationId),
            eq(schema.ecommerceAbandonedCarts.status, "abandoned")
          )
        );
    } catch (err: any) {
      console.error("[EcommerceService] Failed to mark cart recovered:", err?.message);
    }
  }

  /**
   * Mark active abandoned cart as cancelled when customer exits.
   */
  public static async markCartCancelled(conversationId: string): Promise<void> {
    try {
      await db
        .update(schema.ecommerceAbandonedCarts)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.ecommerceAbandonedCarts.conversationId, conversationId),
            eq(schema.ecommerceAbandonedCarts.status, "abandoned")
          )
        );
    } catch (err: any) {
      console.error("[EcommerceService] Failed to mark cart cancelled:", err?.message);
    }
  }

  /**
   * Resume checkout flow from an abandoned cart, preserving previously collected fields.
   */
  public static async resumeCheckoutFlow(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any,
    cart: schema.EcommerceAbandonedCart
  ) {
    // Delete active session
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));

    const savedData: any = cart.customerData || {};
    const qty = cart.quantity || 1;

    // Insert new session with preserved customerData
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: qty,
      currentStep: cart.currentStep || "waiting_for_quantity",
      customerData: savedData,
    });

    const currency = product.currency || config.currency || "INR";
    const basePrice = parseFloat(product.price || "0");
    const subtotal = basePrice * qty;

    const resumeMsg = `🛒 *Welcome back!*\n\nResuming your order for *${product.name}* (x${qty}) • *${currency} ${subtotal.toFixed(2)}*.\n\n` +
      `Reply *1* or send your details to continue, or type *cancel* to restart.`;

    await this.sendAndSaveTextMessage(channelRow, conversationId, contactPhone, resumeMsg);
  }

  /**
   * Send automated recovery message to customer for an abandoned cart.
   */
  public static async sendRecoveryMessageToCart(
    cart: schema.EcommerceAbandonedCart,
    followupNum: 1 | 2,
    config: schema.EcommerceConfig
  ): Promise<boolean> {
    try {
      const channelId = cart.channelId || config.channelId;
      if (!channelId) return false;

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId))
        .limit(1);

      if (!channelRow) return false;

      const customerName = cart.customerName || "there";
      const productName = cart.productName || "your item";
      const currency = config.currency || "INR";
      const price = `${currency} ${cart.productPrice || "0"}`;
      const quantity = String(cart.quantity || 1);

      let text = "";
      if (followupNum === 1) {
        const rawTemplate = config.abandonedCartMessage1 || "👋 Hi {name}! We noticed you left *{product_name}* in your cart.\n\nItems in your cart are in high demand and might sell out soon. Would you like to complete your order now?";
        text = rawTemplate
          .replace(/{name}/g, customerName)
          .replace(/{product_name}/g, productName)
          .replace(/{price}/g, price)
          .replace(/{quantity}/g, quantity);
      } else {
        const rawTemplate = config.abandonedCartMessage2 || "⏰ *Last chance!* Your cart containing *{product_name}* is about to expire.{discount_info}\n\nClick *Complete Order* below or reply *1* to grab it before stock runs out!";
        let discountInfo = "";
        if (config.abandonedCartDiscountCode) {
          discountInfo = `\n\n🎁 *Special Discount:* Use coupon code *${config.abandonedCartDiscountCode}* for *${config.abandonedCartDiscountPercent || 10}% OFF*!`;
        }
        text = rawTemplate
          .replace(/{name}/g, customerName)
          .replace(/{product_name}/g, productName)
          .replace(/{price}/g, price)
          .replace(/{quantity}/g, quantity)
          .replace(/{discount_info}/g, discountInfo);
      }

      const to = cart.customerPhone;
      const conversationId = cart.conversationId;

      if (channelRow.connectionMethod === "qr_code") {
        const fullMsg = `${text}\n\n👉 *Reply '1' or 'checkout' to complete your order!*`;
        if (cart.productPhoto) {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, cart.productPhoto, "image", fullMsg);
          } catch {
            await this.sendAndSaveTextMessage(channelRow, conversationId, to, fullMsg);
          }
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, fullMsg);
        }
      } else {
        // Cloud API Interactive Buttons
        const buttons = [
          { id: `resume_checkout_${cart.id}`, title: "🛒 Complete Order" },
          { id: `cancel_checkout_${cart.id}`, title: "❌ Cancel" }
        ];

        if (cart.productPhoto) {
          try {
            await this.sendCloudApiButtonMessage(channelRow, conversationId, to, text, { type: "image", image: { link: cart.productPhoto } }, buttons);
          } catch {
            await this.sendCloudApiButtonMessage(channelRow, conversationId, to, text, null, buttons);
          }
        } else {
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, text, null, buttons);
        }
      }

      // Update follow-up record
      const updateData: any = {
        followupCount: followupNum,
        updatedAt: new Date()
      };
      if (followupNum === 1) {
        updateData.followup1SentAt = new Date();
      } else {
        updateData.followup2SentAt = new Date();
      }

      await db
        .update(schema.ecommerceAbandonedCarts)
        .set(updateData)
        .where(eq(schema.ecommerceAbandonedCarts.id, cart.id));

      return true;
    } catch (err: any) {
      console.error(`[Ecommerce Recovery] Failed to send recovery message for cart ${cart.id}:`, err?.message);
      return false;
    }
  }

  /**
   * Manually send a recovery message to an abandoned cart from the UI ledger.
   */
  public static async sendManualRecoveryMessage(
    cartId: string,
    customMessage?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const [cart] = await db
        .select()
        .from(schema.ecommerceAbandonedCarts)
        .where(eq(schema.ecommerceAbandonedCarts.id, cartId))
        .limit(1);

      if (!cart) {
        return { success: false, message: "Abandoned cart not found." };
      }

      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.tenantId, cart.tenantId),
            eq(schema.ecommerceConfigs.isActive, true)
          )
        )
        .limit(1);

      const channelId = cart.channelId || config?.channelId;
      if (!channelId) {
        return { success: false, message: "No active channel found for sending recovery message." };
      }

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId))
        .limit(1);

      if (!channelRow) {
        return { success: false, message: "Channel not found." };
      }

      const customerName = cart.customerName || "Customer";
      const productName = cart.productName || "Product";
      const currency = config?.currency || "INR";
      const price = `${currency} ${cart.productPrice || "0"}`;

      let msgText = customMessage?.trim();
      if (!msgText) {
        msgText = `👋 Hi ${customerName}! We noticed you were interested in *${productName}* (${price}). Would you like to complete your order now?`;
      }

      const to = cart.customerPhone;
      const conversationId = cart.conversationId;

      if (channelRow.connectionMethod === "qr_code") {
        const fullMsg = `${msgText}\n\n👉 *Reply '1' or 'checkout' to complete your order!*`;
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, fullMsg);
      } else {
        const buttons = [
          { id: `resume_checkout_${cart.id}`, title: "🛒 Complete Order" },
          { id: `cancel_checkout_${cart.id}`, title: "❌ Cancel" }
        ];
        await this.sendCloudApiButtonMessage(channelRow, conversationId, to, msgText, null, buttons);
      }

      const nextCount = (cart.followupCount || 0) + 1;
      await db
        .update(schema.ecommerceAbandonedCarts)
        .set({
          followupCount: nextCount,
          ...(nextCount === 1 ? { followup1SentAt: new Date() } : { followup2SentAt: new Date() }),
          updatedAt: new Date()
        })
        .where(eq(schema.ecommerceAbandonedCarts.id, cart.id));

      return { success: true, message: `Recovery message successfully sent to ${to}` };
    } catch (err: any) {
      console.error(`[Ecommerce Recovery] Manual recovery error for cart ${cartId}:`, err);
      return { success: false, message: `Failed to send recovery message: ${err.message}` };
    }
  }

  /**
   * Cron check: runs every 5 minutes to find abandoned carts eligible for automated recovery follow-ups.
   */
  public static async checkAndRunAbandonedCartRecovery(): Promise<void> {
    try {
      const activeConfigs = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.abandonedCartRecoveryEnabled, true),
            eq(schema.ecommerceConfigs.isActive, true)
          )
        );

      if (activeConfigs.length === 0) return;

      const now = new Date();

      for (const config of activeConfigs) {
        try {
          const delay1Minutes = config.abandonedCartDelay1Minutes || 60;
          const delay2Hours = config.abandonedCartDelay2Hours || 18;

          const cutoff1 = new Date(now.getTime() - delay1Minutes * 60 * 1000);
          const cutoff2 = new Date(now.getTime() - delay2Hours * 60 * 60 * 1000);
          // 23.5 hours cutoff to ensure we strictly stay within WhatsApp's 24-hour customer window
          const cutoffMax24h = new Date(now.getTime() - 23.5 * 60 * 60 * 1000);

          // Fetch all abandoned carts for tenant within 24h window
          const candidateCarts = await db
            .select()
            .from(schema.ecommerceAbandonedCarts)
            .where(
              and(
                eq(schema.ecommerceAbandonedCarts.tenantId, config.tenantId),
                eq(schema.ecommerceAbandonedCarts.status, "abandoned"),
                gte(schema.ecommerceAbandonedCarts.lastActivityAt, cutoffMax24h)
              )
            );

          for (const cart of candidateCarts) {
            const lastActivity = cart.lastActivityAt ? new Date(cart.lastActivityAt) : new Date(cart.createdAt || now);

            // Follow-up 1 check: 0 followups sent, and last activity was before cutoff1
            if ((cart.followupCount || 0) === 0 && lastActivity <= cutoff1) {
              console.log(`[Ecommerce Recovery] 🛒 Sending Follow-up 1 to ${cart.customerPhone} for abandoned product ${cart.productName}`);
              await this.sendRecoveryMessageToCart(cart, 1, config);
            }
            // Follow-up 2 check: 1 followup sent, and last activity was before cutoff2
            else if ((cart.followupCount || 0) === 1 && lastActivity <= cutoff2) {
              console.log(`[Ecommerce Recovery] ⏰ Sending Follow-up 2 to ${cart.customerPhone} for abandoned product ${cart.productName}`);
              await this.sendRecoveryMessageToCart(cart, 2, config);
            }
          }
        } catch (innerErr: any) {
          console.error(`[Ecommerce Recovery] Error checking recovery for config ${config.id}:`, innerErr?.message);
        }
      }
    } catch (err: any) {
      console.error("[Ecommerce Recovery] Error in checkAndRunAbandonedCartRecovery:", err?.message);
    }
  }

  /**
   * Cron check: runs every minute to see if any enabled ecommerce configs match the current scheduled time.
   */
  public static async checkAndRunDailyReports(): Promise<void> {
    try {
      const activeConfigs = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            or(
              eq(schema.ecommerceConfigs.dailyReportEnabled, true),
              eq(schema.ecommerceConfigs.dailyReportWaEnabled, true)
            ),
            eq(schema.ecommerceConfigs.isActive, true)
          )
        );

      if (activeConfigs.length === 0) return;

      const now = new Date();
      // Format current time in 24-hour HH:MM format
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const config of activeConfigs) {
        try {
          const reportTime = (config.dailyReportTime || "21:00").trim();
          
          if (currentHHMM !== reportTime) {
            continue;
          }

          // Check if report was already sent today (within last 20 hours)
          if (config.dailyReportLastSentAt) {
            const lastSent = new Date(config.dailyReportLastSentAt);
            const diffHours = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
            if (diffHours < 20) {
              // Already sent for today
              continue;
            }
          }

          console.log(`[Ecommerce Reports] ⏰ Triggering scheduled daily orders report for config ID: ${config.id} (Scheduled time: ${reportTime})`);
          await this.sendDailyOrdersReport(config);
        } catch (innerErr: any) {
          console.error(`[Ecommerce Reports] Error processing daily report for config ${config.id}:`, innerErr?.message);
        }
      }
    } catch (err: any) {
      console.error("[Ecommerce Reports] Error in checkAndRunDailyReports:", err?.message);
    }
  }
}
