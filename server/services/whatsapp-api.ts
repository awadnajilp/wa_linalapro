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

import type { Channel } from "@shared/schema";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import * as fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import type { Response } from "express";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { storage } from '../storage';
import { getWhatsAppError } from "@shared/whatsapp-error-codes";
import { randomUUID } from "crypto";
import { BaileysManager } from "./baileys-manager";



interface WhatsAppTemplate {
  id: string;
  status: string;
  name: string;
  language: string;
  category: string;
  components: any[];
}

export class WhatsAppApiService {
  public static mediaCache = new Map<string, { buffer?: Buffer; url?: string; mimeType?: string; filename?: string }>();
  private channel: Channel;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(channel: Channel) {
  this.channel = channel;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v24.0";
  this.baseUrl = `https://graph.facebook.com/${apiVersion}`;

  // Prefer channel token, but fallback to ENV token
  const token = channel.accessToken;

  if (!token) {
    throw new Error("Missing WhatsApp access token");
  }

  this.headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}


  // Static method for sending template messages

  static async sendTemplateMessage(
    channel: Channel,
    to: string,
    templateName: string,
    components: any[] = [],
    language: string = "en_US",
    isMarketing: boolean = true
  ): Promise<any> {
    if (channel.connectionMethod === "qr_code") {
      // Reconstruct template message into plain text
      const template = await storage.getTemplateByNameAndChannel(templateName, channel.id)
        || (await storage.getTemplatesByName(templateName))[0];
      let text = "";
      let hasHeaderMedia = false;
      let headerMediaData: any = null;

      if (template) {
        text = template.body;
        if (components && components.length > 0) {
          const bodyComp = components.find(c => c.type === "body");
          if (bodyComp && bodyComp.parameters) {
            bodyComp.parameters.forEach((param: any, idx: number) => {
              const val = param.text || "";
              text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
            });
          }

          const headerComp = components.find(c => c.type === "header");
          if (headerComp && headerComp.parameters && headerComp.parameters.length > 0) {
            const mediaParam = headerComp.parameters[0];
            const mediaType = mediaParam.type;
            const mediaInfo = mediaParam[mediaType];
            if (mediaInfo && mediaInfo.link) {
              hasHeaderMedia = true;
              headerMediaData = {
                url: mediaInfo.link,
                mimeType: mediaType === "image" ? "image/jpeg" : mediaType === "video" ? "video/mp4" : "application/pdf",
                filename: mediaInfo.filename || "file"
              };
            }
          }
        }
      } else {
        text = `Template: ${templateName}`;
      }

      if (hasHeaderMedia && headerMediaData) {
        return BaileysManager.sendMediaMessage(channel.id, to, headerMediaData, text || undefined);
      }
      return BaileysManager.sendMessage(channel.id, to, text);
    }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v24.0";
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const formattedPhone = to.replace(/\D/g, "");

  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: components.length > 0 ? components : undefined,
    },
  };

  const headers = {
    Authorization: `Bearer ${channel.accessToken}`,
    "Content-Type": "application/json",
  };

  if (isMarketing) {
    const mmLiteEndpoint = `${baseUrl}/${channel.phoneNumberId}/marketing_messages`;
    const mmBody = {
      ...body,
      product_policy: "CLOUD_API_FALLBACK",
      message_activity_sharing: true,
    };
    try {
      const mmResponse = await fetch(mmLiteEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(mmBody),
      });
      const mmData = await mmResponse.json();

      if (mmResponse.ok) {
        console.log(`[WhatsApp] MM Lite sent to ${formattedPhone}:`, mmData);
        mmData._sentVia = "mm_lite";
        return mmData;
      }

      console.warn(`[WhatsApp] MM Lite failed for ${formattedPhone}, falling back to Cloud API:`, mmData.error?.message);
    } catch (err) {
      console.warn(`[WhatsApp] MM Lite request error, falling back to Cloud API:`, err);
    }
  }

  const messagesEndpoint = `${baseUrl}/${channel.phoneNumberId}/messages`;
  const response = await fetch(messagesEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const err: any = new Error(
      responseData.error?.message || "Failed to send template message"
    );
    err.metaErrorCode = responseData.error?.code;
    err.metaErrorTitle = responseData.error?.error_user_title || responseData.error?.title || "";
    throw err;
  }

  console.log(`[WhatsApp] Cloud API sent to ${formattedPhone}:`, responseData);
  responseData._sentVia = "cloud_api";
  return responseData;
}

  /**
   * Get a temporary media download URL for a WhatsApp mediaId
   */
  async fetchMediaUrl(mediaId: string): Promise<string> {
    if (this.channel.connectionMethod === "qr_code") {
      const cached = WhatsAppApiService.mediaCache.get(mediaId);
      if (cached?.url) {
        return cached.url;
      }
      return "";
    }
    const url = `${this.baseUrl}/${mediaId}`;
    console.log(`Fetching media URL: ${url}`);

    const response = await fetch(url, { headers: this.headers });
    const data = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp API Media Fetch Error:", data);
      throw new Error(data.error?.message || "Failed to fetch media URL");
    }

    if (!data.url) {
      throw new Error("No media URL returned by WhatsApp API");
    }

    console.log("✅ Media URL fetched successfully:", data.url);
    return data.url; // Temporary signed URL
  }


  private static readonly TIER_RATE_LIMITS: Record<string, number> = {
    TIER_250: 1,
    TIER_1K: 4,
    TIER_10K: 80,
    TIER_100K: 500,
    UNLIMITED: 1000,
  };

  private static readonly TIER_CONCURRENCY: Record<string, number> = {
    TIER_250: 1,
    TIER_1K: 4,
    TIER_10K: 20,
    TIER_100K: 50,
    UNLIMITED: 100,
  };

  private static _rateLimitWindows: Map<string, number[]> = new Map();

  static resolveTier(channelTier?: string): string {
    return (channelTier || process.env.WHATSAPP_MESSAGING_TIER || "TIER_10K").toUpperCase();
  }

  static getConcurrencyForTier(channelTier?: string): number {
    const override = process.env.MESSAGE_QUEUE_CONCURRENCY;
    if (override) return Math.max(1, parseInt(override, 10) || 10);
    const tierStr = this.resolveTier(channelTier);
    return this.TIER_CONCURRENCY[tierStr] ?? 10;
  }

  static async checkRateLimit(channelId: string, channelTier?: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 1000;

    const tierStr = this.resolveTier(channelTier);
    const max = this.TIER_RATE_LIMITS[tierStr] ?? 80;

    if (!this._rateLimitWindows.has(channelId)) {
      this._rateLimitWindows.set(channelId, []);
    }
    const timestamps = this._rateLimitWindows.get(channelId)!;

    const cutoff = now - windowMs;
    const recent = timestamps.filter((t) => t > cutoff);
    this._rateLimitWindows.set(channelId, recent);

    if (recent.length >= max) {
      return false;
    }

    recent.push(now);
    this._rateLimitWindows.set(channelId, recent);
    return true;
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 7) {
      console.warn(`[WhatsApp API] Phone number may be too short: ${cleaned}`);
    }
    return cleaned;
  }

  // Deprecated - MM Lite now uses marketing_messages endpoint in sendTemplateMessage
  // Keeping for backward compatibility but routes to sendTemplateMessage
  private async sendMMliteMessage(
    to: string,
    templateName: string,
    parameters: string[] = [],
    language: string = "en_US"
  ): Promise<any> {
    return WhatsAppApiService.sendTemplateMessage(
      this.channel,
      to,
      templateName,
      parameters,
      language,
      true // isMarketing = true for MM Lite
    );
  }




  async createTemplate(templateData: any): Promise<any> {
      const body: any = {
        name: templateData.name,
        category: templateData.category,
        language: templateData.language,
        components: templateData.components,
      };

      if (templateData.category === "MARKETING" && templateData.degrees_of_freedom_spec) {
        body.degrees_of_freedom_spec = templateData.degrees_of_freedom_spec;
      }

      if (templateData.message_send_ttl_seconds) {
        body.message_send_ttl_seconds = String(templateData.message_send_ttl_seconds);
      }
  
      console.log("🌐 Sending to WhatsApp API:", JSON.stringify(body, null, 2));
  
      const response = await fetch(
        `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/message_templates`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify(body),
        }
      );
  
      if (!response.ok) {
        const error = await response.json();
        console.error("❌ WhatsApp API Error Response:", JSON.stringify(error, null, 2));
        throw new Error(error.error?.message || "Failed to create template");
      }
  
      return await response.json();
    }



  async editTemplate(templateId: string, templateData: any): Promise<any> {
  const body: any = {
    category: templateData.category,
    components: templateData.components,
  };

  if (templateData.degrees_of_freedom_spec) {
    body.degrees_of_freedom_spec = templateData.degrees_of_freedom_spec;
  }

  if (templateData.message_send_ttl_seconds) {
    body.message_send_ttl_seconds = String(templateData.message_send_ttl_seconds);
  }

  console.log("✏️ Editing WhatsApp template:", templateId);
  console.log("📤 Edit payload:", JSON.stringify(body, null, 2));

  const response = await fetch(
    `${this.baseUrl}/${templateId}`,
    {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ WhatsApp Edit Error:", JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || "Failed to edit template");
  }

  const result = await response.json();
  console.log("✅ Template edited successfully:", result);
  return result;
}



    // Pehle check karo ki Phone Number aur WABA same account ke hain
async verifyPhoneNumberBelongsToWABA(): Promise<boolean> {
  try {
    const response = await fetch(
      `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/phone_numbers`,
      {
        headers: {
          Authorization: `Bearer ${this.channel.accessToken}`,
        },
      }
    );
    
    const data = await response.json();
    console.log("📱 Phone numbers in this WABA:", data);
    
    // Check if your phoneNumberId exists in this WABA
    const phoneExists = data.data?.some(
      (phone: any) => phone.id === this.channel.phoneNumberId
    );
    
    if (!phoneExists) {
      console.error("❌ Phone Number ID doesn't belong to this WABA!");
      console.error(`   Phone Number ID: ${this.channel.phoneNumberId}`);
      console.error(`   WABA ID: ${this.channel.whatsappBusinessAccountId}`);
    }
    
    return phoneExists;
  } catch (error) {
    console.error("❌ Failed to verify:", error);
    return false;
  }
}

async getMessageTemplateByName(
  templateName: string,
  apiVersion = "v24.0"
) {
  const wabaId = this.channel.whatsappBusinessAccountId;
  const accessToken = this.channel.accessToken;

  if (!wabaId) {
    throw new Error("whatsappBusinessAccountId not found");
  }

  if (!accessToken) {
    throw new Error("accessToken not found");
  }

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;

  const res = await axios.get(url, {
    params: { name: templateName },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.data?.data?.length) {
    throw new Error(`Template "${templateName}" not found`);
  }

  return res.data.data[0];
}


  

  async checkTemplateExists(templateName: string): Promise<boolean> {
  const url = `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: this.headers
  });

  if (res.status === 404) return false;

  const data = await res.json();

  return data.data && data.data.length > 0;
}




 async deleteTemplate(templateName: string): Promise<any> {
  console.log("DELETE CHECK:", templateName);

  // Check if template exists
  const exists = await this.checkTemplateExists(templateName);

  if (!exists) {
    console.log(`⚠️ Template '${templateName}' does NOT exist on WhatsApp. Skipping delete.`);
    return { skipped: true };
  }

  console.log(`🗑 Deleting WhatsApp template: ${templateName}`);

  const url = `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: this.headers
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("DELETE ERROR RESPONSE:", error);
    throw new Error(error.error?.message || "Failed to delete template");
  }

  return await response.json();
}


async getTemplateStatus(templateName: string): Promise<string> {
  const url = `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: this.headers
  });

  if (res.status === 404) return "NOT_FOUND";

  const data = await res.json();
  if (!data.data || data.data.length === 0) return "NOT_FOUND";

  return data.data[0].status || "UNKNOWN";
}



  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const response = await fetch(
      `${this.baseUrl}/${this.channel.whatsappBusinessAccountId}/message_templates?fields=id,status,name,language,category,components,degrees_of_freedom_spec&limit=100`,
      {
        headers: this.headers,
      }
    );


    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch templates");
    }

    const data = await response.json();
    return data.data || [];
  }

async sendMessage(
  to: string,
  templateName: string,
  parameters: string[] = [],
  mediaId?: string,
  headerType?: "IMAGE" | "VIDEO" | "DOCUMENT",
  buttonParams?: string[],
  cardBodyParams?: Record<number, Record<string, string>>,
  cardButtonParams?: Record<number, Record<number, string>>,
  expirationTimeMs?: number,
  carouselCardMediaIds?: Record<number, string>
): Promise<any> {
  if (this.channel.connectionMethod === "qr_code") {
    const template = await storage.getTemplateByNameAndChannel(templateName, this.channel.id)
      || (await storage.getTemplatesByName(templateName))[0];
    let text = "";
    if (template) {
      text = template.body;
      if (parameters && parameters.length > 0) {
        parameters.forEach((val, idx) => {
          text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
        });
      }
    } else {
      text = `Template: ${templateName}`;
    }
    return BaileysManager.sendMessage(this.channel.id, to, text);
  }

  const formattedPhone = this.formatPhoneNumber(to);
  const template = await storage.getTemplateByNameAndChannel(templateName, this.channel.id)
    || (await storage.getTemplatesByName(templateName))[0];
  if (!template) throw new Error("Template not found");

  const templateLanguage = template.language || "en_US";

  const components: any[] = [];

  const carouselCards = Array.isArray(template.carouselCards) && template.carouselCards.length > 0
    ? (template.carouselCards as any[])
    : null;
  const isCarousel = !!carouselCards;

  const normalizedHeaderType = headerType?.toUpperCase();

  if (!isCarousel && mediaId && normalizedHeaderType) {
    const mediaTypeMap: Record<string, string> = {
      IMAGE: "image",
      VIDEO: "video",
      DOCUMENT: "document",
    };
    const mediaType = mediaTypeMap[normalizedHeaderType];
    if (mediaType) {
      components.push({
        type: "header",
        parameters: [
          {
            type: mediaType,
            [mediaType]: { id: mediaId },
          },
        ],
      });
    }
  }

  let resolvedExpirationMs = expirationTimeMs;
  if (!resolvedExpirationMs && template.whatsappTemplateId) {
    try {
      const ltoCheckResp = await fetch(
        `https://graph.facebook.com/v24.0/${template.whatsappTemplateId}`,
        { headers: { Authorization: `Bearer ${this.channel.accessToken}` } }
      );
      const ltoCheckData = await ltoCheckResp.json();
      const hasLto = (ltoCheckData.components || []).some(
        (c: any) => c.type === "LIMITED_TIME_OFFER"
      );
      if (hasLto) {
        resolvedExpirationMs = Date.now() + 24 * 60 * 60 * 1000;
      }
    } catch (err) {
      console.warn("⚠️ Failed to auto-detect LTO for template:", err);
    }
  }

  if (resolvedExpirationMs) {
    components.push({
      type: "limited_time_offer",
      parameters: [
        {
          type: "limited_time_offer",
          limited_time_offer: {
            expiration_time_ms: resolvedExpirationMs,
          },
        },
      ],
    });
  }

  if (parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map((text) => ({
        type: "text",
        text: String(text),
      })),
    });
  }

  if (isCarousel) {
    let metaCardHandles: string[] = [];
    let metaCardFormats: string[] = [];
    const needsMetaFetch = carouselCards.some((c: any) => !c.mediaUrl);
    if (needsMetaFetch && template.whatsappTemplateId) {
      try {
        const metaResp = await fetch(
          `https://graph.facebook.com/v24.0/${template.whatsappTemplateId}`,
          { headers: { Authorization: `Bearer ${this.channel.accessToken}` } }
        );
        const metaData = await metaResp.json();
        const metaCarousel = metaData.components?.find((c: any) => c.type === "CAROUSEL");
        if (metaCarousel?.cards) {
          for (const metaCard of metaCarousel.cards) {
            const hdr = metaCard.components?.find((c: any) => c.type === "HEADER");
            metaCardHandles.push(hdr?.example?.header_handle?.[0] || "");
            metaCardFormats.push((hdr?.format || "IMAGE").toLowerCase());
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch carousel media handles from Meta:", err);
      }
    }

    const carouselComp: any = { type: "carousel", cards: [] };
    for (let cardIdx = 0; cardIdx < carouselCards.length; cardIdx++) {
      const card = carouselCards[cardIdx];
      const cardComponents: any[] = [];

      const overrideMediaId = carouselCardMediaIds?.[cardIdx];
      const cardMediaUrl = overrideMediaId || card.mediaUrl || metaCardHandles[cardIdx] || "";
      const cardMediaType = metaCardFormats[cardIdx] || (card.mediaType || "image").toLowerCase();
      if (cardMediaUrl) {
        const isUrl = cardMediaUrl.startsWith("http");
        const mediaRef = isUrl ? { link: cardMediaUrl } : { id: cardMediaUrl };
        cardComponents.push({
          type: "header",
          parameters: [
            cardMediaType === "video"
              ? { type: "video", video: mediaRef }
              : { type: "image", image: mediaRef },
          ],
        });
      }

      const cardBody = card.body || "";
      const cardBodyVars = cardBody.match(/\{\{\d+\}\}/g) || [];
      if (cardBodyVars.length > 0) {
        const cardBodyComp: any = { type: "body", parameters: [] };
        for (let varI = 0; varI < cardBodyVars.length; varI++) {
          const varIdx = cardBodyVars[varI].replace(/\D/g, "");
          const resolved = cardBodyParams?.[cardIdx]?.[varIdx] || "";
          cardBodyComp.parameters.push({ type: "text", text: resolved });
        }
        cardComponents.push(cardBodyComp);
      }

      if (Array.isArray(card.buttons)) {
        card.buttons.forEach((btn: any, btnIdx: number) => {
          if (btn.type === "QUICK_REPLY") {
            const payload = cardButtonParams?.[cardIdx]?.[btnIdx] || btn.text || "";
            cardComponents.push({
              type: "button",
              sub_type: "quick_reply",
              index: btnIdx.toString(),
              parameters: [{ type: "payload", payload }],
            });
          } else if (btn.type === "URL" && btn.url?.includes("{{")) {
            const urlText = cardButtonParams?.[cardIdx]?.[btnIdx] || "";
            if (urlText) {
              cardComponents.push({
                type: "button",
                sub_type: "url",
                index: btnIdx.toString(),
                parameters: [{ type: "text", text: urlText }],
              });
            }
          }
        });
      }

      carouselComp.cards.push({ card_index: cardIdx, components: cardComponents });
    }
    components.push(carouselComp);
  }

  let templateButtons: any[] = [];
  if (!isCarousel) {
    if (typeof template.buttons === "string") {
      try { templateButtons = JSON.parse(template.buttons); } catch { templateButtons = []; }
    } else if (Array.isArray(template.buttons)) {
      templateButtons = template.buttons;
    }
  }
  if (templateButtons.length > 0) {
    let dynBtnIdx = 0;
    templateButtons.forEach((btn: any, index: number) => {
      if (btn.type === "URL" && btn.url?.includes("{{")) {
        const buttonParamValue = buttonParams?.[dynBtnIdx] || btn.url.replace(/\{\{1\}\}/, "");
        components.push({
          type: "button",
          sub_type: "url",
          index: index.toString(),
          parameters: [{ type: "text", text: buttonParamValue }],
        });
        dynBtnIdx++;
      } else if (btn.type === "COPY_CODE") {
        const couponCode = buttonParams?.[dynBtnIdx] || btn.example?.[0] || "";
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

  const body = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: components.length > 0 ? components : undefined,
    },
  };

  console.log("Sending WhatsApp template:", JSON.stringify(body, null, 2));

  const response = await fetch(
    `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    }
  );

  const responseData = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API Error:", responseData);
    const errorCode = responseData.error?.code;
    const errorTitle = responseData.error?.error_user_title || responseData.error?.title || "";
    const errorMsg = responseData.error?.error_user_msg || responseData.error?.message || "";
    const errorDetails = responseData.error?.error_data?.details || "";
    const enriched = getWhatsAppError(errorCode);
    const fullError = [errorTitle, errorMsg, errorDetails].filter(Boolean).join(" - ");
    const err: any = new Error(fullError || "Failed to send template");
    err.metaErrorCode = errorCode;
    err.metaErrorTitle = errorTitle;
    err.metaErrorDetails = errorDetails;
    err.enrichedDescription = enriched.description;
    err.enrichedSuggestion = enriched.suggestion;
    err.enrichedCategory = enriched.category;
    throw err;
  }

  console.log("WhatsApp template sent successfully:", responseData);
  return responseData;
}


  async sendTextMessage(to: string, text: string, replyToWaId?: string): Promise<any> {
    if (this.channel.connectionMethod === "qr_code") {
      return BaileysManager.sendMessage(this.channel.id, to, text, replyToWaId);
    }

    const formattedPhone = this.formatPhoneNumber(to);
    const body: any = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: { body: text },
    };

    if (replyToWaId) {
      body.context = { message_id: replyToWaId };
    }

    const response = await fetch(
      `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to send message");
    }

    return await response.json();
  }

  async sendMediaMessageByUrl(
    to: string,
    mediaUrl: string,
    type: "image" | "video" | "document" | "audio",
    caption?: string,
    filename?: string
  ): Promise<any> {
    if (this.channel.connectionMethod === "qr_code") {
      const mediaData = {
        url: mediaUrl,
        mimeType: type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "application/pdf",
        filename: filename || "file"
      };
      return BaileysManager.sendMediaMessage(this.channel.id, to, mediaData, caption || undefined);
    }

    const formattedPhone = this.formatPhoneNumber(to);
    const body: any = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: type,
      [type]: {
        link: mediaUrl,
        ...(caption ? { caption } : {}),
        ...(type === "document" && filename ? { filename } : {}),
      },
    };

    const response = await fetch(
      `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to send media message by URL");
    }

    return await response.json();
  }

  async getPublicMediaUrl(relativePath: string): Promise<string> {
    // Assuming your uploads are served at /uploads endpoint
    // Adjust this based on your server configuration
    const baseUrl = process.env.APP_URL || "https://yourdomain.com";

    // Remove leading slash if present
    const cleanPath = relativePath.startsWith("/")
      ? relativePath.substring(1)
      : relativePath;

    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Upload media buffer to WhatsApp (for cloud files)
   */
  async uploadMediaBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    if (this.channel.connectionMethod === "qr_code") {
      const fakeId = `qr_media_${randomUUID()}`;
      WhatsAppApiService.mediaCache.set(fakeId, { buffer, mimeType, filename });
      return fakeId;
    }
    try {
      const FormData = (await import("form-data")).default;
      const form = new FormData();

      

      form.append("file", buffer, {
        filename: filename,
        contentType: mimeType,
      });
      form.append("messaging_product", "whatsapp");

      const response = await axios.post(
        `${this.baseUrl}/${this.channel.phoneNumberId}/media`,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.channel.accessToken}`,
            ...form.getHeaders(),
          },
        }
      );

      console.log("✅ WhatsApp media upload response:", response.data);
      return response.data.id;
    } catch (error: any) {
      const errDetail = error?.response?.data ? JSON.stringify(error.response.data) : String(error);
      console.error("❌ WhatsApp upload buffer error:", errDetail);
      throw new Error(`Failed to upload media buffer to WhatsApp: ${errDetail}`);
    }
  }


  async uploadMediaBufferHeader(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();

    form.append("file", buffer, {
      filename,
      contentType: mimeType,
    });

    // 🔥 REQUIRED FIELDS
    form.append("type", mimeType); // 👈 MOST IMPORTANT
    form.append("messaging_product", "whatsapp");

    const response = await axios.post(
      `${this.baseUrl}/${this.channel.phoneNumberId}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${this.channel.accessToken}`,
          ...form.getHeaders(),
        },
      }
    );

    // console.log("✅ WhatsApp media upload response:", response.data);

    if (!response.data?.id) {
      throw new Error("WhatsApp media id not returned");
    }

    return response.data.id;
  } catch (error: any) {
    console.error(
      "❌ WhatsApp upload buffer error:",
      error?.response?.data || error
    );
    throw new Error("Failed to upload media buffer to WhatsApp");
  }
}


// template image upload

async getImageTemplateHeaderHandle(
  templateName = "image_template_1"
): Promise<string> {
  const wabaId = this.channel.whatsappBusinessAccountId;
  const accessToken = this.channel.accessToken;

  if (!wabaId) {
    throw new Error("whatsappBusinessAccountId not found in channel");
  }

  if (!accessToken) {
    throw new Error("accessToken not found in channel");
  }

  const res = await axios.get(
    `https://graph.facebook.com/v24.0/${wabaId}/message_templates`,
    {
      params: { name: templateName },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const template = res.data?.data?.[0];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  if (template.status !== "APPROVED") {
    throw new Error(
      `Template "${templateName}" is not approved (status: ${template.status})`
    );
  }

  const headerHandle =
    template.components
      ?.find(
        (c: any) => c.type === "HEADER" && c.format === "IMAGE"
      )
      ?.example?.header_handle?.[0];

  if (!headerHandle || !headerHandle.startsWith("4::")) {
    throw new Error(
      `No valid IMAGE header_handle found for template "${templateName}"`
    );
  }

  return headerHandle; // ✅ e.g. "4::aW9nZXJzL2ltYWdlLzEyMzQ1"
}



async uploadTemplateMedia(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {

  const appId = this.channel.appId || process.env.FACEBOOK_APP_ID;
  if (!appId) {
    throw new Error(
      "App ID is required for template media upload. Set FACEBOOK_APP_ID in your environment or configure embedded signup for this channel."
    );
  }

  // STEP 1️⃣ Create upload session
  const sessionRes = await axios.post(
    `https://graph.facebook.com/v24.0/${appId}/uploads`,
    {
      file_name: filename,
      file_length: buffer.length,
      file_type: mimeType
    },
    {
      headers: {
        Authorization: `Bearer ${this.channel.accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  const uploadSessionId = sessionRes.data.id;

  // STEP 2️⃣ Upload binary
  const uploadBinaryRes = await axios.post(
    `https://graph.facebook.com/v24.0/${uploadSessionId}`,
    buffer,
    {
      headers: {
        Authorization: `Bearer ${this.channel.accessToken}`,
        "Content-Type": "application/octet-stream"
      }
    }
  );

  const headerHandle = uploadBinaryRes.data.h;

  console.log("Uploaded template media, header handle:", headerHandle);

  if (!headerHandle) {
    throw new Error("No header handle returned");
  }

  return headerHandle; // ✅ "4::xxxx"
}

  async uploadMedia(filePath: string, mimeType: string, filename?: string): Promise<string> {
    if (this.channel.connectionMethod === "qr_code") {
      const fakeId = `qr_media_${randomUUID()}`;
      const name = filename || path.basename(filePath);
      WhatsAppApiService.mediaCache.set(fakeId, { url: filePath, mimeType, filename: name });
      return fakeId;
    }
    const resolvedPath = path.resolve(filePath);

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", fs.createReadStream(resolvedPath), {
      filename: path.basename(resolvedPath),
      contentType: mimeType,
    });

    console.log("Uploading local media:", resolvedPath, mimeType);

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.channel.phoneNumberId}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.channel.accessToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      console.log("Media uploaded successfully, ID:", response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error(
        "WhatsApp upload error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.error?.message || "Failed to upload media"
      );
    }
  }

  async uploadMediaManual(filePath: string, mimeType: string): Promise<string> {
    const resolvedPath = path.resolve(filePath);
    const fileBuffer = fs.readFileSync(resolvedPath);
    const fileName = path.basename(resolvedPath);

    // Create boundary for multipart form
    const boundary = `----formdata-node-${Math.random().toString(36)}`;

    // Construct multipart body manually
    const chunks: Buffer[] = [];

    // Add messaging_product field
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="messaging_product"\r\n\r\n`
      )
    );
    chunks.push(Buffer.from(`whatsapp\r\n`));

    // Add file field
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`
      )
    );
    chunks.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
    chunks.push(fileBuffer);
    chunks.push(Buffer.from(`\r\n`));

    // End boundary
    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(chunks);

    console.log("Uploading local media:", resolvedPath, mimeType);

    const response = await fetch(
      `${this.baseUrl}/${this.channel.phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.channel.accessToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp upload error response:", data);
      throw new Error(data.error?.message || "Failed to upload media");
    }

    console.log("Media uploaded successfully, ID:", data.id);
    return data.id;
  }



// Helper to resolve buffer from local path or cloud URL (including private S3/Spaces)
async resolveMediaBuffer(urlOrPath: string): Promise<Buffer> {
  const isLocal = !urlOrPath.startsWith("http://") && !urlOrPath.startsWith("https://");
  
  if (isLocal) {
    const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.substring(1) : urlOrPath;
    const resolvedPath = path.resolve(cleanPath);
    if (fs.existsSync(resolvedPath)) {
      console.log(`[resolveMediaBuffer] Reading local file: ${resolvedPath}`);
      return fs.readFileSync(resolvedPath);
    } else {
      throw new Error(`Local file not found at path: ${resolvedPath}`);
    }
  }

  // Check if it's a cloud storage URL (S3 or DigitalOcean)
  try {
    const { createDOClient } = await import('../config/digitalOceanConfig');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const doClient = await createDOClient();
    if (doClient) {
      const { s3, bucket, endpoint } = doClient;
      const isOurBucket = urlOrPath.includes(bucket) || (endpoint && urlOrPath.includes(new URL(endpoint).host));
      
      if (isOurBucket) {
        let key = "";
        if (urlOrPath.includes(`/${bucket}/`)) {
          key = urlOrPath.substring(urlOrPath.indexOf(`/${bucket}/`) + bucket.length + 2);
        } else {
          const parsedUrl = new URL(urlOrPath);
          key = parsedUrl.pathname.replace(/^\/+/, "");
        }
        key = decodeURIComponent(key);
        
        console.log(`[resolveMediaBuffer] Cloud storage match found! Downloading object: ${key}`);
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
    console.error("[resolveMediaBuffer] Failed to download from S3, falling back to HTTP fetch:", err);
  }

  // Fallback to normal HTTP download using Axios
  console.log(`[resolveMediaBuffer] Downloading via Axios: ${urlOrPath}`);
  const response = await axios.get(urlOrPath, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

// Add new function for URL uploads
async uploadMediaFromUrl(url: string, mimeType: string = 'image/jpeg'): Promise<string> {
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFileName = `temp_${Date.now()}_${path.basename(url.split('?')[0]) || 'image.jpg'}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    console.log("📥 Resolving media from url/path:", url);
    const buffer = await this.resolveMediaBuffer(url);
    
    // Save to temp file
    fs.writeFileSync(tempFilePath, buffer);
    console.log("✅ File written to:", tempFilePath);

    // Upload using existing function
    const mediaId = await this.uploadMedia(tempFilePath, mimeType);

    // Cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("🗑️ Temporary file deleted");
    }

    return mediaId;
    
  } catch (error: any) {
    // Cleanup on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    console.error("❌ Upload from URL failed:", error.message);
    throw new Error(`Failed to upload media from URL: ${error.message}`);
  }
}


  async getMediaUrl(mediaId: string): Promise<string | null> {
    if (this.channel.connectionMethod === "qr_code" || mediaId.startsWith("baileys_media_")) {
      const cached = WhatsAppApiService.mediaCache.get(mediaId);
      if (cached?.url) {
        return cached.url;
      }
      
      // Fallback: Query the database messages table to find a matching message and return its mediaUrl
      try {
        const { db } = await import("../db");
        const { messages } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        const [msgRow] = await db
          .select({ mediaUrl: messages.mediaUrl })
          .from(messages)
          .where(eq(messages.mediaId, mediaId))
          .limit(1);
        
        if (msgRow && msgRow.mediaUrl) {
          // Cache it for subsequent requests
          WhatsAppApiService.mediaCache.set(mediaId, { url: msgRow.mediaUrl });
          return msgRow.mediaUrl;
        }
      } catch (dbErr) {
        console.error("[WhatsAppApi] Failed to query mediaUrl from DB fallback:", dbErr);
      }
      
      return null;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v24.0/${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${this.channel.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error(
          "Failed to get media URL:",
          response.status,
          response.statusText
        );
        return null;
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error getting media URL:", error);
      return null;
    }
  }

  /**
   * Download media content as buffer
   */
  async getMedia(mediaId: string): Promise<Buffer | null> {
    try {
      // First, get the fresh media URL
      const mediaUrl = await this.getMediaUrl(mediaId);
      if (!mediaUrl) {
        return null;
      }

      // Check if it's a cloud storage or local URL
      const isMetaMedia = mediaUrl.includes("fbsbx.com") || 
                          mediaUrl.includes("facebook.com") || 
                          mediaUrl.includes("whatsapp.com");

      if (!isMetaMedia) {
        return await this.resolveMediaBuffer(mediaUrl);
      }

      // Then, download the media content from Meta
      const response = await fetch(mediaUrl, {
        headers: {
          Authorization: `Bearer ${this.channel.accessToken}`,
          "User-Agent": "WhatsAppBusinessAPI/1.0",
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to download media:",
          response.status,
          response.statusText
        );
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Error downloading media:", error);
      return null;
    }
  }

  /**
   * Stream media content directly
   */
  async streamMedia(mediaId: string, res: Response<any>): Promise<boolean> {
    try {
      // First, get the fresh media URL
      const mediaUrl = await this.getMediaUrl(mediaId);
      if (!mediaUrl) {
        return false;
      }

      // Check if it's a local file or cloud S3/Spaces URL
      const isMetaMedia = mediaUrl.includes("fbsbx.com") || 
                          mediaUrl.includes("facebook.com") || 
                          mediaUrl.includes("whatsapp.com");

      if (!isMetaMedia) {
        if (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://")) {
          // Local file path
          const cleanPath = mediaUrl.replace(/^\//, "");
          const localPath = path.join(process.cwd(), cleanPath);
          if (fs.existsSync(localPath)) {
            res.sendFile(localPath);
            return true;
          }
          return false;
        } else {
          // Cloud S3 URL, stream using direct axios request without authorization header
          const response = await axios({
            method: "get",
            url: mediaUrl,
            responseType: "stream",
          });
          if (response.status !== 200) {
            return false;
          }
          if (response.headers["content-length"]) {
            res.set("Content-Length", response.headers["content-length"]);
          }
          response.data.pipe(res);
          return new Promise((resolve, reject) => {
            response.data.on("end", () => resolve(true));
            response.data.on("error", (error: any) => {
              console.error("Stream error:", error);
              reject(false);
            });
          });
        }
      }

      // Stream Meta Cloud API media using axios with Authorization header
      const response = await axios({
        method: "get",
        url: mediaUrl,
        responseType: "stream",
        headers: {
          Authorization: `Bearer ${this.channel.accessToken}`,
          "User-Agent": "WhatsAppBusinessAPI/1.0",
        },
      });

      if (response.status !== 200) {
        console.error(
          "Failed to stream media:",
          response.status,
          response.statusText
        );
        return false;
      }

      // Set content length if available
      if (response.headers["content-length"]) {
        res.set("Content-Length", response.headers["content-length"]);
      }

      // Pipe the stream
      response.data.pipe(res);

      return new Promise((resolve, reject) => {
        response.data.on("end", () => resolve(true));
        response.data.on("error", (error: any) => {
          console.error("Stream error:", error);
          reject(false);
        });
      });
    } catch (error) {
      console.error("Error streaming media with axios:", error);
      return false;
    }
  }

  // Optional: Method to download and save media locally
  async downloadAndSaveMedia(
    mediaUrl: string,
    fileName: string
  ): Promise<string> {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.channel.accessToken}`,
        "User-Agent": "WhatsAppBusinessAPI/1.0",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download media");
    }

    const buffer = await response.arrayBuffer();
    const localPath = path.join("uploads", "media", fileName);

    // Ensure directory exists
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(localPath, Buffer.from(buffer));
    return localPath;
  }

  async getMediaBuffer(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const mediaUrl = await this.getMediaUrl(mediaId);
    if (!mediaUrl) {
      throw new Error(`Failed to resolve media URL for ID: ${mediaId}`);
    }

    const isMetaMedia = mediaUrl.includes("fbsbx.com") || 
                        mediaUrl.includes("facebook.com") || 
                        mediaUrl.includes("whatsapp.com");

    if (!isMetaMedia) {
      const buffer = await this.resolveMediaBuffer(mediaUrl);
      return { buffer, mimeType: "audio/ogg" };
    }

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.channel.accessToken}`,
        "User-Agent": "WhatsAppBusinessAPI/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media from Meta (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") || "audio/ogg";
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  }

  async sendMediaMessageOLDDDAA(
    to: string,
    mediaId: string,
    type: "image" | "video" | "audio" | "document",
    caption?: string
  ): Promise<any> {
    const formattedPhone = this.formatPhoneNumber(to);

    const body: any = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: type,
      [type]: {
        id: mediaId,
      },
    };

    console.log("Sending WhatsApp media message:", {
      to: formattedPhone,
      mediaId,
      type,
      caption,
    });

    if (
      caption &&
      (type === "image" || type === "video" || type === "document")
    ) {
      body[type].caption = caption;
    }

    const response = await fetch(
      `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to send media message");
    }

    return data;
  }

  async sendMediaMessage(
  to: string,
  templateName: string,
  parameters: string[],
  mediaId?: string,
) {
  if (this.channel.connectionMethod === "qr_code") {
    console.log(`[WhatsApp-QR] Skipping sendMediaMessage to ${to}`);
    return {
      messaging_product: "whatsapp",
      contacts: [{ input: to, wa_id: to }],
      messages: [{ id: `qr_wamid_${randomUUID()}` }],
      _sentVia: "qr_code"
    };
  }

  const formattedPhone = this.formatPhoneNumber(to);

  const cleanMediaId = (id: any) => (id && /^\d+$/.test(String(id)) ? parseInt(String(id), 10) : id);
  const components: any[] = [];

  // ✅ HEADER IMAGE
  if (mediaId) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: { id: cleanMediaId(mediaId) },
        },
      ],
    });
  }

  // ✅ BODY VARIABLES
  if (parameters?.length) {
    components.push({
      type: "body",
      parameters: parameters.map((p) => ({
        type: "text",
        text: p,
      })),
    });
  }

  const body = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      components,
    },
  };

  console.log("📤 TEMPLATE PAYLOAD =>", JSON.stringify(body, null, 2));

  const response = await fetch(
    `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to send template");
  }

  return data;
}


async sendMediaMessagee(
  to: string,
  mediaId: string,
  mediaType: "image" | "video" | "audio" | "document",
  caption?: string,
  replyToWaId?: string,
  isVoiceNote?: boolean,
  mediaUrl?: string,
  mediaFileName?: string,
  mediaMimeType?: string
) {
  const formattedPhone = this.formatPhoneNumber(to);

  const body: any = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: mediaType,
    [mediaType]: {
      id: mediaId || undefined,
      link: mediaUrl || undefined,
      filename: mediaFileName || undefined,
      mime_type: mediaMimeType || undefined
    },
  };

  if (isVoiceNote && mediaType === "audio") {
    body[mediaType].voice = true;
    body.metadata = { voice: true };
  }

  if (replyToWaId) {
    body.context = { message_id: replyToWaId };
  }

  if (caption && (mediaType === "image" || mediaType === "video" || mediaType === "document")) {
    body[mediaType].caption = caption;
  }

  console.log("📤 MEDIA PAYLOAD =>", JSON.stringify(body, null, 2));

  return this.sendDirectMessage(body);
}

  async sendVoiceNote(to: string, mediaUrl: string): Promise<any> {
    if (this.channel.connectionMethod === "qr_code") {
      const mediaData = {
        url: mediaUrl,
        mimeType: "audio/ogg; codecs=opus",
        filename: "audio.ogg",
        ptt: true
      };
      return BaileysManager.sendMediaMessage(this.channel.id, to, mediaData, undefined);
    }

    const formattedPhone = this.formatPhoneNumber(to);
    const body = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "audio",
      audio: {
        link: mediaUrl
      }
    };
    return this.sendDirectMessage(body);
  }



  async markMessageAsRead(whatsappMessageId: string): Promise<any> {
    if (this.channel.connectionMethod === "qr_code") {
      return null;
    }

    const url = `${this.baseUrl}/${this.channel.phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: whatsappMessageId,
    };

    console.log(`[WhatsApp-API] Marking message as read: ${whatsappMessageId}`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.channel.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("❌ Failed to mark message as read on WABA:", data.error?.message || data);
      }
      return data;
    } catch (err: any) {
      console.error("❌ Error marking message as read on WABA:", err.message || err);
      return null;
    }
  }

  async sendDirectMessage(payload: any): Promise<any> {
    if (this.channel.connectionMethod === "qr_code") {
      const to = payload.to;
      const type = payload.type;
      
      if (type === "text") {
        const text = payload.text?.body || "";
        const replyToWaId = payload.context?.message_id;
        return BaileysManager.sendMessage(this.channel.id, to, text, replyToWaId);
      } else if (type === "template") {
        const templateName = payload.template?.name;
        const components = payload.template?.components || [];
        
        const template = await storage.getTemplateByNameAndChannel(templateName, this.channel.id)
          || (await storage.getTemplatesByName(templateName))[0];
        
        let text = "";
        if (template) {
          text = template.body;
          const bodyComp = components.find((c: any) => c.type === "body");
          if (bodyComp && bodyComp.parameters) {
            bodyComp.parameters.forEach((param: any, idx: number) => {
              const val = param.text || "";
              text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
            });
          }
        } else {
          text = `Template: ${templateName}`;
        }
        
        return BaileysManager.sendMessage(this.channel.id, to, text);
      } else if (["image", "video", "audio", "document"].includes(type)) {
        const mediaObj = payload[type];
        const mediaId = mediaObj?.id;
        const caption = mediaObj?.caption;
        const replyToWaId = payload.context?.message_id;
        
        let mediaData = WhatsAppApiService.mediaCache.get(mediaId);
        if (!mediaData) {
          const link = mediaObj?.link;
          if (link) {
            mediaData = { 
              url: link, 
              mimeType: mediaObj?.mime_type || (type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "application/octet-stream"),
              filename: mediaObj?.filename || undefined
            };
          }
        } else if (mediaObj?.filename && mediaData) {
          mediaData = { ...mediaData, filename: mediaObj.filename };
        }
        
        if (mediaData) {
          const isPtt = type === "audio" && (mediaObj?.voice || mediaObj?.ptt || payload.metadata?.voice);
          return BaileysManager.sendMediaMessage(this.channel.id, to, { ...mediaData, ptt: !!isPtt } as any, caption, replyToWaId);
        } else {
          if (caption) {
            return BaileysManager.sendMessage(this.channel.id, to, caption, replyToWaId);
          }
          throw new Error(`Media not found in cache or payload for QR message: ${mediaId}`);
        }
      } else {
        console.warn(`[WhatsApp-QR] Unsupported message type: ${type}`);
        return {
          messaging_product: "whatsapp",
          contacts: [{ input: to, wa_id: to }],
          messages: [{ id: `qr_wamid_${randomUUID()}` }],
          _sentVia: "qr_code"
        };
      }
    }

    // Format phone number if 'to' field exists
    if (payload.to) {
      payload.to = this.formatPhoneNumber(payload.to);
    }

    const body = {
      messaging_product: "whatsapp",
      ...payload,
    };
    console.log("Sending direct WhatsApp message with payload:", body);
    const response = await fetch(
      `${this.baseUrl}/${this.channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to send message");
    }

    const data = await response.json();
    console.log("Direct WhatsApp message sent successfully:", data);
    return data;
  }


  

  async getMessageStatus(whatsappMessageId: string): Promise<any> {
    // WhatsApp doesn't provide a direct API to get message status by ID
    // Status updates come through webhooks, so we'll return a mock response
    // In production, you would store webhook status updates and query from database
    return {
      status: "sent",
      deliveredAt: null,
      readAt: null,
      errorCode: null,
      errorMessage: null,
    };
  }
}
