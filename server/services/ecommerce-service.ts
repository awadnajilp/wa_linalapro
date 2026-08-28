import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AddonManager } from "./addon-manager";
import { WhatsAppApiService } from "./whatsapp-api";
import { getTransporter } from "./email.service";
import PDFDocument from "pdfkit";
import axios from "axios";
import Razorpay from "razorpay";
import crypto from "crypto";

export class EcommerceService {
  /**
   * Check if ecommerce addon is active for tenant
   */
  public static async isEcommerceActive(tenantId: string): Promise<boolean> {
    return await AddonManager.isAddonActive(tenantId, "ecommerce");
  }

  /**
   * Intercept incoming message for Ecommerce addon
   */
  public static async interceptEcommerce(
    channelId: string,
    conversation: any[],
    contact: any[],
    message: any,
    content: string,
    isGroupMessage: boolean,
    channelRow: any
  ): Promise<boolean> {
    if (!channelId || conversation.length === 0 || isGroupMessage) {
      return false;
    }

    try {
      const tenantId = channelRow?.createdBy;
      if (!tenantId) return false;

      const isPluginActive = await this.isEcommerceActive(tenantId);
      if (!isPluginActive) return false;

      // Fetch active ecommerce config for channel
      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.channelId, channelId),
            eq(schema.ecommerceConfigs.isActive, true)
          )
        )
        .limit(1);

      if (!config) return false;

      const conversationId = conversation[0].id;
      const contactPhone = conversation[0].contactPhone;
      const cleanContent = content.trim().toLowerCase();

      // Check if there is an active ecommerce session
      const [session] = await db
        .select()
        .from(schema.ecommerceSessions)
        .where(eq(schema.ecommerceSessions.conversationId, conversationId))
        .limit(1);

      if (session) {
        // Process active session response
        await this.processSessionInput(channelRow, config, session, content.trim(), message);
        return true;
      }

      // NO Active session: Check for trigger keywords
      // 1. Store trigger (Store-wise flow)
      const storeKeyword = (config.storeTriggerKeyword || "store").toLowerCase();
      if (config.isStoreFlowActive && cleanContent === storeKeyword) {
        await this.sendStoreCatalog(channelRow, config, contactPhone);
        return true;
      }

      // 2. Individual product trigger
      const products = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(
          and(
            eq(schema.ecommerceProducts.tenantId, tenantId),
            eq(schema.ecommerceProducts.isTriggerEnabled, true)
          )
        );

      // Check for exact matching keyword
      const matchedProduct = products.find(
        (p) => p.triggerKeyword && p.triggerKeyword.trim().toLowerCase() === cleanContent
      );

      if (matchedProduct) {
        await this.startIndividualProductFlow(channelRow, config, conversationId, contactPhone, matchedProduct);
        return true;
      }

      // 3. QR / IVR Number based product selection
      // If store flow was active and they sent a number, we can check if they are trying to select a product
      const isNumber = /^\d+$/.test(cleanContent);
      if (isNumber) {
        const productIndex = parseInt(cleanContent) - 1;
        // Retrieve active store products to match index
        const allActiveProducts = await db
          .select()
          .from(schema.ecommerceProducts)
          .where(eq(schema.ecommerceProducts.tenantId, tenantId));

        if (productIndex >= 0 && productIndex < allActiveProducts.length) {
          const selectedProd = allActiveProducts[productIndex];
          await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, selectedProd);
          return true;
        }
      }

      // 4. Interactive button replies (Buy Now)
      if (message.interactive?.type === "button_reply") {
        const replyId = message.interactive.button_reply.id;
        if (replyId && replyId.startsWith("buy_")) {
          const productId = replyId.replace("buy_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product) {
            await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, product);
            return true;
          }
        }
      }

      // 5. Interactive list replies
      if (message.interactive?.type === "list_reply") {
        const replyId = message.interactive.list_reply.id;
        if (replyId && replyId.startsWith("prod_")) {
          const productId = replyId.replace("prod_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product) {
            await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, product);
            return true;
          }
        }
      }

      return false;
    } catch (err: any) {
      console.error("[Ecommerce Interceptor] Error:", err.message);
      return false;
    }
  }

  /**
   * Send the store catalogue of products
   */
  private static async sendStoreCatalog(channelRow: any, config: any, to: string) {
    const waApi = new WhatsAppApiService(channelRow);
    const isQr = channelRow.connectionMethod === "qr_code";

    // 1. Send Welcome Message
    if (config.welcomeHeaderUrl && config.welcomeHeaderType !== "none") {
      await waApi.sendMediaMessageByUrl(
        to,
        config.welcomeHeaderUrl,
        config.welcomeHeaderType as "image" | "video",
        config.welcomeMessage || "Welcome to our store!"
      );
    } else {
      await waApi.sendTextMessage(to, config.welcomeMessage || "Welcome to our store!");
    }

    // 2. Fetch all products
    const products = await db
      .select()
      .from(schema.ecommerceProducts)
      .where(eq(schema.ecommerceProducts.tenantId, config.tenantId));

    if (products.length === 0) {
      await waApi.sendTextMessage(to, "We currently don't have any products listed in the store.");
      return;
    }

    // 3. List products one-by-one with media and details
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let photos: string[] = [];
      try {
        photos = typeof product.photos === "string" ? JSON.parse(product.photos) : (product.photos || []);
      } catch {
        photos = [];
      }

      const descText = `*${product.name}*\nPrice: ${(product as any).currency || 'INR'} ${product.price}\n\n${product.description || ""}`;

      if (isQr) {
        // For QR code: send photos then details text containing numerical option
        if (photos.length > 0) {
          for (let p = 0; p < photos.length; p++) {
            if (p === photos.length - 1) {
              await waApi.sendMediaMessageByUrl(
                to,
                photos[p],
                "image",
                `${descText}\n\nReply with *${i + 1}* to Buy Now!`
              );
            } else {
              await waApi.sendMediaMessageByUrl(to, photos[p], "image");
            }
          }
        } else {
          await waApi.sendTextMessage(to, `${descText}\n\nReply with *${i + 1}* to Buy Now!`);
        }
      } else {
        // For Cloud API: send intermediate photos, and send last image / text as interactive button "Buy Now"
        if (photos.length > 0) {
          // Send first N-1 photos
          for (let p = 0; p < photos.length - 1; p++) {
            await waApi.sendMediaMessageByUrl(to, photos[p], "image");
          }
          // Send last photo as header of interactive message
          const lastPhoto = photos[photos.length - 1];
          await this.sendCloudApiButtonMessage(channelRow, to, descText, lastPhoto, [
            { id: `buy_${product.id}`, title: "Buy Now" }
          ]);
        } else {
          // Send interactive message without image
          await this.sendCloudApiButtonMessage(channelRow, to, descText, null, [
            { id: `buy_${product.id}`, title: "Buy Now" }
          ]);
        }
      }
    }

    // 4. Send Store-wide List Message / IVR listing
    if (isQr) {
      const listText = `*Product List:*\n\n` + products.map((p, idx) => `${idx + 1}. ${p.name} - ${(p as any).currency || 'INR'} ${p.price}`).join("\n") + `\n\nReply with the product number (e.g. 1) to start checkout.`;
      await waApi.sendTextMessage(to, listText);
    } else {
      // Cloud API: Send interactive list message
      await this.sendCloudApiListMessage(
        channelRow,
        to,
        "Store Catalog",
        "Select a product from our catalog below to buy:",
        "View Products",
        [
          {
            title: "Available Products",
            rows: products.map((p) => ({
              id: `prod_${p.id}`,
              title: p.name.substring(0, 24),
              description: `Price: ${(p as any).currency || 'INR'} ${p.price}`.substring(0, 72)
            }))
          }
        ]
      );
    }
  }

  /**
   * Start individual product flow
   */
  private static async startIndividualProductFlow(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any
  ) {
    const waApi = new WhatsAppApiService(channelRow);
    let photos: string[] = [];
    try {
      photos = typeof product.photos === "string" ? JSON.parse(product.photos) : (product.photos || []);
    } catch {
      photos = [];
    }

    // Send product photos one-by-one
    for (const photo of photos) {
      await waApi.sendMediaMessageByUrl(contactPhone, photo, "image");
    }

    // Send details text
    const descText = `*${product.name}*\nPrice: ${(product as any).currency || 'INR'} ${product.price}\n\n${product.description || ""}`;
    await waApi.sendTextMessage(contactPhone, descText);

    // Start checkout flow immediately
    await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, product);
  }

  /**
   * Start checkout flow session
   */
  private static async startCheckoutFlow(
    channelRow: any,
    config: any,
    conversationId: string,
    contactPhone: string,
    product: any
  ) {
    // Delete any active sessions for this conversation first
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));

    // Create session
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: 1,
      currentStep: "waiting_for_quantity",
      customerData: {}
    });

    const waApi = new WhatsAppApiService(channelRow);
    await waApi.sendTextMessage(
      contactPhone,
      `How many units of *${product.name}* (Price: ${(product as any).currency || 'INR'} ${product.price}) would you like to buy? Please reply with a number.`
    );
  }

  /**
   * Process incoming messages for active checkout session
   */
  private static async processSessionInput(
    channelRow: any,
    config: any,
    session: any,
    input: string,
    message: any
  ) {
    const waApi = new WhatsAppApiService(channelRow);
    const conversationId = session.conversationId;
    const contactPhone = channelRow.connectionMethod === "qr_code" ? session.conversationId.split("@")[0] : session.conversationId; // Fallback or handle phone extraction
    // Actually, get contact phone from session's conversation mapping or directly
    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId))
      .limit(1);
    
    const to = conv?.contactPhone || contactPhone;

    const rawFields = config.checkoutFields || ["name", "phone", "address", "pin"];
    // Standardize to array of { text: string, variable: string }
    const fields = rawFields.map((f: any) => {
      if (typeof f === "string") {
        return { text: `Please enter your *${this.getFieldLabel(f)}*:`, variable: f };
      }
      return { 
        text: f.text || `Please enter your *${this.getFieldLabel(f.variable)}*:`, 
        variable: f.variable || "custom_field" 
      };
    });

    // 1. STEP: WAITING FOR QUANTITY
    if (session.currentStep === "waiting_for_quantity") {
      const quantity = parseInt(input);
      if (isNaN(quantity) || quantity <= 0) {
        await waApi.sendTextMessage(to, "Please enter a valid quantity (positive number):");
        return;
      }

      if (fields.length === 0) {
        await db
          .update(schema.ecommerceSessions)
          .set({
            quantity,
            currentStep: "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));
      } else {
        await db
          .update(schema.ecommerceSessions)
          .set({
            quantity,
            currentStep: `waiting_for_field:${fields[0].variable}`
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        await waApi.sendTextMessage(to, fields[0].text);
        return;
      }
    }

    // 2. STEP: WAITING FOR CUSTOM FIELDS
    if (session.currentStep.startsWith("waiting_for_field:")) {
      const currentFieldVar = session.currentStep.replace("waiting_for_field:", "");
      const customerData = session.customerData || {};
      customerData[currentFieldVar] = input;

      const currentIndex = fields.findIndex((f) => f.variable === currentFieldVar);
      const nextIndex = currentIndex + 1;

      if (nextIndex < fields.length && currentIndex !== -1) {
        const nextField = fields[nextIndex];
        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData,
            currentStep: `waiting_for_field:${nextField.variable}`
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        await waApi.sendTextMessage(to, nextField.text);
      } else {
        // All fields collected, ask for payment method
        await db
          .update(schema.ecommerceSessions)
          .set({
            customerData,
            currentStep: "waiting_for_payment_method"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        // Generate payment options
        const paymentOptions = [];
        paymentOptions.push({ id: "cod", title: "Cash on Delivery (COD)" });
        if (config.upiId) {
          paymentOptions.push({ id: "upi_direct", title: "UPI Direct Mobile Pay" });
        }
        if (config.qrCodeUrl) {
          paymentOptions.push({ id: "qr_pay", title: "UPI (Pay via QR Code)" });
        }
        if (
          (config.razorpayKeyId && config.razorpayKeySecret) ||
          (config.instamojoApiKey && config.instamojoAuthToken)
        ) {
          paymentOptions.push({ id: "gateway", title: "Online Payment" });
        }

        const promptText = "Please select your preferred checkout payment method:";

        if (channelRow.connectionMethod === "qr_code" || paymentOptions.length > 3) {
          if (channelRow.connectionMethod === "qr_code") {
            const listOpts = promptText + "\n\n" + paymentOptions.map((opt, idx) => `${idx + 1}. ${opt.title}`).join("\n") + "\n\nReply with option number (e.g. 1):";
            await waApi.sendTextMessage(to, listOpts);
          } else {
            // Cloud API: Send interactive list message since button count > 3
            await this.sendCloudApiListMessage(
              channelRow,
              to,
              "Payment Options",
              promptText,
              "Select Payment",
              [
                {
                  title: "Available Options",
                  rows: paymentOptions.map(opt => ({
                    id: opt.id,
                    title: opt.title.substring(0, 24)
                  }))
                }
              ]
            );
          }
        } else {
          // Cloud API: Send interactive buttons
          await this.sendCloudApiButtonMessage(channelRow, to, promptText, null, paymentOptions);
        }
      }
      return;
    }

    // 3. STEP: WAITING FOR PAYMENT METHOD
    if (session.currentStep === "waiting_for_payment_method") {
      let selectedMethod = "";

      const paymentOptions = [];
      paymentOptions.push({ id: "cod", title: "Cash on Delivery (COD)" });
      if (config.upiId) {
        paymentOptions.push({ id: "upi_direct", title: "UPI Direct Mobile Pay" });
      }
      if (config.qrCodeUrl) {
        paymentOptions.push({ id: "qr_pay", title: "UPI (Pay via QR Code)" });
      }
      if (
        (config.razorpayKeyId && config.razorpayKeySecret) ||
        (config.instamojoApiKey && config.instamojoAuthToken)
      ) {
        paymentOptions.push({ id: "gateway", title: "Online Payment" });
      }

      if (message.interactive?.type === "button_reply") {
        selectedMethod = message.interactive.button_reply.id;
      } else if (message.interactive?.type === "list_reply") {
        selectedMethod = message.interactive.list_reply.id;
      } else {
        // IVR selection matching index
        const matchIdx = parseInt(input) - 1;
        if (!isNaN(matchIdx) && matchIdx >= 0 && matchIdx < paymentOptions.length) {
          selectedMethod = paymentOptions[matchIdx].id;
        } else {
          // Fallback to text matching
          const lowerVal = input.toLowerCase();
          if (lowerVal.includes("cod") || lowerVal.includes("cash")) {
            selectedMethod = "cod";
          } else if (lowerVal.includes("direct") || lowerVal.includes("mobile")) {
            selectedMethod = "upi_direct";
          } else if (lowerVal.includes("qr") || lowerVal.includes("upi")) {
            selectedMethod = "qr_pay";
          } else if (lowerVal.includes("online") || lowerVal.includes("gateway")) {
            selectedMethod = "gateway";
          }
        }
      }

      if (!selectedMethod || !paymentOptions.find(o => o.id === selectedMethod)) {
        await waApi.sendTextMessage(to, "Invalid payment method. Please select or reply with the correct option.");
        return;
      }

      const [product] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, session.productId))
        .limit(1);

      if (!product) {
        await waApi.sendTextMessage(to, "Sorry, the product you are ordering is no longer available.");
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        return;
      }

      const totalAmount = parseFloat(product.price || "0") * session.quantity;

      if (selectedMethod === "cod") {
        // Complete Order COD
        const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        const [order] = await db
          .insert(schema.ecommerceOrders)
          .values({
            orderNumber,
            tenantId: config.tenantId,
            channelId: config.channelId,
            conversationId: session.conversationId,
            customerPhone: to,
            customerName: session.customerData?.name || conv?.contactName || "Customer",
            customerData: session.customerData,
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: session.quantity,
            totalAmount: String(totalAmount),
            currency: (product as any).currency || "INR",
            paymentMethod: "cod",
            paymentStatus: "pending",
            status: "pending"
          })
          .returning();

        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

        // Send confirmation WhatsApp message
        await waApi.sendTextMessage(
          to,
          `🎉 *Order Placed Successfully!*\n\nOrder Number: *${orderNumber}*\nProduct: *${product.name}* (x${session.quantity})\nTotal Amount: *${(product as any).currency || "INR"} ${totalAmount}*\nPayment Mode: *Cash on Delivery (COD)*\n\nWe will update you as soon as your order status changes!`
        );

        // Send email with PDF to merchant
        await this.sendOrderEmail(order);
      } 
      else if (selectedMethod === "upi_direct") {
        // Transition to QR payment receipt upload
        await db
          .update(schema.ecommerceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        // Create the order as pending payment
        const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        const [order] = await db
          .insert(schema.ecommerceOrders)
          .values({
            orderNumber,
            tenantId: config.tenantId,
            channelId: config.channelId,
            conversationId: session.conversationId,
            customerPhone: to,
            customerName: session.customerData?.name || conv?.contactName || "Customer",
            customerData: session.customerData,
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: session.quantity,
            totalAmount: String(totalAmount),
            currency: (product as any).currency || "INR",
            paymentMethod: "upi_direct",
            paymentStatus: "pending_verification",
            status: "pending"
          })
          .returning();

        // Send direct payment redirect link
        const redirectUrl = `https://wa.linalapro.com/api/ecommerce/checkout/pay?orderId=${order.id}`;

        await waApi.sendTextMessage(
          to,
          `📱 *UPI Mobile Direct Pay*\n\nTo pay *${(product as any).currency || "INR"} ${totalAmount}* directly using GPay / PhonePe / Paytm:\n\n👉 *Click here to Pay:* ${redirectUrl}\n\nOnce paid, *please send the receipt/payment screenshot here* to verify and complete your order.`
        );
      }
      else if (selectedMethod === "qr_pay") {
        // Transition to QR payment receipt upload
        await db
          .update(schema.ecommerceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt"
          })
          .where(eq(schema.ecommerceSessions.id, session.id));

        // Create order first
        const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        const [order] = await db
          .insert(schema.ecommerceOrders)
          .values({
            orderNumber,
            tenantId: config.tenantId,
            channelId: config.channelId,
            conversationId: session.conversationId,
            customerPhone: to,
            customerName: session.customerData?.name || conv?.contactName || "Customer",
            customerData: session.customerData,
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: session.quantity,
            totalAmount: String(totalAmount),
            currency: (product as any).currency || "INR",
            paymentMethod: "qr_pay",
            paymentStatus: "pending_verification",
            status: "pending"
          })
          .returning();

        // Send QR code
        await waApi.sendMediaMessageByUrl(to, config.qrCodeUrl, "image");
        await waApi.sendTextMessage(
          to,
          `Please scan the QR code to pay a total of *${(product as any).currency || "INR"} ${totalAmount}* via GPAY / PhonePe.\n\nAfter completing your payment, *please send/upload your payment receipt/screenshot here* to complete your order.`
        );
      } 
      else if (selectedMethod === "gateway") {
        // Transition to gateway creation
        try {
          await waApi.sendTextMessage(to, "Generating your secure online checkout link, please wait...");
          const paymentLinkData = await this.createPaymentLink(config, product, session.quantity, session.customerData?.name || "Customer", to);

          const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
          const [order] = await db
            .insert(schema.ecommerceOrders)
            .values({
              orderNumber,
              tenantId: config.tenantId,
              channelId: config.channelId,
              conversationId: session.conversationId,
              customerPhone: to,
              customerName: session.customerData?.name || "Customer",
              customerData: session.customerData,
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity: session.quantity,
              totalAmount: String(totalAmount),
              currency: (product as any).currency || "INR",
              paymentMethod: "gateway",
              paymentStatus: "pending_payment",
              paymentGateway: paymentLinkData.gateway,
              paymentGatewayOrderId: paymentLinkData.orderId,
              status: "pending"
            })
            .returning();

          await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

          await waApi.sendTextMessage(
            to,
            `🔗 *Complete Your Payment*\n\nOrder Number: *${orderNumber}*\nTotal Amount: *${(product as any).currency || "INR"} ${totalAmount}*\n\nPlease complete your payment using this secure link:\n${paymentLinkData.url}\n\nYour order will be verified automatically once paid.`
          );

          // Email notification of pending order
          await this.sendOrderEmail(order);
        } catch (err: any) {
          await waApi.sendTextMessage(to, `Error generating payment link: ${err.message}. Please try again later or select Cash on Delivery.`);
        }
      }
      return;
    }

    // 4. STEP: WAITING FOR QR RECEIPT
    if (session.currentStep === "waiting_for_qr_receipt") {
      const mediaId = message.image?.id || message.mediaId;
      // Also support checking message type
      const isImage = message.type === "image" || mediaId;

      if (!isImage) {
        await waApi.sendTextMessage(to, "Please upload the payment receipt/screenshot as an image/photo to complete your order.");
        return;
      }

      // We have the receipt image! Let's download URL or save mediaId
      let fileUrl = "";
      if (mediaId) {
        try {
          fileUrl = await waApi.fetchMediaUrl(mediaId);
        } catch (err) {
          console.error("Failed to fetch media url for receipt:", err);
          fileUrl = `baileys_media_${mediaId}`; // Fallback or template reference
        }
      }

      const [product] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, session.productId))
        .limit(1);

      const totalAmount = parseFloat(product?.price || "0") * session.quantity;
      const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);

      const [order] = await db
        .insert(schema.ecommerceOrders)
        .values({
          orderNumber,
          tenantId: config.tenantId,
          channelId: config.channelId,
          conversationId: session.conversationId,
          customerPhone: to,
          customerName: session.customerData?.name || "Customer",
          customerData: session.customerData,
          productId: product?.id,
          productName: product?.name,
          price: product?.price,
          quantity: session.quantity,
          totalAmount: String(totalAmount),
          paymentMethod: "qr_pay",
          paymentStatus: "pending_verification",
          receiptUrl: fileUrl || null,
          status: "pending"
        })
        .returning();

      await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));

      await waApi.sendTextMessage(
        to,
        `✅ *Receipt Received!*\n\nOrder Number: *${orderNumber}*\nYour payment is being verified by our team. You will receive WhatsApp notifications as your order is processed!`
      );

      // Email notification
      await this.sendOrderEmail(order);
    }
  }

  /**
   * Create Gateway Payment Link
   */
  private static async createPaymentLink(
    config: any,
    product: any,
    quantity: number,
    customerName: string,
    customerPhone: string
  ): Promise<{ url: string; orderId: string; gateway: string }> {
    const totalAmount = parseFloat(product.price || "0") * quantity;

    // Razorpay Integration
    if (config.razorpayKeyId && config.razorpayKeySecret) {
      const razorpay = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret
      });

      const payload = {
        amount: Math.round(totalAmount * 100), // INR paise
        currency: "INR",
        accept_partial: false,
        description: `Order for ${product.name} (x${quantity})`,
        customer: {
          name: customerName,
          contact: customerPhone
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        notes: {
          productName: product.name,
          quantity: String(quantity)
        }
      };

      const paymentLink: any = await razorpay.paymentLink.create(payload);
      if (!paymentLink || !paymentLink.short_url) {
        throw new Error("Razorpay link creation failed");
      }
      return {
        url: paymentLink.short_url,
        orderId: paymentLink.id,
        gateway: "razorpay"
      };
    }

    // Instamojo Integration
    if (config.instamojoApiKey && config.instamojoAuthToken) {
      const baseUrl = config.instamojoSandbox
        ? "https://test.instamojo.com/api/1.1"
        : "https://www.instamojo.com/api/1.1";

      const payload: any = {
        amount: totalAmount.toFixed(2),
        purpose: `Order: ${product.name.substring(0, 25)} (x${quantity})`,
        send_email: false,
        send_sms: false,
        buyer_name: customerName,
        phone: customerPhone,
        allow_repeated_payments: false
      };

      const serverUrl = process.env.SERVER_URL;
      if (serverUrl) {
        payload.webhook = `${serverUrl}/api/webhooks/ecommerce/instamojo`;
      }

      const response = await axios.post(`${baseUrl}/payment-requests/`, payload, {
        headers: {
          "X-Api-Key": config.instamojoApiKey,
          "X-Auth-Token": config.instamojoAuthToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        transformRequest: [
          (data) => {
            const params = new URLSearchParams();
            for (const key in data) {
              params.append(key, data[key]);
            }
            return params.toString();
          }
        ]
      });

      if (!response.data || !response.data.success || !response.data.payment_request) {
        throw new Error(`Instamojo payload failed: ${JSON.stringify(response.data)}`);
      }

      const pr = response.data.payment_request;
      return {
        url: pr.longurl,
        orderId: pr.id,
        gateway: "instamojo"
      };
    }

    throw new Error("No active online payment gateway configured for store");
  }

  /**
   * Generate Invoice PDF Kit
   */
  public static async generateOrderPdf(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        // Header Design
        doc.fillColor("#111827").fontSize(22).text("ORDER INVOICE", { align: "center" });
        doc.moveDown(1);

        // Metadata block
        doc.fontSize(10).fillColor("#4B5563");
        doc.text(`Order Reference: ${order.orderNumber}`);
        doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleString()}`);
        doc.text(`Order Status: ${order.status.toUpperCase()}`);
        doc.moveDown(2);

        // Customer Card Table
        doc.fillColor("#111827").fontSize(13).text("Customer Billing Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        doc.text(`Recipient Name: ${order.customerName || "Customer"}`);
        doc.text(`Contact Phone: ${order.customerPhone}`);
        
        if (order.customerData) {
          for (const [key, value] of Object.entries(order.customerData)) {
            if (key !== "name" && key !== "phone") {
              const label = key.toUpperCase();
              doc.text(`${label}: ${value}`);
            }
          }
        }
        doc.moveDown(2);

        // Product Details Table
        doc.fillColor("#111827").fontSize(13).text("Products & Line Items", { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(10).fillColor("#1F2937");
        doc.text("Product", 50, tableTop);
        doc.text("Qty", 250, tableTop);
        doc.text("Unit Price", 320, tableTop);
        doc.text("Total", 420, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).strokeColor("#E5E7EB").stroke();
        
        const rowTop = tableTop + 25;
        doc.text(order.productName || "Unknown Product", 50, rowTop);
        doc.text(String(order.quantity || 1), 250, rowTop);
        doc.text(`${order.currency || "INR"} ${order.price || "0"}`, 320, rowTop);
        doc.text(`${order.currency || "INR"} ${order.totalAmount || "0"}`, 420, rowTop);

        doc.moveTo(50, rowTop + 15).lineTo(500, rowTop + 15).stroke();
        doc.moveDown(3);

        // Payment Summary
        doc.fillColor("#111827").fontSize(13).text("Payment Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        doc.text(`Payment Gateway / Mode: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}`);
        doc.text(`Payment Reference Status: ${order.paymentStatus ? order.paymentStatus.toUpperCase() : "N/A"}`);
        if (order.receiptUrl) {
          doc.text(`Receipt attachment URL: ${order.receiptUrl}`);
        }
        doc.moveDown(3);

        doc.fillColor("#9CA3AF").fontSize(9).text("Thank you for shopping with us! If you have questions about this order, please contact the merchant.", { align: "center" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Email Store Owner on Completion
   */
  public static async sendOrderEmail(order: any) {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order.tenantId))
        .limit(1);

      if (!user || !user.email) return;

      const transporter = await getTransporter();
      if (!transporter) return;

      const pdfBuffer = await this.generateOrderPdf(order);

      const customerDetails = order.customerData
        ? Object.entries(order.customerData)
            .map(([k, v]) => `<li><strong>${k.toUpperCase()}:</strong> ${v}</li>`)
            .join("")
        : "";

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Marketplace Store" <no-reply@example.com>',
        to: user.email,
        subject: `[New Store Order] ${order.orderNumber} - ${order.currency || "INR"} ${order.totalAmount}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h2 style="color: #10B981; margin-top: 0;">New Order Placed!</h2>
            <p>Hello Store Owner,</p>
            <p>A customer has just completed their checkout. Here are the order details:</p>
            
            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; border-color: #E5E7EB; margin-bottom: 20px;">
              <tr style="background-color: #F9FAFB;">
                <td style="font-weight: bold;">Order Number</td>
                <td>${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Product Name</td>
                <td>${order.productName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Quantity</td>
                <td>${order.quantity}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Total Amount</td>
                <td style="color: #10B981; font-weight: bold;">${order.currency || "INR"} ${order.totalAmount}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Payment Method</td>
                <td>${order.paymentMethod.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Payment Status</td>
                <td>${order.paymentStatus.toUpperCase()}</td>
              </tr>
            </table>

            <h3>Customer checkout inputs:</h3>
            <ul>
              <li><strong>Phone:</strong> ${order.customerPhone}</li>
              ${customerDetails}
            </ul>

            <p style="margin-top: 20px;">The customer invoice/order summary has been generated and attached to this email as a PDF document.</p>
          </div>
        `,
        attachments: [
          {
            filename: `order_${order.orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EcommerceService] Email sent to ${user.email} for order ${order.orderNumber}`);
    } catch (err: any) {
      console.error("[EcommerceService] Failed to send order email:", err.message);
    }
  }

  /**
   * Send WhatsApp notification when order status changes
   */
  public static async sendOrderStatusUpdateNotification(orderId: string, status: string) {
    try {
      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.id, orderId))
        .limit(1);

      if (!order) return;

      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, order.channelId || ""))
        .limit(1);

      if (!channel) return;

      const waApi = new WhatsAppApiService(channel);
      const message = `🔔 *Order Status Update*\n\nDear *${order.customerName || "Customer"}*,\n\nYour order *${order.orderNumber}* status has been updated to *${status.toUpperCase()}*.\n\nThank you for shopping with us!`;

      await waApi.sendTextMessage(order.customerPhone, message);
      console.log(`[EcommerceService] WhatsApp notification status sent to ${order.customerPhone} for order ${order.orderNumber}`);
    } catch (err: any) {
      console.error("[EcommerceService] Failed to send status WhatsApp update:", err.message);
    }
  }

  /**
   * Helper to format fields
   */
  private static getFieldLabel(field: string): string {
    switch (field.toLowerCase()) {
      case "name": return "Full Name";
      case "phone": return "Contact Phone";
      case "address": return "Shipping Address";
      case "pin": return "PIN / Zip Code";
      default: return field.charAt(0).toUpperCase() + field.slice(1);
    }
  }

  /**
   * Cloud API payload helpers
   */
  private static async sendCloudApiButtonMessage(
    channelRow: any,
    to: string,
    bodyText: string,
    headerImageUrl: string | null,
    buttons: { id: string; title: string }[]
  ) {
    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title.substring(0, 20) }
          }))
        }
      }
    };

    if (headerImageUrl) {
      payload.interactive.header = {
        type: "image",
        image: { link: headerImageUrl }
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channelRow.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelRow.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Interactive button failed");
    }
  }

  private static async sendCloudApiListMessage(
    channelRow: any,
    to: string,
    headerText: string,
    bodyText: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ) {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections: sections.map((sec) => ({
            title: sec.title,
            rows: sec.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description
            }))
          }))
        }
      }
    };

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${channelRow.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelRow.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Interactive list failed");
    }
  }
}
