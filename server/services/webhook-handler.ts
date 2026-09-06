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

import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { webhookConfigs, messages, conversations, contacts, messageQueue, templates, channels, users, aiSettings, sites, automationExecutions, automations, voiceProfiles, automationNodes, aiProfiles, campaignRecipients, campaigns } from "@shared/schema";
import * as schema from "@shared/schema";
import { eq, and, gte, inArray, desc, isNull, sql, or } from "drizzle-orm";
import crypto from "crypto";
import { triggerNotification, triggerThrottledNotification, NOTIFICATION_EVENTS } from "./notification.service";
import OpenAI from "openai";
import { searchTrainingData } from "./training.service";
import { WhatsAppApiService } from "./whatsapp-api";
import { triggerService } from "./automation-execution-service";
import { VoiceManager } from "./voice";
import { AddonManager } from "./addon-manager";
import { ReminderAIService, getContactTimezoneOffset, getTimezoneLabel, formatLocalTime } from "./reminder-ai-service";
import { ExpenseAIService } from "./expense-ai-service";
import { TicketAIService } from "./ticket-ai-service";
import { getTransporter, getSystemFromAddress } from "./email.service";
import { EcommerceService } from "./ecommerce-service";
import { AiBillingService } from "./ai-billing-service";
import { WhatsappFlowsService } from "./whatsapp-flows.service";


export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: string;
  image?: {
    id: string;
    mime_type: string;
    sha256?: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256?: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256?: string;
    voice?: boolean;
  };
  sticker?: {
    id: string;
    mime_type: string;
    sha256?: string;
    animated?: boolean;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256?: string;
    filename: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    url?: string;
  };
  contacts?: Array<{
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
    };
    phones?: Array<{
      phone: string;
      type?: string;
    }>;
    emails?: Array<{
      email: string;
      type?: string;
    }>;
    org?: {
      company?: string;
      title?: string;
    };
  }>;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: {
      details: string;
    };
  }>;
  rawBaileysMessage?: any;
}

export interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: {
      type: "marketing_lite" | "marketing" | "utility" | "authentication" | "service" | "referral_conversion" | string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: "marketing_lite" | "marketing" | "utility" | "authentication" | "service" | string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

export class WebhookHandler {
  // Verify webhook signature
  static verifySignature(
    rawBody: string,
    signature: string,
    appSecret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    
    return `sha256=${expectedSignature}` === signature;
  }

  // Handle webhook verification (GET request)
  static async handleVerification(
    mode: string,
    verifyToken: string,
    challenge: string,
    expectedToken: string
  ): Promise<{ verified: boolean; challenge?: string }> {
    if (mode === "subscribe" && verifyToken === expectedToken) {
      console.log("Webhook verified successfully");
      return { verified: true, challenge };
    }
    
    console.error("Webhook verification failed");
    return { verified: false };
  }

  // Process incoming webhook events
  static async processWebhook(body: any): Promise<void> {
    if (body.object !== "whatsapp_business_account") {
      throw new Error("Invalid webhook object type");
    }

    for (const entry of body.entry) {
      const wabaId = entry.id;
      
      for (const change of entry.changes) {
        const value = change.value;
        const field = change.field;

        if (field === "messages") {
          // Handle incoming messages
          if (value.messages) {
            const contactProfiles = value.contacts || [];
            for (const message of value.messages) {
              const profile = contactProfiles.find((c: any) => c.wa_id === message.from);
              const profileName = profile?.profile?.name || null;
              await this.handleIncomingMessage(
                value.metadata.phone_number_id,
                message,
                profileName
              );
            }
          }

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await this.handleStatusUpdate(status);
            }
          }
        } else if (field === "message_template_status_update") {
          // Handle template status updates
          await this.handleTemplateStatusUpdate(value);
        } else if (field === "account_alerts") {
          await this.handleAccountAlert(value);
        } else if (field === "account_update") {
          await this.handleAccountUpdate(entry.id, value);
        }
      }
    }
  }

  // Handle incoming messages
  // Static helper to execute AI Expense Tracker interceptor for both QR and Cloud API channels
  public static async interceptExpenseTracker(
    channelId: string,
    conversation: any[],
    contact: any[],
    message: any,
    content: string,
    isGroupMessage: boolean,
    channelRow: any
  ): Promise<boolean> {
    let automationHandled = false;
// ==================== EXPENSE TRACKER INTERCEPTOR ====================
if (channelId && conversation.length > 0 && !isGroupMessage) {
  try {
    const tenantId = channelRow?.createdBy;
    if (tenantId) {
      const accounts = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId));

      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(and(eq(schema.addons.slug, "expense-tracker"), eq(schema.addons.isActive, true)))
        .limit(1);

      if (addon) {
        const [subscription] = await db
          .select()
          .from(schema.tenantAddons)
          .where(
            and(
              eq(schema.tenantAddons.tenantId, tenantId),
              eq(schema.tenantAddons.addonId, addon.id)
            )
          )
          .limit(1);

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, tenantId))
          .limit(1);

        const isSubscriptionActive = subscription
          ? (subscription.status === "active" || user?.role === "superadmin")
          : (user?.role === "superadmin" ? true : false);

        const purchaseType = subscription?.purchaseType || (user?.role === "superadmin" ? "ai" : "flow");

        if (isSubscriptionActive && purchaseType === "ai") {
          const [expenseConfig] = await db
            .select()
            .from(schema.expenseConfigs)
            .where(eq(schema.expenseConfigs.channelId, channelId))
            .limit(1);

          if (expenseConfig && expenseConfig.isActive) {
            // 1. Check if there is an active conversational session for this conversation
            const [activeSession] = await db
              .select()
              .from(schema.expenseSessions)
              .where(eq(schema.expenseSessions.conversationId, conversation[0].id))
              .limit(1);

            if (activeSession) {
              const cleanContent = content.trim();
              const waApi = new WhatsAppApiService(channelRow);

              if (activeSession.status === "waiting_for_details") {
                const mediaId = message.image?.id || message.mediaId;
                if (message.type === "image" && mediaId) {
                  try {
                    const { buffer, mimeType } = await waApi.getMediaBuffer(mediaId);
                    let fileUrl: string | undefined;
                    try {
                      fileUrl = await waApi.fetchMediaUrl(mediaId);
                    } catch (err) {
                      console.error("Failed to fetch media URL:", err);
                    }

                    const parsed = await ExpenseAIService.parseReceiptImage(tenantId, channelId, buffer, mimeType);
                    if (parsed && !parsed.error && parsed.amount > 0) {
                      const matchedAccount = await ExpenseAIService.resolveOrCreatePaymentAccount(tenantId, parsed.accountName);
                      const isMissingAccount = false;
                      const isMissingDate = parsed.date === "MISSING";

                      if (isMissingAccount || isMissingDate) {
                        await db
                          .update(schema.expenseSessions)
                          .set({
                            status: isMissingAccount ? "waiting_for_account" : "waiting_for_date",
                            amount: String(parsed.amount),
                            category: parsed.category,
                            paymentAccountId: matchedAccount ? matchedAccount.id : null,
                            description: parsed.description,
                            date: parsed.date,
                            type: parsed.type || "expense",
                            mediaUrl: fileUrl || null
                          })
                          .where(eq(schema.expenseSessions.id, activeSession.id));

                        if (isMissingAccount) {
                          const accountListStr = accounts.map(a => `- ${a.name}`).join("\n");
                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: {
                              body: `📸 *Receipt Detected!*\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n\n⚠️ Could not determine which payment account to charge it to. Please reply with one of the following:\n\n${accountListStr}`
                            }
                          });
                        } else {
                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: {
                              body: `📸 *Receipt Detected!*\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${matchedAccount!.name}*\n\n📅 The transaction date is missing. Please reply with the date (e.g. today, yesterday, or a date like 2026-08-24).`
                            }
                          });
                        }
                      } else {
                        const finalAccount = matchedAccount || (accounts.length > 0 ? accounts[0] : null);
                        if (finalAccount) {
                          const currentBalance = parseFloat(finalAccount.balance || "0");
                          const amountVal = parsed.amount;
                          const newBalance = parsed.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                          await db
                            .update(schema.paymentAccounts)
                            .set({
                              balance: String(newBalance),
                              updatedAt: new Date()
                            })
                            .where(eq(schema.paymentAccounts.id, finalAccount.id));

                          const txDate = parsed.date && parsed.date !== "MISSING" ? new Date(parsed.date) : new Date();

                          await db.insert(schema.expenses).values({
                            tenantId,
                            channelId,
                            amount: String(parsed.amount),
                            category: parsed.category,
                            paymentAccountId: finalAccount.id,
                            type: parsed.type || "expense",
                            description: parsed.description,
                            date: txDate,
                            mediaUrl: fileUrl || null,
                            loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                            loggedByPhone: contact[0]?.phone || "Unknown",
                          });

                          await db.delete(schema.expenseSessions).where(eq(schema.expenseSessions.id, activeSession.id));

                          await db
                            .update(schema.conversations)
                            .set({ aiEnabled: false })
                            .where(eq(schema.conversations.id, conversation[0].id));

                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: {
                              body: `✅ *Receipt Logged Successfully!*\n\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${finalAccount.name}*\n📝 Description: *${parsed.description || "N/A"}*\n📅 Date: *${txDate.toISOString().split("T")[0]}*`
                            }
                          });
                        }
                      }
                    } else {
                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `⚠️ *Failed to parse receipt image.*\nReason: ${parsed?.error || "AI could not extract receipt details."}\n\nPlease try again or upload a clearer photo.`
                        }
                      });
                    }
                  } catch (err: any) {
                    console.error("Receipt image parsing failed inside active session:", err.message);
                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: {
                        body: `⚠️ *Failed to parse receipt image due to system error.*`
                      }
                    });
                  }
                } else {
                  // Parse details via AI
                  const parsed = await ExpenseAIService.parseExpense(tenantId, channelId, cleanContent, (activeSession.type as "expense" | "deposit") || "expense");
                  if (parsed && !parsed.error && parsed.amount > 0) {
                    const matchedAccount = await ExpenseAIService.resolveOrCreatePaymentAccount(tenantId, parsed.accountName);

                    const isMissingAccount = false;
                    const isMissingDate = (parsed as any).date === "MISSING";

                    if (isMissingAccount || isMissingDate) {
                      await db
                        .update(schema.expenseSessions)
                        .set({
                          status: isMissingAccount ? "waiting_for_account" : "waiting_for_date",
                          amount: String(parsed.amount),
                          category: parsed.category,
                          paymentAccountId: matchedAccount ? matchedAccount.id : null,
                          description: parsed.description,
                          date: (parsed as any).date || null,
                          type: parsed.type || (activeSession.type as "expense" | "deposit") || "expense"
                        })
                        .where(eq(schema.expenseSessions.id, activeSession.id));

                      if (isMissingAccount) {
                        const accountListStr = accounts.map(a => `- ${a.name}`).join("\n");
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n\n⚠️ Could not determine which payment account to charge it to. Please reply with one of the following:\n\n${accountListStr}`
                          }
                        });
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${matchedAccount!.name}*\n\n📅 The transaction date is missing. Please reply with the date (e.g. today, yesterday, or a date like 2026-08-24).`
                          }
                        });
                      }
                    } else {
                      const finalAccount = matchedAccount || (accounts.length > 0 ? accounts[0] : null);
                      if (finalAccount) {
                        const currentBalance = parseFloat(finalAccount.balance || "0");
                        const amountVal = parsed.amount;
                        const newBalance = parsed.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                        await db
                          .update(schema.paymentAccounts)
                          .set({
                            balance: String(newBalance),
                            updatedAt: new Date()
                          })
                          .where(eq(schema.paymentAccounts.id, finalAccount.id));

                        const txDate = (parsed as any).date && (parsed as any).date !== "MISSING" ? new Date((parsed as any).date) : new Date();

                        await db.insert(schema.expenses).values({
                          tenantId,
                          channelId,
                          amount: String(parsed.amount),
                          category: parsed.category,
                          paymentAccountId: finalAccount.id,
                          type: parsed.type || (activeSession.type as "expense" | "deposit") || "expense",
                          description: parsed.description,
                          date: txDate,
                          loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          loggedByPhone: contact[0]?.phone || "Unknown",
                        });

                        await db.delete(schema.expenseSessions).where(eq(schema.expenseSessions.id, activeSession.id));

                        await db
                          .update(schema.conversations)
                          .set({ aiEnabled: false })
                          .where(eq(schema.conversations.id, conversation[0].id));

                        const successTitle = parsed.type === "deposit" ? "Income/Deposit Logged Successfully!" : "Expense Logged Successfully!";
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *${successTitle}*\n\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${finalAccount.name}*\n📝 Description: *${parsed.description || "N/A"}*\n📅 Date: *${txDate.toISOString().split("T")[0]}*`
                          }
                        });
                      }
                    }
                  } else {
                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: {
                        body: `⚠️ *Failed to parse transaction details.*\nReason: ${parsed?.error || "AI could not extract amount or category."}\n\nPlease try again or reply with clear text (e.g. "spent 50 for marketing cash").`
                      }
                    });
                  }
                }
                automationHandled = true;
              } else if (activeSession.status === "waiting_for_account") {
                // Resolve or auto-create payment account
                const matchedAccount = await ExpenseAIService.resolveOrCreatePaymentAccount(tenantId, cleanContent);

                if (matchedAccount) {
                  // Account matched! Check if date is missing
                  if (activeSession.date === "MISSING") {
                    await db
                      .update(schema.expenseSessions)
                      .set({
                        status: "waiting_for_date",
                        paymentAccountId: matchedAccount.id
                      })
                      .where(eq(schema.expenseSessions.id, activeSession.id));

                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: {
                        body: `💳 *Account matched:* ${matchedAccount.name}\n\n📅 The date of this receipt is missing. Please reply with the date (e.g. today, yesterday, or a date like 2026-08-24).`
                      }
                    });
                  } else {
                    // Complete transaction
                    const currentBalance = parseFloat(matchedAccount.balance || "0");
                    const amountVal = parseFloat(activeSession.amount);
                    const newBalance = activeSession.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                    await db
                      .update(schema.paymentAccounts)
                      .set({
                        balance: String(newBalance),
                        updatedAt: new Date()
                      })
                      .where(eq(schema.paymentAccounts.id, matchedAccount.id));

                    await db.insert(schema.expenses).values({
                      tenantId,
                      channelId,
                      amount: activeSession.amount,
                      category: activeSession.category,
                      paymentAccountId: matchedAccount.id,
                      type: activeSession.type || "expense",
                      description: activeSession.description,
                      date: activeSession.date ? new Date(activeSession.date) : new Date(),
                      mediaUrl: activeSession.mediaUrl,
                      loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                      loggedByPhone: contact[0]?.phone || "Unknown",
                    });

                    await db.delete(schema.expenseSessions).where(eq(schema.expenseSessions.id, activeSession.id));

                    await db
                      .update(schema.conversations)
                      .set({ aiEnabled: false })
                      .where(eq(schema.conversations.id, conversation[0].id));

                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: {
                        body: `✅ *Receipt Logged Successfully!*\n\n💰 Amount: *${amountVal.toFixed(2)}*\n📂 Category: *${activeSession.category}*\n💳 Account: *${matchedAccount.name}*\n📝 Description: *${activeSession.description || "N/A"}*\n📅 Date: *${activeSession.date}*`
                      }
                    });
                  }
                }
                automationHandled = true;
              } else if (activeSession.status === "waiting_for_date") {
                // Resolve date and complete transaction
                let parsedDate = new Date();
                const lowerDateInput = cleanContent.toLowerCase();
                if (lowerDateInput === "today" || lowerDateInput.includes("today")) {
                  parsedDate = new Date();
                } else if (lowerDateInput === "yesterday" || lowerDateInput.includes("yesterday")) {
                  parsedDate = new Date();
                  parsedDate.setDate(parsedDate.getDate() - 1);
                } else {
                  const parsedMs = Date.parse(cleanContent);
                  if (!isNaN(parsedMs)) {
                    parsedDate = new Date(parsedMs);
                  }
                }

                const accountId = activeSession.paymentAccountId;
                if (accountId) {
                  const [account] = await db
                    .select()
                    .from(schema.paymentAccounts)
                    .where(eq(schema.paymentAccounts.id, accountId))
                    .limit(1);

                  if (account) {
                    const currentBalance = parseFloat(account.balance || "0");
                    const amountVal = parseFloat(activeSession.amount);
                    const newBalance = activeSession.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                    await db
                      .update(schema.paymentAccounts)
                      .set({
                        balance: String(newBalance),
                        updatedAt: new Date()
                      })
                      .where(eq(schema.paymentAccounts.id, account.id));

                    await db.insert(schema.expenses).values({
                      tenantId,
                      channelId,
                      amount: activeSession.amount,
                      category: activeSession.category,
                      paymentAccountId: account.id,
                      type: activeSession.type || "expense",
                      description: activeSession.description,
                      date: parsedDate,
                      mediaUrl: activeSession.mediaUrl,
                      loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                      loggedByPhone: contact[0]?.phone || "Unknown",
                    });

                    await db.delete(schema.expenseSessions).where(eq(schema.expenseSessions.id, activeSession.id));

                     await db
                       .update(schema.conversations)
                       .set({ aiEnabled: false })
                       .where(eq(schema.conversations.id, conversation[0].id));

                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: {
                        body: `✅ *Receipt Logged Successfully!*\n\n💰 Amount: *${amountVal.toFixed(2)}*\n📂 Category: *${activeSession.category}*\n💳 Account: *${account.name}*\n📝 Description: *${activeSession.description || "N/A"}*\n📅 Date: *${parsedDate.toISOString().split("T")[0]}*`
                      }
                    });
                  }
                }
                automationHandled = true;
              }
            } else if (message.type === "image") {
              // 2. Vision OCR receipt scanning
              console.log(`[Expense Tracker] Triggered receipt vision scan.`);
              const waApi = new WhatsAppApiService(channelRow);
              const mediaId = (message.image as any)?.id || message.mediaId;
              
              if (mediaId) {
                try {
                  const { buffer, mimeType } = await waApi.getMediaBuffer(mediaId);
                  
                  let fileUrl: string | undefined;
                  try {
                    fileUrl = await waApi.fetchMediaUrl(mediaId);
                  } catch (err) {
                    console.error("Failed to fetch media URL:", err);
                  }

                  const parsed = await ExpenseAIService.parseReceiptImage(tenantId, channelId, buffer, mimeType);

                  if (parsed && !parsed.error && parsed.amount > 0) {
                    const matchedAccount = await ExpenseAIService.resolveOrCreatePaymentAccount(tenantId, parsed.accountName);
                    const isMissingAccount = false;
                    const isMissingDate = parsed.date === "MISSING";

                    if (isMissingAccount || isMissingDate) {
                      // Create temporary session
                      await db.insert(schema.expenseSessions).values({
                        conversationId: conversation[0].id,
                        status: isMissingAccount ? "waiting_for_account" : "waiting_for_date",
                        amount: String(parsed.amount),
                        category: parsed.category,
                        paymentAccountId: matchedAccount ? matchedAccount.id : null,
                        description: parsed.description,
                        date: parsed.date,
                        type: parsed.type || "expense",
                        mediaUrl: fileUrl || null
                      });

                      if (isMissingAccount) {
                        const accountListStr = accounts.map(a => `- ${a.name}`).join("\n");
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `📸 *Receipt Detected!*\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n\n⚠️ Could not determine which payment account to charge it to. Please reply with one of the following:\n\n${accountListStr}`
                          }
                        });
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `📸 *Receipt Detected!*\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${matchedAccount!.name}*\n\n📅 The transaction date is missing. Please reply with the date (e.g. today, yesterday, or a date like 2026-08-24).`
                          }
                        });
                      }
                    } else {
                      // Fully resolved immediately!
                      const finalAccount = matchedAccount || (accounts.length > 0 ? accounts[0] : null);
                      if (finalAccount) {
                        const currentBalance = parseFloat(finalAccount.balance || "0");
                        const amountVal = parsed.amount;
                        const newBalance = parsed.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                        await db
                          .update(schema.paymentAccounts)
                          .set({
                            balance: String(newBalance),
                            updatedAt: new Date()
                          })
                          .where(eq(schema.paymentAccounts.id, finalAccount.id));

                        const txDate = parsed.date && parsed.date !== "MISSING" ? new Date(parsed.date) : new Date();

                        await db.insert(schema.expenses).values({
                          tenantId,
                          channelId,
                          amount: String(parsed.amount),
                          category: parsed.category,
                          paymentAccountId: finalAccount.id,
                          type: parsed.type || "expense",
                          description: parsed.description,
                          date: txDate,
                          mediaUrl: fileUrl || null,
                          loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          loggedByPhone: contact[0]?.phone || "Unknown",
                        });

                    await db
                      .update(schema.conversations)
                      .set({ aiEnabled: false })
                      .where(eq(schema.conversations.id, conversation[0].id));

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *Receipt Logged Successfully!*\n\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${finalAccount.name}*\n📝 Description: *${parsed.description || "N/A"}*\n📅 Date: *${txDate.toISOString().split("T")[0]}*`
                          }
                        });
                      }
                    }
                    automationHandled = true;
                  }
                } catch (err: any) {
                  console.error("Receipt parsing failed:", err.message);
                }
              }
            } else {
              // 3. Regular text/audio trigger parser (supports expense, income, etc.)
              const triggerKeyword = (expenseConfig?.triggerKeyword || "expense").toLowerCase();
              const retrievalKeyword = (expenseConfig?.retrievalKeyword || "getexpense").toLowerCase();
              const incomeKeyword = (expenseConfig?.incomeKeyword || "income").toLowerCase();
              const cleanContent = content.trim();
              const lowerContent = cleanContent.toLowerCase();

              let isTrigger = lowerContent.startsWith(triggerKeyword);
              let isIncomeTrigger = lowerContent.startsWith(incomeKeyword);
              let isRetrieval = lowerContent.startsWith(retrievalKeyword);
              let isVoiceLog = false;

              // Disable direct audio logs to prevent the bot from being active on voice notes all the time
              if (!isTrigger && !isIncomeTrigger && !isRetrieval && message.type === "audio" && cleanContent.length > 0) {
                isVoiceLog = false;
              }

              if (isTrigger || isIncomeTrigger || isVoiceLog) {
                console.log(`[Expense Tracker] Triggered expense logging via text/voice.`);
                const keywordToStrip = isTrigger ? triggerKeyword : (isIncomeTrigger ? incomeKeyword : "");
                const promptText = keywordToStrip ? cleanContent.substring(keywordToStrip.length).trim() : cleanContent;
                
                const defaultType = isIncomeTrigger ? "deposit" : "expense";

                if (promptText.length === 0) {
                  // Create waiting_for_details session
                  await db.insert(schema.expenseSessions).values({
                    conversationId: conversation[0].id,
                    status: "waiting_for_details",
                    amount: "0.00",
                    category: "General",
                    type: isIncomeTrigger ? "deposit" : "expense"
                  });

                  const waApi = new WhatsAppApiService(channelRow);
                  await waApi.sendDirectMessage({
                    to: message.from,
                    type: "text",
                    text: {
                      body: isIncomeTrigger
                        ? "💰 *Income Tracker*\n\nPlease reply with your income details (e.g., amount, category, payment account, description)."
                        : "💸 *Expense Tracker*\n\nPlease reply with your expense details (e.g., amount, category, payment account, description)."
                    }
                  });
                  automationHandled = true;
                } else {
                  // Parse with AI
                  const parsed = await ExpenseAIService.parseExpense(tenantId, channelId, promptText, defaultType);
                  if (parsed && !parsed.error && parsed.amount > 0) {
                    const matchedAccount = await ExpenseAIService.resolveOrCreatePaymentAccount(tenantId, parsed.accountName);

                    if (matchedAccount) {
                      const currentBalance = parseFloat(matchedAccount.balance || "0");
                      const amountVal = parsed.amount;
                      const newBalance = parsed.type === "deposit" ? currentBalance + amountVal : currentBalance - amountVal;

                      await db
                        .update(schema.paymentAccounts)
                        .set({
                          balance: String(newBalance),
                          updatedAt: new Date()
                        })
                        .where(eq(schema.paymentAccounts.id, matchedAccount.id));

                      // Insert Expense
                      await db.insert(schema.expenses).values({
                        tenantId,
                        channelId,
                        amount: String(parsed.amount),
                        category: parsed.category,
                        paymentAccountId: matchedAccount.id,
                        type: parsed.type || "expense",
                        description: parsed.description,
                        date: new Date(),
                        loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                        loggedByPhone: contact[0]?.phone || "Unknown",
                      });

                    await db
                      .update(schema.conversations)
                      .set({ aiEnabled: false })
                      .where(eq(schema.conversations.id, conversation[0].id));

                      const waApi = new WhatsAppApiService(channelRow);
                      const successTitle = parsed.type === "deposit" ? "Income/Deposit Logged Successfully!" : "Expense Logged Successfully!";
                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `✅ *${successTitle}*\n\n💰 Amount: *${parsed.amount.toFixed(2)}*\n📂 Category: *${parsed.category}*\n💳 Account: *${matchedAccount.name}*\n📝 Description: *${parsed.description || "N/A"}*`
                        }
                      });
                      automationHandled = true;
                    }
                  } else {
                    if (isTrigger || isIncomeTrigger) {
                      const waApi = new WhatsAppApiService(channelRow);
                      const helperFormat = isIncomeTrigger ? "income <amount> <category> <payment_account> <description>" : "expense <amount> <category> <payment_account> <description>";
                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `⚠️ *Failed to parse transaction.*\nReason: ${parsed?.error || "AI could not extract valid amount/category."}\n\nFormat: \`${helperFormat}\``
                        }
                      });
                      automationHandled = true;
                    }
                  }
                }
              } else if (isRetrieval) {
          console.log(`[Expense Tracker] Triggered expense retrieval.`);
          const timeFrame = cleanContent.substring(retrievalKeyword.length).trim().toLowerCase() || "today";

          let startDate = new Date();
          if (timeFrame === "today") {
            startDate.setHours(0, 0, 0, 0);
          } else if (timeFrame === "week") {
            startDate.setDate(startDate.getDate() - 7);
          } else if (timeFrame === "month") {
            startDate.setDate(startDate.getDate() - 30);
          } else if (timeFrame === "year") {
            startDate.setDate(startDate.getDate() - 365);
          } else {
            startDate.setHours(0, 0, 0, 0); // default today
          }

          const expenseLogs = await db
            .select()
            .from(schema.expenses)
            .where(
              and(
                eq(schema.expenses.tenantId, tenantId),
                eq(schema.expenses.channelId, channelId),
                gte(schema.expenses.date, startDate)
              )
            );

          const totalAmount = expenseLogs.reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);

          let summary = `📊 *Expenses Summary (${timeFrame.toUpperCase()})*\n`;
          summary += `───────────────────\n`;
          if (expenseLogs.length === 0) {
            summary += `No expenses found for this period.`;
          } else {
            expenseLogs.forEach((e, idx) => {
              summary += `${idx + 1}. *${parseFloat(e.amount).toFixed(2)}* [${e.category}] - ${e.description || "No description"}\n`;
            });
            summary += `───────────────────\n`;
            summary += `Total spent: *${totalAmount.toFixed(2)}*`;
          }

          const waApi = new WhatsAppApiService(channelRow);
          await waApi.sendDirectMessage({
            to: message.from,
            type: "text",
            text: { body: summary }
          });
          automationHandled = true;
        }
        }
      }
    }
  }
}
    } catch (err: any) {
  console.error(`[Expense Tracker Interceptor] Error logging expense via bot:`, err.message);
}
    }

    return automationHandled;
  }

  // Static helper to execute Reminders & To-Do interceptor
  public static async interceptReminders(
    channelId: string,
    conversation: any[],
    contact: any[],
    message: any,
    content: string,
    isGroupMessage: boolean,
    channelRow: any
  ): Promise<boolean> {
    let automationHandled = false;
    console.log(`🔍 [Reminders Interceptor] Entered for message: "${content}" (Channel: ${channelId})`);
    if (channelId && conversation.length > 0 && !isGroupMessage) {
      try {
        const tenantId = channelRow?.createdBy;
        console.log(`🔍 [Reminders Interceptor] tenantId resolved: ${tenantId}`);
        if (tenantId) {
          const [addon] = await db
            .select()
            .from(schema.addons)
            .where(and(eq(schema.addons.slug, "reminders-module"), eq(schema.addons.isActive, true)))
            .limit(1);

          console.log(`🔍 [Reminders Interceptor] Addon details:`, addon ? `ID=${addon.id}, Slug=${addon.slug}` : "Addon Not Found");
          if (addon) {
            const [subscription] = await db
              .select()
              .from(schema.tenantAddons)
              .where(
                and(
                  eq(schema.tenantAddons.tenantId, tenantId),
                  eq(schema.tenantAddons.addonId, addon.id)
                )
              )
              .limit(1);

            const [user] = await db
              .select()
              .from(schema.users)
              .where(eq(schema.users.id, tenantId))
              .limit(1);

            const isSubscriptionActive = subscription
              ? (subscription.status === "active" || user?.role === "superadmin")
              : (user?.role === "superadmin" ? true : false);

            const purchaseType = subscription?.purchaseType || (user?.role === "superadmin" ? "ai" : "flow");
            console.log(`🔍 [Reminders Interceptor] Subscription info: active=${isSubscriptionActive}, purchaseType=${purchaseType}`);

            if (isSubscriptionActive) {
               const [reminderConfig] = await db
                .select()
                .from(schema.reminderConfigs)
                .where(eq(schema.reminderConfigs.channelId, channelId))
                .limit(1);

              console.log(`🔍 [Reminders Interceptor] Config details: configFound=${!!reminderConfig}, active=${reminderConfig?.isActive}`);
              if (reminderConfig && reminderConfig.isActive) {
                const triggerKeyword = (reminderConfig.triggerKeyword || "remind").toLowerCase();
                const todoKeyword = (reminderConfig.todoKeyword || "todo").toLowerCase();
                const cleanContent = content.trim();
                const lowerContent = cleanContent.toLowerCase();
                const waApi = new WhatsAppApiService(channelRow);

                // Timezone change command
                const isTimezoneCmd = lowerContent === "timezone" || lowerContent.startsWith("timezone ");
                if (isTimezoneCmd) {
                  automationHandled = true;
                  const val = cleanContent.substring(8).trim().toLowerCase();
                  let offset: number | null = null;

                  if (!val) {
                    const currentOffset = await getContactTimezoneOffset(message.from, channelId);
                    const currentLabel = getTimezoneLabel(currentOffset);
                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: { body: `🌐 *Your current timezone:* ${currentLabel}\n\nTo change it, reply with:\n• *timezone KSA* (or *timezone 3*)\n• *timezone India* (or *timezone 5.5*)\n• *timezone UAE* (or *timezone 4*)\n• *timezone -5* (for New York/EST)` }
                    });
                    return true;
                  }

                  if (val === "ksa" || val === "saudi" || val === "ast" || val === "riyadh") {
                    offset = 3;
                  } else if (val === "dubai" || val === "uae" || val === "gst") {
                    offset = 4;
                  } else if (val === "india" || val === "ist" || val === "delhi") {
                    offset = 5.5;
                  } else if (val === "gmt" || val === "utc") {
                    offset = 0;
                  } else {
                    const valClean = val.replace(/utc|gmt/gi, "").replace("+", "").trim();
                    const parsedNum = parseFloat(valClean);
                    if (!isNaN(parsedNum) && parsedNum >= -12 && parsedNum <= 14) {
                      offset = parsedNum;
                    }
                  }

                  if (offset !== null) {
                    const existingContact = contact[0];
                    if (existingContact) {
                      const updatedVars = { ...(existingContact.variables || {}), timezoneOffset: String(offset) };
                      await db
                        .update(schema.contacts)
                        .set({ variables: updatedVars })
                        .where(eq(schema.contacts.id, existingContact.id));

                      const tzLabel = getTimezoneLabel(offset);
                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: { body: `✅ *Timezone updated!* Your timezone is now set to *${tzLabel}*.\n\nAll your future reminders will be processed and notified relative to this timezone.` }
                      });
                      return true;
                    }
                  } else {
                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: { body: `⚠️ *Invalid timezone!* Please type:\n• *timezone KSA* (for UTC+3)\n• *timezone India* (for UTC+5.5)\n• *timezone UAE* (for UTC+4)\n• *timezone <offset>* (e.g. *timezone 3* or *timezone -5*)` }
                    });
                    return true;
                  }
                }

                // 1. Check if there is an active session
                const [activeSession] = await db
                  .select()
                  .from(schema.reminderSessions)
                  .where(eq(schema.reminderSessions.conversationId, conversation[0].id))
                  .limit(1);

                if (activeSession) {
                  automationHandled = true;
                  
                  if (lowerContent === "cancel" || lowerContent === "exit") {
                    await db.delete(schema.reminderSessions).where(eq(schema.reminderSessions.id, activeSession.id));
                    await db
                      .update(schema.conversations)
                      .set({ aiEnabled: false })
                      .where(eq(schema.conversations.id, conversation[0].id));

                    await waApi.sendDirectMessage({
                      to: message.from,
                      type: "text",
                      text: { body: "❌ *Reminder flow cancelled.*" }
                    });
                    return true;
                  }

                  if (purchaseType === "ai") {
                    // AI mode: process the message text or voice note/image via LLM
                    let textToParse = cleanContent;

                    const parsed = await ReminderAIService.parseReminder(tenantId, channelId, textToParse, message.from);
                    if (parsed && !parsed.error && parsed.title && parsed.dueTime) {
                      const dueD = new Date(parsed.dueTime.replace(" ", "T"));
                      
                      await db.insert(schema.reminders).values({
                        tenantId,
                        channelId,
                        contactPhone: message.from,
                        contactName: contact[0]?.name || contact[0]?.phone || "Unknown",
                        title: parsed.title,
                        dueTime: dueD,
                        leadTimeMinutes: parsed.leadTimeMinutes || reminderConfig.defaultLeadTimeMinutes || 15,
                        status: "pending"
                      });

                      await db.delete(schema.reminderSessions).where(eq(schema.reminderSessions.id, activeSession.id));
                      await db
                        .update(schema.conversations)
                        .set({ aiEnabled: false })
                        .where(eq(schema.conversations.id, conversation[0].id));

                      const offset = await getContactTimezoneOffset(message.from, channelId);
                      const localTimeStr = formatLocalTime(dueD, offset);
                      const tzLabel = getTimezoneLabel(offset);

                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `✅ *Reminder Scheduled!*\n\n📝 *Task:* ${parsed.title}\n📅 *Time:* ${localTimeStr}\n🔔 *Alert:* You will be reminded 15m before and at the event time.\n\n🌐 _Tz: ${tzLabel} (reply "timezone KSA" to change)_`
                        }
                      });
                    } else {
                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `⚠️ *Could not extract reminder details.* Please type: *What* and *When* clearly (e.g. "Call dentist tomorrow at 5pm"), or reply *exit* to cancel.`
                        }
                      });
                    }
                  } else {
                    // Flow mode: structured questions
                    if (activeSession.status === "waiting_for_what") {
                      if (!cleanContent) {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: { body: "⚠️ Please enter a valid task description." }
                        });
                        return true;
                      }

                      await db
                        .update(schema.reminderSessions)
                        .set({
                          title: cleanContent,
                          status: "waiting_for_when"
                        })
                        .where(eq(schema.reminderSessions.id, activeSession.id));

                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `⏰ *When to remind? (e.g., Today 10pm or 2pm 01/08)*`
                        }
                      });
                     } else if (activeSession.status === "waiting_for_when") {
                       const combinedText = `Remind me to ${activeSession.title} at ${cleanContent}`;
                       const parsed = await ReminderAIService.parseReminder(tenantId, channelId, combinedText, message.from);

                      if (parsed && !parsed.error && parsed.dueTime) {
                        const dueD = new Date(parsed.dueTime.replace(" ", "T"));
                        
                        await db.insert(schema.reminders).values({
                          tenantId,
                          channelId,
                          contactPhone: message.from,
                          contactName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          title: activeSession.title || "Reminder Task",
                          dueTime: dueD,
                          leadTimeMinutes: reminderConfig.defaultLeadTimeMinutes || 15,
                          status: "pending"
                        });

                        await db.delete(schema.reminderSessions).where(eq(schema.reminderSessions.id, activeSession.id));
                        await db
                          .update(schema.conversations)
                          .set({ aiEnabled: false })
                          .where(eq(schema.conversations.id, conversation[0].id));

                        const offset = await getContactTimezoneOffset(message.from, channelId);
                        const localTimeStr = formatLocalTime(dueD, offset);
                        const tzLabel = getTimezoneLabel(offset);

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *Reminder Scheduled!*\n\n📝 *Task:* ${activeSession.title}\n📅 *Time:* ${localTimeStr}\n🔔 *Alert:* You will be reminded 15m before and at the event time.\n\n🌐 _Tz: ${tzLabel} (reply "timezone KSA" to change)_`
                          }
                        });
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `⚠️ *Could not understand the date/time.* Please reply with a clear format (e.g., *Today 10pm* or *2pm 01/08*).`
                          }
                        });
                      }
                    }
                  }
                } else {
                  // 2. Check for Trigger Keyword
                  const isTrigger = lowerContent.startsWith(triggerKeyword);
                  const isTodoTrigger = lowerContent.startsWith(todoKeyword);

                  if (isTrigger || isTodoTrigger) {
                    automationHandled = true;
                    console.log(`[Reminders Module] Triggered reminder flow.`);

                    const keywordToStrip = isTrigger ? triggerKeyword : todoKeyword;
                    const promptText = cleanContent.substring(keywordToStrip.length).trim();

                    if (promptText.length === 0) {
                      // Create a new session
                      await db.insert(schema.reminderSessions).values({
                        conversationId: conversation[0].id,
                        status: purchaseType === "ai" ? "waiting_for_details" : "waiting_for_what"
                      });

                      // Enable AI messaging context so webhook doesn't override with other templates
                      await db
                        .update(schema.conversations)
                        .set({ aiEnabled: true })
                        .where(eq(schema.conversations.id, conversation[0].id));

                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: purchaseType === "ai"
                            ? `📅 *Reminders & To-Do AI*\n\nPlease reply with what you want to be reminded of and when (e.g., 'call dentist tomorrow at 5pm').`
                            : `📝 *What to remind? (Enter task/event description)*`
                        }
                      });
                    } else {
                      // Direct inline reminder parsing (e.g., "remind call boss at 5pm")
                      const parsed = await ReminderAIService.parseReminder(tenantId, channelId, promptText, message.from);
                      
                      if (parsed && !parsed.error && parsed.title && parsed.dueTime) {
                        const dueD = new Date(parsed.dueTime.replace(" ", "T"));
                        
                        await db.insert(schema.reminders).values({
                          tenantId,
                          channelId,
                          contactPhone: message.from,
                          contactName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          title: parsed.title,
                          dueTime: dueD,
                          leadTimeMinutes: parsed.leadTimeMinutes || reminderConfig.defaultLeadTimeMinutes || 15,
                          status: "pending"
                        });

                        const offset = await getContactTimezoneOffset(message.from, channelId);
                        const localTimeStr = formatLocalTime(dueD, offset);
                        const tzLabel = getTimezoneLabel(offset);

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *Reminder Scheduled!*\n\n📝 *Task:* ${parsed.title}\n📅 *Time:* ${localTimeStr}\n🔔 *Alert:* You will be reminded 15m before and at the event time.\n\n🌐 _Tz: ${tzLabel} (reply "timezone KSA" to change)_`
                          }
                        });
                      } else {
                        // Start session since inline parsing failed
                        await db.insert(schema.reminderSessions).values({
                          conversationId: conversation[0].id,
                          status: purchaseType === "ai" ? "waiting_for_details" : "waiting_for_what"
                        });

                        await db
                          .update(schema.conversations)
                          .set({ aiEnabled: true })
                          .where(eq(schema.conversations.id, conversation[0].id));

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `⚠️ *Could not parse inline reminder.* Starting reminder flow.\n\n${
                              purchaseType === "ai"
                                ? "Please reply with what you want to be reminded of and when (e.g., 'call dentist tomorrow at 5pm')."
                                : "What to remind? (Enter task/event description)"
                            }`
                          }
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`[Reminders Interceptor] Error logging reminder via bot:`, err.message);
      }
    }
    return automationHandled;
  }

  // Static helper to execute AI Support Tickets interceptor for both QR and Cloud API channels
  public static async interceptSupportTickets(
    channelId: string,
    conversation: any[],
    contact: any[],
    message: any,
    content: string,
    isGroupMessage: boolean,
    channelRow: any
  ): Promise<boolean> {
    let automationHandled = false;
    if (channelId && conversation.length > 0 && !isGroupMessage) {
      try {
        const tenantId = channelRow?.createdBy;
        if (tenantId) {
          const [addon] = await db
            .select()
            .from(schema.addons)
            .where(and(eq(schema.addons.slug, "support-tickets"), eq(schema.addons.isActive, true)))
            .limit(1);

          if (addon) {
            const [subscription] = await db
              .select()
              .from(schema.tenantAddons)
              .where(
                and(
                  eq(schema.tenantAddons.tenantId, tenantId),
                  eq(schema.tenantAddons.addonId, addon.id)
                )
              )
              .limit(1);

            const [user] = await db
              .select()
              .from(schema.users)
              .where(eq(schema.users.id, tenantId))
              .limit(1);

            const isSubscriptionActive = subscription
              ? (subscription.status === "active" || user?.role === "superadmin")
              : (user?.role === "superadmin" ? true : false);

            const purchaseType = subscription?.purchaseType || (user?.role === "superadmin" ? "ai" : "flow");

            if (isSubscriptionActive && purchaseType === "ai") {
              const [ticketConfig] = await db
                .select()
                .from(schema.whatsappSupportTicketConfigs)
                .where(eq(schema.whatsappSupportTicketConfigs.channelId, channelId))
                .limit(1);

              if (ticketConfig && ticketConfig.isActive) {
                // Check if there is an active conversational session for this conversation
                const [activeSession] = await db
                  .select()
                  .from(schema.whatsappSupportTicketSessions)
                  .where(eq(schema.whatsappSupportTicketSessions.conversationId, conversation[0].id))
                  .limit(1);

                const waApi = new WhatsAppApiService(channelRow);

                if (activeSession) {
                  const cleanContent = content.trim();

                  if (activeSession.status === "waiting_for_details") {
                    const mediaId = message.image?.id || message.mediaId;
                    if (message.type === "image" && mediaId) {
                      try {
                        const { buffer, mimeType } = await waApi.getMediaBuffer(mediaId);
                        let fileUrl: string | undefined;
                        try {
                          fileUrl = await waApi.fetchMediaUrl(mediaId);
                        } catch (err) {
                          console.error("Failed to fetch media URL:", err);
                        }

                        const parsed = await TicketAIService.parseScreenshotImage(tenantId, channelId, buffer, mimeType);
                        if (parsed && !parsed.error && parsed.subject) {
                          const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
                          
                          await db.insert(schema.whatsappSupportTickets).values({
                            ticketId,
                            tenantId,
                            channelId,
                            subject: parsed.subject,
                            description: parsed.description || "Refer to attached screenshot",
                            category: parsed.category.toLowerCase(),
                            priority: parsed.priority.toLowerCase(),
                            status: "open",
                            mediaUrl: fileUrl || null,
                            loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                            loggedByPhone: contact[0]?.phone || "Unknown",
                          });

                          await db.delete(schema.whatsappSupportTicketSessions).where(eq(schema.whatsappSupportTicketSessions.id, activeSession.id));

                          await db
                            .update(schema.conversations)
                            .set({ aiEnabled: false })
                            .where(eq(schema.conversations.id, conversation[0].id));

                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: {
                              body: `✅ *Support Ticket Logged Successfully (from Image)!*\n\n🎫 Ticket ID: *${ticketId}*\n📌 Subject: *${parsed.subject}*\n📂 Category: *${parsed.category}*\n⚠️ Priority: *${parsed.priority}*`
                            }
                          });

                          // Forward email if config is enabled
                          if (ticketConfig.forwardEnabled && ticketConfig.forwardEmail) {
                            try {
                              const transporter = await getTransporter();
                              const { from: fromHeader } = await getSystemFromAddress("Support Ticket");
                              await transporter.sendMail({
                                from: fromHeader,
                                to: ticketConfig.forwardEmail,
                                subject: `🎫 [Support Ticket] New Ticket Alert: ${ticketId} - ${parsed.subject}`,
                                html: `
                                  <h3>New Support Ticket Logged via WhatsApp (Image Mode)</h3>
                                  <p>Hello,</p>
                                  <p>A new support ticket has been created. Details below:</p>
                                  <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Ticket ID:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${ticketId}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Customer:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${contact[0]?.name || "Unknown"} (${contact[0]?.phone || "Unknown"})</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Subject:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${parsed.subject}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Description:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${parsed.description}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Category:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${parsed.category}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Priority:</td>
                                      <td style="padding:8px; border:1px solid #ddd;">${parsed.priority}</td>
                                    </tr>
                                    ${fileUrl ? `
                                    <tr>
                                      <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Attachment:</td>
                                      <td style="padding:8px; border:1px solid #ddd;"><a href="${fileUrl}">View Screenshot</a></td>
                                    </tr>` : ""}
                                  </table>
                                  <br/>
                                  <p>Best regards,<br/>Linala Team</p>
                                `
                              });
                            } catch (e: any) {
                              console.error("[Support Ticket] Failed to send forward email:", e.message);
                            }
                          }

                          automationHandled = true;
                        } else {
                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: {
                              body: `⚠️ *Failed to parse support request image.*\nReason: ${parsed?.error || "AI could not extract issue details."}\n\nPlease try again or describe the issue in text.`
                            }
                          });
                          automationHandled = true;
                        }
                      } catch (err: any) {
                        console.error("Screenshot support ticket parsing failed:", err.message);
                      }
                    } else {
                      // Parse details via AI
                      const parsed = await TicketAIService.parseTicket(tenantId, channelId, cleanContent);
                      if (parsed && !parsed.error && parsed.subject) {
                        const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

                        await db.insert(schema.whatsappSupportTickets).values({
                          ticketId,
                          tenantId,
                          channelId,
                          subject: parsed.subject,
                          description: parsed.description,
                          category: parsed.category.toLowerCase(),
                          priority: parsed.priority.toLowerCase(),
                          status: "open",
                          loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          loggedByPhone: contact[0]?.phone || "Unknown",
                        });

                        await db.delete(schema.whatsappSupportTicketSessions).where(eq(schema.whatsappSupportTicketSessions.id, activeSession.id));

                        await db
                          .update(schema.conversations)
                          .set({ aiEnabled: false })
                          .where(eq(schema.conversations.id, conversation[0].id));

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *Support Ticket Logged Successfully!*\n\n🎫 Ticket ID: *${ticketId}*\n📌 Subject: *${parsed.subject}*\n📂 Category: *${parsed.category}*\n⚠️ Priority: *${parsed.priority}*\n📝 Description: *${parsed.description || "N/A"}*`
                          }
                        });

                        // Forward email if config is enabled
                        if (ticketConfig.forwardEnabled && ticketConfig.forwardEmail) {
                          try {
                            const transporter = await getTransporter();
                            const { from: fromHeader } = await getSystemFromAddress("Support Ticket");
                            await transporter.sendMail({
                              from: fromHeader,
                              to: ticketConfig.forwardEmail,
                              subject: `🎫 [Support Ticket] New Ticket Alert: ${ticketId} - ${parsed.subject}`,
                              html: `
                                <h3>New Support Ticket Logged via WhatsApp</h3>
                                <p>Hello,</p>
                                <p>A new support ticket has been created. Details below:</p>
                                <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Ticket ID:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${ticketId}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Customer:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${contact[0]?.name || "Unknown"} (${contact[0]?.phone || "Unknown"})</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Subject:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.subject}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Description:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.description}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Category:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.category}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Priority:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.priority}</td>
                                  </tr>
                                </table>
                                <br/>
                                <p>Best regards,<br/>Linala Team</p>
                              `
                            });
                          } catch (e: any) {
                            console.error("[Support Ticket] Failed to send forward email:", e.message);
                          }
                        }

                        automationHandled = true;
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `⚠️ *Failed to parse issue details.*\nReason: ${parsed?.error || "AI could not extract subject/details."}\n\nPlease try again or describe the issue clearly.`
                          }
                        });
                        automationHandled = true;
                      }
                    }
                  }
                } else {
                  // Regular text/audio trigger parser (supports tickets)
                  const triggerKeyword = (ticketConfig?.triggerKeyword || "ticket").toLowerCase();
                  const retrievalKeyword = (ticketConfig?.retrievalKeyword || "getticket").toLowerCase();
                  const cleanContent = content.trim();
                  const lowerContent = cleanContent.toLowerCase();

                  let isTrigger = lowerContent.startsWith(triggerKeyword);
                  let isRetrieval = lowerContent.startsWith(retrievalKeyword);

                  if (isTrigger) {
                    console.log(`[Support Ticket] Triggered ticket logging via text.`);
                    const promptText = cleanContent.substring(triggerKeyword.length).trim();

                    if (promptText.length === 0) {
                      // Create waiting_for_details session
                      await db.insert(schema.whatsappSupportTicketSessions).values({
                        conversationId: conversation[0].id,
                        status: "waiting_for_details"
                      });

                      await waApi.sendDirectMessage({
                        to: message.from,
                        type: "text",
                        text: {
                          body: `🎫 *Support Ticket Bot*\n\nPlease reply describing your issue (e.g. subject, description, category, priority) or attach a screenshot detailing the problem.`
                        }
                      });
                      automationHandled = true;
                    } else {
                      // Parse with AI immediately
                      const parsed = await TicketAIService.parseTicket(tenantId, channelId, promptText);
                      if (parsed && !parsed.error && parsed.subject) {
                        const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

                        await db.insert(schema.whatsappSupportTickets).values({
                          ticketId,
                          tenantId,
                          channelId,
                          subject: parsed.subject,
                          description: parsed.description,
                          category: parsed.category.toLowerCase(),
                          priority: parsed.priority.toLowerCase(),
                          status: "open",
                          loggedByName: contact[0]?.name || contact[0]?.phone || "Unknown",
                          loggedByPhone: contact[0]?.phone || "Unknown",
                        });

                        await db
                          .update(schema.conversations)
                          .set({ aiEnabled: false })
                          .where(eq(schema.conversations.id, conversation[0].id));

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `✅ *Support Ticket Logged Successfully!*\n\n🎫 Ticket ID: *${ticketId}*\n📌 Subject: *${parsed.subject}*\n📂 Category: *${parsed.category}*\n⚠️ Priority: *${parsed.priority}*\n📝 Description: *${parsed.description || "N/A"}*`
                          }
                        });

                        // Forward email if config is enabled
                        if (ticketConfig.forwardEnabled && ticketConfig.forwardEmail) {
                          try {
                            const transporter = await getTransporter();
                            const { from: fromHeader } = await getSystemFromAddress("Support Ticket");
                            await transporter.sendMail({
                              from: fromHeader,
                              to: ticketConfig.forwardEmail,
                              subject: `🎫 [Support Ticket] New Ticket Alert: ${ticketId} - ${parsed.subject}`,
                              html: `
                                <h3>New Support Ticket Logged via WhatsApp</h3>
                                <p>Hello,</p>
                                <p>A new support ticket has been created. Details below:</p>
                                <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Ticket ID:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${ticketId}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Customer:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${contact[0]?.name || "Unknown"} (${contact[0]?.phone || "Unknown"})</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Subject:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.subject}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Description:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.description}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Category:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.category}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Priority:</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${parsed.priority}</td>
                                  </tr>
                                </table>
                                <br/>
                                <p>Best regards,<br/>Linala Team</p>
                              `
                            });
                          } catch (e: any) {
                            console.error("[Support Ticket] Failed to send forward email:", e.message);
                          }
                        }

                        automationHandled = true;
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: {
                            body: `⚠️ *Failed to parse issue details.*\nReason: ${parsed?.error || "AI could not extract subject/details."}\n\nFormat: \`ticket <describe your issue here>\``
                          }
                        });
                        automationHandled = true;
                      }
                    }
                  } else if (isRetrieval) {
                    console.log(`[Support Ticket] Triggered ticket retrieval.`);
                    const targetTicketId = cleanContent.substring(retrievalKeyword.length).trim().toUpperCase();

                    if (targetTicketId) {
                      // Retrieve a specific ticket
                      const [tkt] = await db
                        .select()
                        .from(schema.whatsappSupportTickets)
                        .where(
                          and(
                            eq(schema.whatsappSupportTickets.tenantId, tenantId),
                            eq(schema.whatsappSupportTickets.ticketId, targetTicketId)
                          )
                        )
                        .limit(1);

                      if (tkt) {
                        const statusEmoji = tkt.status === "open" ? "🟢" : (tkt.status === "pending" ? "🟡" : "✅");
                        let body = `🎫 *Support Ticket Details - ${tkt.ticketId}*\n\n`;
                        body += `📌 Subject: *${tkt.subject}*\n`;
                        body += `${statusEmoji} Status: *${tkt.status.toUpperCase()}*\n`;
                        body += `⚠️ Priority: *${tkt.priority.toUpperCase()}*\n`;
                        body += `📂 Category: *${tkt.category.toUpperCase()}*\n`;
                        body += `📝 Description: *${tkt.description || "N/A"}*\n`;
                        body += `👤 Assigned To: *${tkt.assignedTo || "Unassigned"}*\n`;
                        body += `📅 Created: *${tkt.createdAt ? new Date(tkt.createdAt).toLocaleDateString() : "N/A"}*`;

                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: { body }
                        });
                      } else {
                        await waApi.sendDirectMessage({
                          to: message.from,
                          type: "text",
                          text: { body: `⚠️ Ticket *${targetTicketId}* not found.` }
                        });
                      }
                      automationHandled = true;
                    } else {
                      // Retrieve list of tickets for this contact
                      const contactPhone = contact[0]?.phone;
                      if (contactPhone) {
                        const list = await db
                          .select()
                          .from(schema.whatsappSupportTickets)
                          .where(
                            and(
                              eq(schema.whatsappSupportTickets.tenantId, tenantId),
                              eq(schema.whatsappSupportTickets.loggedByPhone, contactPhone)
                            )
                          )
                          .orderBy(desc(schema.whatsappSupportTickets.createdAt))
                          .limit(5);

                        if (list.length > 0) {
                          let body = `🎫 *Your Recent Support Tickets:*\n\n`;
                          for (const tkt of list) {
                            const emoji = tkt.status === "open" ? "🟢" : (tkt.status === "pending" ? "🟡" : "✅");
                            body += `${emoji} *${tkt.ticketId}* - ${tkt.subject} (${tkt.status.toUpperCase()})\n`;
                          }
                          body += `\nTo view details, reply with: \`getticket <ticketId>\``;
                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: { body }
                          });
                        } else {
                          await waApi.sendDirectMessage({
                            to: message.from,
                            type: "text",
                            text: { body: `🎫 You do not have any logged support tickets.` }
                          });
                        }
                      }
                      automationHandled = true;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error("[Support Tickets Interceptor] Error:", err.message);
      }
    }
    return automationHandled;
  }

  public static async handleIncomingMessage(
    phoneNumberId: string,
    message: WebhookMessage,
    profileName?: string | null
  ): Promise<void> {
    try {
      // 1. Look up channel by phoneNumberId first (for proper client/channel scoping)
      const channel = await db
        .select()
        .from(channels)
        .where(eq(channels.phoneNumberId, phoneNumberId))
        .limit(1);

      const channelId = channel.length > 0 ? channel[0].id : null;

      if (channel.length > 0 && channel[0].disableIncomingInbox) {
        console.log(`[WebhookHandler] Incoming messages disabled for channel ${channelId}. Ignoring message.`);
        return;
      }

      if (!channelId) {
        console.warn(`⚠️ No channel found for phoneNumberId: ${phoneNumberId}. Message from ${message.from} will be stored without channel scope.`);
      }

      // 2. Find or create contact scoped to this channel
      let contact;
      if (channelId) {
        const existingContact = await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.channelId, channelId), eq(contacts.phone, message.from)))
          .limit(1);
        contact = existingContact;
      } else {
        const existingContact = await db
          .select()
          .from(contacts)
          .where(eq(contacts.phone, message.from))
          .limit(1);
        contact = existingContact;
      }

      if (contact.length === 0) {
        const displayName = profileName || message.from;
        const isGroup = message.from.endsWith("@g.us");
        const insertData: any = {
          name: displayName,
          phone: message.from,
          lastContact: new Date(),
          source: "whatsapp",
          isGroup,
        };
        if (isGroup) {
          insertData.groups = ["Groups WA"];
        }
        if (channelId) insertData.channelId = channelId;
        if (channel.length > 0 && channel[0].createdBy) insertData.createdBy = channel[0].createdBy;

        const [newContact] = await db
          .insert(contacts)
          .values(insertData)
          .returning();
        contact = [newContact];
      } else {
        const updateData: any = { lastContact: new Date() };
        if (profileName && (contact[0].name === contact[0].phone || contact[0].name === message.from)) {
          updateData.name = profileName;
        }
        await db
          .update(contacts)
          .set(updateData)
          .where(eq(contacts.id, contact[0].id));
        if (updateData.name) {
          contact[0].name = updateData.name;
        }
      }

      // Fetch and update profile picture if not already fetched
      if (channelId && contact.length > 0) {
        const targetContact = contact[0];
        const currentVars = (targetContact.variables as any) || {};
        if (!currentVars.profilePicUrl) {
          Promise.resolve().then(async () => {
            try {
              const { BaileysManager } = await import("./baileys-manager");
              const sock = BaileysManager.getActiveSocket(channelId);
              if (sock) {
                const ppUrl = await sock.profilePictureUrl(targetContact.phone, 'image').catch(() => null);
                if (ppUrl) {
                  await db
                    .update(contacts)
                    .set({
                      variables: {
                        ...currentVars,
                        profilePicUrl: ppUrl
                      }
                    })
                    .where(eq(contacts.id, targetContact.id));
                  console.log(`📸 [Baileys] Successfully fetched and stored profile picture for ${targetContact.phone}`);
                }
              }
            } catch (err) {
              console.error("❌ Failed to fetch profile picture for contact:", err);
            }
          }).catch(console.error);
        }
      }

      // 3. Find or create conversation scoped to this channel
      let conversation;
      if (channelId) {
        conversation = await db
          .select()
          .from(conversations)
          .where(and(eq(conversations.channelId, channelId), eq(conversations.contactId, contact[0].id)))
          .limit(1);
      } else {
        conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.contactId, contact[0].id))
          .limit(1);
      }

      // 4. Parse message content and media
      let content = "";
      let mediaId: string | undefined;
      let mediaMimeType: string | undefined;
      let mediaSha256: string | undefined;
      let metadata: Record<string, any> | undefined;

      switch (message.type) {
        case "text":
          content = message.text?.body || "";
          break;

        case "image":
          content = message.image?.caption || "[Image]";
          mediaId = message.image?.id;
          mediaMimeType = message.image?.mime_type;
          mediaSha256 = message.image?.sha256;
          break;

        case "video":
          content = message.video?.caption || "[Video]";
          mediaId = message.video?.id;
          mediaMimeType = message.video?.mime_type;
          mediaSha256 = message.video?.sha256;
          break;

        case "audio":
          content = "[Audio]";
          mediaId = message.audio?.id;
          mediaMimeType = message.audio?.mime_type;
          mediaSha256 = message.audio?.sha256;
          metadata = { voice: message.audio?.voice || false };
          break;

        case "sticker":
          content = "[Sticker]";
          mediaId = message.sticker?.id;
          mediaMimeType = message.sticker?.mime_type;
          mediaSha256 = message.sticker?.sha256;
          metadata = { animated: message.sticker?.animated || false };
          break;

        case "document":
          content = message.document?.caption || `[Document: ${message.document?.filename || "Unknown"}]`;
          mediaId = message.document?.id;
          mediaMimeType = message.document?.mime_type;
          mediaSha256 = message.document?.sha256;
          metadata = { fileName: message.document?.filename };
          break;

        case "location":
          content = message.location?.name || message.location?.address || "[Location]";
          metadata = {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            locationName: message.location?.name,
            locationAddress: message.location?.address,
            locationUrl: message.location?.url,
          };
          break;

        case "contacts":
          if (message.contacts && message.contacts.length > 0) {
            const names = message.contacts.map(c => c.name.formatted_name).join(", ");
            content = `[Contact: ${names}]`;
            metadata = { sharedContacts: message.contacts };
          } else {
            content = "[Contact]";
          }
          break;

        case "button":
          content = (message as any).button?.text || "[Button reply]";
          metadata = { buttonPayload: (message as any).button?.payload };
          break;

        case "interactive": {
          const interactive = (message as any).interactive;
          if (interactive?.type === "list_reply") {
            content = interactive.list_reply?.title || "[List reply]";
            metadata = { listReplyId: interactive.list_reply?.id, listReplyDescription: interactive.list_reply?.description };
          } else if (interactive?.type === "button_reply") {
            content = interactive.button_reply?.title || "[Button reply]";
            metadata = { buttonReplyId: interactive.button_reply?.id };
          } else if (interactive?.type === "nfm_reply") {
            const rawJson = interactive.nfm_reply?.response_json;
            let parsedPayload: Record<string, any> = {};
            try {
              if (rawJson) {
                parsedPayload = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
              }
            } catch (e) {}

            const formattedFields = Object.entries(parsedPayload)
              .map(([k, v]) => `• *${k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}:* ${Array.isArray(v) ? v.join(", ") : v}`)
              .join("\n");

            content = formattedFields ? `📋 *WhatsApp Flow Form Submitted*\n${formattedFields}` : `📋 [Flow Response Submitted]`;
            metadata = {
              type: "nfm_reply",
              flowResponse: rawJson,
              parsedPayload,
              flowBody: interactive.nfm_reply?.body,
              flowName: interactive.nfm_reply?.name,
            };
          } else {
            content = `[Interactive: ${interactive?.type || "unknown"}]`;
          }
          break;
        }

        case "order":
          content = "[Order received]";
          metadata = { order: (message as any).order };
          break;

        case "system":
          content = (message as any).system?.body || "[System message]";
          metadata = { systemType: (message as any).system?.type, systemIdentity: (message as any).system?.identity };
          break;

        case "referral":
          content = message.text?.body || "[Referral message]";
          metadata = { referral: (message as any).referral };
          break;

        case "reaction": {
          const emoji = (message as any).reaction?.emoji || '';
          const reactedMessageId = (message as any).reaction?.message_id;
          if (reactedMessageId) {
            const reactedMsg = await db.select().from(messages).where(eq(messages.whatsappMessageId, reactedMessageId)).limit(1);
            if (reactedMsg.length > 0) {
              const existingMeta = (reactedMsg[0].metadata as any) || {};
              let reactions = existingMeta.reactions || [];
              if (!emoji) {
                reactions = reactions.filter((r: any) => r.from !== message.from);
              } else {
                reactions = reactions.filter((r: any) => r.from !== message.from);
                reactions.push({ emoji, from: message.from, timestamp: message.timestamp });
              }
              await db.update(messages).set({ metadata: { ...existingMeta, reactions } }).where(eq(messages.id, reactedMsg[0].id));
            }
          }
          return;
        }

        case "edit": {
          const editPayload = (message as any).edit;
          const originalWaId = editPayload?.original_message_id;
          const newText = editPayload?.message?.text?.body || editPayload?.message?.caption || '';
          if (originalWaId && newText) {
            const [originalMsg] = await db.select().from(messages).where(eq(messages.whatsappMessageId, originalWaId)).limit(1);
            if (originalMsg) {
              const existingMeta = (originalMsg.metadata as any) || {};
              await db.update(messages)
                .set({
                  content: newText,
                  metadata: {
                    ...existingMeta,
                    edited: true,
                    editedAt: message.timestamp
                      ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                      : new Date().toISOString(),
                  },
                })
                .where(eq(messages.id, originalMsg.id));

              const io = (global as any).io;
              if (io) {
                io.to(`conversation:${originalMsg.conversationId}`).emit('message_edited', {
                  conversationId: originalMsg.conversationId,
                  messageId: originalMsg.id,
                  content: newText,
                  editedAt: message.timestamp
                    ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                    : new Date().toISOString(),
                });
              }
              console.log(`[Webhook] Edit applied to message ${originalWaId}: "${newText}"`);
            } else {
              console.log(`[Webhook] Edit received but original message not found: ${originalWaId}`);
            }
          }
          return;
        }

        case "location_request":
          content = "[Location request]";
          break;

        case "address":
          content = "[Address message]";
          metadata = { type: "address", address: (message as any).address };
          break;

        case "template":
          content = "[Template message]";
          break;

        case "unsupported":
          if (message.errors && message.errors.length > 0) {
            const err = message.errors[0];
            content = `[Unsupported: ${err.title || "This message type is not supported"}]`;
            metadata = { type: "unsupported", originalType: "unsupported", errorCode: err.code, errorTitle: err.title, errorDetails: err.error_data?.details, rawWebhook: message };
          } else {
            content = "[This message type is not yet supported]";
            metadata = { type: "unsupported", originalType: "unsupported", rawWebhook: message };
          }
          break;

        default:
          content = `[Unsupported: Message type "${message.type}" unknown]`;
          metadata = { type: "unsupported", originalType: message.type, rawWebhook: message };
          break;
      }

      if (message.rawBaileysMessage) {
        if (!metadata) metadata = {};
        metadata.rawBaileysMessage = message.rawBaileysMessage;
      }

      // Intercept audio message for voice-enabled AI takeover nodes
      if (message.type === "audio" && mediaId && conversation.length > 0) {
        try {
          const [pendingExec] = await db
            .select()
            .from(automationExecutions)
            .where(
              and(
                eq(automationExecutions.conversationId, conversation[0].id),
                eq(automationExecutions.status, "paused")
              )
            )
            .limit(1);

          let node: any = null;
          if (pendingExec && pendingExec.currentNodeId) {
            const [foundNode] = await db
              .select()
              .from(automationNodes)
              .where(
                and(
                  eq(automationNodes.automationId, pendingExec.automationId),
                  eq(automationNodes.nodeId, pendingExec.currentNodeId)
                )
              )
              .limit(1);
            node = foundNode;
          }

          let voiceProfileId = null;
          let voiceLanguage = "en-IN";

          const settings = (conversation[0].aiSettings || {}) as any;
          const chanSettings = (channel[0]?.inboxAiSettings || {}) as any;
          const isChannelAiEnabled = channel[0]?.inboxAiSettings && chanSettings.aiEnabled === true;
          const sttEnabled = settings.sttEnabled !== undefined ? settings.sttEnabled : chanSettings.sttEnabled;
 
          // Check for active ecommerce session or ecommerce config on this channel
          const [ecomSession] = await db
            .select()
            .from(schema.ecommerceSessions)
            .where(eq(schema.ecommerceSessions.conversationId, conversation[0].id))
            .limit(1);

          let ecomConfig: any = null;
          if (channel[0]?.id) {
            const [foundConfig] = await db
              .select()
              .from(schema.ecommerceConfigs)
              .where(eq(schema.ecommerceConfigs.channelId, channel[0].id))
              .limit(1);
            ecomConfig = foundConfig;
          }

          if (ecomConfig?.voiceProfileId) {
            voiceProfileId = ecomConfig.voiceProfileId;
            voiceLanguage = ecomConfig.aiVoiceLanguageMode === "auto" ? "unknown" : (voiceLanguage || "ml-IN");
          } else if (settings.voiceProfileId || chanSettings.voiceProfileId) {
            voiceProfileId = settings.voiceProfileId || chanSettings.voiceProfileId;
            voiceLanguage = settings.voiceLanguage || settings.sttLanguage || chanSettings.voiceLanguage || chanSettings.sttLanguage || "en-IN";
          } else if (node && node.type === "ai_agent" && (node.data as any)?.voiceProfileId) {
            const nodeData = node.data as any;
            voiceProfileId = nodeData.voiceProfileId;
            voiceLanguage = nodeData.voiceLanguage || "en-IN";
          }

          if (!voiceProfileId) {
            const firstProfile = await db.query.voiceProfiles.findFirst();
            if (firstProfile) {
              voiceProfileId = firstProfile.id;
              if (firstProfile.languageCode && voiceLanguage === "en-IN") {
                voiceLanguage = firstProfile.languageCode as string;
              }
            }
          }

          let ownerUser: any = null;
          const creatorId = channel[0]?.createdBy;
          if (creatorId) {
            ownerUser = await db.query.users.findFirst({
              where: eq(users.id, creatorId),
            });
          }
          if (!ownerUser) {
            const [defaultUser] = await db
              .select()
              .from(users)
              .where(eq(users.email, "awadnajilp@gmail.com"))
              .limit(1);
            ownerUser = defaultUser;
          }

          const platformAi = await AiBillingService.getPlatformAiConfig();

          const getApiKeyFor = (provName: string) => {
            if (provName === "groq") return ownerUser?.groqApiKey || platformAi.groqApiKey || "";
            if (provName === "elevenlabs") return ownerUser?.elevenlabsApiKey || platformAi.elevenlabsApiKey || "";
            if (provName === "openai") return ownerUser?.openaiApiKey || platformAi.openaiApiKey || "";
            if (provName === "sarvam") return ownerUser?.sarvamApiKey || platformAi.sarvamApiKey || "";
            return "";
          };

          let voiceProfile: any = null;
          if (voiceProfileId) {
            voiceProfile = await db.query.voiceProfiles.findFirst({
              where: eq(voiceProfiles.id, voiceProfileId),
            });
          }

          console.log(`[STT Webhook] Downloading audio note ${mediaId} from WhatsApp...`);
          const waApi = new WhatsAppApiService(channel[0]);
          const { buffer } = await waApi.getMediaBuffer(mediaId);

          let transcriptText = "";

          // 1. Try configured voiceProfile provider if available
          if (voiceProfile) {
            const primaryProvider = voiceProfile.provider || "sarvam";
            const primaryKey = getApiKeyFor(primaryProvider);
            if (primaryKey) {
              try {
                console.log(`[STT Webhook] Transcribing audio via configured primary provider ${primaryProvider}...`);
                const provider = VoiceManager.getProvider(primaryProvider);
                transcriptText = await provider.transcribe(
                  buffer,
                  voiceLanguage || voiceProfile.languageCode || "unknown",
                  { apiKey: primaryKey }
                );
              } catch (primarySttErr: any) {
                console.warn(`[STT Webhook] Primary STT (${primaryProvider}) failed: ${primarySttErr.message}. Trying fallbacks...`);
              }
            }
          }

          // 2. Fallback to Sarvam STT (optimal for Indian languages like Malayalam, Hindi, etc.)
          if (!transcriptText) {
            const sarvamKey = getApiKeyFor("sarvam");
            if (sarvamKey) {
              try {
                console.log("[STT Webhook] Attempting Sarvam STT fallback...");
                const sarvamProvider = VoiceManager.getProvider("sarvam");
                transcriptText = await sarvamProvider.transcribe(
                  buffer,
                  voiceLanguage === "unknown" ? "unknown" : (voiceLanguage || "ml-IN"),
                  { apiKey: sarvamKey }
                );
                console.log(`[STT Webhook] Sarvam STT fallback successful: "${transcriptText}"`);
              } catch (sarvamErr: any) {
                console.warn("[STT Webhook] Sarvam STT fallback failed:", sarvamErr.message);
              }
            }
          }

          // 3. Fallback to Groq Whisper
          if (!transcriptText) {
            const groqKey = getApiKeyFor("groq");
            if (groqKey) {
              try {
                console.log("[STT Webhook] Attempting Groq Whisper fallback...");
                const groqProvider = VoiceManager.getProvider("groq");
                transcriptText = await groqProvider.transcribe(buffer, voiceLanguage, { apiKey: groqKey });
                console.log(`[STT Webhook] Groq Whisper fallback successful: "${transcriptText}"`);
              } catch (groqErr: any) {
                console.warn("[STT Webhook] Groq fallback failed:", groqErr.message);
              }
            }
          }

          // 4. Fallback to OpenAI Whisper
          if (!transcriptText) {
            const openaiKey = getApiKeyFor("openai");
            if (openaiKey) {
              try {
                console.log("[STT Webhook] Attempting OpenAI Whisper fallback...");
                const openaiProvider = VoiceManager.getProvider("openai");
                transcriptText = await openaiProvider.transcribe(buffer, voiceLanguage, { apiKey: openaiKey });
                console.log(`[STT Webhook] OpenAI Whisper fallback successful: "${transcriptText}"`);
              } catch (openaiErr: any) {
                console.warn("[STT Webhook] OpenAI fallback failed:", openaiErr.message);
              }
            }
          }

          if (transcriptText) {
            console.log(`[STT Webhook] Final transcription successful: "${transcriptText}"`);
            content = transcriptText;
          }
        } catch (sttErr) {
          console.error("[STT Webhook] Failed to transcribe voice note:", sttErr);
        }
      }

      let mediaUrl: string | undefined;
      if (mediaId && channel.length > 0) {
        try {
          const waApi = new WhatsAppApiService(channel[0]);
          mediaUrl = await waApi.fetchMediaUrl(mediaId);
        } catch (err) {
          console.error("Failed to fetch media URL in webhook-handler:", err);
        }
      }

      // Check for stop cadence campaign condition (Stp)
      const cleanLowerContent = (content || "").trim().toLowerCase();
      if (channelId && (cleanLowerContent === "stp" || cleanLowerContent === "stop")) {
        try {
          const activeCadenceCampaigns = await db
            .select()
            .from(schema.campaigns)
            .where(
              and(
                eq(schema.campaigns.channelId, channelId),
                eq(schema.campaigns.isCadence, true),
                inArray(schema.campaigns.status, ["active", "sending", "scheduled"])
              )
            );
          
          if (activeCadenceCampaigns.length > 0) {
            console.log(`[Cadence Stop] Found ${activeCadenceCampaigns.length} active cadence campaign(s) for channel ${channelId}. Checking recipients for ${message.from}`);
            for (const cmp of activeCadenceCampaigns) {
              const updatedRecipients = await db
                .update(schema.campaignRecipients)
                .set({
                  status: "stopped",
                  isStopped: true,
                  updatedAt: new Date()
                })
                .where(
                  and(
                    eq(schema.campaignRecipients.campaignId, cmp.id),
                    eq(schema.campaignRecipients.phone, message.from)
                  )
                )
                .returning();
              
              if (updatedRecipients.length > 0) {
                // Delete queued steps in message_queue
                const deletedQueue = await db
                  .delete(schema.messageQueue)
                  .where(
                    and(
                      eq(schema.messageQueue.campaignId, cmp.id),
                      eq(schema.messageQueue.recipientPhone, message.from),
                      eq(schema.messageQueue.status, "queued")
                    )
                  )
                  .returning();
                console.log(`[Cadence Stop] Stopped future steps for ${message.from} in campaign ${cmp.name}. Deleted ${deletedQueue.length} queued messages.`);
              }
            }
          }
        } catch (stopErr) {
          console.error("[Cadence Stop] Error processing stop request:", stopErr);
        }
      }

      // 5. Convert WhatsApp epoch timestamp to Date
      const whatsappTimestamp = message.timestamp
        ? new Date(parseInt(message.timestamp) * 1000)
        : new Date();

      const now = new Date();
      const contactName = contact[0].name || message.from;

      // Check if AI Assistant Profile ignores this message (Personal Conversation Check)
      if (channelId) {
        const aiProfile = await db.query.aiProfiles.findFirst({
          where: and(eq(aiProfiles.channelId, channelId), eq(aiProfiles.enabled, true)),
        });
        if (aiProfile && aiProfile.ignorePersonalConversations) {
          const keywords = aiProfile.personalKeywords || [];
          const lowerMsg = (content || "").toLowerCase();
          const hasKeyword = keywords.some((kw: string) => lowerMsg.includes(kw.toLowerCase()));
          if (hasKeyword) {
            console.log(`🤫 [Webhook] Ignored personal conversation storage & replies due to AI Assistant Profile keywords.`);
            return;
          }
        }
      }

      const isNewConversation = conversation.length === 0;
      // 6. Create or update conversation with all channel-scoped fields
      if (conversation.length === 0) {
        const convInsert: any = {
          contactId: contact[0].id,
          contactPhone: message.from,
          contactName: contactName,
          lastMessageAt: now,
          lastIncomingMessageAt: now,
          lastMessageText: content.length > 200 ? content.substring(0, 200) : content,
          unreadCount: 1,
          status: "open",
          type: "whatsapp",
        };
        if (channelId) convInsert.channelId = channelId;

        const [newConversation] = await db
          .insert(conversations)
          .values(convInsert)
          .returning();
        conversation = [newConversation];
      } else {
        const currentUnread = conversation[0].unreadCount || 0;
        await db
          .update(conversations)
          .set({
            lastMessageAt: now,
            lastIncomingMessageAt: now,
            lastMessageText: content.length > 200 ? content.substring(0, 200) : content,
            contactPhone: message.from,
            contactName: contactName,
            unreadCount: currentUnread + 1,
          })
          .where(eq(conversations.id, conversation[0].id));
      }

      // 7. Insert message with ALL available fields
      const insertValues: any = {
        conversationId: conversation[0].id,
        whatsappMessageId: message.id,
        fromUser: false,
        direction: "inbound",
        content,
        type: message.type,
        messageType: message.type,
        status: "received",
        timestamp: whatsappTimestamp,
      };
      if (mediaId) insertValues.mediaId = mediaId;
      if (mediaUrl) insertValues.mediaUrl = mediaUrl;
      if (mediaMimeType) insertValues.mediaMimeType = mediaMimeType;
      if (mediaSha256) insertValues.mediaSha256 = mediaSha256;
      if (metadata) insertValues.metadata = metadata;

      const [insertedMessage] = await db.insert(messages).values(insertValues).returning();

      // Emit realtime events to update frontend
      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation[0].id, {
          type: "new-message",
          message: insertedMessage,
        });
      }

      console.log(`[${channelId || 'no-channel'}] Received ${message.type} from ${message.from}: ${content.substring(0, 80)}`);

      // 7.5 Track Campaign Reply if contact replied after receiving a campaign message
      const isGroupMessage = contact[0]?.isGroup === true || message.from.endsWith("@g.us");
      if (channelId && !isGroupMessage) {
        try {
            const cleanPhone = message.from.replace(/\D/g, "");
            const matchedRecipients = await db
              .select({
                id: campaignRecipients.id,
                campaignId: campaignRecipients.campaignId,
                status: campaignRecipients.status,
                repliedAt: campaignRecipients.repliedAt,
              })
              .from(campaignRecipients)
              .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
              .where(
                and(
                  eq(campaigns.channelId, channelId),
                  or(
                    eq(campaignRecipients.phone, message.from),
                    eq(campaignRecipients.phone, `+${cleanPhone}`),
                    eq(campaignRecipients.phone, cleanPhone)
                  ),
                  isNull(campaignRecipients.repliedAt)
                )
              )
              .orderBy(desc(campaignRecipients.createdAt))
              .limit(1);

          if (matchedRecipients.length > 0) {
            const recipientEntry = matchedRecipients[0];
            const replyPreview = content.length > 500 ? content.substring(0, 500) : content;

            await db
              .update(campaignRecipients)
              .set({
                status: "replied",
                repliedAt: now,
                replyText: replyPreview,
                updatedAt: now,
              })
              .where(eq(campaignRecipients.id, recipientEntry.id));

            await db
              .update(campaigns)
              .set({
                repliedCount: sql`COALESCE(${campaigns.repliedCount}, 0) + 1`,
                updatedAt: now,
              })
              .where(eq(campaigns.id, recipientEntry.campaignId));

            await db
              .update(messageQueue)
              .set({
                repliedAt: now,
              })
              .where(
                and(
                  eq(messageQueue.campaignId, recipientEntry.campaignId),
                  eq(messageQueue.recipientPhone, message.from),
                  isNull(messageQueue.repliedAt)
                )
              );

            console.log(`📊 [Campaign Reply] Attributed reply from ${message.from} to campaign ${recipientEntry.campaignId}`);
          }
        } catch (repErr) {
          console.error("❌ [Campaign Reply] Failed to track campaign reply:", repErr);
        }
      }

      // 7.6 Capture WhatsApp Flow Submission Response
      if (message.type === "interactive" && (message as any).interactive?.type === "nfm_reply") {
        try {
          const rawJson = (message as any).interactive?.nfm_reply?.response_json;
          let parsedPayload: Record<string, any> = {};
          if (rawJson) {
            parsedPayload = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
          }

          const tenantId = channel[0]?.createdBy;
          if (tenantId) {
            const [matchedFlow] = await db
              .select()
              .from(schema.whatsappFlows)
              .where(
                and(
                  eq(schema.whatsappFlows.tenantId, tenantId),
                  eq(schema.whatsappFlows.channelId, channelId)
                )
              )
              .orderBy(desc(schema.whatsappFlows.updatedAt))
              .limit(1);

            await db.insert(schema.whatsappFlowResponses).values({
              flowId: matchedFlow?.id || null,
              metaFlowId: matchedFlow?.flowId || null,
              channelId,
              tenantId,
              conversationId: conversation[0]?.id || null,
              contactId: contact[0]?.id || null,
              contactPhone: message.from,
              contactName: contactName,
              responsePayload: parsedPayload,
              rawMessageId: message.id,
            });

            // Auto-save form fields to Contact Variables
            if (matchedFlow?.autoSaveContactFields !== false && contact.length > 0) {
              const currentVars = (contact[0].variables || {}) as Record<string, any>;
              const updatedVars = { ...currentVars, ...parsedPayload };
              
              const contactUpdate: any = {
                variables: updatedVars,
                updatedAt: new Date(),
              };

              if (parsedPayload.full_name && typeof parsedPayload.full_name === "string" && !contact[0].name) {
                contactUpdate.name = parsedPayload.full_name.trim();
              }
              if (parsedPayload.work_email || parsedPayload.email) {
                const emailVal = (parsedPayload.work_email || parsedPayload.email);
                if (typeof emailVal === "string") contactUpdate.email = emailVal.trim();
              }

              await db.update(contacts).set(contactUpdate).where(eq(contacts.id, contact[0].id));
            }
          }
        } catch (flowRespErr) {
          console.warn("[WebhookHandler] Failed to record WhatsApp Flow response:", flowRespErr);
        }
      }

      // 7.7 WhatsApp Flow Trigger Keyword Autoresponder
      if (channelId && !isGroupMessage && message.type === "text" && content) {
        try {
          const tenantId = channel[0]?.createdBy;
          const cleanText = content.trim().toLowerCase();
          const activeFlows = await db
            .select()
            .from(schema.whatsappFlows)
            .where(
              tenantId
                ? or(
                    eq(schema.whatsappFlows.channelId, channelId),
                    eq(schema.whatsappFlows.tenantId, tenantId)
                  )
                : eq(schema.whatsappFlows.channelId, channelId)
            );

          const matchedFlow = activeFlows.find((f: any) => {
            const kws = (f.triggerKeywords || []) as string[];
            return kws.some((kw: string) => {
              const cleanKw = (kw || "").trim().toLowerCase();
              return cleanKw && (cleanText === cleanKw || cleanText.includes(cleanKw) || cleanText.startsWith(cleanKw + " "));
            });
          });

          if (matchedFlow) {
            console.log(`🌊 [WhatsApp Flow Trigger] Triggering flow "${matchedFlow.name}" for ${message.from}`);
            await WhatsappFlowsService.sendFlowMessage(channelId, message.from, matchedFlow);
          }
        } catch (flowTriggerErr: any) {
          console.warn("[WebhookHandler] Failed to process WhatsApp Flow keyword trigger:", flowTriggerErr?.message || flowTriggerErr);
        }
      }

      // 8. Send notification to channel owner and team
      if (!isGroupMessage) {
        try {
          if (channel.length > 0 && channel[0].createdBy) {
            const ownerId = channel[0].createdBy;
            const ownerAndTeam = await db
              .select()
              .from(users)
              .where(eq(users.id, ownerId));
            const teamMembers = await db
              .select()
              .from(users)
              .where(eq(users.createdBy, ownerId));
            const allUsers = [...ownerAndTeam, ...teamMembers];
            const targetUserIds = [...new Set(allUsers.map((u) => u.id))];

            if (targetUserIds.length > 0) {
              const messagePreview = content.length > 100 ? content.substring(0, 100) + "..." : content;

              await triggerThrottledNotification({
                contactName,
                contactPhone: message.from,
                channelName: channel[0].name || channel[0].phoneNumber || "Unknown",
                messagePreview,
                conversationId: conversation[0].id,
              }, targetUserIds, channel[0].id);
            }
          }
        } catch (notifError) {
          console.error("Error sending new message notification:", notifError);
        }
      }

      let automationHandled = false;

      // ==================== EXPENSE TRACKER INTERCEPTOR ====================
      automationHandled = await WebhookHandler.interceptExpenseTracker(
        channelId,
        conversation,
        contact,
        message,
        content,
        isGroupMessage,
        channel[0]
      );

      // ==================== SUPPORT TICKETS INTERCEPTOR ====================
      if (!automationHandled) {
        automationHandled = await WebhookHandler.interceptSupportTickets(
          channelId,
          conversation,
          contact,
          message,
          content,
          isGroupMessage,
          channel[0]
        );
      }

      // ==================== REMINDERS MODULE INTERCEPTOR ====================
      if (!automationHandled) {
        automationHandled = await WebhookHandler.interceptReminders(
          channelId,
          conversation,
          contact,
          message,
          content,
          isGroupMessage,
          channel[0]
        );
      }

      // ==================== ECOMMERCE INTERCEPTOR ====================
      if (!automationHandled) {
        automationHandled = await EcommerceService.interceptEcommerce(
          channelId,
          conversation,
          contact,
          message,
          content,
          isGroupMessage,
          channel[0]
        );
      }

      // 8.5 Automations (run first — takes priority over AI)
      if (!isGroupMessage && !automationHandled) {
        try {
          if (channelId) {
            const hasPendingExecution =
              await triggerService.getExecutionService().hasPendingExecutionAsync(conversation[0].id);

            if (hasPendingExecution) {
              let interactiveData: any = null;
              if (message.type === "interactive") {
                const interactive = (message as any).interactive;
                interactiveData = {
                  type: interactive?.type,
                  buttonReply: metadata?.buttonReplyId ? { id: metadata.buttonReplyId, title: content } : null,
                  listReply: metadata?.listReplyId ? { id: metadata.listReplyId, title: content } : null,
                  flowReply: metadata?.flowResponse ? { response_json: metadata.flowResponse } : null,
                };
              } else if (message.type === "button") {
                interactiveData = {
                  type: "button_reply",
                  buttonReply: {
                    id: metadata?.buttonPayload || content,
                    title: content,
                  },
                };
              }

              const result = await triggerService.getExecutionService().handleUserResponse(
                conversation[0].id,
                content,
                interactiveData,
                message
              );

              if (result && result.success) {
                const io = (global as any).io;
                if (io) {
                  io.to(`conversation:${conversation[0].id}`).emit("automation-resumed", {
                    type: "automation-resumed",
                    data: result,
                  });
                  io.to(`conversation_${conversation[0].id}`).emit("automation-resumed", {
                    type: "automation-resumed",
                    data: result,
                  });
                }
                automationHandled = true;
              }
            }

            if (!automationHandled) {
              if (isNewConversation) {
                automationHandled = await triggerService.handleNewConversation(
                  conversation[0].id,
                  channelId,
                  contact[0]?.id
                );
              }
              
              // If it was a new conversation but no "new_conversation" flow was triggered,
              // or if it's an existing conversation, try triggering "message_received" flows!
              if (!automationHandled) {
                let interactiveData: any = null;
                if (message.type === "interactive") {
                  const interactive = (message as any).interactive;
                  interactiveData = {
                    type: interactive?.type,
                    buttonReply: metadata?.buttonReplyId ? { id: metadata.buttonReplyId, title: content } : null,
                    listReply: metadata?.listReplyId ? { id: metadata.listReplyId, title: content } : null,
                    flowReply: metadata?.flowResponse ? { response_json: metadata.flowResponse } : null,
                  };
                } else if (message.type === "button") {
                  interactiveData = {
                    type: "button_reply",
                    buttonReply: {
                      id: metadata?.buttonPayload || content,
                      title: content,
                    },
                  };
                }

                automationHandled = await triggerService.handleMessageReceived(
                  conversation[0].id,
                  {
                    content,
                    text: content,
                    body: content,
                    type: message.type,
                    from: message.from,
                    whatsappMessageId: message.id,
                    timestamp: message.timestamp,
                    interactive: interactiveData,
                  },
                  channelId,
                  contact[0]?.id
                );
              }
            }
          }
        } catch (autoErr) {
          console.error("❌ Automation execution error (non-blocking) in Baileys webhook handler:", autoErr);
          const io = (global as any).io;
          if (io) {
            io.to(`conversation:${conversation[0].id}`).emit("automation-error", {
              type: "automation-error",
              error: autoErr instanceof Error ? autoErr.message : String(autoErr),
            });
            io.to(`conversation_${conversation[0].id}`).emit("automation-error", {
              type: "automation-error",
              error: autoErr instanceof Error ? autoErr.message : String(autoErr),
            });
          }
        }

        // 8.5 Global Account-Level AI Assistant Profile Takeover
        let isChannelAiEnabled = channel[0]?.inboxAiSettings && (channel[0].inboxAiSettings as any).aiEnabled === true;
        if (channelId) {
          const activeSettings = await db
            .select()
            .from(aiSettings)
            .where(and(eq(aiSettings.channelId, channelId), eq(aiSettings.isActive, true)))
            .limit(1);
          if (activeSettings.length > 0) {
            isChannelAiEnabled = true;
          }
        }
        const isAiActive = conversation[0].aiEnabled || isChannelAiEnabled;

        if (!automationHandled && channelId && content && isAiActive) {
          try {
            const { AiAssistantProfileService } = await import("./ai-assistant-profile.service");
            const handled = await AiAssistantProfileService.processIncomingMessage(
              channelId,
              contact[0].id,
              conversation[0].id,
              content,
              message.type === "audio" || message.type === "voice"
            );
            if (handled) {
              console.log(`🤖 [Webhook] AI Assistant Profile handled reply/action for conversation: ${conversation[0].id}`);
              automationHandled = true;
            }
          } catch (aiProfileErr) {
            console.error("❌ [Webhook] Error running AI Assistant Profile:", aiProfileErr);
          }
        }

        // 8.6 Manual Inbox AI Agent Takeover (if active)
        if (!automationHandled && (conversation[0].aiEnabled || isChannelAiEnabled)) {
          try {
            const executionService = triggerService.getExecutionService();
            const aiHandled = await executionService.triggerInboxAiTakeover(
              conversation[0].id,
              channelId || "",
              contact[0].id,
              content,
              conversation[0].lastIncomingMessageAt ? new Date(conversation[0].lastIncomingMessageAt) : null
            );
            if (aiHandled) {
              console.log(`[Webhook] Inbox AI Takeover handled reply for conversation: ${conversation[0].id}`);
              automationHandled = true;
            }
          } catch (aiErr) {
            console.error("[Webhook] Error running Inbox AI Takeover:", aiErr);
          }
        }

        // 9. AI Auto-Reply for WhatsApp incoming messages
        try {
          if (!automationHandled && channelId && message.type === "text" && content) {
            await this.handleAIAutoReply(
              channelId,
              channel[0],
              conversation[0],
              contact[0],
              content,
              message.from
            );
          }
        } catch (aiError) {
          console.error("AI auto-reply error (non-blocking):", aiError);
        }
      }
    } catch (error) {
      console.error("Error handling incoming message:", error);
      throw error;
    }
  }

  private static async handleAIAutoReply(
    channelId: string,
    channelData: any,
    conversation: any,
    contactData: any,
    messageContent: string,
    senderPhone: string
  ): Promise<void> {
    if (conversation.status === "assigned" && conversation.assignedTo) {
      console.log(`[AI] Skipping auto-reply - conversation already assigned to agent`);
      return;
    }

    const aiSetting = await db
      .select()
      .from(aiSettings)
      .where(and(eq(aiSettings.channelId, channelId), eq(aiSettings.isActive, true)))
      .limit(1);

    const activeAI = aiSetting?.[0];
    if (!activeAI || !activeAI.apiKey) {
      return;
    }

    let triggerWords: string[] = [];
    if (Array.isArray(activeAI.words)) {
      triggerWords = activeAI.words;
    } else if (typeof activeAI.words === "string") {
      try { triggerWords = JSON.parse(activeAI.words); } catch { triggerWords = []; }
    }

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id));

    const hasBotReplied = existingMessages.some(
      (m: any) => m.direction === "outbound" && m.fromType === "bot"
    );

    if (triggerWords.length > 0) {
      const msgLower = messageContent.toLowerCase().trim();
      const hasMatch = triggerWords.some((word: string) =>
        msgLower.includes(word.toLowerCase().trim())
      );
      if (!hasMatch) {
        console.log(`[AI] Skipping auto-reply for channel ${channelId} - trigger word not matched`);
        return;
      }
    }

    const channelSites = await db
      .select()
      .from(sites)
      .where(eq(sites.channelId, channelId))
      .limit(1);

    let site = channelSites[0];
    if (!site) {
      const [newSite] = await db
        .insert(sites)
        .values({
          name: channelData?.name || "Default Site",
          domain: "localhost",
          channelId: channelId,
          widgetCode: `whatsapp-${channelId}`,
          widgetEnabled: true,
          widgetConfig: {
            systemPrompt: `You are a helpful customer support AI assistant for ${channelData?.name || 'our company'}. Answer questions using the provided knowledge base.`,
            escalationRules: {
              enabled: true,
              maxAttempts: 3,
              escalationMessage: "I'm transferring you to a human agent who can better assist you.",
            }
          },
          aiTrainingConfig: {
            model: "gpt-4o-mini",
            temperature: "0.7",
            maxTokens: "500",
          }
        })
        .returning();
      site = newSite;
      console.log(`[Site] Auto-created site ${site.id} for channel ${channelId} during AI reply processing`);
    }

    const siteId = site?.id || "";

    const conversationHistory = existingMessages
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-11, -1) // gets the last 10 messages before the current one
      .map((msg: any) => ({
        role: msg.direction === "inbound" ? "user" as const : "assistant" as const,
        content: msg.content,
      }));

    let trainingContext = "";
    try {
      if (siteId) {
        const trainingResults = await searchTrainingData(siteId, channelId, messageContent);
        if (trainingResults.chunks.length > 0) {
          trainingContext += "\n\n--- RELEVANT KNOWLEDGE BASE & TRAINING DATA ---\n";
          trainingContext += trainingResults.chunks.join("\n\n");
        }
        if (trainingResults.qaPairs.length > 0) {
          trainingContext += "\n\n--- RELEVANT FAQ PAIRS ---\n";
          for (const qa of trainingResults.qaPairs) {
            trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
          }
        }
      }
    } catch (err) {
      console.warn("[AI] Training data search failed:", err);
    }

    const unansweredCount = existingMessages.filter((m: any) =>
      m.direction === "outbound" && m.fromType === "bot" &&
      (m.content.includes("I don't have") || m.content.includes("I'm not sure") || m.content.includes("I cannot find"))
    ).length;

    const widgetCfg = (site?.widgetConfig as any) || {};
    const escalationConfig = widgetCfg.escalationRules || {};
    const maxAttempts = escalationConfig.maxAttempts || 3;

    const siteName = site?.name || channelData?.name || "our company";
    const basePrompt = widgetCfg.systemPrompt ||
      `You are a helpful, friendly customer support assistant for ${siteName}. Answer questions using the provided facts in the knowledge base. Be conversational and helpful. Keep responses concise for WhatsApp (under 300 words). If you don't know the answer, be honest about it.
CRITICAL LANGUAGE RULE: Understand Manglish (Malayalam written in English/Latin letters, e.g. "ithinte price ethra?", "evideya sthalam?") as MALAYALAM language. Always respond in natural, clear MALAYALAM SCRIPT (മലയാളം). NEVER reply in English to a Manglish or Malayalam query! If in Malayalam script (മലയാളം), reply in Malayalam script. If in Hinglish, reply in Hindi script. If in Arabic, reply in Arabic. If in English, reply in English.`;

    const escalationInstruction = `\n\nCRITICAL INSTRUCTIONS:
- You are strictly restricted to only answering questions using the facts provided in the "RELEVANT KNOWLEDGE BASE & TRAINING DATA" or "RELEVANT FAQ PAIRS" sections above.
- If the answer to the user's message is not explicitly found in the provided knowledge base, or if the user asks a general question, or if the message is a greeting/typo/meaningless character, you MUST start your response with exactly: "[ESCALATE_TO_AGENT]" and then explain politely that you are transferring them to a human assistant.
- Do NOT use your general pre-trained knowledge to answer questions that are not covered in the knowledge base.
- When escalating, you MUST include the text "[ESCALATE_TO_AGENT]" at the very beginning of your response.
${unansweredCount >= maxAttempts - 1 ? `- The user has had ${unansweredCount} unanswered questions. If you cannot answer this one confidently, you MUST escalate with "[ESCALATE_TO_AGENT]".` : ""}`;

    const systemPrompt = basePrompt + trainingContext + escalationInstruction;

    const aiClient = new OpenAI({
      apiKey: activeAI.apiKey,
      baseURL: activeAI.endpoint || "https://api.openai.com/v1",
    });

    const finalModel = activeAI.model || "gpt-4o-mini";
    const finalTemp = parseFloat(activeAI.temperature || "0.7");
    const finalMaxTokens = parseInt(activeAI.maxTokens || "500");

    try {
      let completion;
      try {
        completion = await aiClient.chat.completions.create({
          model: finalModel,
          messages: [
            { role: "system", content: systemPrompt.substring(0, 128000) },
            ...conversationHistory,
            { role: "user", content: messageContent },
          ],
          temperature: finalTemp,
          max_tokens: finalMaxTokens,
        });
      } catch (err: any) {
        console.warn("[AI] Primary AI provider failed, trying global fallback key...", err.message || err);
        if (process.env.OPENAI_API_KEY && activeAI.apiKey !== process.env.OPENAI_API_KEY) {
          const fallbackClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: "https://api.openai.com/v1",
          });
          completion = await fallbackClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt.substring(0, 128000) },
              ...conversationHistory,
              { role: "user", content: messageContent },
            ],
            temperature: finalTemp,
            max_tokens: finalMaxTokens,
          });
        } else {
          throw err;
        }
      }

      let aiResponse = completion.choices?.[0]?.message?.content || "";
      if (!aiResponse.trim()) return;

      let escalated = false;
      if (aiResponse.includes("[ESCALATE_TO_AGENT]")) {
        aiResponse = aiResponse.replace(/\[ESCALATE_TO_AGENT\]/g, "").trim();
        escalated = true;
      }

      if (escalated) {
        let assignedAgent: any = null;

        const teamMembers = widgetCfg.teamMembers || [];
        let validMembers = teamMembers.filter((m: any) => m.userId);

        if (validMembers.length === 0 && channelData?.createdBy) {
          const ownerAndTeam = await db
            .select({ id: users.id, name: users.username })
            .from(users)
            .where(eq(users.id, channelData.createdBy));
          const teamUsers = await db
            .select({ id: users.id, name: users.username })
            .from(users)
            .where(eq(users.createdBy, channelData.createdBy));
          const allAgents = [...ownerAndTeam, ...teamUsers];
          validMembers = allAgents.map(u => ({ userId: u.id, name: u.name }));
        }

        if (validMembers.length > 0) {
          assignedAgent = validMembers[Math.floor(Math.random() * validMembers.length)];
          await db
            .update(conversations)
            .set({ status: "assigned", assignedTo: assignedAgent.userId, updatedAt: new Date() })
            .where(eq(conversations.id, conversation.id));

          if (!aiResponse.toLowerCase().includes("transfer") && !aiResponse.toLowerCase().includes("connect")) {
            aiResponse += `\n\nI'm transferring you to ${assignedAgent.name || 'a support agent'} who will be able to help you better.`;
          }

          console.log(`[AI] Escalated WhatsApp conversation ${conversation.id} to agent ${assignedAgent.name}`);
        } else {
          await db
            .update(conversations)
            .set({ status: "pending", updatedAt: new Date() })
            .where(eq(conversations.id, conversation.id));

          if (!aiResponse.toLowerCase().includes("transfer") && !aiResponse.toLowerCase().includes("connect")) {
            aiResponse += "\n\nI'm transferring you to a human agent. Someone will get back to you shortly.";
          }
        }
      }

      const whatsappApi = new WhatsAppApiService(channelData);
      const sendResult = await whatsappApi.sendTextMessage(senderPhone, aiResponse);

      const whatsappMessageId = sendResult?.messages?.[0]?.id || null;

      const [insertedAiMessage] = await db.insert(messages).values({
        conversationId: conversation.id,
        whatsappMessageId,
        fromUser: false,
        direction: "outbound",
        content: aiResponse,
        type: "text",
        messageType: "text",
        fromType: "bot",
        status: "sent",
        timestamp: new Date(),
      }).returning();

      // Emit realtime events to update frontend
      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: insertedAiMessage,
        });
      }

      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessageText: aiResponse.substring(0, 200),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));

      const io = (global as any).io;
      if (io) {
        io.to(`channel:${channelId}`).emit("conversation_updated", {
          conversationId: conversation.id,
        });
      }

      console.log(`[AI] Auto-replied to WhatsApp message from ${senderPhone} in conversation ${conversation.id}`);
    } catch (error: any) {
      console.error("[AI] Failed to generate/send auto-reply:", error.message);

      let fallbackMembers: any[] = [];
      const teamMembers = widgetCfg.teamMembers || [];
      fallbackMembers = teamMembers.filter((m: any) => m.userId);

      if (fallbackMembers.length === 0 && channelData?.createdBy) {
        const ownerAndTeam = await db
          .select({ id: users.id, name: users.username })
          .from(users)
          .where(eq(users.id, channelData.createdBy));
        const teamUsers = await db
          .select({ id: users.id, name: users.username })
          .from(users)
          .where(eq(users.createdBy, channelData.createdBy));
        fallbackMembers = [...ownerAndTeam, ...teamUsers].map(u => ({ userId: u.id, name: u.name }));
      }

      if (fallbackMembers.length > 0) {
        const randomAgent = fallbackMembers[Math.floor(Math.random() * fallbackMembers.length)];
        await db
          .update(conversations)
          .set({ status: "assigned", assignedTo: randomAgent.userId, updatedAt: new Date() })
          .where(eq(conversations.id, conversation.id));
        console.log(`[AI] AI failed, assigned conversation to agent ${randomAgent.name}`);
      } else {
        await db
          .update(conversations)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(conversations.id, conversation.id));
      }
    }
  }

  // Handle message status updates
  public static async handleStatusUpdate(status: WebhookStatus): Promise<void> {
    try {
      // Update message status in messages table
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.whatsappMessageId, status.id))
        .limit(1);

      if (message) {
        const updateData: any = {
          status: status.status === "failed" ? "failed" : status.status,
          updatedAt: new Date(),
        };

        if (status.status === "delivered") {
          updateData.deliveredAt = new Date();
        } else if (status.status === "read") {
          updateData.readAt = new Date();
        } else if (status.status === "failed" && status.errors?.[0]) {
          updateData.errorCode = status.errors[0].code.toString();
          updateData.errorMessage = status.errors[0].message;
        }

        await db
          .update(messages)
          .set(updateData)
          .where(eq(messages.id, message.id));

        console.log(`Message ${status.id} status updated to ${status.status}`);
      }

      // Also check message queue for campaign messages
      const [queueItem] = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.whatsappMessageId, status.id))
        .limit(1);

      if (queueItem) {
        const updateData: any = {
          status: status.status === "failed" ? "failed" : status.status,
        };

        if (status.status === "delivered") {
          updateData.deliveredAt = new Date();
        } else if (status.status === "read") {
          updateData.readAt = new Date();
        } else if (status.status === "failed" && status.errors?.[0]) {
          updateData.errorCode = status.errors[0].code.toString();
          updateData.errorMessage = status.errors[0].message;
        }

        await db
          .update(messageQueue)
          .set(updateData)
          .where(eq(messageQueue.id, queueItem.id));

        // Update campaign statistics if this is part of a campaign
        if (queueItem.campaignId) {
          await this.updateCampaignStats(queueItem.campaignId, status.status);
        }
      }
    } catch (error) {
      console.error("Error handling status update:", error);
      throw error;
    }
  }

  // Update campaign statistics
  private static async updateCampaignStats(
    campaignId: string,
    status: string
  ): Promise<void> {
    const incrementField = {
      delivered: "deliveredCount",
      read: "readCount",
      failed: "failedCount",
    }[status];

    if (incrementField) {
      await db.execute(
        sql`UPDATE campaigns 
            SET ${sql.identifier(incrementField)} = ${sql.identifier(incrementField)} + 1 
            WHERE id = ${campaignId}`
      );
    }
  }

  // Handle template status updates
  static async handleTemplateStatusUpdate(value: any): Promise<void> {
    try {
      const { message_template_id, message_template_name, event, reason } = value;

      console.log(
        `Template ${message_template_name} status changed to ${event}`,
        reason ? `Reason: ${reason}` : ""
      );

      // Map WhatsApp event status to our template status
      let status: string;
      switch (event) {
        case "APPROVED":
          status = "approved";
          break;
        case "REJECTED":
          status = "rejected";
          break;
        case "PENDING":
          status = "pending";
          break;
        case "DISABLED":
          status = "disabled";
          break;
        default:
          console.warn(`Unknown template status event: ${event}`);
          return;
      }

      // Update template status in database
      const updatedTemplates = await db
        .update(templates)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(templates.whatsappTemplateId, message_template_id))
        .returning();

      const updatedTemplate = updatedTemplates[0];
      let templateRecord = updatedTemplate;
      
      if (!templateRecord) {
        const updatedByName = await db
          .update(templates)
          .set({ 
            status,
            updatedAt: new Date()
          })
          .where(eq(templates.name, message_template_name))
          .returning();
          
        if (updatedByName.length === 0) {
          console.warn(`Template not found for update: ${message_template_name} (${message_template_id})`);
        } else {
          templateRecord = updatedByName[0];
        }
      }

      if (templateRecord && (event === "APPROVED" || event === "REJECTED")) {
        try {
          if (!templateRecord.channelId) {
            console.warn("Template channelId is null, cannot send status notification");
            return;
          }
          const channel = await db.select().from(channels).where(eq(channels.id, templateRecord.channelId)).limit(1);
          const channelName = channel[0]?.name || "Unknown";
          const eventType = event === "APPROVED" ? NOTIFICATION_EVENTS.TEMPLATE_APPROVED : NOTIFICATION_EVENTS.TEMPLATE_REJECTED;
          const ownerId = channel[0]?.createdBy;
          let targetUserIds: string[] = [];
          if (ownerId) {
            const ownerAndTeam = await db.select().from(users).where(eq(users.id, ownerId));
            const teamMembers = await db.select().from(users).where(eq(users.createdBy, ownerId));
            const allUsers = [...ownerAndTeam, ...teamMembers];
            targetUserIds = [...new Set(allUsers.map((u: any) => u.id))];
          }
          
          if (targetUserIds.length > 0) {
            await triggerNotification(eventType, {
              templateName: message_template_name,
              templateCategory: templateRecord.category || "N/A",
              templateLanguage: templateRecord.language || "en",
              rejectionReason: reason || "No reason provided",
              channelName,
            }, targetUserIds, templateRecord.channelId || undefined);
          }
        } catch (notifError) {
          console.error("Error sending template status notification:", notifError);
        }
      }
    } catch (error) {
      console.error("Error handling template status update:", error);
      throw error;
    }
  }

  private static async handleAccountUpdate(wabaId: string, value: any): Promise<void> {
    try {
      console.log("[Webhook] account_update received:", JSON.stringify(value, null, 2));

      const phoneNumberId = value.phone_number_id;
      const event = value.event;

      if (!phoneNumberId) {
        console.warn("[Webhook] account_update missing phone_number_id");
        return;
      }

      const channelRows = await db
        .select()
        .from(channels)
        .where(eq(channels.phoneNumberId, phoneNumberId))
        .limit(1);

      if (channelRows.length === 0) {
        console.warn(`[Webhook] No channel found for phone_number_id: ${phoneNumberId}`);
        return;
      }

      const channel = channelRows[0];

      if (event === "VERIFIED_ACCOUNT" || event === "PHONE_NUMBER_NAME_UPDATE") {
        const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
        const fields = 'verified_name,name_status,new_name_status';
        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=${fields}`;
        const response = await fetch(`${url}`, {
          headers: { 'Authorization': `Bearer ${channel.accessToken}` }
        });

        if (response.ok) {
          const data: any = await response.json();
          const healthDetails = {
            ...(channel.healthDetails as Record<string, any> || {}),
            verified_name: typeof data.verified_name === 'string' ? data.verified_name : (channel.healthDetails as any)?.verified_name || '',
            name_status: data.name_status || 'UNKNOWN',
            new_name_status: data.new_name_status || undefined,
          };

          await db.update(channels)
            .set({ healthDetails })
            .where(eq(channels.id, channel.id));

          console.log(`[Webhook] Display name updated for channel ${channel.id}: verified_name=${data.verified_name}, name_status=${data.name_status}`);

          try {
            const { io } = await import('../socket');
            if (io) {
              io.to(`channel:${channel.id}`).emit('display_name_update', {
                channelId: channel.id,
                verified_name: data.verified_name || '',
                name_status: data.name_status || 'UNKNOWN',
                new_name_status: data.new_name_status || null,
              });

              if (channel.createdBy) {
                io.to(`user:${channel.createdBy}`).emit('display_name_update', {
                  channelId: channel.id,
                  verified_name: data.verified_name || '',
                  name_status: data.name_status || 'UNKNOWN',
                  new_name_status: data.new_name_status || null,
                });
              }
            }
          } catch (socketErr) {
            console.error("[Webhook] Socket emit error for display_name_update:", socketErr);
          }
        } else {
          // Map token/permission errors to user-friendly messages and persist them
          let errData: any = {};
          try { errData = await response.json(); } catch {}
          const apiError = errData?.error;
          const errCode: number | undefined = apiError?.code;
          const errType: string | undefined = apiError?.type;
          const errRaw: string = (apiError?.message || '').toLowerCase();

          let userMessage: string;
          if (errCode === 190 || errType === 'OAuthException' || errRaw.includes('access token') || errRaw.includes('expired')) {
            userMessage = "Your access token has expired or been revoked. Please click 'Reconnect' to re-authorize this channel and restore full functionality.";
          } else if (errCode === 100 && (errRaw.includes('does not exist') || errRaw.includes('missing permissions') || errRaw.includes('unsupported'))) {
            userMessage = "Cannot access this channel — the access token may have expired or is missing the required WhatsApp permissions (whatsapp_business_messaging, whatsapp_business_management). Please click 'Reconnect' to re-authorize.";
          } else if (typeof errCode === 'number' && errCode >= 200 && errCode <= 299) {
            userMessage = "The access token is missing required WhatsApp permissions (whatsapp_business_messaging, whatsapp_business_management). Please click 'Reconnect' to re-authorize the channel with the correct permissions.";
          } else {
            userMessage = (apiError?.message || 'Failed to fetch display name from Meta') + ' — If this persists, try reconnecting the channel.';
          }

          console.warn(`[Webhook] account_update phone-number fetch failed for phone_number_id ${phoneNumberId}: code=${errCode} — ${userMessage}`);
          const existingHealth = (channel.healthDetails as Record<string, any>) || {};
          await db.update(channels)
            .set({
              healthStatus: 'error',
              healthDetails: {
                ...existingHealth,
                error: userMessage,
                error_code: errCode,
                error_type: errType,
              }
            })
            .where(eq(channels.id, channel.id));
        }
      } else {
        console.log(`[Webhook] Unhandled account_update event: ${event}`);
      }
    } catch (error) {
      console.error("[Webhook] Error handling account_update:", error);
    }
  }

  // Handle account alerts
  private static async handleAccountAlert(value: any): Promise<void> {
    try {
      console.warn("Account alert received:", value);
      
      // Handle different types of alerts
      // - Quality rating changes
      // - Account restrictions
      // - Policy violations
      // You might want to send notifications to admins here
    } catch (error) {
      console.error("Error handling account alert:", error);
      throw error;
    }
  }

  // Update webhook last ping time
  static async updateWebhookPing(channelId: string): Promise<void> {
    await db
      .update(webhookConfigs)
      .set({ lastPingAt: new Date() })
      .where(eq(webhookConfigs.channelId, channelId));
  }
}

// Import sql from drizzle-orm
import { sql } from "drizzle-orm";