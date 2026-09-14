/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * System WhatsApp Notification Controller
 * ============================================================
 */

import { Request, Response } from "express";
import { db } from "../db";
import { channels, panelConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getSystemWhatsappConfig,
  sendSystemWhatsappNotification,
  resolveSystemWhatsappChannel,
} from "../services/system-whatsapp.service";
import { getFirstPanelConfig, updateFirstPanelConfig } from "../services/panel.config";

export const getSystemWhatsappSettings = async (req: Request, res: Response) => {
  try {
    const config = await getSystemWhatsappConfig();

    // Fetch all active channels for dropdown selection
    const allChannels = await db
      .select({
        id: channels.id,
        name: channels.name,
        phoneNumber: channels.phoneNumber,
        phoneNumberId: channels.phoneNumberId,
        connectionMethod: channels.connectionMethod,
        isActive: channels.isActive,
        healthStatus: channels.healthStatus,
      })
      .from(channels)
      .where(eq(channels.isActive, true));

    const { channel: resolvedChannel, type: resolvedType } = await resolveSystemWhatsappChannel();

    return res.json({
      config,
      channels: allChannels,
      activeStatus: {
        hasResolvedChannel: !!resolvedChannel,
        channelName: resolvedChannel?.name || (resolvedChannel?.id ? "Custom Cloud API" : "None"),
        channelType: resolvedType,
      },
    });
  } catch (error: any) {
    console.error("Error fetching system WhatsApp config:", error);
    return res.status(500).json({ error: error.message || "Failed to load configuration" });
  }
};

export const updateSystemWhatsappSettings = async (req: Request, res: Response) => {
  try {
    const {
      systemWhatsappType,
      systemWhatsappChannelId,
      systemWhatsappPhoneNumberId,
      systemWhatsappAccessToken,
      systemWhatsappWabaId,
      systemWhatsappEnabled,
      systemWhatsappRenewalReminderEnabled,
      systemWhatsappRenewalTemplate,
      systemWhatsappOtpTemplate,
      systemWhatsappRenewalUrl,
    } = req.body;

    const patchData: any = {};
    if (systemWhatsappType !== undefined) patchData.systemWhatsappType = systemWhatsappType;
    if (systemWhatsappChannelId !== undefined) patchData.systemWhatsappChannelId = systemWhatsappChannelId || null;
    if (systemWhatsappPhoneNumberId !== undefined) patchData.systemWhatsappPhoneNumberId = systemWhatsappPhoneNumberId || null;
    if (systemWhatsappAccessToken !== undefined) patchData.systemWhatsappAccessToken = systemWhatsappAccessToken || null;
    if (systemWhatsappWabaId !== undefined) patchData.systemWhatsappWabaId = systemWhatsappWabaId || null;
    if (systemWhatsappEnabled !== undefined) patchData.systemWhatsappEnabled = Boolean(systemWhatsappEnabled);
    if (systemWhatsappRenewalReminderEnabled !== undefined) patchData.systemWhatsappRenewalReminderEnabled = Boolean(systemWhatsappRenewalReminderEnabled);
    if (systemWhatsappRenewalTemplate !== undefined) patchData.systemWhatsappRenewalTemplate = systemWhatsappRenewalTemplate;
    if (systemWhatsappOtpTemplate !== undefined) patchData.systemWhatsappOtpTemplate = systemWhatsappOtpTemplate;
    if (systemWhatsappRenewalUrl !== undefined) patchData.systemWhatsappRenewalUrl = systemWhatsappRenewalUrl || null;

    const updated = await updateFirstPanelConfig(patchData);
    return res.json({ success: true, config: updated });
  } catch (error: any) {
    console.error("Error updating system WhatsApp config:", error);
    return res.status(500).json({ error: error.message || "Failed to save configuration" });
  }
};

export const sendTestWhatsappNotification = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const testMsg =
      message ||
      `🔔 *LINALA System Test Alert*\n\nThis is a test notification from your LINALA WhatsApp Marketing Platform. Your system notification channel is working perfectly! ✅`;

    const result = await sendSystemWhatsappNotification({
      to: phoneNumber,
      message: testMsg,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to send test message" });
    }

    return res.json({
      success: true,
      message: "Test WhatsApp notification delivered successfully",
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Error sending test WhatsApp notification:", error);
    return res.status(500).json({ error: error.message || "Failed to send test notification" });
  }
};
