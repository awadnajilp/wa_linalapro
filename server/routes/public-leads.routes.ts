import type { Express, Request, Response } from "express";
import { db } from "../db";
import { whatsappChannels, panelConfig } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { BaileysManager } from "../services/baileys-manager";

export function registerPublicLeadsRoutes(app: Express) {
  app.post("/api/public/lead-capture", async (req: Request, res: Response) => {
    try {
      const { phone, email, name, source } = req.body;

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          error: "Either phone number or email is required",
        });
      }

      console.log(`📥 [Lead Capture] Received new lead: phone=${phone}, email=${email}, source=${source || "popup"}`);

      // If phone number is provided, attempt an immediate WhatsApp follow-up message
      if (phone) {
        // Clean phone number (keep digits only)
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length >= 7) {
          // Find an active/connected WhatsApp channel
          const activeChannels = await db
            .select()
            .from(whatsappChannels)
            .where(eq(whatsappChannels.status, "connected"))
            .orderBy(desc(whatsappChannels.updatedAt))
            .limit(1);

          if (activeChannels.length > 0) {
            const channel = activeChannels[0];
            const welcomeText =
              "Hello! 👋 Thank you for connecting with Linala.\n\n" +
              "We've received your request. Our WhatsApp AI and automation specialist is ready to help you supercharge your customer conversions and sales.\n\n" +
              "🚀 Explore our platform: https://wa.linalapro.com\n\n" +
              "Feel free to reply directly to this message if you have any questions or would like a personalized demo!";

            try {
              if (channel.channelType === "cloud_api" || channel.channelType === "waba") {
                const waApi = new WhatsAppApiService(channel.id);
                await waApi.sendTextMessage(cleanPhone, welcomeText);
                console.log(`✅ [Lead Capture] Sent Cloud API WhatsApp welcome message to ${cleanPhone}`);
              } else {
                await BaileysManager.sendMessage(channel.id, cleanPhone, welcomeText);
                console.log(`✅ [Lead Capture] Sent WhatsApp welcome message to ${cleanPhone} via channel ${channel.name}`);
              }
            } catch (sendErr: any) {
              console.warn(`⚠️ [Lead Capture] Could not dispatch instant WhatsApp message: ${sendErr?.message}`);
            }
          } else {
            console.log(`ℹ️ [Lead Capture] No active WhatsApp channel found to dispatch immediate follow-up message`);
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: "Thank you! Your information has been received.",
      });
    } catch (err: any) {
      console.error("❌ [Lead Capture] Error processing lead:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to process lead request",
      });
    }
  });
}
