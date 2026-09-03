import { db, dbRead } from "../db";
import { whatsappFlows, whatsappFlowResponses, channels, conversations, contacts, messages, users, whatsappBusinessAccountsConfig } from "@shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface MetaFlowAsset {
  name: string;
  asset_type: string;
}

export const SAMPLE_FLOW_TEMPLATES: Record<string, {
  name: string;
  categories: string[];
  headerText: string;
  bodyText: string;
  footerText: string;
  ctaButtonText: string;
  triggerKeywords: string[];
  flowJson: any;
}> = {
  lead_qualification: {
    name: "Lead Qualification Form",
    categories: ["LEAD_GENERATION"],
    headerText: "💼 Business Inquiry",
    bodyText: "Please fill in a few details so we can understand your business needs and assign the best specialist for you.",
    footerText: "Quick 1-minute form",
    ctaButtonText: "Start Form",
    triggerKeywords: ["lead", "quote", "inquiry", "pricing", "demo"],
    flowJson: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: "Lead Qualification",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "Tell us about your requirements",
              },
              {
                type: "TextInput",
                name: "full_name",
                label: "Full Name",
                required: true,
              },
              {
                type: "TextInput",
                name: "company_name",
                label: "Company / Business Name",
                required: true,
              },
              {
                type: "TextInput",
                name: "work_email",
                label: "Work Email",
                required: true,
                "input-type": "email",
              },
              {
                type: "Dropdown",
                name: "industry",
                label: "Industry",
                required: true,
                "data-source": [
                  { id: "ecommerce", title: "E-Commerce & Retail" },
                  { id: "real_estate", title: "Real Estate & Construction" },
                  { id: "healthcare", title: "Healthcare & Clinic" },
                  { id: "finance", title: "Finance & Legal" },
                  { id: "education", title: "Education & Coaching" },
                  { id: "technology", title: "IT & Technology" },
                  { id: "other", title: "Other Services" },
                ],
              },
              {
                type: "Dropdown",
                name: "budget",
                label: "Estimated Monthly Budget",
                required: true,
                "data-source": [
                  { id: "tier_1", title: "Under $1,000" },
                  { id: "tier_2", title: "$1,000 - $5,000" },
                  { id: "tier_3", title: "$5,000 - $15,000" },
                  { id: "tier_4", title: "$15,000+" },
                ],
              },
              {
                type: "TextArea",
                name: "project_details",
                label: "Describe your project or goals",
                required: false,
              },
              {
                type: "Footer",
                label: "Submit Application",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    full_name: "${form.full_name}",
                    company_name: "${form.company_name}",
                    work_email: "${form.work_email}",
                    industry: "${form.industry}",
                    budget: "${form.budget}",
                    project_details: "${form.project_details}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  customer_feedback: {
    name: "Customer Feedback & NPS Survey",
    categories: ["SURVEY"],
    headerText: "⭐ We value your feedback",
    bodyText: "How was your recent experience with our team? Your feedback helps us improve.",
    footerText: "Takes 30 seconds",
    ctaButtonText: "Give Feedback",
    triggerKeywords: ["feedback", "survey", "review", "rate", "nps"],
    flowJson: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: "Feedback Survey",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "How likely are you to recommend us?",
              },
              {
                type: "Dropdown",
                name: "nps_rating",
                label: "Rating (1 = Poor, 10 = Outstanding)",
                required: true,
                "data-source": [
                  { id: "10", title: "10 - Extremely Likely 🌟" },
                  { id: "9", title: "9 - Very Likely" },
                  { id: "8", title: "8 - Likely" },
                  { id: "7", title: "7 - Neutral" },
                  { id: "5", title: "5 - Needs Improvement" },
                  { id: "1", title: "1 - Unlikely" },
                ],
              },
              {
                type: "CheckboxGroup",
                name: "liked_aspects",
                label: "What did you like most?",
                required: false,
                "data-source": [
                  { id: "speed", title: "Response Speed & Support" },
                  { id: "quality", title: "Product / Service Quality" },
                  { id: "pricing", title: "Value for Money" },
                  { id: "ease", title: "Ease of Communication" },
                ],
              },
              {
                type: "TextArea",
                name: "suggestions",
                label: "Any suggestions for improvement?",
                required: false,
              },
              {
                type: "Footer",
                label: "Submit Feedback",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    nps_rating: "${form.nps_rating}",
                    liked_aspects: "${form.liked_aspects}",
                    suggestions: "${form.suggestions}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  appointment_booking: {
    name: "Appointment & Consultation Booking",
    categories: ["APPOINTMENT_BOOKING"],
    headerText: "📅 Schedule a Consultation",
    bodyText: "Select your preferred service, date, and time slot for a personalized consultation.",
    footerText: "Instant booking confirmation",
    ctaButtonText: "Book Appointment",
    triggerKeywords: ["book", "appointment", "consultation", "schedule", "meeting", "call"],
    flowJson: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: "Book Appointment",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "Select your session details",
              },
              {
                type: "Dropdown",
                name: "service_type",
                label: "Consultation Service",
                required: true,
                "data-source": [
                  { id: "initial_audit", title: "Initial Strategy Audit (30 Min)" },
                  { id: "product_demo", title: "Product Demonstration (45 Min)" },
                  { id: "technical_setup", title: "Technical Setup & Onboarding" },
                  { id: "executive_briefing", title: "Executive Business Review" },
                ],
              },
              {
                type: "DatePicker",
                name: "preferred_date",
                label: "Preferred Date",
                required: true,
              },
              {
                type: "Dropdown",
                name: "time_slot",
                label: "Preferred Time Slot",
                required: true,
                "data-source": [
                  { id: "morning_1", title: "10:00 AM - 11:00 AM" },
                  { id: "morning_2", title: "11:30 AM - 12:30 PM" },
                  { id: "afternoon_1", title: "02:00 PM - 03:00 PM" },
                  { id: "afternoon_2", title: "03:30 PM - 04:30 PM" },
                  { id: "evening_1", title: "05:00 PM - 06:00 PM" },
                ],
              },
              {
                type: "TextArea",
                name: "meeting_notes",
                label: "Topic or Specific Questions",
                required: false,
              },
              {
                type: "Footer",
                label: "Confirm Booking",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    service_type: "${form.service_type}",
                    preferred_date: "${form.preferred_date}",
                    time_slot: "${form.time_slot}",
                    meeting_notes: "${form.meeting_notes}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  support_ticket: {
    name: "Support Ticket & Service Request",
    categories: ["CUSTOMER_SUPPORT"],
    headerText: "🛠️ Support Desk",
    bodyText: "Need assistance? Submit a support request directly to our customer success team.",
    footerText: "Ticket created immediately",
    ctaButtonText: "Open Ticket",
    triggerKeywords: ["support", "ticket", "help", "issue", "bug", "problem"],
    flowJson: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: "Submit Support Request",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "Describe your issue",
              },
              {
                type: "Dropdown",
                name: "category",
                label: "Issue Category",
                required: true,
                "data-source": [
                  { id: "account_login", title: "Account / Login / Permissions" },
                  { id: "billing_invoice", title: "Billing, Plans & Invoices" },
                  { id: "campaign_delivery", title: "Campaigns & WhatsApp Messaging" },
                  { id: "api_webhook", title: "API, Integrations & Webhooks" },
                  { id: "other", title: "General Inquiry" },
                ],
              },
              {
                type: "RadioButtonsGroup",
                name: "priority",
                label: "Urgency / Priority",
                required: true,
                "data-source": [
                  { id: "low", title: "Low (General question)" },
                  { id: "medium", title: "Medium (Feature hindered)" },
                  { id: "high", title: "High (Business critical blocker)" },
                ],
              },
              {
                type: "TextInput",
                name: "subject",
                label: "Summary / Subject",
                required: true,
              },
              {
                type: "TextArea",
                name: "description",
                label: "Detailed Steps & Description",
                required: true,
              },
              {
                type: "Footer",
                label: "Submit Ticket",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    category: "${form.category}",
                    priority: "${form.priority}",
                    subject: "${form.subject}",
                    description: "${form.description}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  product_inquiry: {
    name: "Product & Order Inquiry",
    categories: ["OTHER"],
    headerText: "🛍️ Product Information",
    bodyText: "Interested in our products or custom volume pricing? Request a catalog or quote.",
    footerText: "Official product inquiry",
    ctaButtonText: "Request Quote",
    triggerKeywords: ["product", "catalog", "order", "buy", "stock"],
    flowJson: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: "Product Inquiry",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "Select Product Interest",
              },
              {
                type: "Dropdown",
                name: "product_line",
                label: "Product Category",
                required: true,
                "data-source": [
                  { id: "packages", title: "Standard Service Packages" },
                  { id: "enterprise", title: "Custom Enterprise Solution" },
                  { id: "hardware", title: "Hardware & Devices" },
                  { id: "consulting", title: "Dedicated Consulting" },
                ],
              },
              {
                type: "TextInput",
                name: "quantity",
                label: "Estimated Quantity / Units",
                required: false,
                "input-type": "number",
              },
              {
                type: "TextInput",
                name: "delivery_city",
                label: "Delivery City / Region",
                required: true,
              },
              {
                type: "TextArea",
                name: "notes",
                label: "Specific Requirements or Questions",
                required: false,
              },
              {
                type: "Footer",
                label: "Send Inquiry",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    product_line: "${form.product_line}",
                    quantity: "${form.quantity}",
                    delivery_city: "${form.delivery_city}",
                    notes: "${form.notes}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

export class WhatsappFlowsService {
  /**
   * Helper to retrieve Meta credentials from channel config
   */
  private static async getChannelMetaCredentials(channelId: string) {
    const [channel] = await dbRead
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const rawChannel = channel as any;
    const config = (rawChannel.config || {}) as Record<string, any>;
    
    let accessToken =
      rawChannel.accessToken ||
      rawChannel.access_token ||
      config.permanentAccessToken ||
      config.accessToken;
    
    let wabaId =
      rawChannel.whatsappBusinessAccountId ||
      rawChannel.whatsapp_business_account_id ||
      config.wabaId ||
      config.businessAccountId;

    let phoneNumberId =
      rawChannel.phoneNumberId ||
      rawChannel.phone_number_id ||
      config.phoneNumberId;

    // Fallback: Check global WABA config if channel doesn't have direct credentials
    if (!wabaId || !accessToken) {
      try {
        const [wabaConfig] = await dbRead
          .select()
          .from(whatsappBusinessAccountsConfig)
          .limit(1);
        
        if (wabaConfig) {
          const rawWaba = wabaConfig as any;
          if (!wabaId) {
            wabaId = rawWaba.wabaId || rawWaba.businessAccountId;
          }
          if (!accessToken) {
            accessToken = rawWaba.systemUserAccessToken || rawWaba.permanentToken || rawWaba.accessToken;
          }
        }
      } catch (err) {
        console.warn("[WhatsappFlowsService] Error fetching fallback WABA config:", err);
      }
    }

    return {
      channel,
      accessToken,
      wabaId,
      phoneNumberId,
    };
  }

  /**
   * Create a Flow on Meta Graph API
   */
  static async createFlowOnMeta(channelId: string, { name, categories }: { name: string; categories?: string[] }) {
    const { accessToken, wabaId } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken || !wabaId) {
      throw new Error("Meta WABA credentials (access token and WABA ID) not configured for this channel.");
    }

    const flowCategories = categories && categories.length > 0 ? categories : ["OTHER"];

    let res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/flows`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        categories: flowCategories,
      }),
    });

    let data = await res.json();

    // If flow name is not unique (error_subcode 4016019)
    if (!res.ok && data.error?.error_subcode === 4016019) {
      // 1. Try to find existing flow on WABA with this name
      try {
        const listRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/flows?fields=id,name`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const listData = await listRes.json();
        const existingOnMeta = (listData.data || []).find((f: any) => f.name.toLowerCase() === name.toLowerCase());
        if (existingOnMeta?.id) {
          return { flowId: existingOnMeta.id as string };
        }
      } catch (listErr) {
        console.warn("[WhatsappFlowsService] Error searching existing flows on WABA:", listErr);
      }

      // 2. Retry with short suffix
      const uniqueName = `${name.substring(0, 50)}_${Date.now().toString(36).slice(-4)}`;
      res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/flows`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: uniqueName,
          categories: flowCategories,
        }),
      });
      data = await res.json();
    }

    if (!res.ok || data.error) {
      const msg = data.error?.error_user_msg || data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flow Creation Error: ${msg}`);
    }

    return {
      flowId: data.id as string,
    };
  }

  /**
   * Upload Flow JSON asset to Meta Graph API
   */
  static async updateFlowJsonOnMeta(channelId: string, metaFlowId: string, flowJson: any) {
    const { accessToken } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken) {
      throw new Error("Meta access token not configured for this channel.");
    }

    const jsonString = typeof flowJson === "string" ? flowJson : JSON.stringify(flowJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const formData = new FormData();
    formData.append("name", "flow.json");
    formData.append("asset_type", "FLOW_JSON");
    formData.append("file", blob, "flow.json");

    const res = await fetch(`https://graph.facebook.com/v21.0/${metaFlowId}/assets`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.error_user_msg || data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flow JSON Upload Error: ${msg}`);
    }

    return data;
  }

  /**
   * Publish a Flow on Meta Graph API
   */
  static async publishFlowOnMeta(channelId: string, metaFlowId: string) {
    const { accessToken } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken) {
      throw new Error("Meta access token not configured for this channel.");
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${metaFlowId}/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flow Publish Error: ${msg}`);
    }

    return data;
  }

  /**
   * Deprecate a Flow on Meta Graph API
   */
  static async deprecateFlowOnMeta(channelId: string, metaFlowId: string) {
    const { accessToken } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken) {
      throw new Error("Meta access token not configured for this channel.");
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${metaFlowId}/deprecate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flow Deprecate Error: ${msg}`);
    }

    return data;
  }

  /**
   * Delete a Flow on Meta Graph API
   */
  static async deleteFlowOnMeta(channelId: string, metaFlowId: string) {
    const { accessToken } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken) {
      throw new Error("Meta access token not configured for this channel.");
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${metaFlowId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flow Delete Error: ${msg}`);
    }

    return data;
  }

  /**
   * Sync and fetch all Flows directly from Meta WABA
   */
  static async syncFlowsFromMeta(channelId: string, tenantId: string) {
    const { accessToken, wabaId } = await this.getChannelMetaCredentials(channelId);

    if (!accessToken || !wabaId) {
      throw new Error("Meta WABA credentials (access token and WABA ID) not configured for this channel.");
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/flows?fields=id,name,status,categories,preview`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || JSON.stringify(data);
      throw new Error(`Meta Flows Sync Error: ${msg}`);
    }

    const metaFlowsList: any[] = data.data || [];
    const syncedFlows: any[] = [];

    for (const metaFlow of metaFlowsList) {
      const [existing] = await db
        .select()
        .from(whatsappFlows)
        .where(
          or(
            eq(whatsappFlows.flowId, metaFlow.id),
            and(eq(whatsappFlows.channelId, channelId), eq(whatsappFlows.name, metaFlow.name))
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(whatsappFlows)
          .set({
            flowId: metaFlow.id,
            status: metaFlow.status || existing.status,
            categories: metaFlow.categories || existing.categories,
            previewUrl: metaFlow.preview?.preview_url || existing.previewUrl,
            updatedAt: new Date(),
          })
          .where(eq(whatsappFlows.id, existing.id))
          .returning();
        syncedFlows.push(updated);
      } else {
        const [inserted] = await db
          .insert(whatsappFlows)
          .values({
            tenantId,
            channelId,
            flowId: metaFlow.id,
            name: metaFlow.name,
            status: metaFlow.status || "DRAFT",
            categories: metaFlow.categories || ["OTHER"],
            previewUrl: metaFlow.preview?.preview_url || null,
            bodyText: "Please complete the interactive form below:",
            ctaButtonText: "Start Flow",
          })
          .returning();
        syncedFlows.push(inserted);
      }
    }

    return {
      syncedCount: syncedFlows.length,
      flows: syncedFlows,
    };
  }

  /**
   * Send an Interactive WhatsApp Flow Message
   */
  static async sendFlowMessage(
    channelId: string,
    recipientPhone: string,
    flow: any,
    options: {
      initialScreen?: string;
      initialData?: Record<string, any>;
      token?: string;
    } = {}
  ) {
    const { accessToken, phoneNumberId } = await this.getChannelMetaCredentials(channelId);

    const cleanPhone = recipientPhone.replace(/\D/g, "");
    const flowToken = options.token || `flow_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const initialScreen = options.initialScreen || flow.flowJson?.screens?.[0]?.id || "SCREEN_FORM";

    if (!accessToken || !phoneNumberId) {
      throw new Error("Channel Meta credentials not configured. Flow sending requires Cloud API channel.");
    }

    let metaFlowId = flow.flowId;

    // If flow is not yet synced / registered with Meta WABA, auto-register and upload asset now
    if (!metaFlowId && flow.flowJson) {
      try {
        console.log(`[WhatsappFlowsService] Flow "${flow.name}" (${flow.id}) has no Meta flowId. Auto-creating on Meta WABA...`);
        const metaRes = await this.createFlowOnMeta(channelId, {
          name: flow.name,
          categories: flow.categories,
        });
        metaFlowId = metaRes.flowId;

        // Upload JSON asset
        await this.updateFlowJsonOnMeta(channelId, metaFlowId, flow.flowJson);

        // Publish flow on Meta
        try {
          await this.publishFlowOnMeta(channelId, metaFlowId);
        } catch (pubErr: any) {
          console.warn("[WhatsappFlowsService] Auto-publish notice:", pubErr?.message || pubErr);
        }

        // Save flowId and status in database
        await db
          .update(whatsappFlows)
          .set({
            flowId: metaFlowId,
            status: "PUBLISHED",
            updatedAt: new Date(),
          })
          .where(eq(whatsappFlows.id, flow.id));
      } catch (autoSyncErr: any) {
        console.error("[WhatsappFlowsService] Auto-sync to Meta failed:", autoSyncErr);
        throw new Error(`Failed to initialize Flow with Meta Cloud API: ${autoSyncErr.message}`);
      }
    }

    if (!metaFlowId) {
      throw new Error(`WhatsApp Flow "${flow.name}" has no Meta Flow ID. Please click "Sync with Meta" in the Flow Editor.`);
    }

    const actionPayload: Record<string, any> = {
      screen: initialScreen,
    };

    if (options.initialData && Object.keys(options.initialData).length > 0) {
      actionPayload.data = options.initialData;
    }

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "interactive",
      interactive: {
        type: "flow",
        body: {
          text: flow.bodyText || "Please complete the interactive form below:",
        },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: flowToken,
            flow_id: metaFlowId,
            flow_cta: flow.ctaButtonText || "Start Form",
            flow_action: "navigate",
            flow_action_payload: actionPayload,
          },
        },
      },
    };

    if (flow.headerText && flow.headerText.trim()) {
      payload.interactive.header = {
        type: "text",
        text: flow.headerText.trim(),
      };
    }

    if (flow.footerText && flow.footerText.trim()) {
      payload.interactive.footer = {
        text: flow.footerText.trim(),
      };
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || JSON.stringify(data);
      throw new Error(`WhatsApp Flow Send Error: ${msg}`);
    }

    const whatsappMessageId = data.messages?.[0]?.id;

    // Record outbound message in conversation
    try {
      let [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.channelId, channelId),
            or(
              eq(conversations.contactPhone, cleanPhone),
              eq(conversations.contactPhone, `+${cleanPhone}`)
            )
          )
        )
        .limit(1);

      if (conversation) {
        await db.insert(messages).values({
          conversationId: conversation.id,
          whatsappMessageId,
          content: `🌊 [WhatsApp Flow Sent] ${flow.name}\n${flow.bodyText || ""}`,
          direction: "outbound",
          type: "interactive",
          fromUser: true,
          status: "sent",
          metadata: {
            flowId: flow.id,
            metaFlowId: flow.flowId,
            flowName: flow.name,
            flowToken,
          },
        });
      }
    } catch (saveErr) {
      console.warn("[WhatsappFlowsService] Failed to record outbound flow message in DB:", saveErr);
    }

    return {
      success: true,
      whatsappMessageId,
      flowToken,
    };
  }

  /**
   * Seed standard 5 sample flow templates for a tenant & channel
   */
  static async seedSampleFlows(tenantId: string, channelId: string) {
    const createdFlows = [];

    for (const [key, template] of Object.entries(SAMPLE_FLOW_TEMPLATES)) {
      const [existing] = await db
        .select()
        .from(whatsappFlows)
        .where(
          and(
            eq(whatsappFlows.tenantId, tenantId),
            eq(whatsappFlows.channelId, channelId),
            eq(whatsappFlows.name, template.name)
          )
        )
        .limit(1);

      if (!existing) {
        const [inserted] = await db
          .insert(whatsappFlows)
          .values({
            tenantId,
            channelId,
            name: template.name,
            categories: template.categories,
            status: "DRAFT",
            flowJson: template.flowJson,
            headerText: template.headerText,
            bodyText: template.bodyText,
            footerText: template.footerText,
            ctaButtonText: template.ctaButtonText,
            triggerKeywords: template.triggerKeywords,
            autoSaveContactFields: true,
            isSample: true,
          })
          .returning();
        createdFlows.push(inserted);
      }
    }

    return createdFlows;
  }
}
