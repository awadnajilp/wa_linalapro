import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from "../storage";
import ExcelJS from "exceljs";

export interface EcomTemplateDef {
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

export const ECOMMERCE_TEMPLATES_DEFINITIONS: Record<string, EcomTemplateDef> = {
  ecom_order_alert: {
    key: "ecom_order_alert",
    name: "ecom_order_alert",
    title: "Customer Order Alert",
    description: "Sent immediately to customer when an order is placed/confirmed with full item and payment details.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "John Doe" },
      { index: 2, name: "order_number", label: "Order Number", sample: "ORD-1001" },
      { index: 3, name: "product_name", label: "Product Name", sample: "Septic Tank Cleaner 300g" },
      { index: 4, name: "quantity", label: "Quantity", sample: "1" },
      { index: 5, name: "total_amount", label: "Total Amount", sample: "INR 499.00" },
      { index: 6, name: "payment_method", label: "Payment Method", sample: "Cash on Delivery" },
      { index: 7, name: "delivery_address", label: "Delivery Address", sample: "123 Main Street, City" },
    ],
    defaultHeader: "Order Confirmation",
    defaultBody:
      "Hello {{1}}, thank you for your order! Your order #{{2}} for {{3}} (Qty: {{4}}) with total amount {{5}} has been confirmed. Payment Mode: {{6}}. Delivery Address: {{7}}. We will notify you when your package ships.",
    defaultFooter: "Thank you for shopping with us",
    defaultButtons: [],
    metaPayload: {
      name: "ecom_order_alert",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Order Confirmation",
        },
        {
          type: "BODY",
          text: "Hello {{1}}, thank you for your order! Your order #{{2}} for {{3}} (Qty: {{4}}) with total amount {{5}} has been confirmed. Payment Mode: {{6}}. Delivery Address: {{7}}. We will notify you when your package ships.",
          example: {
            body_text: [
              [
                "John Doe",
                "ORD-1001",
                "Septic Tank Cleaner 300g",
                "1",
                "INR 499.00",
                "Cash on Delivery",
                "123 Main Street, City",
              ],
            ],
          },
        },
        {
          type: "FOOTER",
          text: "Thank you for shopping with us",
        },
      ],
    },
    localData: {
      header: "Order Confirmation",
      body: "Hello {{1}}, thank you for your order! Your order #{{2}} for {{3}} (Qty: {{4}}) with total amount {{5}} has been confirmed. Payment Mode: {{6}}. Delivery Address: {{7}}. We will notify you when your package ships.",
      footer: "Thank you for shopping with us",
      mediaType: "text",
      buttons: [],
    },
  },

  ecom_daily_order_summary: {
    key: "ecom_daily_order_summary",
    name: "ecom_daily_order_summary",
    title: "Daily Summary Order Alert (Excel Attachment)",
    description: "Scheduled daily order summary with attached Excel (.xlsx) spreadsheet report sent to store owners/team via WhatsApp.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "store_name", label: "Store Name", sample: "X Pure Store" },
      { index: 2, name: "date", label: "Report Date", sample: "2026-09-06" },
      { index: 3, name: "total_orders", label: "Total Orders Count", sample: "15" },
      { index: 4, name: "total_revenue", label: "Total Revenue", sample: "INR 7,485.00" },
      { index: 5, name: "paid_orders", label: "Paid Orders Count", sample: "10" },
      { index: 6, name: "pending_orders", label: "Pending/COD Count", sample: "5" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Daily order summary for {{1}} on {{2}}:\nTotal Orders: {{3}}\nTotal Revenue: {{4}}\nPaid Orders: {{5}}\nCOD / Pending: {{6}}\nPlease find attached your complete daily orders Excel report with customer shipping details.",
    defaultFooter: "Automated Daily Orders Report",
    defaultButtons: [],
    metaPayload: {
      name: "ecom_daily_order_summary",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "DOCUMENT",
          example: {
            header_handle: ["https://wa.linalapro.com/assets/sample-orders-report.xlsx"],
          },
        },
        {
          type: "BODY",
          text: "Daily order summary for {{1}} on {{2}}:\nTotal Orders: {{3}}\nTotal Revenue: {{4}}\nPaid Orders: {{5}}\nCOD / Pending: {{6}}\nPlease find attached your complete daily orders Excel report with customer shipping details.",
          example: {
            body_text: [["X Pure Store", "2026-09-06", "15", "INR 7,485.00", "10", "5"]],
          },
        },
        {
          type: "FOOTER",
          text: "Automated Daily Orders Report",
        },
      ],
    },
    localData: {
      body: "Daily order summary for {{1}} on {{2}}:\nTotal Orders: {{3}}\nTotal Revenue: {{4}}\nPaid Orders: {{5}}\nCOD / Pending: {{6}}\nPlease find attached your complete daily orders Excel report with customer shipping details.",
      footer: "Automated Daily Orders Report",
      mediaType: "document",
      buttons: [],
    },
  },

  ecom_abandoned_cart_1: {
    key: "ecom_abandoned_cart_1",
    name: "ecom_abandoned_cart_1",
    title: "Abandoned Cart Reminder 1 (Product Photo Header)",
    description: "Initial recovery reminder sent with product photo header to customers who left items in checkout.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "John" },
      { index: 2, name: "product_name", label: "Product Name", sample: "Septic Tank Cleaner 300g" },
      { index: 3, name: "total_price", label: "Product Price", sample: "INR 499.00" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Hello {{1}}, we noticed you did not finish placing your order for {{2}} (Total: {{3}}). Your reserved item is shown above. Would you like help completing your order now?",
    defaultFooter: "Reply 1 to continue",
    defaultButtons: [],
    metaPayload: {
      name: "ecom_abandoned_cart_1",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "IMAGE",
          example: {
            header_handle: ["https://wa.linalapro.com/assets/sample-product.png"],
          },
        },
        {
          type: "BODY",
          text: "Hello {{1}}, we noticed you did not finish placing your order for {{2}} (Total: {{3}}). Your reserved item is shown above. Would you like help completing your order now?",
          example: {
            body_text: [["John", "Septic Tank Cleaner 300g", "INR 499.00"]],
          },
        },
        {
          type: "FOOTER",
          text: "Reply 1 to continue",
        },
      ],
    },
    localData: {
      body: "Hello {{1}}, we noticed you did not finish placing your order for {{2}} (Total: {{3}}). Your reserved item is shown above. Would you like help completing your order now?",
      footer: "Reply 1 to continue",
      mediaType: "image",
      buttons: [],
    },
  },

  ecom_abandoned_cart_2: {
    key: "ecom_abandoned_cart_2",
    name: "ecom_abandoned_cart_2",
    title: "Abandoned Cart Reminder 2 (Product Photo & Discount)",
    description: "Second recovery reminder with product image header and coupon discount to recover abandoned cart before expiry.",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "John" },
      { index: 2, name: "product_name", label: "Product Name", sample: "Septic Tank Cleaner 300g" },
      { index: 3, name: "coupon_code", label: "Coupon Code", sample: "SAVE10" },
      { index: 4, name: "discount_percent", label: "Discount %", sample: "10%" },
    ],
    defaultHeader: undefined,
    defaultBody:
      "Hello {{1}}, your cart with {{2}} is waiting for you above. You can use coupon code {{3}} for {{4}} off to complete your purchase today!",
    defaultFooter: "Limited time offer",
    defaultButtons: [],
    metaPayload: {
      name: "ecom_abandoned_cart_2",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "IMAGE",
          example: {
            header_handle: ["https://wa.linalapro.com/assets/sample-product.png"],
          },
        },
        {
          type: "BODY",
          text: "Hello {{1}}, your cart with {{2}} is waiting for you above. You can use coupon code {{3}} for {{4}} off to complete your purchase today!",
          example: {
            body_text: [["John", "Septic Tank Cleaner 300g", "SAVE10", "10%"]],
          },
        },
        {
          type: "FOOTER",
          text: "Limited time offer",
        },
      ],
    },
    localData: {
      body: "Hello {{1}}, your cart with {{2}} is waiting for you above. You can use coupon code {{3}} for {{4}} off to complete your purchase today!",
      footer: "Limited time offer",
      mediaType: "image",
      buttons: [],
    },
  },

  ecom_payment_status_alert: {
    key: "ecom_payment_status_alert",
    name: "ecom_payment_status_alert",
    title: "Payment Status Alert",
    description: "Triggered whenever an order's payment status is updated (e.g. Paid, Verified, Pending, Failed).",
    category: "UTILITY",
    language: "en_US",
    variables: [
      { index: 1, name: "customer_name", label: "Customer Name", sample: "John Doe" },
      { index: 2, name: "order_number", label: "Order Number", sample: "ORD-1001" },
      { index: 3, name: "payment_status", label: "Payment Status", sample: "PAID" },
      { index: 4, name: "amount", label: "Amount Paid", sample: "INR 499.00" },
      { index: 5, name: "payment_method", label: "Payment Method", sample: "UPI Direct" },
      { index: 6, name: "reference_id", label: "Transaction Reference", sample: "UPI-998822" },
    ],
    defaultHeader: "Payment Update",
    defaultBody:
      "Hello {{1}}, your payment for order #{{2}} is now {{3}}. Amount: {{4}}. Payment Method: {{5}}. Reference: {{6}}. Thank you for your business!",
    defaultFooter: "Order Status Update",
    defaultButtons: [],
    metaPayload: {
      name: "ecom_payment_status_alert",
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "Payment Update",
        },
        {
          type: "BODY",
          text: "Hello {{1}}, your payment for order #{{2}} is now {{3}}. Amount: {{4}}. Payment Method: {{5}}. Reference: {{6}}. Thank you for your business!",
          example: {
            body_text: [["John Doe", "ORD-1001", "PAID", "INR 499.00", "UPI Direct", "UPI-998822"]],
          },
        },
        {
          type: "FOOTER",
          text: "Order Status Update",
        },
      ],
    },
    localData: {
      header: "Payment Update",
      body: "Hello {{1}}, your payment for order #{{2}} is now {{3}}. Amount: {{4}}. Payment Method: {{5}}. Reference: {{6}}. Thank you for your business!",
      footer: "Order Status Update",
      mediaType: "text",
      buttons: [],
    },
  },
};

export function getEcommerceStarterTemplates() {
  return Object.values(ECOMMERCE_TEMPLATES_DEFINITIONS);
}

/**
 * Format a template into clean plain text for QR Code (Baileys) channels without interactive buttons.
 */
export function formatEcomTemplateForQR(
  templateKey: string,
  values: Record<string, string | number>,
  customBody?: string
): string {
  const def = ECOMMERCE_TEMPLATES_DEFINITIONS[templateKey];
  let body = customBody || def?.defaultBody || "";

  if (def) {
    def.variables.forEach((v) => {
      const val = values[v.name] !== undefined ? String(values[v.name]) : String(values[String(v.index)] || v.sample);
      body = body.replace(new RegExp(`\\{\\{${v.index}\\}\\}`, "g"), val);
      body = body.replace(new RegExp(`\\{${v.name}\\}`, "g"), val);
    });
  }

  // Format with header if present
  let formatted = body;
  if (def?.defaultHeader) {
    formatted = `*${def.defaultHeader}*\n\n${formatted}`;
  }

  // Add QR action guidance for abandoned carts
  if (templateKey === "ecom_abandoned_cart_1" || templateKey === "ecom_abandoned_cart_2") {
    if (!formatted.includes("Reply '1'")) {
      formatted += "\n\n👉 *Reply '1' or 'checkout' to complete your order!*";
    }
  }

  return formatted;
}

/**
 * Build Meta component parameters for sending a Cloud API template message.
 */
export function buildMetaTemplateParameters(
  templateKey: string,
  values: (string | number)[],
  mediaHeader?: { type: "document" | "image"; url: string; filename?: string }
): any[] {
  const components: any[] = [];

  if (mediaHeader && mediaHeader.url) {
    if (mediaHeader.type === "document") {
      components.push({
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: mediaHeader.url,
              filename: mediaHeader.filename || "Daily_Orders_Report.xlsx",
            },
          },
        ],
      });
    } else if (mediaHeader.type === "image") {
      components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: mediaHeader.url,
            },
          },
        ],
      });
    }
  }

  const bodyParams = values.map((val) => ({
    type: "text",
    text: String(val ?? ""),
  }));

  components.push({
    type: "body",
    parameters: bodyParams,
  });

  return components;
}

/**
 * Generate a sample Excel (.xlsx) buffer for Meta document template approval.
 */
async function getSampleExcelBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Orders");
  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 15 },
    { header: "Customer Name", key: "customerName", width: 20 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Product", key: "product", width: 25 },
    { header: "Quantity", key: "qty", width: 10 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Payment Status", key: "status", width: 15 },
  ];
  worksheet.addRow({
    orderId: "ORD-1001",
    customerName: "John Doe",
    phone: "+919876543210",
    product: "Sample Product",
    qty: 1,
    amount: "INR 499.00",
    status: "PAID",
  });
  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

/**
 * Generate a sample PNG image buffer for Meta image template approval.
 */
function getSampleImageBuffer(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
}

/**
 * Build components and upload sample media handles for Meta template creation.
 */
async function prepareMetaComponentsAndPayload(
  def: EcomTemplateDef,
  bodyText: string,
  headerText?: string,
  footerText?: string,
  waApi?: WhatsAppApiService | null
): Promise<{ metaPayload: any; mediaType: string }> {
  const mediaType = def.localData.mediaType || "text";
  const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const varCount = varMatches.length;
  const exampleSamples = def.variables.slice(0, Math.max(varCount, 1)).map((v) => v.sample);

  let headerHandle: string | null = null;
  if (waApi) {
    if (mediaType === "document") {
      try {
        const docBuf = await getSampleExcelBuffer();
        headerHandle = await waApi.uploadTemplateMedia(
          docBuf,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "sample_daily_orders.xlsx"
        );
      } catch (err: any) {
        console.warn(`[Ecom Templates] Meta upload failed for document sample:`, err.message);
      }
    } else if (mediaType === "image") {
      try {
        const imgBuf = getSampleImageBuffer();
        headerHandle = await waApi.uploadTemplateMedia(
          imgBuf,
          "image/png",
          "sample_product.png"
        );
      } catch (err: any) {
        console.warn(`[Ecom Templates] Meta upload failed for image sample:`, err.message);
      }
    }
  }

  const components: any[] = [];
  if (mediaType === "document" && headerHandle) {
    components.push({
      type: "HEADER",
      format: "DOCUMENT",
      example: {
        header_handle: [headerHandle],
      },
    });
  } else if (mediaType === "image" && headerHandle) {
    components.push({
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: [headerHandle],
      },
    });
  } else if (headerText && mediaType === "text") {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
    });
  }

  components.push({
    type: "BODY",
    text: bodyText,
    example: {
      body_text: [exampleSamples],
    },
  });

  if (footerText) {
    components.push({
      type: "FOOTER",
      text: footerText,
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
 * Provision or re-submit ecommerce starter templates to Meta Cloud API and local database.
 */
export async function provisionEcommerceTemplatesForChannel(
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

  for (const def of Object.values(ECOMMERCE_TEMPLATES_DEFINITIONS)) {
    try {
      // Check existing template in DB for this channel
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
              console.warn(`[Ecom Templates] Meta create notice for "${def.name}":`, createErr.message);
            }
          }
        } catch (metaErr: any) {
          console.warn(`[Ecom Templates] Meta build error for "${def.name}":`, metaErr.message);
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
      console.error(`[Ecom Templates] Failed to provision "${def.name}":`, err.message);
      results.push({ name: def.name, action: "error", error: err.message });
    }
  }

  return {
    total: Object.keys(ECOMMERCE_TEMPLATES_DEFINITIONS).length,
    created: createdCount,
    updated: updatedCount,
    results,
  };
}

/**
 * Submit or re-submit a specific edited ecommerce template to Meta for re-approval.
 */
export async function submitEcommerceTemplateToMeta(
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

  const def = ECOMMERCE_TEMPLATES_DEFINITIONS[templateName];
  if (!def) {
    throw new Error(`Invalid ecommerce template name: ${templateName}`);
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
      console.warn(`[Ecom Templates] Direct create failed for ${templateName} (${createErr.message}), deleting and recreating on Meta...`);
      try {
        await waApi.deleteTemplate(templateName);
      } catch (delErr: any) {
        console.warn(`[Ecom Templates] Delete on Meta notice for ${templateName}:`, delErr.message);
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
