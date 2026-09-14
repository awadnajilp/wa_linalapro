/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * System WhatsApp Notification Service
 * Handles administrative alerts, signup OTPs, and tenant renewal reminders
 * Supporting both Meta Cloud API and Baileys QR Code channels.
 * ============================================================
 */

import { db } from "../db";
import { panelConfig, channels, Channel } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WhatsAppApiService } from "./whatsapp-api";
import { BaileysManager } from "./baileys-manager";
import { getFirstPanelConfig } from "./panel.config";

export interface SystemWhatsappConfig {
  systemWhatsappType: "cloud_api" | "qr_code";
  systemWhatsappChannelId?: string | null;
  systemWhatsappPhoneNumberId?: string | null;
  systemWhatsappAccessToken?: string | null;
  systemWhatsappWabaId?: string | null;
  systemWhatsappEnabled: boolean;
  systemWhatsappRenewalReminderEnabled: boolean;
  systemWhatsappRenewalTemplate: string;
  systemWhatsappOtpTemplate: string;
  systemWhatsappRenewalUrl?: string | null;
}

const DEFAULT_RENEWAL_TEMPLATE =
  "Hello {{name}}, your {{plan_name}} subscription is expiring in {{days_left}} days ({{expiry_date}}). Renew now to avoid interruption: {{renewal_link}}";

const DEFAULT_OTP_TEMPLATE =
  "Your verification code is: {{otp}}. Do not share this code with anyone.";

/**
 * Fetch system WhatsApp configuration from panel_config
 */
export async function getSystemWhatsappConfig(): Promise<SystemWhatsappConfig> {
  try {
    const config = await getFirstPanelConfig();
    return {
      systemWhatsappType: (config?.systemWhatsappType as "cloud_api" | "qr_code") || "cloud_api",
      systemWhatsappChannelId: config?.systemWhatsappChannelId || null,
      systemWhatsappPhoneNumberId: config?.systemWhatsappPhoneNumberId || null,
      systemWhatsappAccessToken: config?.systemWhatsappAccessToken || null,
      systemWhatsappWabaId: config?.systemWhatsappWabaId || null,
      systemWhatsappEnabled: config?.systemWhatsappEnabled !== false,
      systemWhatsappRenewalReminderEnabled: config?.systemWhatsappRenewalReminderEnabled !== false,
      systemWhatsappRenewalTemplate: config?.systemWhatsappRenewalTemplate || DEFAULT_RENEWAL_TEMPLATE,
      systemWhatsappOtpTemplate: config?.systemWhatsappOtpTemplate || DEFAULT_OTP_TEMPLATE,
      systemWhatsappRenewalUrl: config?.systemWhatsappRenewalUrl || null,
    };
  } catch (error) {
    console.error("⚠️ [SystemWhatsApp] Failed to read panel config:", error);
    return {
      systemWhatsappType: "cloud_api",
      systemWhatsappChannelId: null,
      systemWhatsappPhoneNumberId: null,
      systemWhatsappAccessToken: null,
      systemWhatsappWabaId: null,
      systemWhatsappEnabled: true,
      systemWhatsappRenewalReminderEnabled: true,
      systemWhatsappRenewalTemplate: DEFAULT_RENEWAL_TEMPLATE,
      systemWhatsappOtpTemplate: DEFAULT_OTP_TEMPLATE,
      systemWhatsappRenewalUrl: null,
    };
  }
}

/**
 * Resolve the active Channel entity to be used for sending system notifications
 */
export async function resolveSystemWhatsappChannel(): Promise<{
  channel: Partial<Channel> | null;
  type: "cloud_api" | "qr_code";
}> {
  const config = await getSystemWhatsappConfig();

  // 1. Explicitly configured channel ID
  if (config.systemWhatsappChannelId) {
    const [foundChannel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, config.systemWhatsappChannelId))
      .limit(1);

    if (foundChannel) {
      const type = foundChannel.connectionMethod === "qr_code" ? "qr_code" : "cloud_api";
      return { channel: foundChannel, type };
    }
  }

  // 2. Direct Meta Cloud API credentials provided in panel_config
  if (
    config.systemWhatsappType === "cloud_api" &&
    config.systemWhatsappPhoneNumberId &&
    config.systemWhatsappAccessToken
  ) {
    const syntheticChannel: Partial<Channel> = {
      id: "system_meta_cloud_api",
      name: "System Meta Cloud API",
      phoneNumberId: config.systemWhatsappPhoneNumberId,
      accessToken: config.systemWhatsappAccessToken,
      whatsappBusinessAccountId: config.systemWhatsappWabaId || undefined,
      connectionMethod: "embedded",
      isActive: true,
    };
    return { channel: syntheticChannel, type: "cloud_api" };
  }

  // 3. Fallback: find any active matching channel from DB
  const matchingChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.isActive, true))
    .limit(10);

  if (config.systemWhatsappType === "qr_code") {
    const qrChan = matchingChannels.find((c) => c.connectionMethod === "qr_code");
    if (qrChan) return { channel: qrChan, type: "qr_code" };
  } else {
    const cloudChan = matchingChannels.find((c) => c.connectionMethod !== "qr_code" && c.phoneNumberId && c.accessToken);
    if (cloudChan) return { channel: cloudChan, type: "cloud_api" };
  }

  // 4. Any available channel
  if (matchingChannels.length > 0) {
    const fallback = matchingChannels[0];
    const type = fallback.connectionMethod === "qr_code" ? "qr_code" : "cloud_api";
    return { channel: fallback, type };
  }

  return { channel: null, type: config.systemWhatsappType };
}

/**
 * Send a notification message via the configured System WhatsApp channel
 */
export async function sendSystemWhatsappNotification(options: {
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getSystemWhatsappConfig();
    if (!config.systemWhatsappEnabled) {
      console.log("ℹ️ [SystemWhatsApp] System WhatsApp notifications are disabled in settings.");
      return { success: false, error: "System WhatsApp notifications are disabled" };
    }

    let cleanTo = options.to.replace(/\D/g, "");
    if (!cleanTo) {
      return { success: false, error: "Invalid recipient phone number" };
    }

    const { channel, type } = await resolveSystemWhatsappChannel();
    if (!channel) {
      const errMsg = "No system WhatsApp channel configured or available";
      console.warn(`⚠️ [SystemWhatsApp] ${errMsg}`);
      return { success: false, error: errMsg };
    }

    console.log(`🚀 [SystemWhatsApp] Sending notification to ${cleanTo} via ${type} (channel: ${channel.name || channel.id})...`);

    if (type === "qr_code" || channel.connectionMethod === "qr_code") {
      // Send via Baileys QR Code Channel
      const result = await BaileysManager.sendMessage(channel.id as string, cleanTo, options.message);
      console.log(`✅ [SystemWhatsApp] Sent via QR channel ${channel.id}:`, result);
      return { success: true, messageId: result?.key?.id || `qr_${Date.now()}` };
    } else {
      // Send via Meta Cloud API
      const apiService = new WhatsAppApiService(channel as Channel);
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "text",
        text: {
          preview_url: true,
          body: options.message,
        },
      };

      const result = await apiService.sendDirectMessage(payload);
      console.log(`✅ [SystemWhatsApp] Sent via Cloud API:`, result);
      return {
        success: true,
        messageId: result?.messages?.[0]?.id || `cloud_${Date.now()}`,
      };
    }
  } catch (error: any) {
    console.error("❌ [SystemWhatsApp] Failed to send system WhatsApp message:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send WhatsApp message" };
  }
}

/**
 * Send a verification OTP via WhatsApp
 */
export async function sendSystemWhatsappOtp(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const config = await getSystemWhatsappConfig();
  const template = config.systemWhatsappOtpTemplate || DEFAULT_OTP_TEMPLATE;
  const message = template.replace(/\{\{\s*otp\s*\}\}/gi, otp);

  return sendSystemWhatsappNotification({
    to: phone,
    message,
  });
}

/**
 * Send a tenant subscription renewal reminder via WhatsApp
 */
export async function sendSystemWhatsappRenewalReminder(data: {
  user: {
    phoneNumber?: string | null;
    phone?: string | null;
    username?: string | null;
    firstName?: string | null;
    email?: string | null;
  };
  subscription: {
    endDate: Date | string;
    status: string;
  };
  planName: string;
  daysLeft: number;
  isExpired: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const config = await getSystemWhatsappConfig();
  if (!config.systemWhatsappRenewalReminderEnabled) {
    return { success: false, error: "Renewal reminders via WhatsApp are disabled" };
  }

  const phone = data.user.phoneNumber || (data.user as any).phone;
  if (!phone) {
    return { success: false, error: "User has no phone number configured" };
  }

  const name = data.user.firstName || data.user.username || "Customer";
  const endDateStr = new Date(data.subscription.endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const baseUrl = config.systemWhatsappRenewalUrl || process.env.APP_URL || "";
  const renewalLink = baseUrl
    ? `${baseUrl.replace(/\/+$/, "")}/billing`
    : "https://app.linala.io/billing";

  let template = config.systemWhatsappRenewalTemplate || DEFAULT_RENEWAL_TEMPLATE;
  const message = template
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*plan_name\s*\}\}/gi, data.planName)
    .replace(/\{\{\s*days_left\s*\}\}/gi, String(Math.max(0, data.daysLeft)))
    .replace(/\{\{\s*expiry_date\s*\}\}/gi, endDateStr)
    .replace(/\{\{\s*renewal_link\s*\}\}/gi, renewalLink);

  return sendSystemWhatsappNotification({
    to: phone,
    message,
  });
}
