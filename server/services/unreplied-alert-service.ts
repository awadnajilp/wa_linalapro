/**
 * ============================================================
 * © 2026 LINALA — WhatsApp Marketing Platform
 * Background Service: Unreplied Message Alerts
 * ============================================================
 */

import { db, dbRead } from "../db";
import { conversations, channels, users, userNotificationPreferences } from "@shared/schema";
import { eq, ne, and, isNull, or, gt, lte, sql } from "drizzle-orm";
import { sendUnrepliedAlertEmail } from "./email.service";
import { BaileysManager } from "./baileys-manager";
import { diployLogger } from "@diploy/core";

export function startUnrepliedAlertService() {
  // Run checks every 2 minutes
  const intervalMs = 2 * 60 * 1000;
  
  setInterval(async () => {
    try {
      await checkAndAlertUnrepliedMessages();
    } catch (error) {
      console.error("[UnrepliedAlertService] Error during periodic check:", error);
    }
  }, intervalMs);

  console.log("[UnrepliedAlertService] Background worker started. Checking every 2 minutes.");
}

async function checkAndAlertUnrepliedMessages() {
  // 1. Fetch all QR Code channels
  const qrChannels = await dbRead
    .select()
    .from(channels)
    .where(eq(channels.connectionMethod, "qr_code"));

  for (const channel of qrChannels) {
    const settings = (channel.inboxAiSettings || {}) as Record<string, any>;
    
    // Check if unreplied alerts are enabled
    if (!settings.unrepliedNotificationsEnabled) {
      continue;
    }

    const timeoutMinutes = Number(settings.unrepliedTimeoutMinutes) || 15;
    const emailEnabled = settings.unrepliedEmailEnabled !== false;
    const whatsappEnabled = settings.unrepliedWhatsappEnabled !== false;

    if (!emailEnabled && !whatsappEnabled) {
      continue;
    }

    // Calculate cutoff time (current time - timeoutMinutes)
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    // 2. Query conversations matching:
    // - Belongs to this channel
    // - Status is not 'closed'
    // - lastIncomingMessageAt is not null
    // - lastIncomingMessageAt >= lastMessageAt (meaning no reply sent since last incoming)
    // - lastIncomingMessageAt <= cutoffTime
    // - lastIncomingMessageAt > lastUnrepliedAlertSentAt (or lastUnrepliedAlertSentAt is null)
    const pendingConversations = await dbRead
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.channelId, channel.id),
          ne(conversations.status, "closed"),
          sql`${conversations.lastIncomingMessageAt} IS NOT NULL`,
          sql`${conversations.lastIncomingMessageAt} >= ${conversations.lastMessageAt}`,
          sql`${conversations.lastIncomingMessageAt} <= ${cutoffTime}`,
          or(
            isNull(conversations.lastUnrepliedAlertSentAt),
            sql`${conversations.lastIncomingMessageAt} > ${conversations.lastUnrepliedAlertSentAt}`
          )
        )
      );

    if (pendingConversations.length === 0) {
      continue;
    }

    // 3. Group conversations by the recipient user ID (assignedTo or channel owner)
    const groupedConversations: Record<string, typeof pendingConversations> = {};

    for (const conv of pendingConversations) {
      // If assigned to a team member, group under them. Otherwise, group under the channel owner.
      const recipientId = conv.assignedTo || channel.createdBy;
      if (!recipientId) continue;

      if (!groupedConversations[recipientId]) {
        groupedConversations[recipientId] = [];
      }
      groupedConversations[recipientId].push(conv);
    }

    // 4. Send notifications for each recipient group
    for (const [userId, convs] of Object.entries(groupedConversations)) {
      // Fetch user profile (email and phone number)
      const [user] = await dbRead
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) continue;

      const unrepliedCount = convs.length;
      const contactsList = convs.map(
        (c) => `${c.contactName || "Unknown Contact"} (${c.contactPhone || "No Phone"})`
      );

      let emailSent = false;
      let whatsappSent = false;

      // Fetch user's notification preferences for new_message
      const [pref] = await dbRead
        .select()
        .from(userNotificationPreferences)
        .where(
          and(
            eq(userNotificationPreferences.userId, userId),
            eq(userNotificationPreferences.eventType, "new_message")
          )
        )
        .limit(1);

      const userEmailEnabled = pref ? pref.emailEnabled : true;

      // A. Send Email Notification
      if (emailEnabled && userEmailEnabled && user.email) {
        try {
          const res = await sendUnrepliedAlertEmail(
            user.email,
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
            unrepliedCount,
            contactsList
          );
          if (res.success) {
            emailSent = true;
          }
        } catch (emailErr) {
          console.error(`[UnrepliedAlertService] Failed to send email to ${user.email}:`, emailErr);
        }
      }

      // B. Send WhatsApp Notification
      if (whatsappEnabled && user.phoneNumber) {
        try {
          // Format summary text
          const header = `⚠️ *LINALA Unreplied Messages Alert*\n\n`;
          const body = `Hello ${user.firstName || user.username},\n\nYou have *${unrepliedCount}* customer messages waiting for a reply for more than ${timeoutMinutes} minutes:\n\n` +
            convs.map((c, i) => `${i + 1}. *${c.contactName || "Unknown"}* (${c.contactPhone})`).join("\n") +
            `\n\n_Please log in to your dashboard to respond._`;

          // Clean phone number for WhatsApp sending
          let cleanPhone = user.phoneNumber.replace(/\D/g, "");
          if (cleanPhone) {
            await BaileysManager.sendMessage(channel.id, cleanPhone, header + body);
            whatsappSent = true;
          }
        } catch (waErr) {
          console.error(`[UnrepliedAlertService] Failed to send WhatsApp alert to ${user.phoneNumber}:`, waErr);
        }
      }

      // 5. Update lastUnrepliedAlertSentAt to prevent duplicate alerts
      if (emailSent || whatsappSent) {
        const convIds = convs.map((c) => c.id);
        await db
          .update(conversations)
          .set({
            lastUnrepliedAlertSentAt: new Date(),
          })
          .where(sql`id IN (${sql.join(convIds)})`);
      }
    }
  }
}
