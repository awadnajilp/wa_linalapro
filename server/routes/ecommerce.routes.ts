import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";
import { EcommerceService } from "../services/ecommerce-service";

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

  // Get all products for tenant
  app.get("/api/ecommerce/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const list = await db
        .select()
        .from(schema.ecommerceProducts)
        .where(eq(schema.ecommerceProducts.tenantId, tenantId))
        .orderBy(desc(schema.ecommerceProducts.createdAt));

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create or Update product
  app.post("/api/ecommerce/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id, name, price, description, photos, checkoutLink, triggerKeyword, isTriggerEnabled, currency } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Product name is required" });
      }

      const parsedPhotos = Array.isArray(photos) ? photos : [];

      if (id) {
        // Edit existing product
        const [updated] = await db
          .update(schema.ecommerceProducts)
          .set({
            name,
            price: String(price || "0"),
            description: description || null,
            photos: parsedPhotos,
            checkoutLink: checkoutLink || null,
            triggerKeyword: triggerKeyword || null,
            isTriggerEnabled: isTriggerEnabled !== undefined ? isTriggerEnabled : false,
            currency: currency || "INR",
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
            photos: parsedPhotos,
            checkoutLink: checkoutLink || null,
            triggerKeyword: triggerKeyword || null,
            isTriggerEnabled: isTriggerEnabled !== undefined ? isTriggerEnabled : false,
            currency: currency || "INR"
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

      res.json(config || null);
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
        aiEnabled,
        aiTimeoutMinutes,
        aiAskButtonEnabled,
        welcomeMessages,
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
            aiEnabled: aiEnabled !== undefined ? aiEnabled : false,
            aiTimeoutMinutes: aiTimeoutMinutes !== undefined ? parseInt(String(aiTimeoutMinutes)) : 30,
            aiAskButtonEnabled: aiAskButtonEnabled !== undefined ? aiAskButtonEnabled : true,
            welcomeMessages: parseWelcomes,
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
            aiEnabled: aiEnabled !== undefined ? aiEnabled : false,
            aiTimeoutMinutes: aiTimeoutMinutes !== undefined ? parseInt(String(aiTimeoutMinutes)) : 30,
            aiAskButtonEnabled: aiAskButtonEnabled !== undefined ? aiAskButtonEnabled : true,
            welcomeMessages: parseWelcomes,
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

  // ============================================================
  // ORDERS
  // ============================================================

  // Get orders list with search & filters
  app.get("/api/ecommerce/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { search, status, paymentStatus, page = "1", limit = "10" } = req.query;

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
      const list = await db
        .select()
        .from(schema.ecommerceOrders)
        .where(and(...conditions))
        .orderBy(desc(schema.ecommerceOrders.createdAt))
        .limit(limitNum)
        .offset(offset);

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

      res.json(updated);
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
        .orderBy(desc(sql`max(${schema.ecommerceOrders.createdAt})`));

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
