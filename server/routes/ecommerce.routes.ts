import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, like, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";
import { EcommerceService } from "../services/ecommerce-service";
import { AiBillingService } from "../services/ai-billing-service";

export function registerEcommerceRoutes(app: Express) {
  // Redirect to UPI deep link for customer checkouts
  app.get("/api/ecommerce/checkout/pay", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.query;
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).send("<h1>Error</h1><p>Missing order identifier.</p>");
      }

      // Fetch order
      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).send("<h1>Error</h1><p>Order not found.</p>");
      }

      // Fetch config for that channel
      if (!order.channelId) {
        return res.status(400).send("<h1>Error</h1><p>Channel mismatch.</p>");
      }

      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(eq(schema.ecommerceConfigs.channelId, order.channelId))
        .limit(1);

      if (!config || !config.upiId) {
        return res.status(400).send("<h1>Error</h1><p>UPI payment is not configured for this store.</p>");
      }

      // Construct upi://pay URI scheme
      const payUrl = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.upiMerchantName || "Store")}&am=${order.totalAmount}&tr=${order.orderNumber}&cu=INR`;

      // Redirect directly to the upi protocol
      res.redirect(302, payUrl);
    } catch (err: any) {
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  // ============================================================
  // PRODUCTS CRUD
  // ============================================================

  // Get all products for tenant (with pagination)
  app.get("/api/ecommerce/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { page = "1", limit = "10" } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Count total products
      const [countResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.tenantId, tenantId));
      const total = parseInt(String(countResult?.count || "0"));

      const list = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.tenantId, tenantId))
        .orderBy(desc(schema.ecommerceProducts.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json({
        products: list,
        total,
        page: pageNum,
        limit: limitNum
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create or Update product
  app.post("/api/ecommerce/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id, name, price, description, longDescription, photos, checkoutLink, triggerKeyword, isTriggerEnabled } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Product name is required" });
      }

      // Load tenant's configured store currency
      const [tenantConfig] = await db
        .select({ currency: schema.ecommerceConfigs.currency })
        .from(schema.ecommerceConfigs)
        .where(eq(schema.ecommerceConfigs.tenantId, tenantId))
        .limit(1);

      const storeCurrency = tenantConfig?.currency || "INR";
      const parsedPhotos = Array.isArray(photos) ? photos : [];

      if (id) {
        // Edit existing product
        const [updated] = await db
          .update(schema.ecommerceProducts)
          .set({
            name,
            price: String(price || "0"),
            description: description || null,
            longDescription: longDescription || null,
            photos: parsedPhotos,
            checkoutLink: checkoutLink || null,
            triggerKeyword: triggerKeyword || null,
            isTriggerEnabled: isTriggerEnabled !== undefined ? isTriggerEnabled : false,
            currency: storeCurrency,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(schema.ecommerceProducts.id, id),
              eq(schema.ecommerceProducts.tenantId, tenantId)
            )
          )
          .returning();

        if (!updated) {
          return res.status(404).json({ error: "Product not found" });
        }
        return res.json(updated);
      } else {
        // Create new product
        const [created] = await db
          .insert(schema.ecommerceProducts)
          .values({
            tenantId,
            name,
            price: String(price || "0"),
            description: description || null,
            longDescription: longDescription || null,
            photos: parsedPhotos,
            checkoutLink: checkoutLink || null,
            triggerKeyword: triggerKeyword || null,
            isTriggerEnabled: isTriggerEnabled !== undefined ? isTriggerEnabled : false,
            currency: storeCurrency
          })
          .returning();

        return res.json(created);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete product
  app.delete("/api/ecommerce/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [existing] = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(
          and(
            eq(schema.ecommerceProducts.id, req.params.id),
            eq(schema.ecommerceProducts.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      await db
        .delete(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.id, req.params.id));

      res.json({ success: true, message: "Product deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // CONFIGURATION
  // ============================================================

  // Get config for channel
  app.get("/api/ecommerce/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId } = req.query;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      let [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.tenantId, tenantId),
            eq(schema.ecommerceConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      if (!config) {
        const [inserted] = await db
          .insert(schema.ecommerceConfigs)
          .values({
            tenantId,
            channelId: String(channelId),
            storeTriggerKeyword: "store",
            isStoreFlowActive: true,
            welcomeMessage: "Welcome to our store!",
            checkoutFields: ["name", "phone", "address", "pin"],
            currency: "INR",
            aiEnabled: false,
            aiTimeoutMinutes: 30,
            aiAskButtonEnabled: true,
            deliveryFeeType: "flat",
            flatDeliveryFee: "0",
            defaultDeliveryFee: "0",
            stateDeliveryFees: {},
            storeCountry: "IN",
            isActive: true
          })
          .returning();
        config = inserted;
      }

      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save/Update config
  app.post("/api/ecommerce/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const {
        channelId,
        storeTriggerKeyword,
        isStoreFlowActive,
        welcomeMessage,
        welcomeHeaderUrl,
        welcomeHeaderType,
        qrCodeUrl,
        checkoutFields,
        instamojoApiKey,
        instamojoAuthToken,
        instamojoSandbox,
        razorpayKeyId,
        razorpayKeySecret,
        upiId,
        upiMerchantName,
        currency,
        apiKeySource,
        aiEnabled,
        aiVoiceEnabled,
        voiceProfileId,
        aiVoiceLanguageMode,
        aiTimeoutMinutes,
        aiAskButtonEnabled,
        welcomeMessages,
        aiSystemPrompt,
        storeName,
        storeAddress,
        storeWebsite,
        storeLogo,
        deliveryFeeType,
        flatDeliveryFee,
        defaultDeliveryFee,
        stateDeliveryFees,
        storeCountry,
        labelCod,
        labelUpiDirect,
        labelQrPay,
        labelGateway,
        autoAssignEnabled,
        autoAssignMode,
        autoAssignUserId,
        autoAssignExcludedUserIds,
        dailyReportEnabled,
        dailyReportEmails,
        dailyReportTime,
        dailyReportWaEnabled,
        dailyReportWaNumbers,
        dailyReportWaChannelId,
        abandonedCartRecoveryEnabled,
        abandonedCartDelay1Minutes,
        abandonedCartDelay2Hours,
        abandonedCartDiscountCode,
        abandonedCartDiscountPercent,
        abandonedCartMessage1,
        abandonedCartMessage2,
        isActive
      } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      // Check if config already exists
      const [existing] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(eq(schema.ecommerceConfigs.channelId, channelId))
        .limit(1);

      const fieldsArray = Array.isArray(checkoutFields) ? checkoutFields : ["name", "phone", "address", "pin"];
      const parseWelcomes = Array.isArray(welcomeMessages) ? welcomeMessages : [];
      const excludedUsers = Array.isArray(autoAssignExcludedUserIds) ? autoAssignExcludedUserIds : [];
      const emailsList = Array.isArray(dailyReportEmails) ? dailyReportEmails.filter(e => typeof e === "string" && e.trim().length > 0) : [];
      const waNumbersList = Array.isArray(dailyReportWaNumbers) ? dailyReportWaNumbers.filter(n => typeof n === "string" && n.trim().length > 0) : [];

      let config;
      if (existing) {
        const [updated] = await db
          .update(schema.ecommerceConfigs)
          .set({
            storeTriggerKeyword: storeTriggerKeyword || "store",
            isStoreFlowActive: isStoreFlowActive !== undefined ? isStoreFlowActive : true,
            welcomeMessage: welcomeMessage || "Welcome to our store!",
            welcomeHeaderUrl: welcomeHeaderUrl || null,
            welcomeHeaderType: welcomeHeaderType || "image",
            qrCodeUrl: qrCodeUrl || null,
            checkoutFields: fieldsArray,
            instamojoApiKey: instamojoApiKey || null,
            instamojoAuthToken: instamojoAuthToken || null,
            instamojoSandbox: instamojoSandbox !== undefined ? instamojoSandbox : true,
            razorpayKeyId: razorpayKeyId || null,
            razorpayKeySecret: razorpayKeySecret || null,
            upiId: upiId || null,
            upiMerchantName: upiMerchantName || null,
            currency: currency || "INR",
            apiKeySource: apiKeySource || "own_key",
            aiEnabled: aiEnabled !== undefined ? aiEnabled : false,
            aiVoiceEnabled: aiVoiceEnabled !== undefined ? aiVoiceEnabled : false,
            voiceProfileId: voiceProfileId || null,
            aiVoiceLanguageMode: aiVoiceLanguageMode || "profile",
            aiTimeoutMinutes: aiTimeoutMinutes !== undefined ? parseInt(String(aiTimeoutMinutes)) : 30,
            aiAskButtonEnabled: aiAskButtonEnabled !== undefined ? aiAskButtonEnabled : true,
            aiSystemPrompt: aiSystemPrompt !== undefined ? aiSystemPrompt : null,
            welcomeMessages: parseWelcomes,
            storeName: storeName || null,
            storeAddress: storeAddress || null,
            storeWebsite: storeWebsite || null,
            storeLogo: storeLogo || null,
            deliveryFeeType: deliveryFeeType || "flat",
            flatDeliveryFee: String(flatDeliveryFee || "0"),
            defaultDeliveryFee: String(defaultDeliveryFee || "0"),
            stateDeliveryFees: stateDeliveryFees || {},
            storeCountry: storeCountry || "IN",
            labelCod: labelCod || "Cash On Delvry(COD)",
            labelUpiDirect: labelUpiDirect || "GPay/PhonePe(UPI)",
            labelQrPay: labelQrPay || "Acc. Info(QR Code)",
            labelGateway: labelGateway || "Online Payment",
            autoAssignEnabled: autoAssignEnabled !== undefined ? autoAssignEnabled : false,
            autoAssignMode: autoAssignMode || "permanent",
            autoAssignUserId: autoAssignUserId || null,
            autoAssignExcludedUserIds: excludedUsers,
            dailyReportEnabled: dailyReportEnabled !== undefined ? dailyReportEnabled : false,
            dailyReportEmails: emailsList,
            dailyReportTime: dailyReportTime || "21:00",
            dailyReportWaEnabled: dailyReportWaEnabled !== undefined ? dailyReportWaEnabled : false,
            dailyReportWaNumbers: waNumbersList,
            dailyReportWaChannelId: dailyReportWaChannelId || null,
            abandonedCartRecoveryEnabled: abandonedCartRecoveryEnabled !== undefined ? abandonedCartRecoveryEnabled : false,
            abandonedCartDelay1Minutes: abandonedCartDelay1Minutes !== undefined ? parseInt(String(abandonedCartDelay1Minutes)) : 60,
            abandonedCartDelay2Hours: abandonedCartDelay2Hours !== undefined ? parseInt(String(abandonedCartDelay2Hours)) : 18,
            abandonedCartDiscountCode: abandonedCartDiscountCode || null,
            abandonedCartDiscountPercent: String(abandonedCartDiscountPercent || "0"),
            abandonedCartMessage1: abandonedCartMessage1 || null,
            abandonedCartMessage2: abandonedCartMessage2 || null,
            isActive: isActive !== undefined ? isActive : true,
            updatedAt: new Date()
          })
          .where(eq(schema.ecommerceConfigs.id, existing.id))
          .returning();
        config = updated;
      } else {
        const [created] = await db
          .insert(schema.ecommerceConfigs)
          .values({
            tenantId,
            channelId,
            storeTriggerKeyword: storeTriggerKeyword || "store",
            isStoreFlowActive: isStoreFlowActive !== undefined ? isStoreFlowActive : true,
            welcomeMessage: welcomeMessage || "Welcome to our store!",
            welcomeHeaderUrl: welcomeHeaderUrl || null,
            welcomeHeaderType: welcomeHeaderType || "image",
            qrCodeUrl: qrCodeUrl || null,
            checkoutFields: fieldsArray,
            instamojoApiKey: instamojoApiKey || null,
            instamojoAuthToken: instamojoAuthToken || null,
            instamojoSandbox: instamojoSandbox !== undefined ? instamojoSandbox : true,
            razorpayKeyId: razorpayKeyId || null,
            razorpayKeySecret: razorpayKeySecret || null,
            upiId: upiId || null,
            upiMerchantName: upiMerchantName || null,
            currency: currency || "INR",
            apiKeySource: apiKeySource || "own_key",
            aiEnabled: aiEnabled !== undefined ? aiEnabled : false,
            aiVoiceEnabled: aiVoiceEnabled !== undefined ? aiVoiceEnabled : false,
            voiceProfileId: voiceProfileId || null,
            aiVoiceLanguageMode: aiVoiceLanguageMode || "profile",
            aiTimeoutMinutes: aiTimeoutMinutes !== undefined ? parseInt(String(aiTimeoutMinutes)) : 30,
            aiAskButtonEnabled: aiAskButtonEnabled !== undefined ? aiAskButtonEnabled : true,
            aiSystemPrompt: aiSystemPrompt !== undefined ? aiSystemPrompt : null,
            welcomeMessages: parseWelcomes,
            storeName: storeName || null,
            storeAddress: storeAddress || null,
            storeWebsite: storeWebsite || null,
            storeLogo: storeLogo || null,
            deliveryFeeType: deliveryFeeType || "flat",
            flatDeliveryFee: String(flatDeliveryFee || "0"),
            defaultDeliveryFee: String(defaultDeliveryFee || "0"),
            stateDeliveryFees: stateDeliveryFees || {},
            storeCountry: storeCountry || "IN",
            labelCod: labelCod || "Cash On Delvry(COD)",
            labelUpiDirect: labelUpiDirect || "GPay/PhonePe(UPI)",
            labelQrPay: labelQrPay || "Acc. Info(QR Code)",
            labelGateway: labelGateway || "Online Payment",
            autoAssignEnabled: autoAssignEnabled !== undefined ? autoAssignEnabled : false,
            autoAssignMode: autoAssignMode || "permanent",
            autoAssignUserId: autoAssignUserId || null,
            autoAssignExcludedUserIds: excludedUsers,
            dailyReportEnabled: dailyReportEnabled !== undefined ? dailyReportEnabled : false,
            dailyReportEmails: emailsList,
            dailyReportTime: dailyReportTime || "21:00",
            dailyReportWaEnabled: dailyReportWaEnabled !== undefined ? dailyReportWaEnabled : false,
            dailyReportWaNumbers: waNumbersList,
            dailyReportWaChannelId: dailyReportWaChannelId || null,
            abandonedCartRecoveryEnabled: abandonedCartRecoveryEnabled !== undefined ? abandonedCartRecoveryEnabled : false,
            abandonedCartDelay1Minutes: abandonedCartDelay1Minutes !== undefined ? parseInt(String(abandonedCartDelay1Minutes)) : 60,
            abandonedCartDelay2Hours: abandonedCartDelay2Hours !== undefined ? parseInt(String(abandonedCartDelay2Hours)) : 18,
            abandonedCartDiscountCode: abandonedCartDiscountCode || null,
            abandonedCartDiscountPercent: String(abandonedCartDiscountPercent || "0"),
            abandonedCartMessage1: abandonedCartMessage1 || null,
            abandonedCartMessage2: abandonedCartMessage2 || null,
            isActive: isActive !== undefined ? isActive : true
          })
          .returning();
        config = created;
      }

      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manually trigger and send daily orders summary report now via email (for testing / on-demand)
  app.post("/api/ecommerce/config/send-daily-report-now", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, emails } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.tenantId, tenantId),
            eq(schema.ecommerceConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      if (!config) {
        return res.status(404).json({ error: "Ecommerce configuration not found for this channel." });
      }

      const overrideEmails = Array.isArray(emails) && emails.length > 0 ? emails : undefined;
      const result = await EcommerceService.sendDailyOrdersReport(config, {
        isManualTest: true,
        targetEmails: overrideEmails
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manually trigger and send daily orders summary report via WhatsApp (for testing)
  app.post("/api/ecommerce/config/send-test-wa-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, targetNumbers, targetChannelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      const [config] = await db
        .select()
        .from(schema.ecommerceConfigs)
        .where(
          and(
            eq(schema.ecommerceConfigs.tenantId, tenantId),
            eq(schema.ecommerceConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      if (!config) {
        return res.status(404).json({ error: "Ecommerce configuration not found for this channel." });
      }

      const result = await EcommerceService.sendDailyWhatsAppReport(config, {
        isManualTest: true,
        targetNumbers: Array.isArray(targetNumbers) && targetNumbers.length > 0 ? targetNumbers : undefined,
        targetChannelId: targetChannelId || undefined,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // ABANDONED CARTS
  // ============================================================

  // Get abandoned carts with pagination, search, and KPI stats
  app.get("/api/ecommerce/abandoned-carts", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { page = "1", limit = "10", status, search, channelId } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Base conditions
      const conditions: any[] = [eq(schema.ecommerceAbandonedCarts.tenantId, tenantId)];

      if (status && status !== "all") {
        conditions.push(eq(schema.ecommerceAbandonedCarts.status, String(status)));
      }

      if (channelId && channelId !== "all") {
        conditions.push(eq(schema.ecommerceAbandonedCarts.channelId, String(channelId)));
      }

      if (search && typeof search === "string" && search.trim().length > 0) {
        const term = `%${search.trim().toLowerCase()}%`;
        conditions.push(
          or(
            sql`lower(${schema.ecommerceAbandonedCarts.customerPhone}) LIKE ${term}`,
            sql`lower(${schema.ecommerceAbandonedCarts.customerName}) LIKE ${term}`,
            sql`lower(${schema.ecommerceAbandonedCarts.productName}) LIKE ${term}`
          )
        );
      }

      const whereClause = and(...conditions);

      // Count filtered carts
      const [countResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.ecommerceAbandonedCarts)
        .where(whereClause);
      const total = parseInt(String(countResult?.count || "0"));

      // Fetch list
      const carts = await db
        .select()
        .from(schema.ecommerceAbandonedCarts)
        .where(whereClause)
        .orderBy(desc(schema.ecommerceAbandonedCarts.lastActivityAt))
        .limit(limitNum)
        .offset(offset);

      // KPI Metrics for all tenant carts
      const allTenantCarts = await db
        .select({
          status: schema.ecommerceAbandonedCarts.status,
          price: schema.ecommerceAbandonedCarts.productPrice,
          quantity: schema.ecommerceAbandonedCarts.quantity
        })
        .from(schema.ecommerceAbandonedCarts)
        .where(eq(schema.ecommerceAbandonedCarts.tenantId, tenantId));

      let totalAbandonedCount = 0;
      let totalRecoveredCount = 0;
      let totalCancelledCount = 0;
      let recoveredRevenue = 0;
      let lostPotentialRevenue = 0;

      for (const c of allTenantCarts) {
        const itemAmount = (parseFloat(c.price || "0") || 0) * (c.quantity || 1);
        if (c.status === "recovered") {
          totalRecoveredCount++;
          recoveredRevenue += itemAmount;
        } else if (c.status === "cancelled") {
          totalCancelledCount++;
        } else {
          totalAbandonedCount++;
          lostPotentialRevenue += itemAmount;
        }
      }

      const totalCarts = allTenantCarts.length;
      const recoveryRate = totalCarts > 0 ? (totalRecoveredCount / totalCarts) * 100 : 0;

      res.json({
        carts,
        total,
        page: pageNum,
        limit: limitNum,
        stats: {
          totalAbandoned: totalAbandonedCount,
          totalRecovered: totalRecoveredCount,
          totalCancelled: totalCancelledCount,
          totalCarts,
          recoveredRevenue,
          lostPotentialRevenue,
          recoveryRate: parseFloat(recoveryRate.toFixed(1))
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manually trigger recovery message to a customer
  app.post("/api/ecommerce/abandoned-carts/:id/send-recovery", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customMessage } = req.body;

      const result = await EcommerceService.sendManualRecoveryMessage(id, customMessage);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update abandoned cart status (e.g. mark manual recovered or cancelled)
  app.patch("/api/ecommerce/abandoned-carts/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["abandoned", "recovered", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const [updated] = await db
        .update(schema.ecommerceAbandonedCarts)
        .set({
          status,
          ...(status === "recovered" ? { recoveredAt: new Date() } : {}),
          updatedAt: new Date()
        })
        .where(eq(schema.ecommerceAbandonedCarts.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Abandoned cart not found" });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete abandoned cart record
  app.delete("/api/ecommerce/abandoned-carts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db
        .delete(schema.ecommerceAbandonedCarts)
        .where(eq(schema.ecommerceAbandonedCarts.id, id));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // AI USAGE & WALLET BILLING LEDGER
  // ============================================================
  app.get("/api/ecommerce/ai-usage-report", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, days = "30" } = req.query;

      const report = await AiBillingService.getDailyUsageReport(
        tenantId,
        channelId ? String(channelId) : undefined,
        parseInt(String(days)) || 30
      );

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // ORDERS
  // ============================================================

  // Get orders list with search, date filters, and export
  app.get("/api/ecommerce/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { search, status, paymentStatus, startDate, endDate, export: isExport, page = "1", limit = "10" } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      const conditions = [eq(schema.ecommerceOrders.tenantId, tenantId)];

      if (status && status !== "all") {
        conditions.push(eq(schema.ecommerceOrders.status, String(status)));
      }
      if (paymentStatus && paymentStatus !== "all") {
        conditions.push(eq(schema.ecommerceOrders.paymentStatus, String(paymentStatus)));
      }
      if (startDate) {
        conditions.push(gte(schema.ecommerceOrders.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(schema.ecommerceOrders.createdAt, end));
      }
      if (search) {
        conditions.push(
          sql`(${schema.ecommerceOrders.orderNumber} ILIKE ${`%"${search}"%`} OR 
                ${schema.ecommerceOrders.customerPhone} ILIKE ${`%"${search}"%`} OR 
                ${schema.ecommerceOrders.customerName} ILIKE ${`%"${search}"%`} OR
                ${schema.ecommerceOrders.productName} ILIKE ${`%"${search}"%`})`
        );
      }

      // Count totals
      const [countResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.ecommerceOrders)
        .where(and(...conditions));

      const total = parseInt(String(countResult?.count || "0"));

      // Fetch list
      let queryBuilder = db
        .select()
        .from(schema.ecommerceOrders)
        .where(and(...conditions))
        .orderBy(desc(schema.ecommerceOrders.createdAt));

      if (isExport !== "true") {
        queryBuilder = queryBuilder.limit(limitNum).offset(offset) as any;
      }

      const list = await queryBuilder;

      res.json({
        orders: list,
        total,
        page: pageNum,
        limit: limitNum
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update order status & trigger customer WhatsApp notification
  app.post("/api/ecommerce/orders/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { status, paymentStatus } = req.body;

      const [existing] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.id, req.params.id),
            eq(schema.ecommerceOrders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updates: any = {};
      if (status) updates.status = status;
      if (paymentStatus) updates.paymentStatus = paymentStatus;
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(schema.ecommerceOrders)
        .set(updates)
        .where(eq(schema.ecommerceOrders.id, req.params.id))
        .returning();

      // Trigger status update WhatsApp notification if status changed
      if (status && status !== existing.status) {
        await EcommerceService.sendOrderStatusUpdateNotification(updated.id, status);
      }

      if (paymentStatus === "paid" && existing.paymentStatus !== "paid") {
        try {
          await EcommerceService.sendInvoiceToCustomer(updated.id);
        } catch (e) {
          console.error("Failed to send customer invoice:", e);
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit/Update Order details
  app.patch("/api/ecommerce/orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const {
        customerName,
        customerPhone,
        address,
        pin,
        totalAmount,
        paymentMethod,
        paymentStatus,
        status,
        quantity,
        price
      } = req.body;

      const [existing] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.id, req.params.id),
            eq(schema.ecommerceOrders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updates: any = {};
      if (customerName !== undefined) updates.customerName = customerName;
      if (customerPhone !== undefined) updates.customerPhone = customerPhone;
      if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);
      if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
      if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
      if (status !== undefined) updates.status = status;
      if (quantity !== undefined) updates.quantity = parseInt(String(quantity)) || 1;
      if (price !== undefined) updates.price = String(price);

      const existingData = existing.customerData || {};
      const updatedData = {
        ...existingData,
        ...(address !== undefined ? { address } : {}),
        ...(pin !== undefined ? { pin } : {})
      };
      updates.customerData = updatedData;
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(schema.ecommerceOrders)
        .set(updates)
        .where(eq(schema.ecommerceOrders.id, req.params.id))
        .returning();

      if (status && status !== existing.status) {
        try {
          await EcommerceService.sendOrderStatusUpdateNotification(updated.id, status);
        } catch (e) {
          console.error("Failed to send order status update notification:", e);
        }
      }

      if (paymentStatus === "paid" && existing.paymentStatus !== "paid") {
        try {
          await EcommerceService.sendInvoiceToCustomer(updated.id);
        } catch (e) {
          console.error("Failed to send customer invoice:", e);
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Order
  app.delete("/api/ecommerce/orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [existing] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.id, req.params.id),
            eq(schema.ecommerceOrders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }

      await db
        .delete(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.id, req.params.id));

      res.json({ success: true, message: "Order deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download Order Invoice PDF
  app.get("/api/ecommerce/orders/:id/invoice", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.id, req.params.id),
            eq(schema.ecommerceOrders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const pdfBuffer = await EcommerceService.generateOrderPdf(order);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Invoice-${order.orderNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download Order Shipping Label PDF
  app.get("/api/ecommerce/orders/:id/shipping-label", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [order] = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(
          and(
            eq(schema.ecommerceOrders.id, req.params.id),
            eq(schema.ecommerceOrders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const [merchantUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order.tenantId))
        .limit(1);

      const pdfBuffer = await EcommerceService.generateShippingLabelPdf(order, merchantUser);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=ShippingLabel-${order.orderNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // CUSTOMERS LIST
  // ============================================================

  // Get aggregated customers list
  app.get("/api/ecommerce/customers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { page = "1", limit = "10" } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Count total distinct customers
      const [countResult] = await db
        .select({ count: sql`count(distinct ${schema.ecommerceOrders.customerPhone})` })
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.tenantId, tenantId));
      const total = parseInt(String(countResult?.count || "0"));

      const list = await db
        .select({
          phone: schema.ecommerceOrders.customerPhone,
          name: sql`max(${schema.ecommerceOrders.customerName})`,
          lastOrderDate: sql`max(${schema.ecommerceOrders.createdAt})`,
          totalOrders: sql`count(*)`,
          totalSpent: sql`sum(${schema.ecommerceOrders.totalAmount})`
        })
        .from(schema.ecommerceOrders)
        .where(eq(schema.ecommerceOrders.tenantId, tenantId))
        .groupBy(schema.ecommerceOrders.customerPhone)
        .orderBy(desc(sql`max(${schema.ecommerceOrders.createdAt})`))
        .limit(limitNum)
        .offset(offset);

      res.json({
        customers: list,
        total,
        page: pageNum,
        limit: limitNum
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
