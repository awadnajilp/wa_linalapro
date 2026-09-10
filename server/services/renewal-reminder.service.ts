import { db } from "../db";
import { panelConfig, channels, notifications, sentNotifications } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { sendSubscriptionRenewalEmail } from "./email.service";
import { sendPushNotification } from "./fcm-service";
import { WhatsAppApiService } from "./whatsapp-api";

export interface RenewalReminderSettings {
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  channelId?: string;
  customApiKey?: string;
  customApiSecret?: string;
  customPhoneNumberId?: string;
  cadenceDays?: number[]; // [7, 3, 1, 0]
  customWhatsappMessage?: string;
}

export const DEFAULT_RENEWAL_SETTINGS: RenewalReminderSettings = {
  whatsappEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  channelId: "",
  cadenceDays: [7, 3, 1, 0],
  customWhatsappMessage: `👋 *Hello {username},*

⚠️ *Subscription Renewal Notice*
Your subscription for *{plan_name}* on {app_name} is expiring in *{days_left} days* (Date: {end_date}).

Please renew your plan to ensure uninterrupted WhatsApp message sending, bot automations, and CRM inbox access:
👉 {renewal_link}

_Thank you for choosing {app_name}!_`,
};

export async function getRenewalReminderSettings(): Promise<RenewalReminderSettings> {
  try {
    const configRows = await db.select().from(panelConfig).limit(1);
    if (configRows.length > 0 && configRows[0].renewalReminderSettings) {
      return { ...DEFAULT_RENEWAL_SETTINGS, ...(configRows[0].renewalReminderSettings as RenewalReminderSettings) };
    }
  } catch (err) {
    console.error("[Renewal Reminder Service] Error reading settings:", err);
  }
  return DEFAULT_RENEWAL_SETTINGS;
}

export async function saveRenewalReminderSettings(settings: Partial<RenewalReminderSettings>): Promise<RenewalReminderSettings> {
  const current = await getRenewalReminderSettings();
  const merged = { ...current, ...settings };

  const configRows = await db.select().from(panelConfig).limit(1);
  if (configRows.length > 0) {
    await db.update(panelConfig).set({ renewalReminderSettings: merged, updatedAt: new Date() }).where(eq(panelConfig.id, configRows[0].id));
  } else {
    await db.insert(panelConfig).values({ name: "WhatsWay", renewalReminderSettings: merged });
  }

  return merged;
}

export async function getAvailableReminderChannels() {
  return await db
    .select({
      id: channels.id,
      name: channels.name,
      phoneNumber: channels.phoneNumber,
      phoneNumberId: channels.phoneNumberId,
      connectionMethod: channels.connectionMethod,
      isActive: channels.isActive,
      createdBy: channels.createdBy,
    })
    .from(channels)
    .where(eq(channels.isActive, true))
    .orderBy(desc(channels.createdAt));
}

export async function sendSingleRenewalReminder({
  user,
  subscription,
  plan,
  daysLeft,
  isExpired,
  forceWhatsapp = false,
  forceEmail = false,
  forcePush = false,
}: {
  user: any;
  subscription: any;
  plan: any;
  daysLeft: number;
  isExpired: boolean;
  forceWhatsapp?: boolean;
  forceEmail?: boolean;
  forcePush?: boolean;
}) {
  const settings = await getRenewalReminderSettings();
  const appUrl = process.env.APP_URL || "https://wa.linalapro.com";
  const appName = "WhatsWay";
  const planName = plan?.name || (subscription?.planData as any)?.name || "Pro Plan";
  const username = user?.firstName || user?.username || "Customer";
  const renewalLink = `${appUrl}/plan-upgrade`;

  const endDate = subscription?.endDate ? new Date(subscription.endDate) : new Date();
  const endDateFormatted = endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const result = {
    emailSent: false,
    whatsappSent: false,
    pushSent: false,
    inAppSent: false,
    errors: [] as string[],
  };

  // 1. Send Email
  if ((settings.emailEnabled || forceEmail) && user?.email) {
    try {
      const emailRes = await sendSubscriptionRenewalEmail({
        toEmail: user.email,
        username,
        planName,
        endDate: endDate.toISOString(),
        daysLeft: Math.max(0, daysLeft),
        isExpired,
      });
      if (emailRes && emailRes.success) {
        result.emailSent = true;
      } else {
        result.errors.push(`Email error: ${emailRes?.message || 'Failed to send email'}`);
      }
    } catch (err: any) {
      result.errors.push(`Email error: ${err.message || err}`);
    }
  }

  // 2. Send Mobile Push Notification
  if ((settings.pushEnabled || forcePush) && user?.fcmToken) {
    try {
      const pushTitle = isExpired
        ? `⚠️ Subscription Expired: ${planName}`
        : daysLeft === 0
        ? `⏳ Subscription Expires Today: ${planName}`
        : `⏳ ${daysLeft} Days Left: ${planName} Renewal`;

      const pushBody = isExpired
        ? `Your ${planName} subscription has expired. Renew today to resume full access.`
        : `Your ${planName} subscription expires on ${endDateFormatted}. Tap to renew.`;

      await sendPushNotification(user.fcmToken, pushTitle, pushBody, {
        type: "subscription_renewal",
        planName,
        daysLeft: String(daysLeft),
        renewalLink,
      });
      result.pushSent = true;
    } catch (err: any) {
      result.errors.push(`Push notification error: ${err.message || err}`);
    }
  }

  // 3. Send In-App Notification & Socket Event
  try {
    const notifTitle = isExpired ? `⚠️ Subscription Expired` : `⏳ Renewal Reminder: ${planName}`;
    const notifMsg = isExpired
      ? `Your ${planName} subscription has expired on ${endDateFormatted}. Please renew your plan.`
      : `Your ${planName} subscription will expire on ${endDateFormatted} (${daysLeft} days remaining). Please renew to avoid disruption.`;

    const [notif] = await db
      .insert(notifications)
      .values({
        title: notifTitle,
        message: notifMsg,
        type: "subscription_renewal",
        createdBy: "system",
        targetType: "single",
        targetIds: [user.id],
        status: "sent",
        sentAt: new Date(),
      })
      .returning();

    await db.insert(sentNotifications).values({
      notificationId: notif.id,
      userId: user.id,
    });

    const io = (global as any).io;
    if (io) {
      io.to(`user_${user.id}`).emit("notification:new", {
        id: notif.id,
        title: notifTitle,
        message: notifMsg,
        type: "subscription_renewal",
        link: "/plan-upgrade",
        createdAt: notif.createdAt,
      });
    }
    result.inAppSent = true;
  } catch (err: any) {
    console.error("[Renewal Reminder] In-app notification error:", err?.message || err);
  }

  // 4. Send WhatsApp Reminder
  if (settings.whatsappEnabled || forceWhatsapp) {
    const recipientPhoneRaw = user?.phoneNumber || user?.phone || user?.username || "";
    const recipientPhone = recipientPhoneRaw.replace(/\D/g, "");

    if (recipientPhone.length >= 8) {
      try {
        let senderChannel: any = null;

        // Try configured channel
        if (settings.channelId) {
          const ch = await db.select().from(channels).where(eq(channels.id, settings.channelId)).limit(1);
          if (ch.length > 0) senderChannel = ch[0];
        }

        // If no configured channel or channel not found, pick any active channel
        if (!senderChannel) {
          const allCh = await db.select().from(channels).where(eq(channels.isActive, true)).orderBy(desc(channels.createdAt));
          senderChannel = allCh.find(c => c.connectionMethod === "qr_code") || allCh[0];
        }

        if (senderChannel) {
          const finalChannel = {
            ...senderChannel,
            accessToken: settings.customApiKey || senderChannel.accessToken,
            phoneNumberId: settings.customPhoneNumberId || senderChannel.phoneNumberId,
          };

          const templateText = settings.customWhatsappMessage || DEFAULT_RENEWAL_SETTINGS.customWhatsappMessage!;
          const waMessage = templateText
            .replace(/{username}/g, username)
            .replace(/{plan_name}/g, planName)
            .replace(/{days_left}/g, String(Math.max(0, daysLeft)))
            .replace(/{end_date}/g, endDateFormatted)
            .replace(/{renewal_link}/g, renewalLink)
            .replace(/{app_name}/g, appName);

          const whatsappApi = new WhatsAppApiService(finalChannel);
          await whatsappApi.sendTextMessage(recipientPhone, waMessage);
          result.whatsappSent = true;
          console.log(`[Renewal Reminder] WhatsApp sent to ${recipientPhone}`);
        } else {
          result.errors.push("No active WhatsApp sender channel available. Please configure a channel.");
        }
      } catch (err: any) {
        result.errors.push(`WhatsApp error: ${err.message || err}`);
        console.error("[Renewal Reminder] WhatsApp sending error:", err);
      }
    } else {
      result.errors.push(`Invalid recipient phone: ${recipientPhoneRaw}`);
    }
  }

  return result;
}
