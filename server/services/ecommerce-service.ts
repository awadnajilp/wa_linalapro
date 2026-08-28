import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";
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
      const waApi = new WhatsAppApiService(channelRow);

      // Check for trigger keywords first to allow resetting/starting fresh
      const storeKeyword = (config.storeTriggerKeyword || "").trim().toLowerCase();
      if (config.isStoreFlowActive && storeKeyword && cleanContent === storeKeyword) {
        // Delete any active sessions first
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
        // Create session
        await db.insert(schema.ecommerceSessions).values({
          conversationId,
          quantity: 1,
          currentStep: "waiting_for_product_selection",
          customerData: {}
        });
        await this.sendStoreCatalog(channelRow, config, contactPhone);
        return true;
      }

      // Check individual product trigger
      const products = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(
          and(
            eq(schema.ecommerceProducts.tenantId, tenantId),
            eq(schema.ecommerceProducts.isTriggerEnabled, true)
          )
        );

      const matchedProduct = products.find(
        (p) => p.triggerKeyword && p.triggerKeyword.trim().toLowerCase() === cleanContent
      );

      if (matchedProduct) {
        // Delete any active sessions first
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
        await this.startIndividualProductFlow(channelRow, config, conversationId, contactPhone, matchedProduct);
        return true;
      }

      // Check interactive button clicks FIRST (always high priority)
      // 1. Interactive button replies (Buy Now or Ask AI)
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
        } else if (replyId && replyId.startsWith("ai_ask_")) {
          const productId = replyId.replace("ai_ask_", "");
          const [product] = await db
            .select()
            .from(schema.ecommerceProducts)
            .where(eq(schema.ecommerceProducts.id, productId))
            .limit(1);

          if (product && config.aiEnabled) {
            // Delete active sessions
            await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
            // Create AI chat session
            await db.insert(schema.ecommerceSessions).values({
              conversationId,
              productId: product.id,
              quantity: 1,
              currentStep: "ai_chat",
              customerData: {
                aiStartTime: new Date().toISOString(),
                aiLastMessageTime: new Date().toISOString()
              }
            });
            await waApi.sendTextMessage(contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${product.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
            return true;
          }
        }
      }

      // 2. Interactive list replies
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

      // Check if there is an active ecommerce session
      const [session] = await db
        .select()
        .from(schema.ecommerceSessions)
        .where(eq(schema.ecommerceSessions.conversationId, conversationId))
        .limit(1);

      if (session) {
        const lastUpdated = session.updatedAt || session.createdAt;
        const diffMs = Date.now() - new Date(lastUpdated).getTime();
        const timeoutMs = 15 * 60 * 1000;
        if (diffMs > timeoutMs) {
          console.log(`[EcommerceService] Inactive session ${session.id} expired after 15 mins`);
          await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        } else {
        // If it's a waiting_for_product_selection session
        if (session.currentStep === "waiting_for_product_selection") {
          if (session.productId) {
            const isBuy = cleanContent === "1" || cleanContent.includes("buy");
            const isAi = cleanContent === "2" || cleanContent === "ai" || cleanContent.includes("ask") || cleanContent.includes("learn") || cleanContent.includes("more");

            if (isBuy) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await this.startCheckoutFlow(channelRow, config, conversationId, contactPhone, selectedProd);
                return true;
              }
            } else if (isAi && config.aiEnabled) {
              const [selectedProd] = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.id, session.productId))
                .limit(1);
              if (selectedProd) {
                await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
                await db.insert(schema.ecommerceSessions).values({
                  conversationId,
                  productId: selectedProd.id,
                  quantity: 1,
                  currentStep: "ai_chat",
                  customerData: {
                    aiStartTime: new Date().toISOString(),
                    aiLastMessageTime: new Date().toISOString()
                  }
                });
                await waApi.sendTextMessage(contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${selectedProd.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
                return true;
              }
            }

            await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
          } else {
            const isNumber = /^\d+$/.test(cleanContent);
            if (isNumber) {
              const productIndex = parseInt(cleanContent) - 1;
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

            if (cleanContent === "ai" || cleanContent.includes("ask ai")) {
              const allActiveProducts = await db
                .select()
                .from(schema.ecommerceProducts)
                .where(eq(schema.ecommerceProducts.tenantId, tenantId));
              if (allActiveProducts.length > 0 && config.aiEnabled) {
                const firstProd = allActiveProducts[0];
                await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
                await db.insert(schema.ecommerceSessions).values({
                  conversationId,
                  productId: firstProd.id,
                  quantity: 1,
                  currentStep: "ai_chat",
                  customerData: {
                    aiStartTime: new Date().toISOString(),
                    aiLastMessageTime: new Date().toISOString()
                  }
                });
                await waApi.sendTextMessage(contactPhone, `🤖 *Product AI Assistant*\n\nAsk me any question about *${firstProd.name}*!\n\nWhen you are ready to buy, simply say *Checkout* or reply *1*.`);
                return true;
              }
            }

            await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
          }
        } else {
          // Process active session response (checkout steps, ai chat)
          await this.processSessionInput(channelRow, config, session, content.trim(), message);
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

    // 1. Send Welcome Message Sequence
    const sortedWelcomes = (config.welcomeMessages || [])
      .map((w: any) => ({
        text: w.text || "",
        mediaType: w.mediaType || "none",
        mediaUrl: w.mediaUrl || "",
        sortOrder: typeof w.sortOrder === "number" ? w.sortOrder : 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortedWelcomes.length === 0) {
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
    } else {
      for (const msg of sortedWelcomes) {
        if (msg.mediaType !== "none" && msg.mediaUrl) {
          await waApi.sendMediaMessageByUrl(to, msg.mediaUrl, msg.mediaType as any, msg.text || "");
        } else if (msg.text) {
          await waApi.sendTextMessage(to, msg.text);
        }
      }
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
        let promptMsg = `${descText}\n\nReply with *${i + 1}* to Buy Now!`;
        if (config.aiEnabled && config.aiAskButtonEnabled) {
          promptMsg += `\nOr reply with *AI* to ask questions about this product.`;
        }

        if (photos.length > 0) {
          for (let p = 0; p < photos.length; p++) {
            if (p === photos.length - 1) {
              await waApi.sendMediaMessageByUrl(
                to,
                photos[p],
                "image",
                promptMsg
              );
            } else {
              await waApi.sendMediaMessageByUrl(to, photos[p], "image");
            }
          }
        } else {
          await waApi.sendTextMessage(to, promptMsg);
        }
      } else {
        // For Cloud API: send intermediate photos, and send last image / text as interactive button "Buy Now" / "Ask AI"
        const buttons = [{ id: `buy_${product.id}`, title: "Buy Now" }];
        if (config.aiEnabled && config.aiAskButtonEnabled) {
          buttons.push({ id: `ai_ask_${product.id}`, title: "Ask AI" });
        }

        if (photos.length > 0) {
          // Send first N-1 photos
          for (let p = 0; p < photos.length - 1; p++) {
            await waApi.sendMediaMessageByUrl(to, photos[p], "image");
          }
          // Send last photo as header of interactive message
          const lastPhoto = photos[photos.length - 1];
          await this.sendCloudApiButtonMessage(channelRow, to, descText, lastPhoto, buttons);
        } else {
          // Send interactive message without image
          await this.sendCloudApiButtonMessage(channelRow, to, descText, null, buttons);
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
    
    // Send Welcome Messages Sequence first (even if store trigger is off)
    const sortedWelcomes = (config.welcomeMessages || [])
      .map((w: any) => ({
        text: w.text || "",
        mediaType: w.mediaType || "none",
        mediaUrl: w.mediaUrl || "",
        sortOrder: typeof w.sortOrder === "number" ? w.sortOrder : 0
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortedWelcomes.length === 0) {
      if (config.welcomeHeaderUrl && config.welcomeHeaderType !== "none") {
        await waApi.sendMediaMessageByUrl(
          contactPhone,
          config.welcomeHeaderUrl,
          config.welcomeHeaderType as "image" | "video",
          config.welcomeMessage || "Welcome to our store!"
        );
      } else if (config.welcomeMessage) {
        await waApi.sendTextMessage(contactPhone, config.welcomeMessage);
      }
    } else {
      for (const msg of sortedWelcomes) {
        if (msg.mediaType !== "none" && msg.mediaUrl) {
          await waApi.sendMediaMessageByUrl(contactPhone, msg.mediaUrl, msg.mediaType as any, msg.text || "");
        } else if (msg.text) {
          await waApi.sendTextMessage(contactPhone, msg.text);
        }
      }
    }

    let photos: string[] = [];
    try {
      photos = typeof product.photos === "string" ? JSON.parse(product.photos) : (product.photos || []);
    } catch {
      photos = [];
    }

    // Send product photos one-by-one with product name as caption
    for (const photo of photos) {
      await waApi.sendMediaMessageByUrl(contactPhone, photo, "image", product.name);
    }

    const isQr = channelRow.connectionMethod === "qr_code";
    const showAiButton = config.aiEnabled && config.aiAskButtonEnabled;
    const descText = `*${product.name}*\nPrice: ${(product as any).currency || 'INR'} ${product.price}\n\n${product.description || ""}`;

    if (isQr) {
      let promptMsg = `${descText}\n\nReply with *1* to Buy Now!`;
      if (showAiButton) {
        promptMsg += `\nReply with *2* to Learn More!`;
      }
      await waApi.sendTextMessage(contactPhone, promptMsg);
    } else {
      const buttons = [{ id: `buy_${product.id}`, title: "Buy Now" }];
      if (showAiButton) {
        buttons.push({ id: `ai_ask_${product.id}`, title: "Learn More" });
      }
      await this.sendCloudApiButtonMessage(channelRow, contactPhone, descText, null, buttons);
    }

    // Create product selection session to capture reply/button click
    await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.conversationId, conversationId));
    await db.insert(schema.ecommerceSessions).values({
      conversationId,
      productId: product.id,
      quantity: 1,
      currentStep: "waiting_for_product_selection",
      customerData: {}
    });
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
      `How many Qty? (type only number)`
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

    // Support cancelling/resetting active checkout session
    const cleanInput = input.trim().toLowerCase();
    if (cleanInput === "cancel" || cleanInput === "exit" || cleanInput === "reset") {
      await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
      await waApi.sendTextMessage(to, "❌ *Checkout cancelled.* Type *store* to open the catalog again.");
      return;
    }

    // AI Chat Step check
    if (session.currentStep === "ai_chat") {
      const buyKeywords = ["checkout", "buy", "buy now", "purchase", "1"];
      if (buyKeywords.includes(input.toLowerCase().trim())) {
        const [product] = await db
          .select()
          .from(schema.ecommerceProducts)
          .where(eq(schema.ecommerceProducts.id, session.productId))
          .limit(1);
        if (product) {
          await this.startCheckoutFlow(channelRow, config, session.conversationId, to, product);
          return;
        }
      }

      // Check timeout
      const customerData = session.customerData || {};
      const lastMsgTime = customerData.aiLastMessageTime ? new Date(customerData.aiLastMessageTime) : new Date(session.updatedAt);
      const timeoutMin = config.aiTimeoutMinutes || 30;
      const diffMs = new Date().getTime() - lastMsgTime.getTime();
      if (diffMs > timeoutMin * 60 * 1000) {
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        await waApi.sendTextMessage(to, "AI session timed out. Please send store trigger word again to browse products.");
        return;
      }

      // Update session last active time
      customerData.aiLastMessageTime = new Date().toISOString();
      await db
        .update(schema.ecommerceSessions)
        .set({ customerData, updatedAt: new Date() })
        .where(eq(schema.ecommerceSessions.id, session.id));

      // Fetch product details
      const [product] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, session.productId))
        .limit(1);

      if (!product) {
        await waApi.sendTextMessage(to, "Product no longer available. AI chat session closed.");
        await db.delete(schema.ecommerceSessions).where(eq(schema.ecommerceSessions.id, session.id));
        return;
      }

      // Determine the base system prompt.
      // Use config.aiSystemPrompt if configured; otherwise use the default prompt.
      const defaultSystemPrompt = `You are a helpful customer sales AI assistant for this store.
You are chatting with a customer regarding this product:
- Name: {product_name}
- Price: {product_price}
- Description: {product_description}

CRITICAL DIRECTIVE: Keep responses concise and conversational for WhatsApp (under 150 words). Always try to close the sale by encouraging them to buy and proceed to checkout once their queries are addressed. Inform the user they can type 'checkout' or '1' at any time to buy!`;

      const rawPrompt = config.aiSystemPrompt || defaultSystemPrompt;

      // Replace placeholders
      const productPrice = `${product.currency || "INR"} ${product.price}`;
      const basePrompt = rawPrompt
        .replace(/{product_name}/g, product.name)
        .replace(/{product_price}/g, productPrice)
        .replace(/{product_description}/g, product.description || "N/A");

      const aiSetting = await db
        .select()
        .from(schema.aiSettings)
        .where(and(eq(schema.aiSettings.channelId, channelRow.id), eq(schema.aiSettings.isActive, true)))
        .limit(1);
      const activeAI = aiSetting?.[0];
      const apiKey = activeAI?.apiKey || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        await waApi.sendTextMessage(to, "AI is currently offline. Please try checking out directly by typing 'checkout'.");
        return;
      }

      try {
        const aiClient = new OpenAI({
          apiKey,
          baseURL: activeAI?.endpoint || "https://api.openai.com/v1",
        });
        const finalModel = activeAI?.model || "gpt-4o-mini";
        
        const completion = await aiClient.chat.completions.create({
          model: finalModel,
          messages: [
            { role: "system", content: basePrompt },
            { role: "user", content: input }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        const aiResponse = completion.choices[0]?.message?.content || "Sorry, I am having trouble answering right now.";
        await waApi.sendTextMessage(to, aiResponse);
      } catch (err: any) {
        console.error("[AI Chat Session Error]", err.message);
        await waApi.sendTextMessage(to, "Sorry, I encountered an error processing your query. Please reply with 'checkout' to buy the product directly.");
      }
      return;
    }

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

        await this.addContactToCustomersGroup(config.channelId, to, session.customerData?.name, config.tenantId);

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

        await this.addContactToCustomersGroup(config.channelId, to, session.customerData?.name, config.tenantId);

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

        await this.addContactToCustomersGroup(config.channelId, to, session.customerData?.name, config.tenantId);

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

          await this.addContactToCustomersGroup(config.channelId, to, session.customerData?.name, config.tenantId);

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
          if (channelRow.connectionMethod === "qr_code") {
            fileUrl = await waApi.fetchMediaUrl(mediaId);
          } else {
            const mimeType = message.image?.mime_type || "image/jpeg";
            const savedUrl = await this.saveIncomingMedia(mediaId, mimeType, waApi);
            fileUrl = savedUrl || (await waApi.fetchMediaUrl(mediaId));
          }
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
    const [config] = await db
      .select()
      .from(schema.ecommerceConfigs)
      .where(eq(schema.ecommerceConfigs.channelId, order.channelId))
      .limit(1);

    const [merchantUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, order.tenantId))
      .limit(1);

    let logoBuffer: Buffer | null = null;
    if (config?.storeLogo) {
      try {
        logoBuffer = await this.resolveMediaBuffer(config.storeLogo);
      } catch (logoErr) {
        console.error("Failed to resolve store logo for Invoice PDF:", logoErr);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        // Render Store Logo if available
        let headerOffset = 50;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 50, 45, { fit: [60, 60] });
            headerOffset = 120;
          } catch (e) {
            console.error("Failed to render logo in Invoice PDF:", e);
          }
        }

        // Store Identity / Header info
        const storeName = config?.storeName || merchantUser?.username || "Main Store";
        const storeAddress = config?.storeAddress || "India";
        const storeWebsite = config?.storeWebsite || "";

        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18).text(storeName.toUpperCase(), headerOffset, 45);
        
        let subText = storeAddress;
        if (storeWebsite) subText += `  |  Website: ${storeWebsite}`;
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(subText, headerOffset, 68);

        // Divider
        doc.moveTo(50, 115).lineTo(562, 115).lineWidth(1).strokeColor("#E5E7EB").stroke();

        // Title
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20).text("ORDER INVOICE", 50, 135, { align: "right" });
        doc.moveDown(2);

        // Metadata block
        doc.fontSize(10).fillColor("#4B5563").font("Helvetica");
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
   * Generate Standard Indian Shipping Label PDF (Shiprocket / Delhivery style)
   */
  public static async generateShippingLabelPdf(order: any, user: any): Promise<Buffer> {
    const [config] = await db
      .select()
      .from(schema.ecommerceConfigs)
      .where(eq(schema.ecommerceConfigs.channelId, order.channelId))
      .limit(1);

    let logoBuffer: Buffer | null = null;
    if (config?.storeLogo) {
      try {
        logoBuffer = await this.resolveMediaBuffer(config.storeLogo);
      } catch (logoErr) {
        console.error("Failed to resolve store logo for Label PDF:", logoErr);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: [288, 432], margin: 15 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

        // Draw Outer Border
        doc.lineWidth(1).rect(10, 10, 268, 412).strokeColor("#111827").stroke();

        // Draw Store Logo if available in top-left
        let headerOffset = 15;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 15, 15, { fit: [30, 30] });
            headerOffset = 50;
          } catch (e) {
            console.error("Failed to render logo in Label PDF:", e);
          }
        }

        // Store Identity
        const storeName = config?.storeName || user?.username || "Main Store";

        // 1. Header (Delhivery / Shiprocket style routing header)
        doc.fillColor("#111827");
        doc.font("Helvetica-Bold").fontSize(11).text(storeName.toUpperCase(), headerOffset, 18);
        doc.font("Helvetica").fontSize(7).text(`Ref: ${order.orderNumber}`, headerOffset, 32);
        doc.font("Helvetica-Bold").fontSize(10).text(order.paymentMethod === "cod" ? "C.O.D." : "PREPAID", 200, 20, { align: "right", width: 70 });
        
        // Draw horizontal divider line
        doc.moveTo(10, 50).lineTo(278, 50).lineWidth(1).strokeColor("#111827").stroke();

        // 2. Barcode simulation box
        doc.rect(20, 60, 248, 40).fill("#111827");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(order.orderNumber, 20, 75, { align: "center", width: 248 });
        doc.fillColor("#111827");

        // Draw horizontal divider line
        doc.moveTo(10, 110).lineTo(278, 110).lineWidth(1).strokeColor("#111827").stroke();

        // 3. Deliver To (Customer Details - LARGE PINCODE)
        const address = order.customerData?.address || "N/A";
        const pincode = order.customerData?.pin || "N/A";
        
        doc.font("Helvetica-Bold").fontSize(9).text("DELIVER TO:", 15, 120);
        doc.font("Helvetica-Bold").fontSize(11).text(order.customerName || "Customer", 15, 132);
        doc.font("Helvetica").fontSize(9).text(address, 15, 146, { width: 258, height: 40 });
        doc.font("Helvetica-Bold").fontSize(9).text(`Phone: ${order.customerPhone}`, 15, 190);
        
        // Large Pincode Box for routing sorting
        doc.rect(15, 210, 258, 25).stroke();
        doc.font("Helvetica-Bold").fontSize(12).text(`PIN: ${pincode}`, 25, 217);

        // Draw horizontal divider line
        doc.moveTo(10, 245).lineTo(278, 245).lineWidth(1).stroke();

        // 4. Product description / SKU / Qty
        doc.font("Helvetica-Bold").fontSize(8).text("ITEM DETAILS", 15, 255);
        doc.font("Helvetica").fontSize(9).text(`${order.productName || "Product"} (x${order.quantity || 1})`, 15, 267);
        doc.font("Helvetica").fontSize(8).text(`Declared Value: INR ${order.totalAmount}`, 15, 280);

        // Draw horizontal divider line
        doc.moveTo(10, 295).lineTo(278, 295).lineWidth(1).stroke();

        // 5. COD Collect Amount
        if (order.paymentMethod === "cod") {
          doc.rect(15, 305, 258, 45).fill("#FFF3CD").stroke("#FFEBAA");
          doc.fillColor("#856404");
          doc.font("Helvetica-Bold").fontSize(10).text("COD - COLLECT CASH", 20, 312);
          doc.font("Helvetica-Bold").fontSize(14).text(`INR ${order.totalAmount}`, 20, 326);
          doc.fillColor("#111827");
        } else {
          doc.rect(15, 305, 258, 45).fill("#D4EDDA").stroke("#C3E6CB");
          doc.fillColor("#155724");
          doc.font("Helvetica-Bold").fontSize(10).text("PREPAID - DO NOT COLLECT CASH", 20, 318);
          doc.fillColor("#111827");
        }

        // Draw horizontal divider line
        doc.moveTo(10, 360).lineTo(278, 360).lineWidth(1).stroke();

        // 6. Return Address (Merchant Details)
        const returnName = config?.storeName || user?.username || "Main Store Warehouse";
        const returnAddress = config?.storeAddress || "India";
        const returnWebsite = config?.storeWebsite || "";

        doc.font("Helvetica-Bold").fontSize(8).text("RETURN TO / SENDER:", 15, 370);
        doc.font("Helvetica-Bold").fontSize(8).text(returnName, 15, 380);
        
        let returnSub = returnAddress;
        if (returnWebsite) returnSub += ` | Web: ${returnWebsite}`;
        doc.font("Helvetica").fontSize(7).text(returnSub, 15, 390, { width: 258 });

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

  private static async saveIncomingMedia(
    mediaId: string,
    mimeType: string,
    waApi: WhatsAppApiService
  ): Promise<string | null> {
    try {
      console.log(`[EcommerceService] Downloading receipt media: ${mediaId}`);
      const buffer = await waApi.getMedia(mediaId);
      if (!buffer) return null;

      const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";
      const filename = `${Date.now()}-${mediaId}.${extension}`;

      // Try cloud storage first
      const { createDOClient } = await import("../config/digitalOceanConfig");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const doClient = await createDOClient();
      if (doClient) {
        const { s3, bucket, endpoint } = doClient;
        const fileKey = `uploads/incoming/${filename}`;
        console.log(`[EcommerceService] Uploading receipt to cloud storage: ${fileKey}`);

        try {
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket!,
              Key: fileKey,
              Body: buffer,
              ACL: "public-read",
              ContentType: mimeType,
            })
          );
        } catch (s3Error: any) {
          if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
            console.warn("[EcommerceService] S3 bucket does not support ACLs. Retrying without public-read ACL...");
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket!,
                Key: fileKey,
                Body: buffer,
                ContentType: mimeType,
              })
            );
          } else {
            throw s3Error;
          }
        }

        const endpointUrl = new URL(endpoint || "");
        return `https://${bucket}.${endpointUrl.host}/${fileKey}`;
      }

      // Local storage fallback
      const uploadDir = path.join(process.cwd(), "uploads", "incoming");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, buffer);
      
      const serverUrl = process.env.SERVER_URL || "https://wa.linalapro.com";
      return `${serverUrl.replace(/\/$/, "")}/uploads/incoming/${filename}`;
    } catch (err: any) {
      console.error("[EcommerceService] Failed to download/save incoming media:", err);
      return null;
    }
  }

  private static async addContactToCustomersGroup(
    channelId: string,
    phone: string,
    name: string,
    tenantId: string
  ) {
    try {
      const [existingContact] = await db
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.channelId, channelId), eq(schema.contacts.phone, phone)))
        .limit(1);

      if (existingContact) {
        const currentGroups = existingContact.groups || [];
        if (!currentGroups.includes("Customers")) {
          await db
            .update(schema.contacts)
            .set({
              groups: [...currentGroups, "Customers"],
              name: name || existingContact.name,
              updatedAt: new Date()
            })
            .where(eq(schema.contacts.id, existingContact.id));
        } else if (name && existingContact.name !== name) {
          await db
            .update(schema.contacts)
            .set({
              name,
              updatedAt: new Date()
            })
            .where(eq(schema.contacts.id, existingContact.id));
        }
      } else {
        // Create new contact
        await db
          .insert(schema.contacts)
          .values({
            channelId,
            phone,
            name: name || phone,
            groups: ["Customers"],
            source: "chatbot",
            createdBy: tenantId || "",
          });
      }
      console.log(`[EcommerceService] Added/updated contact ${phone} in Customers group`);
    } catch (err) {
      console.error("[EcommerceService] Failed to add contact to Customers group:", err);
    }
  }
}
