import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from "../storage";
import ExcelJS from "exceljs";

export interface ServiceTemplateDef {
  key: string;
  name: string;
  title: string;
  description: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  variables: { index: number; name: string; label: string; sample: string }[];
  defaultHeader?: string;
  defaultBody: string;
  defaultFooter?: string;
  defaultButtons?: any[];
  metaPayload: {
    name: string;
    category: "UTILITY" | "MARKETING";
    language: string;
    components: any[];
  };
  localData: {
    header?: string;
    body: string;
    footer?: string;
    mediaType?: string;
    buttons?: any[];
  };
}

export const SERVICE_BOOKING_TEMPLATES_DEFINITIONS: Record<string, ServiceTemplateDef> = {
  service_booking_confirmed: {
    key: "service_booking_confirmed",
    name: "service_booking_confirmed",
    title: "Appointment Booking Confirmation",
    description: "Sent immediately to customer when an appointment is booked with specialist, date, slot time, and total amount.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "Sarah Jenkins" },
      { index: 2, name: "booking_number", label: "Booking Number", sample: "SB-2026-001" },
      { index: 3, name: "service_name", label: "Service Name", sample: "Hair Styling & Treatment" },
      { index: 4, name: "specialist_name", label: "Specialist / Staff", sample: "Dr. Alex Carter" },
      { index: 5, name: "booking_date", label: "Appointment Date", sample: "2026-09-15" },
      { index: 6, name: "time_slot", label: "Time Slot", sample: "10:30 AM - 11:15 AM" },
      { index: 7, name: "total_amount", label: "Total Price", sample: "INR 850.00" },
      { index: 8, name: "payment_method", label: "Payment Mode", sample: "Pay at Venue (Cash/Card)" },
    ],
    defaultHeader: "Booking Confirmed",
    defaultBody:
      "Hello {{1}}, your appointment #{{2}} for {{3}} with {{4}} has been confirmed for {{5}} at {{6}}. Total Amount: {{7}}. Payment Mode: {{8}}. We look forward to welcoming you!",
    defaultFooter: "Service Appointment Confirmation",
    defaultButtons: [],
    metaPayload: {
      name: "service_booking_confirmed",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Booking Confirmed",
        },
        {
          type: "BODY",
          text: "Hello {{1}}, your appointment #{{2}} for {{3}} with {{4}} has been confirmed for {{5}} at {{6}}. Total Amount: {{7}}. Payment Mode: {{8}}. We look forward to welcoming you!",
          example: {
            body_text: [
              [
                "Sarah Jenkins",
                "SB-2026-001",
                "Hair Styling & Treatment",
                "Dr. Alex Carter",
                "2026-09-15",
                "10:30 AM - 11:15 AM",
                "INR 850.00",
                "Pay at Venue (Cash/Card)",
              ],
            ],
          },
        },
        {
          type: "FOOTER",
          text: "Service Appointment Confirmation",
        },
      ],
    },
    localData: {
      header: "Booking Confirmed",
      body: "Hello {{1}}, your appointment #{{2}} for {{3}} with {{4}} has been confirmed for {{5}} at {{6}}. Total Amount: {{7}}. Payment Mode: {{8}}. We look forward to welcoming you!",
      footer: "Service Appointment Confirmation",
      mediaType: "text",
      buttons: [],
    },
  },

  service_booking_reminder_1: {
    key: "service_booking_reminder_1",
    name: "service_booking_reminder_1",
    title: "Appointment Reminder (24 Hours Prior)",
    description: "Scheduled reminder sent to clients 24 hours prior to their upcoming appointment.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "Sarah Jenkins" },
      { index: 2, name: "service_name", label: "Service Name", sample: "Hair Styling & Treatment" },
      { index: 3, name: "specialist_name", label: "Specialist", sample: "Dr. Alex Carter" },
      { index: 4, name: "booking_date", label: "Date", sample: "Tomorrow (2026-09-15)" },
      { index: 5, name: "time_slot", label: "Time Slot", sample: "10:30 AM - 11:15 AM" },
    ],
    defaultHeader: "Appointment Reminder",
    defaultBody:
      "Hello {{1}}, this is a friendly reminder of your upcoming appointment for {{2}} with {{3}} scheduled for {{4}} at {{5}}. Please arrive 5 minutes early.",
    defaultFooter: "Appointment Reminder",
    defaultButtons: [],
    metaPayload: {
      name: "service_booking_reminder_1",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Appointment Reminder",
        },
        {
          type: "BODY",
          text: "Hello {{1}}, this is a friendly reminder of your upcoming appointment for {{2}} with {{3}} scheduled for {{4}} at {{5}}. Please arrive 5 minutes early.",
          example: {
            body_text: [
              [
                "Sarah Jenkins",
                "Hair Styling & Treatment",
                "Dr. Alex Carter",
                "Tomorrow (2026-09-15)",
                "10:30 AM - 11:15 AM",
              ],
            ],
          },
        },
        {
          type: "FOOTER",
          text: "Appointment Reminder",
        },
      ],
    },
    localData: {
      header: "Appointment Reminder",
      body: "Hello {{1}}, this is a friendly reminder of your upcoming appointment for {{2}} with {{3}} scheduled for {{4}} at {{5}}. Please arrive 5 minutes early.",
      footer: "Appointment Reminder",
      mediaType: "text",
      buttons: [],
    },
  },

  service_booking_abandoned_1: {
    key: "service_booking_abandoned_1",
    name: "service_booking_abandoned_1",
    title: "Abandoned Booking Reminder 1",
    description: "Initial recovery reminder sent to clients who started booking a service appointment but didn't finish.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "Sarah" },
      { index: 2, name: "service_name", label: "Service Name", sample: "Dental Consultation" },
      { index: 3, name: "price", label: "Service Price", sample: "INR 500.00" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Hello {{1}}, we noticed you did not finish booking your appointment for {{2}} (Fee: {{3}}). Available time slots fill up quickly! Would you like help choosing your date and time?",
    defaultFooter: "Reply 1 to continue booking",
    defaultButtons: [],
    metaPayload: {
      name: "service_booking_abandoned_1",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "BODY",
          text: "Hello {{1}}, we noticed you did not finish booking your appointment for {{2}} (Fee: {{3}}). Available time slots fill up quickly! Would you like help choosing your date and time?",
          example: {
            body_text: [["Sarah", "Dental Consultation", "INR 500.00"]],
          },
        },
        {
          type: "FOOTER",
          text: "Reply 1 to continue booking",
        },
      ],
    },
    localData: {
      body: "Hello {{1}}, we noticed you did not finish booking your appointment for {{2}} (Fee: {{3}}). Available time slots fill up quickly! Would you like help choosing your date and time?",
      footer: "Reply 1 to continue booking",
      mediaType: "text",
      buttons: [],
    },
  },

  service_booking_abandoned_2: {
    key: "service_booking_abandoned_2",
    name: "service_booking_abandoned_2",
    title: "Abandoned Booking Reminder 2 (Discount Offer)",
    description: "Second recovery reminder with promotional discount coupon to complete appointment booking before slot release.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "Sarah" },
      { index: 2, name: "service_name", label: "Service Name", sample: "Dental Consultation" },
      { index: 3, name: "coupon_code", label: "Coupon Code", sample: "SLOT10" },
      { index: 4, name: "discount_percent", label: "Discount %", sample: "10%" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Hello {{1}}, your slot for {{2}} is waiting. Use coupon code {{3}} for {{4}} off to confirm your appointment today before slots are taken!",
    defaultFooter: "Limited time offer",
    defaultButtons: [],
    metaPayload: {
      name: "service_booking_abandoned_2",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "BODY",
          text: "Hello {{1}}, your slot for {{2}} is waiting. Use coupon code {{3}} for {{4}} off to confirm your appointment today before slots are taken!",
          example: {
            body_text: [["Sarah", "Dental Consultation", "SLOT10", "10%"]],
          },
        },
        {
          type: "FOOTER",
          text: "Limited time offer",
        },
      ],
    },
    localData: {
      body: "Hello {{1}}, your slot for {{2}} is waiting. Use coupon code {{3}} for {{4}} off to confirm your appointment today before slots are taken!",
      footer: "Limited time offer",
      mediaType: "text",
      buttons: [],
    },
  },

  service_daily_booking_summary: {
    key: "service_daily_booking_summary",
    name: "service_daily_booking_summary",
    title: "Daily Appointments Summary (Excel Attachment)",
    description: "Scheduled daily appointment summary with attached Excel (.xlsx) schedule sent to business managers and staff via WhatsApp.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "business_name", label: "Business Name", sample: "Wellness Clinic" },
      { index: 2, name: "date", label: "Report Date", sample: "2026-09-15" },
      { index: 3, name: "total_bookings", label: "Total Bookings Count", sample: "12" },
      { index: 4, name: "total_revenue", label: "Total Expected Revenue", sample: "INR 6,400.00" },
      { index: 5, name: "confirmed_count", label: "Confirmed Appointments", sample: "10" },
      { index: 6, name: "pending_count", label: "Pending/Venue Payments", sample: "2" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Daily appointment summary for {{1}} on {{2}}:\nTotal Appointments: {{3}}\nExpected Revenue: {{4}}\nConfirmed: {{5}}\nPending: {{6}}\nPlease find attached your complete daily booking schedule and client details in Excel.",
    defaultFooter: "Automated Daily Schedule Report",
    defaultButtons: [],
    metaPayload: {
      name: "service_daily_booking_summary",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "DOCUMENT",
          example: {
            header_handle: ["https://wa.linalapro.com/assets/sample-bookings-report.xlsx"],
          },
        },
        {
          type: "BODY",
          text: "Daily appointment summary for {{1}} on {{2}}:\nTotal Appointments: {{3}}\nExpected Revenue: {{4}}\nConfirmed: {{5}}\nPending: {{6}}\nPlease find attached your complete daily booking schedule and client details in Excel.",
          example: {
            body_text: [["Wellness Clinic", "2026-09-15", "12", "INR 6,400.00", "10", "2"]],
          },
        },
        {
          type: "FOOTER",
          text: "Automated Daily Schedule Report",
        },
      ],
    },
    localData: {
      body: "Daily appointment summary for {{1}} on {{2}}:\nTotal Appointments: {{3}}\nExpected Revenue: {{4}}\nConfirmed: {{5}}\nPending: {{6}}\nPlease find attached your complete daily booking schedule and client details in Excel.",
      footer: "Automated Daily Schedule Report",
      mediaType: "document",
      buttons: [],
    },
  },
};

/**
 * Helper to prepare Meta components and payload for a Service Template
 */
async function prepareMetaComponentsAndPayload(
  def: ServiceTemplateDef,
  bodyText: string,
  headerText?: string,
  footerText?: string,
  waApi?: WhatsAppApiService | null
): Promise<{ metaPayload: any; mediaType: string }> {
  const components: any[] = [];
  let mediaType = "text";

  const originalHeaderComp = def.metaPayload.components.find((c) => c.type === "HEADER");

  if (originalHeaderComp?.format === "DOCUMENT") {
    mediaType = "document";
    let documentHandle = "https://wa.linalapro.com/assets/sample-bookings-report.xlsx";
    if (waApi) {
      try {
        const sampleWorkbook = new ExcelJS.Workbook();
        const sampleSheet = sampleWorkbook.addWorksheet("Daily Bookings");
        sampleSheet.addRow(["Booking #", "Customer", "Phone", "Service", "Specialist", "Date", "Time", "Amount"]);
        sampleSheet.addRow(["SB-1001", "Jane Doe", "919876543210", "Hair Styling", "Dr. Alex", "2026-09-15", "10:00", "500"]);
        const sampleBuffer = await sampleWorkbook.xlsx.writeBuffer();
        const uploadRes = await waApi.uploadMediaToMeta(
          Buffer.from(sampleBuffer),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "daily-bookings-report.xlsx"
        );
        if (uploadRes?.h) {
          documentHandle = uploadRes.h;
        }
      } catch (err: any) {
        console.warn("[Service Templates] Meta document sample upload fallback:", err.message);
      }
    }
    components.push({
      type: "HEADER",
      format: "DOCUMENT",
      example: {
        header_handle: [documentHandle],
      },
    });
  } else if (headerText && headerText.trim().length > 0) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText.trim(),
    });
  }

  const exampleSamples = (def.variables || []).map((v) => v.sample || `Sample ${v.name}`);

  components.push({
    type: "BODY",
    text: bodyText,
    example: {
      body_text: [exampleSamples],
    },
  });

  if (footerText && footerText.trim().length > 0) {
    components.push({
      type: "FOOTER",
      text: footerText.trim(),
    });
  }

  return {
    metaPayload: {
      name: def.name,
      category: "UTILITY",
      language: def.language || "en_US",
      components,
    },
    mediaType,
  };
}

/**
 * Provision or re-submit service starter templates to Meta Cloud API and local database.
 */
export async function provisionServiceTemplatesForChannel(
  channelId: string,
  userId: string
): Promise<{ total: number; created: number; updated: number; results: any[] }> {
  const [channel] = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const isCloudApi = channel.connectionMethod === "embedded" || channel.connectionMethod === "waba" || !channel.connectionMethod;
  const waApi = isCloudApi ? new WhatsAppApiService(channel) : null;
  const results: any[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const def of Object.values(SERVICE_BOOKING_TEMPLATES_DEFINITIONS)) {
    try {
      const [existing] = await db
        .select()
        .from(schema.templates)
        .where(
          and(
            eq(schema.templates.channelId, channelId),
            eq(schema.templates.name, def.name)
          )
        )
        .limit(1);

      let metaId = existing?.whatsappTemplateId || null;
      let status = existing?.status || (isCloudApi ? "PENDING" : "APPROVED");
      const mediaType = def.localData.mediaType || "text";

      if (isCloudApi && waApi && channel.whatsappBusinessAccountId) {
        try {
          const { metaPayload: builtPayload } = await prepareMetaComponentsAndPayload(
            def,
            def.localData.body,
            def.localData.header,
            def.localData.footer,
            waApi
          );

          try {
            const res = await waApi.createTemplate(builtPayload);
            metaId = res?.id || metaId;
            status = (res?.status || "PENDING").toUpperCase();
          } catch (createErr: any) {
            if (
              createErr.message?.includes("already exists") ||
              createErr.message?.includes("duplicate") ||
              createErr.message?.includes("status can't be changed")
            ) {
              try {
                await waApi.deleteTemplate(def.name);
                const res = await waApi.createTemplate(builtPayload);
                metaId = res?.id || metaId;
                status = (res?.status || "PENDING").toUpperCase();
              } catch {
                status = existing?.status || "APPROVED";
              }
            } else {
              console.warn(`[Service Templates] Meta create notice for "${def.name}":`, createErr.message);
            }
          }
        } catch (metaErr: any) {
          console.warn(`[Service Templates] Meta build error for "${def.name}":`, metaErr.message);
        }
      }

      if (existing) {
        await storage.updateTemplate(existing.id, {
          category: def.category,
          language: def.language,
          header: def.localData.header || "",
          body: def.localData.body,
          footer: def.localData.footer || "",
          buttons: def.localData.buttons || [],
          mediaType: mediaType,
          status: status,
          ...(metaId ? { whatsappTemplateId: metaId } : {}),
          updatedAt: new Date(),
        });
        updatedCount++;
        results.push({ name: def.name, action: "updated", status, id: existing.id });
      } else {
        const created = await storage.createTemplate({
          name: def.name,
          category: def.category,
          language: def.language,
          header: def.localData.header || "",
          body: def.localData.body,
          footer: def.localData.footer || "",
          buttons: def.localData.buttons || [],
          variables: def.variables,
          status: status,
          whatsappTemplateId: metaId,
          channelId: channelId,
          createdBy: userId || channel.createdBy || "",
          mediaType: mediaType,
        });
        createdCount++;
        results.push({ name: def.name, action: "created", status, id: created.id });
      }
    } catch (err: any) {
      console.error(`[Service Templates] Failed to provision "${def.name}":`, err.message);
      results.push({ name: def.name, action: "error", error: err.message });
    }
  }

  return {
    total: Object.keys(SERVICE_BOOKING_TEMPLATES_DEFINITIONS).length,
    created: createdCount,
    updated: updatedCount,
    results,
  };
}

/**
 * Submit or re-submit a specific edited service booking template to Meta for re-approval.
 */
export async function submitServiceTemplateToMeta(
  channelId: string,
  userId: string,
  templateName: string,
  bodyText: string,
  headerText?: string,
  footerText?: string
): Promise<{ success: boolean; template: any; message: string }> {
  const [channel] = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const def = SERVICE_BOOKING_TEMPLATES_DEFINITIONS[templateName];
  if (!def) {
    throw new Error(`Invalid service template name: ${templateName}`);
  }

  const [existing] = await db
    .select()
    .from(schema.templates)
    .where(
      and(
        eq(schema.templates.channelId, channelId),
        eq(schema.templates.name, templateName)
      )
    )
    .limit(1);

  const isCloudApi = channel.connectionMethod === "embedded" || channel.connectionMethod === "waba" || !channel.connectionMethod;
  const waApi = isCloudApi ? new WhatsAppApiService(channel) : null;

  let metaResult: any = null;
  let finalStatus = isCloudApi ? "PENDING" : "APPROVED";
  let mediaType = def.localData.mediaType || "text";

  if (isCloudApi && waApi && channel.whatsappBusinessAccountId) {
    const { metaPayload: builtPayload, mediaType: detectedMediaType } = await prepareMetaComponentsAndPayload(
      def,
      bodyText,
      headerText,
      footerText,
      waApi
    );
    mediaType = detectedMediaType;

    try {
      metaResult = await waApi.createTemplate(builtPayload);
      finalStatus = (metaResult?.status || "PENDING").toUpperCase();
    } catch (createErr: any) {
      console.warn(`[Service Templates] Direct create failed for ${templateName} (${createErr.message}), deleting and recreating on Meta...`);
      try {
        await waApi.deleteTemplate(templateName);
      } catch (delErr: any) {
        console.warn(`[Service Templates] Delete on Meta notice for ${templateName}:`, delErr.message);
      }

      try {
        metaResult = await waApi.createTemplate(builtPayload);
        finalStatus = (metaResult?.status || "PENDING").toUpperCase();
      } catch (retryErr: any) {
        throw new Error(`Meta Template API Error: ${retryErr.message}`);
      }
    }
  }

  let savedTemplate: any;
  if (existing) {
    savedTemplate = await storage.updateTemplate(existing.id, {
      category: "UTILITY",
      header: headerText || null,
      body: bodyText,
      footer: footerText || null,
      mediaType: mediaType,
      status: finalStatus,
      ...(metaResult?.id ? { whatsappTemplateId: metaResult.id } : {}),
      updatedAt: new Date(),
    });
  } else {
    savedTemplate = await storage.createTemplate({
      name: templateName,
      category: "UTILITY",
      language: def.language || "en_US",
      header: headerText || null,
      body: bodyText,
      footer: footerText || null,
      buttons: [],
      variables: def.variables,
      status: finalStatus,
      whatsappTemplateId: metaResult?.id || null,
      channelId: channelId,
      createdBy: userId || channel.createdBy || "",
      mediaType: mediaType,
    });
  }

  return {
    success: true,
    template: savedTemplate,
    message: isCloudApi
      ? `Template "${templateName}" successfully submitted to Meta in UTILITY category (Status: ${finalStatus})`
      : `Template "${templateName}" updated for QR Code channel`,
  };
}
