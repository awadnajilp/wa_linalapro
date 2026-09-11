import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";
import { ServiceBookingService } from "../services/service-booking-service";
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
      const { id, name, description, sortOrder } = req.body;

      if (!name) return res.status(400).json({ error: "Category name is required" });

      if (id) {
        const [updated] = await db
          .update(schema.serviceCategories)
          .set({ name, description, sortOrder: sortOrder || 0, updatedAt: new Date() })
          .where(and(eq(schema.serviceCategories.id, id), eq(schema.serviceCategories.tenantId, tenantId)))
          .returning();
        return res.json({ category: updated });
      }

      const [created] = await db
        .insert(schema.serviceCategories)
        .values({ tenantId, name, description, sortOrder: sortOrder || 0 })
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
  // SERVICE MASTERS / SPECIALISTS CRUD
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
      const { id, name, title, bio, photoUrl, serviceIds, workingHours, slotIntervalMinutes, isActive } = req.body;

      if (!name) return res.status(400).json({ error: "Master/Specialist name is required" });

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
  // CONFIGURATION
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
          .where(and(eq(schema.serviceConfigs.tenantId, tenantId), eq(schema.serviceConfigs.channelId, channelId as string)))
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

      let existing = null;
      if (body.id) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(eq(schema.serviceConfigs.id, body.id))
          .limit(1);
        existing = c || null;
      } else if (body.channelId) {
        const [c] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(and(eq(schema.serviceConfigs.tenantId, tenantId), eq(schema.serviceConfigs.channelId, body.channelId)))
          .limit(1);
        existing = c || null;
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

      const pdfBuffer = await ServiceBookingService.generateBookingPdf(booking);
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
