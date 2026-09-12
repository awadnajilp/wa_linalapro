import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";
import { ServiceBookingService } from "../services/service-booking-service";
import {
  SERVICE_BOOKING_TEMPLATES_DEFINITIONS,
  provisionServiceTemplatesForChannel,
  submitServiceTemplateToMeta
} from "../services/service-booking-templates";
import ExcelJS from "exceljs";

export function registerServiceBookingRoutes(app: Express) {
  // 1. UPI Payment Deep Link Redirect
  app.get("/api/service-booking/checkout/pay", async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.query;
      if (!bookingId || typeof bookingId !== "string") {
        return res.status(400).send("<h1>Error</h1><p>Missing booking identifier.</p>");
      }

      const [booking] = await db
        .select()
        .from(schema.serviceBookings)
        .where(eq(schema.serviceBookings.id, bookingId))
        .limit(1);

      if (!booking) {
        return res.status(404).send("<h1>Error</h1><p>Booking not found.</p>");
      }

      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.tenantId, booking.tenantId))
        .limit(1);

      if (!config || !config.upiId) {
        return res.status(400).send("<h1>Error</h1><p>UPI payment is not configured.</p>");
      }

      const payUrl = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.upiMerchantName || "Service Provider")}&am=${booking.totalAmount}&tr=${booking.bookingNumber}&cu=INR`;
      res.redirect(302, payUrl);
    } catch (err: any) {
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  // 2. Query Dynamic Available Slots
  app.get("/api/service-booking/available-slots", async (req: Request, res: Response) => {
    try {
      const { serviceId, masterId, date, tenantId, channelId } = req.query;
      if (!serviceId || !date) {
        return res.status(400).json({ error: "serviceId and date are required" });
      }

      let targetTenantId = tenantId as string;
      if (!targetTenantId) {
        const [service] = await db
          .select({ tenantId: schema.services.tenantId })
          .from(schema.services)
          .where(eq(schema.services.id, serviceId as string))
          .limit(1);
        targetTenantId = service?.tenantId || "";
      }

      if (!targetTenantId) {
        return res.status(404).json({ error: "Service not found" });
      }

      const result = await ServiceBookingService.getAvailableSlots({
        tenantId: targetTenantId,
        serviceId: serviceId as string,
        masterId: masterId as string || undefined,
        date: date as string,
        channelId: channelId as string || undefined
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // SERVICES CRUD
  // ============================================================
  app.get("/api/service-booking/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const list = await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.tenantId, tenantId))
        .orderBy(desc(schema.services.createdAt));

      res.json({ services: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const {
        id,
        name,
        categoryId,
        price,
        durationMinutes,
        description,
        longDescription,
        photos,
        serviceMessages,
        triggerKeyword,
        isTriggerEnabled,
        currency,
        isActive
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Service name is required" });
      }

      if (id) {
        const [updated] = await db
          .update(schema.services)
          .set({
            name,
            categoryId: categoryId || null,
            price: String(price || "0"),
            durationMinutes: parseInt(durationMinutes, 10) || 30,
            description: description || null,
            longDescription: longDescription || null,
            photos: photos || [],
            serviceMessages: serviceMessages || [],
            triggerKeyword: triggerKeyword || null,
            isTriggerEnabled: isTriggerEnabled ?? false,
            currency: currency || "INR",
            isActive: isActive ?? true,
            updatedAt: new Date()
          })
          .where(and(eq(schema.services.id, id), eq(schema.services.tenantId, tenantId)))
          .returning();

        return res.json({ service: updated });
      }

      const [created] = await db
        .insert(schema.services)
        .values({
          tenantId,
          categoryId: categoryId || null,
          name,
          price: String(price || "0"),
          durationMinutes: parseInt(durationMinutes, 10) || 30,
          description: description || null,
          longDescription: longDescription || null,
          photos: photos || [],
          serviceMessages: serviceMessages || [],
          triggerKeyword: triggerKeyword || null,
          isTriggerEnabled: isTriggerEnabled ?? false,
          currency: currency || "INR",
          isActive: isActive ?? true
        })
        .returning();

      res.json({ service: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/service-booking/services/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;

      await db
        .delete(schema.services)
        .where(and(eq(schema.services.id, id), eq(schema.services.tenantId, tenantId)));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // CATEGORIES CRUD
  // ============================================================
  app.get("/api/service-booking/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const list = await db
        .select()
        .from(schema.serviceCategories)
        .where(eq(schema.serviceCategories.tenantId, tenantId))
        .orderBy(desc(schema.serviceCategories.createdAt));

      res.json({ categories: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id, name, description, icon, sortOrder } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      if (id) {
        const [updated] = await db
          .update(schema.serviceCategories)
          .set({
            name,
            description: description || null,
            icon: icon || null,
            sortOrder: sortOrder || 0,
            updatedAt: new Date()
          })
          .where(and(eq(schema.serviceCategories.id, id), eq(schema.serviceCategories.tenantId, tenantId)))
          .returning();

        return res.json({ category: updated });
      }

      const [created] = await db
        .insert(schema.serviceCategories)
        .values({
          tenantId,
          name,
          description: description || null,
          icon: icon || null,
          sortOrder: sortOrder || 0
        })
        .returning();

      res.json({ category: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/service-booking/categories/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;

      await db
        .delete(schema.serviceCategories)
        .where(and(eq(schema.serviceCategories.id, id), eq(schema.serviceCategories.tenantId, tenantId)));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // MASTERS / SPECIALISTS CRUD
  // ============================================================
  app.get("/api/service-booking/masters", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const list = await db
        .select()
        .from(schema.serviceMasters)
        .where(eq(schema.serviceMasters.tenantId, tenantId))
        .orderBy(desc(schema.serviceMasters.createdAt));

      res.json({ masters: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/masters", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const {
        id,
        name,
        title,
        bio,
        photoUrl,
        serviceIds,
        workingHours,
        slotIntervalMinutes,
        isActive
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Master name is required" });
      }

      if (id) {
        const [updated] = await db
          .update(schema.serviceMasters)
          .set({
            name,
            title: title || "Specialist",
            bio: bio || null,
            photoUrl: photoUrl || null,
            serviceIds: serviceIds || [],
            workingHours: workingHours || undefined,
            slotIntervalMinutes: parseInt(slotIntervalMinutes, 10) || 30,
            isActive: isActive ?? true,
            updatedAt: new Date()
          })
          .where(and(eq(schema.serviceMasters.id, id), eq(schema.serviceMasters.tenantId, tenantId)))
          .returning();

        return res.json({ master: updated });
      }

      const [created] = await db
        .insert(schema.serviceMasters)
        .values({
          tenantId,
          name,
          title: title || "Specialist",
          bio: bio || null,
          photoUrl: photoUrl || null,
          serviceIds: serviceIds || [],
          workingHours: workingHours || undefined,
          slotIntervalMinutes: parseInt(slotIntervalMinutes, 10) || 30,
          isActive: isActive ?? true
        })
        .returning();

      res.json({ master: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/service-booking/masters/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;

      await db
        .delete(schema.serviceMasters)
        .where(and(eq(schema.serviceMasters.id, id), eq(schema.serviceMasters.tenantId, tenantId)));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // SERVICE CONFIGURATION
  // ============================================================
  app.get("/api/service-booking/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId } = req.query;

      let config = null;
      if (channelId) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(and(eq(schema.serviceConfigs.tenantId, tenantId), eq(schema.serviceConfigs.channelId, String(channelId))))
          .limit(1);
        config = c || null;
      }

      if (!config) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(eq(schema.serviceConfigs.tenantId, tenantId))
          .limit(1);
        config = c || null;
      }

      res.json({ config });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const body = req.body;
      const channelId = body.channelId;

      let existing = null;
      if (channelId) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(and(eq(schema.serviceConfigs.tenantId, tenantId), eq(schema.serviceConfigs.channelId, String(channelId))))
          .limit(1);
        existing = c;
      }

      if (!existing && body.id) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(and(eq(schema.serviceConfigs.id, body.id), eq(schema.serviceConfigs.tenantId, tenantId)))
          .limit(1);
        existing = c;
      }

      if (existing) {
        const [updated] = await db
          .update(schema.serviceConfigs)
          .set({
            ...body,
            tenantId,
            updatedAt: new Date()
          })
          .where(eq(schema.serviceConfigs.id, existing.id))
          .returning();
        return res.json({ config: updated });
      }

      const [created] = await db
        .insert(schema.serviceConfigs)
        .values({
          ...body,
          tenantId
        })
        .returning();

      res.json({ config: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-generate or Sync Meta WhatsApp Flow Form for Service Booking
  app.post("/api/service-booking/sync-booking-flow", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user?.role === "team" ? user.createdBy : user?.id;
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(
          and(
            eq(schema.serviceConfigs.tenantId, tenantId),
            eq(schema.serviceConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      if (!config) {
        return res.status(404).json({ error: "Service Booking configuration not found for this channel." });
      }

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, String(channelId)))
        .limit(1);

      if (!channelRow) {
        return res.status(404).json({ error: "Channel not found." });
      }

      const result = await ServiceBookingService.generateAndSyncBookingFlow(config, channelRow);

      res.json({
        success: true,
        message: "WhatsApp Booking Flow successfully generated and synced!",
        data: result
      });
    } catch (err: any) {
      console.error("[ServiceBookingRoutes] sync-booking-flow error:", err);
      res.status(500).json({ error: err.message || "Failed to generate WhatsApp booking flow" });
    }
  });

  // ============================================================
  // WHATSAPP TEMPLATES MANAGEMENT
  // ============================================================
  app.get("/api/service-booking/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const { channelId } = req.query;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, String(channelId)))
        .limit(1);

      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const dbTemplates = await db
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.channelId, String(channelId)));

      const dbMap = new Map(dbTemplates.map(t => [t.name, t]));

      const items = Object.values(SERVICE_BOOKING_TEMPLATES_DEFINITIONS).map(def => {
        const found = dbMap.get(def.name);
        return {
          key: def.key,
          name: def.name,
          title: def.title,
          description: def.description,
          category: def.category,
          language: def.language,
          variables: def.variables,
          defaultHeader: def.defaultHeader,
          defaultBody: def.defaultBody,
          defaultFooter: def.defaultFooter,
          status: found?.status || "NOT_SUBMITTED",
          header: found?.header || def.defaultHeader || "",
          body: found?.body || def.defaultBody || "",
          footer: found?.footer || def.defaultFooter || "",
          whatsappTemplateId: found?.whatsappTemplateId || null,
          dbId: found?.id || null,
          mediaType: found?.mediaType || def.localData.mediaType || "text"
        };
      });

      res.json({
        templates: items,
        channelConnectionMethod: channel.connectionMethod || "embedded"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/templates/provision", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const result = await provisionServiceTemplatesForChannel(String(channelId), user.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/templates/submit", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const { channelId, templateName, body, header, footer } = req.body;

      if (!channelId || !templateName || !body) {
        return res.status(400).json({ error: "channelId, templateName, and body are required" });
      }

      const result = await submitServiceTemplateToMeta(
        String(channelId),
        user.id,
        templateName,
        body,
        header,
        footer
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // ABANDONED BOOKINGS RECOVERY
  // ============================================================
  app.get("/api/service-booking/abandoned-bookings", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { status, search, channelId, page = "1", limit = "10" } = req.query;

      const pageNum = parseInt(String(page), 10) || 1;
      const limitNum = parseInt(String(limit), 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      const conditions = [eq(schema.serviceAbandonedBookings.tenantId, tenantId)];

      if (status && status !== "all") {
        conditions.push(eq(schema.serviceAbandonedBookings.status, String(status)));
      }
      if (channelId && channelId !== "all") {
        conditions.push(eq(schema.serviceAbandonedBookings.channelId, String(channelId)));
      }
      if (search) {
        conditions.push(
          sql`(${schema.serviceAbandonedBookings.customerPhone} ILIKE ${`%${search}%`} OR ${schema.serviceAbandonedBookings.customerName} ILIKE ${`%${search}%`} OR ${schema.serviceAbandonedBookings.serviceName} ILIKE ${`%${search}%`})`
        );
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.serviceAbandonedBookings)
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);

      const items = await db
        .select()
        .from(schema.serviceAbandonedBookings)
        .where(and(...conditions))
        .orderBy(desc(schema.serviceAbandonedBookings.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json({
        abandonedBookings: items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/abandoned-bookings/:id/recover", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;
      const { customMessage } = req.body;

      const [cart] = await db
        .select()
        .from(schema.serviceAbandonedBookings)
        .where(
          and(
            eq(schema.serviceAbandonedBookings.id, id),
            eq(schema.serviceAbandonedBookings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!cart) {
        return res.status(404).json({ error: "Abandoned booking session not found" });
      }

      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.channelId, cart.channelId))
        .limit(1);

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, cart.channelId))
        .limit(1);

      if (!channelRow) {
        return res.status(404).json({ error: "Channel not found" });
      }

      if (customMessage) {
        await ServiceBookingService.sendAndSaveTextMessage(
          channelRow,
          cart.conversationId,
          cart.customerPhone,
          customMessage
        );
      } else if (config) {
        await ServiceBookingService.sendAbandonedBookingRecoveryMessage(cart, config, 1);
      }

      await db
        .update(schema.serviceAbandonedBookings)
        .set({
          followupCount: (cart.followupCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(schema.serviceAbandonedBookings.id, id));

      res.json({ success: true, message: "Recovery message dispatched successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // TEST REPORT NOTIFICATIONS
  // ============================================================
  app.post("/api/service-booking/reports/send-test-email", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, targetEmails } = req.body;

      let [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(
          and(
            eq(schema.serviceConfigs.tenantId, tenantId),
            channelId ? eq(schema.serviceConfigs.channelId, String(channelId)) : sql`1=1`
          )
        )
        .limit(1);

      if (!config) {
        return res.status(404).json({ error: "Service config not found" });
      }

      const result = await ServiceBookingService.sendDailyBookingsReport(config, {
        isManualTest: true,
        targetEmails: targetEmails && targetEmails.length > 0 ? targetEmails : undefined
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/service-booking/reports/send-test-wa", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, targetNumbers } = req.body;

      let [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(
          and(
            eq(schema.serviceConfigs.tenantId, tenantId),
            channelId ? eq(schema.serviceConfigs.channelId, String(channelId)) : sql`1=1`
          )
        )
        .limit(1);

      if (!config) {
        return res.status(404).json({ error: "Service config not found" });
      }

      const result = await ServiceBookingService.sendDailyBookingsWaReport(config, {
        isManualTest: true,
        targetNumbers: targetNumbers && targetNumbers.length > 0 ? targetNumbers : undefined,
        targetChannelId: channelId
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // BOOKINGS LIST & ACTIONS
  // ============================================================
  app.get("/api/service-booking/bookings", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { status, paymentStatus, startDate, endDate, search, masterId, serviceId } = req.query;

      const conditions = [eq(schema.serviceBookings.tenantId, tenantId)];

      if (status && status !== "all") {
        conditions.push(eq(schema.serviceBookings.status, String(status)));
      }
      if (paymentStatus && paymentStatus !== "all") {
        conditions.push(eq(schema.serviceBookings.paymentStatus, String(paymentStatus)));
      }
      if (masterId && masterId !== "all") {
        conditions.push(eq(schema.serviceBookings.masterId, String(masterId)));
      }
      if (serviceId && serviceId !== "all") {
        conditions.push(eq(schema.serviceBookings.serviceId, String(serviceId)));
      }
      if (startDate) {
        conditions.push(gte(schema.serviceBookings.bookingDate, String(startDate)));
      }
      if (endDate) {
        conditions.push(lte(schema.serviceBookings.bookingDate, String(endDate)));
      }
      if (search) {
        conditions.push(
          sql`(${schema.serviceBookings.bookingNumber} ILIKE ${`%${search}%`} OR ${schema.serviceBookings.customerPhone} ILIKE ${`%${search}%`} OR ${schema.serviceBookings.customerName} ILIKE ${`%${search}%`} OR ${schema.serviceBookings.serviceName} ILIKE ${`%${search}%`})`
        );
      }

      const list = await db
        .select()
        .from(schema.serviceBookings)
        .where(and(...conditions))
        .orderBy(desc(schema.serviceBookings.createdAt));

      res.json({ bookings: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/service-booking/bookings/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;
      const { status } = req.body;

      const [updated] = await db
        .update(schema.serviceBookings)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(schema.serviceBookings.id, id), eq(schema.serviceBookings.tenantId, tenantId)))
        .returning();

      res.json({ booking: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/service-booking/bookings/:id/payment-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;
      const { paymentStatus } = req.body;

      const [updated] = await db
        .update(schema.serviceBookings)
        .set({ paymentStatus, updatedAt: new Date() })
        .where(and(eq(schema.serviceBookings.id, id), eq(schema.serviceBookings.tenantId, tenantId)))
        .returning();

      res.json({ booking: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download PDF Booking Slip
  app.get("/api/service-booking/bookings/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { id } = req.params;

      const [booking] = await db
        .select()
        .from(schema.serviceBookings)
        .where(and(eq(schema.serviceBookings.id, id), eq(schema.serviceBookings.tenantId, tenantId)))
        .limit(1);

      if (!booking) return res.status(404).send("Booking not found");

      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.tenantId, tenantId))
        .limit(1);

      const pdfBuffer = await ServiceBookingService.generateBookingPdf(booking, config);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Booking_${booking.bookingNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Export Bookings to Excel (.xlsx)
  app.get("/api/service-booking/bookings/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const bookings = await db
        .select()
        .from(schema.serviceBookings)
        .where(eq(schema.serviceBookings.tenantId, tenantId))
        .orderBy(desc(schema.serviceBookings.createdAt));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Service Bookings");

      worksheet.columns = [
        { header: "Booking #", key: "bookingNumber", width: 15 },
        { header: "Date", key: "bookingDate", width: 14 },
        { header: "Start Time", key: "startTime", width: 12 },
        { header: "End Time", key: "endTime", width: 12 },
        { header: "Service Name", key: "serviceName", width: 25 },
        { header: "Specialist / Master", key: "masterName", width: 22 },
        { header: "Customer Name", key: "customerName", width: 20 },
        { header: "Customer Phone", key: "customerPhone", width: 18 },
        { header: "Total Amount", key: "totalAmount", width: 14 },
        { header: "Payment Mode", key: "paymentMethod", width: 16 },
        { header: "Payment Status", key: "paymentStatus", width: 16 },
        { header: "Booking Status", key: "status", width: 16 },
        { header: "Notes", key: "notes", width: 25 },
        { header: "Created At", key: "createdAt", width: 20 }
      ];

      bookings.forEach(b => {
        worksheet.addRow({
          bookingNumber: b.bookingNumber,
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          endTime: b.endTime,
          serviceName: b.serviceName,
          masterName: b.masterName || "Any Specialist",
          customerName: b.customerName || "Customer",
          customerPhone: b.customerPhone,
          totalAmount: `${b.currency || "INR"} ${b.totalAmount}`,
          paymentMethod: b.paymentMethod?.toUpperCase(),
          paymentStatus: b.paymentStatus?.toUpperCase(),
          status: b.status?.toUpperCase(),
          notes: b.notes || "",
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString() : ""
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="Service_Bookings_${Date.now()}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
