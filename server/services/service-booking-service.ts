import { db } from "../db";
import { storage } from "../storage";
import * as schema from "@shared/schema";
import { eq, and, or, inArray, sql, gte, lte, desc } from "drizzle-orm";
import * as path from "path";
import * as fs from "fs";
import { WhatsAppApiService } from "./whatsapp-api";
import { getTransporter, getSystemFromAddress } from "./email.service";
import PDFDocument from "pdfkit";
import axios from "axios";
import Razorpay from "razorpay";
import ExcelJS from "exceljs";
import { WhatsappFlowsService } from "./whatsapp-flows.service";
import { AddonManager } from "./addon-manager";
import { SERVICE_BOOKING_TEMPLATES_DEFINITIONS } from "./service-booking-templates";

export interface AvailableSlot {
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  label: string;     // "10:00 AM - 10:30 AM"
  available: boolean;
}

export class ServiceBookingService {
  /**
   * Helper to check if channel is Meta Cloud API (supports manual, embedded, waba)
   */
  public static isCloudApiChannel(channelRow: any): boolean {
    if (!channelRow) return false;
    if (channelRow.connectionMethod === "qr" || channelRow.connectionMethod === "qr_code" || channelRow.channelType === "qr") {
      return false;
    }
    return Boolean(
      (channelRow.phoneNumberId && channelRow.accessToken) ||
      channelRow.connectionMethod === "embedded" ||
      channelRow.connectionMethod === "manual" ||
      channelRow.connectionMethod === "waba" ||
      !channelRow.connectionMethod
    );
  }
  /**
   * Check if service booking addon is active for tenant
   */
  public static async isServiceBookingActive(tenantId: string): Promise<boolean> {
    return await AddonManager.isAddonActive(tenantId, "service-booking");
  }

  /**
   * Helper to format 24h time to 12h AM/PM label
   */
  public static formatTimeLabel(time24: string): string {
    const [hStr, mStr] = (time24 || "00:00").split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  /**
   * Helper to add minutes to "HH:mm" time string
   */
  public static addMinutesToTime(timeStr: string, minutesToAdd: number): string {
    const [h, m] = (timeStr || "00:00").split(":").map(Number);
    const totalMinutes = h * 60 + m + minutesToAdd;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  }

  /**
   * Helper to parse time string "HH:mm" to minutes from midnight
   */
  public static timeToMinutes(timeStr: string): number {
    const [h, m] = (timeStr || "00:00").split(":").map(Number);
    return h * 60 + m;
  }

  /**
   * Helper to get human label for checkout field
   */
  public static getFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      name: "Full Name",
      phone: "Phone Number",
      email: "Email Address",
      notes: "Notes / Special Requests",
      address: "Address",
      age: "Age",
      gender: "Gender",
      pin: "PIN / Zip Code",
      city: "City"
    };
    return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Read media buffer from URL or local path
   */
  public static async readMediaBuffer(urlOrPath: string): Promise<Buffer | null> {
    try {
      if (!urlOrPath) return null;
      if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
        const response = await axios.get(urlOrPath, { responseType: "arraybuffer", timeout: 15000 });
        return Buffer.from(response.data);
      }
      const localPath = urlOrPath.startsWith("/")
        ? urlOrPath
        : path.resolve(process.cwd(), urlOrPath.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        return await fs.promises.readFile(localPath);
      }
      return null;
    } catch (err: any) {
      console.error(`[ServiceBookingService] Failed to read media buffer from ${urlOrPath}:`, err.message);
      return null;
    }
  }

  /**
   * Generate Next Booking Number (e.g. BKG-1001)
   */
  public static async generateNextBookingNumber(tenantId: string): Promise<string> {
    const allBookings = await db
      .select({ bookingNumber: schema.serviceBookings.bookingNumber })
      .from(schema.serviceBookings);

    let maxNum = 1000;
    for (const b of allBookings) {
      if (b.bookingNumber && b.bookingNumber.startsWith("BKG-")) {
        const numPart = parseInt(b.bookingNumber.replace("BKG-", ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    return `BKG-${maxNum + 1}`;
  }

  /**
   * Helper to get current Date, YYYY-MM-DD date string, and current minutes in target timezone
   */
  public static getNowInTimezone(timezone?: string): { now: Date; todayStr: string; currentMinutes: number; timezone: string } {
    const tz = timezone || "Asia/Kolkata";
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const partMap: Record<string, string> = {};
      for (const p of parts) {
        partMap[p.type] = p.value;
      }
      const year = partMap["year"] || String(now.getUTCFullYear());
      const month = partMap["month"] || String(now.getUTCMonth() + 1).padStart(2, "0");
      const day = partMap["day"] || String(now.getUTCDate()).padStart(2, "0");
      let hour = parseInt(partMap["hour"] || "0", 10);
      if (hour === 24) hour = 0;
      const minute = parseInt(partMap["minute"] || "0", 10);

      const todayStr = `${year}-${month}-${day}`;
      const currentMinutes = hour * 60 + minute;
      return { now, todayStr, currentMinutes, timezone: tz };
    } catch (e) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return { now, todayStr, currentMinutes, timezone: tz };
    }
  }

  /**
   * Get upcoming N booking dates formatted relative to the target timezone
   */
  public static getUpcomingDates(timezone?: string, count: number = 7): { dateStr: string; label: string; fullLabel: string }[] {
    const tz = timezone || "Asia/Kolkata";
    const { todayStr } = this.getNowInTimezone(tz);
    const [y, m, d] = todayStr.split("-").map(Number);
    const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    const upcoming: { dateStr: string; label: string; fullLabel: string }[] = [];
    for (let i = 0; i < count; i++) {
      const cur = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      const curY = cur.getUTCFullYear();
      const curM = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const curD = String(cur.getUTCDate()).padStart(2, "0");
      const dStr = `${curY}-${curM}-${curD}`;

      const dayName = cur.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const monthDay = cur.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const tag = i === 0 ? "Today" : (i === 1 ? "Tomorrow" : `${dayName}, ${monthDay}`);
      upcoming.push({ dateStr: dStr, label: tag, fullLabel: `${tag} (${dStr})` });
    }
    return upcoming;
  }

  /**
   * Accurately get day of week (0=Sunday, 1=Monday... 6=Saturday) for a YYYY-MM-DD date
   */
  public static getDayOfWeekInDate(dateStr: string): number {
    const [y, m, d] = (dateStr || "").split("-").map(Number);
    if (!y || !m || !d) return new Date().getDay();
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dt.getUTCDay();
  }

  /**
   * Calculate Dynamic Available Slots for a given service, master, and date with Timezone awareness.
   */
  public static async getAvailableSlots(params: {
    tenantId: string;
    serviceId: string;
    masterId?: string | null;
    date: string; // "YYYY-MM-DD"
    channelId?: string;
  }): Promise<{ availableSlots: AvailableSlot[]; message?: string; isOffDay?: boolean }> {
    const { tenantId, serviceId, masterId, date, channelId } = params;

    // 1. Fetch service details
    const [service] = await db
      .select()
      .from(schema.services)
      .where(and(eq(schema.services.id, serviceId), eq(schema.services.tenantId, tenantId)))
      .limit(1);

    if (!service) {
      return { availableSlots: [], message: "Service not found" };
    }

    const duration = service.durationMinutes || 30;

    // 2. Fetch master details if provided
    let master: schema.ServiceMaster | null = null;
    if (masterId && masterId !== "any") {
      const [m] = await db
        .select()
        .from(schema.serviceMasters)
        .where(and(eq(schema.serviceMasters.id, masterId), eq(schema.serviceMasters.tenantId, tenantId)))
        .limit(1);
      master = m || null;
    }

    // 3. Fetch config for fallback working hours & timezone
    let config: schema.ServiceConfig | null = null;
    if (channelId) {
      const [c] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.channelId, channelId))
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

    // Working hours & Timezone logic
    const workingHours = master?.workingHours || config?.defaultWorkingHours || {
      days: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    };

    const slotInterval = master?.slotIntervalMinutes || config?.defaultSlotIntervalMinutes || duration || 30;
    const activeTz = master?.timezone || config?.timezone || "Asia/Kolkata";

    // Check day of week accurately
    const dayOfWeek = this.getDayOfWeekInDate(date);

    const activeDays = Array.isArray(workingHours.days) ? workingHours.days : [1, 2, 3, 4, 5, 6];
    if (!activeDays.includes(dayOfWeek)) {
      return { availableSlots: [], message: "The specialist/business is closed on this day.", isOffDay: true };
    }

    const dayStartMin = this.timeToMinutes(workingHours.startTime || "09:00");
    const dayEndMin = this.timeToMinutes(workingHours.endTime || "18:00");
    const breakStartMin = workingHours.breakStartTime ? this.timeToMinutes(workingHours.breakStartTime) : null;
    const breakEndMin = workingHours.breakEndTime ? this.timeToMinutes(workingHours.breakEndTime) : null;

    // Fetch existing bookings for this date and specialist
    const bookingConditions = [
      eq(schema.serviceBookings.tenantId, tenantId),
      eq(schema.serviceBookings.bookingDate, date),
      or(
        eq(schema.serviceBookings.status, "confirmed"),
        eq(schema.serviceBookings.status, "pending")
      )
    ];

    if (masterId && masterId !== "any") {
      bookingConditions.push(eq(schema.serviceBookings.masterId, masterId));
    }

    const bookedAppointments = await db
      .select()
      .from(schema.serviceBookings)
      .where(and(...bookingConditions));

    // Generate slots
    const availableSlots: AvailableSlot[] = [];
    let currentMin = dayStartMin;

    // Determine current time in the active business/master timezone
    const { todayStr, currentMinutes } = this.getNowInTimezone(activeTz);
    const isToday = todayStr === date;
    const currentMinutesNow = currentMinutes + 15; // 15 mins advance buffer

    while (currentMin + duration <= dayEndMin) {
      const slotStartH = Math.floor(currentMin / 60);
      const slotStartM = currentMin % 60;
      const slotStartStr = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;

      const slotEndMin = currentMin + duration;
      const slotEndH = Math.floor(slotEndMin / 60);
      const slotEndM = slotEndMin % 60;
      const slotEndStr = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

      // Check if overlaps break time
      let inBreak = false;
      if (breakStartMin !== null && breakEndMin !== null) {
        if (currentMin < breakEndMin && slotEndMin > breakStartMin) {
          inBreak = true;
        }
      }

      // Check if slot is in past (if booking for today in target timezone)
      let inPast = false;
      if (isToday && currentMin < currentMinutesNow) {
        inPast = true;
      }

      // Check if overlaps existing booked appointment
      let isBooked = false;
      for (const b of bookedAppointments) {
        const bStart = this.timeToMinutes(b.startTime);
        const bEnd = this.timeToMinutes(b.endTime);
        if (currentMin < bEnd && slotEndMin > bStart) {
          isBooked = true;
          break;
        }
      }

      if (!inBreak && !inPast && !isBooked) {
        availableSlots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          label: `${this.formatTimeLabel(slotStartStr)} - ${this.formatTimeLabel(slotEndStr)}`,
          available: true
        });
      }

      currentMin += slotInterval;
    }

    return { availableSlots };
  }

  /**
   * Auto-Assign conversation to team member (Permanent or Round Robin with exclusions)
   */
  public static async assignConversationIfNeeded(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string
  ): Promise<void> {
    try {
      if (!config.autoAssignEnabled) return;

      const [conv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, conversationId))
        .limit(1);

      if (!conv || conv.assignedTo) return; // already assigned

      if (config.autoAssignMode === "permanent" && config.autoAssignUserId) {
        await db
          .update(schema.conversations)
          .set({ assignedTo: config.autoAssignUserId, updatedAt: new Date() })
          .where(eq(schema.conversations.id, conversationId));
        return;
      }

      if (config.autoAssignMode === "round_robin") {
        const tenantUsers = await db
          .select()
          .from(schema.users)
          .where(
            or(
              eq(schema.users.id, config.tenantId),
              eq(schema.users.createdBy, config.tenantId)
            )
          );

        const excluded = Array.isArray(config.autoAssignExcludedUserIds) ? config.autoAssignExcludedUserIds : [];
        const eligible = tenantUsers.filter(u => !excluded.includes(u.id));

        if (eligible.length === 0) return;

        // Find eligible member with fewest or oldest assigned conversations
        const eligibleIds = eligible.map(u => u.id);
        const assignedCounts = await db
          .select({
            assignedTo: schema.conversations.assignedTo,
            count: sql<number>`count(*)`
          })
          .from(schema.conversations)
          .where(and(eq(schema.conversations.channelId, channelRow.id), inArray(schema.conversations.assignedTo, eligibleIds)))
          .groupBy(schema.conversations.assignedTo);

        const countMap: Record<string, number> = {};
        eligibleIds.forEach(id => { countMap[id] = 0; });
        assignedCounts.forEach((r: any) => { if (r.assignedTo) countMap[r.assignedTo] = Number(r.count || 0); });

        let bestId = eligibleIds[0];
        let minCount = countMap[bestId] ?? 0;

        for (const id of eligibleIds) {
          if ((countMap[id] ?? 0) < minCount) {
            minCount = countMap[id];
            bestId = id;
          }
        }

        await db
          .update(schema.conversations)
          .set({ assignedTo: bestId, updatedAt: new Date() })
          .where(eq(schema.conversations.id, conversationId));
      }
    } catch (err: any) {
      console.warn("[ServiceBookingService] Auto-assignment notice:", err.message);
    }
  }

  /**
   * Track or update an abandoned booking session.
   */
  public static async trackAbandonedBooking(params: {
    tenantId: string;
    channelId: string;
    conversationId: string;
    customerPhone: string;
    customerName?: string | null;
    serviceId?: string | null;
    serviceName?: string | null;
    servicePrice?: string | null;
    masterId?: string | null;
    masterName?: string | null;
    bookingDate?: string | null;
    selectedSlot?: string | null;
    customerData?: Record<string, any>;
    currentStep: string;
  }): Promise<void> {
    try {
      const {
        tenantId,
        channelId,
        conversationId,
        customerPhone,
        customerName,
        serviceId,
        serviceName,
        servicePrice,
        masterId,
        masterName,
        bookingDate,
        selectedSlot,
        customerData,
        currentStep
      } = params;

      const [existing] = await db
        .select()
        .from(schema.serviceAbandonedBookings)
        .where(
          and(
            eq(schema.serviceAbandonedBookings.conversationId, conversationId),
            eq(schema.serviceAbandonedBookings.status, "abandoned")
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(schema.serviceAbandonedBookings)
          .set({
            customerName: customerName || existing.customerName,
            serviceId: serviceId || existing.serviceId,
            serviceName: serviceName || existing.serviceName,
            servicePrice: servicePrice ? String(servicePrice) : existing.servicePrice,
            masterId: masterId || existing.masterId,
            masterName: masterName || existing.masterName,
            bookingDate: bookingDate || existing.bookingDate,
            selectedSlot: selectedSlot || existing.selectedSlot,
            customerData: { ...(existing.customerData || {}), ...(customerData || {}) },
            currentStep,
            lastActivityAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(schema.serviceAbandonedBookings.id, existing.id));
      } else {
        await db.insert(schema.serviceAbandonedBookings).values({
          tenantId,
          channelId,
          conversationId,
          customerPhone,
          customerName: customerName || null,
          serviceId: serviceId || null,
          serviceName: serviceName || null,
          servicePrice: servicePrice ? String(servicePrice) : "0",
          masterId: masterId || null,
          masterName: masterName || null,
          bookingDate: bookingDate || null,
          selectedSlot: selectedSlot || null,
          customerData: customerData || {},
          currentStep,
          status: "abandoned",
          lastActivityAt: new Date()
        });
      }
    } catch (err: any) {
      console.warn("[ServiceBookingService] Failed to track abandoned booking:", err.message);
    }
  }

  /**
   * Mark active abandoned booking as recovered when an appointment is placed.
   */
  public static async markAbandonedBookingRecovered(conversationId: string, bookingId: string): Promise<void> {
    try {
      await db
        .update(schema.serviceAbandonedBookings)
        .set({
          status: "recovered",
          recoveredAt: new Date(),
          recoveredBookingId: bookingId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(schema.serviceAbandonedBookings.conversationId, conversationId),
            eq(schema.serviceAbandonedBookings.status, "abandoned")
          )
        );
    } catch (err: any) {
      console.warn("[ServiceBookingService] Failed to mark abandoned booking recovered:", err.message);
    }
  }

  /**
   * Generate or Sync Meta WhatsApp Flow for Service Booking
   */
  public static async generateAndSyncBookingFlow(config: schema.ServiceConfig, channelRow: any): Promise<any> {
    const rawFields = Array.isArray(config.checkoutFields) ? config.checkoutFields : [
      { text: "Please enter your full name:", variable: "name" },
      { text: "Please enter your phone number:", variable: "phone" },
      { text: "Any notes / requests:", variable: "notes" }
    ];

    const fields = rawFields.map((f: any) => {
      if (typeof f === "string") {
        return { text: this.getFieldLabel(f), variable: f };
      }
      return {
        text: f.text ? f.text.replace(/Please enter your\s*|\*|:/gi, "").trim() : this.getFieldLabel(f.variable),
        variable: f.variable || "custom_field"
      };
    });

    const businessTitle = config.businessName || "Service Booking";
    const flowName = `${businessTitle} Booking Form`;

    const children: any[] = [
      {
        type: "TextHeading",
        text: `${businessTitle}`
      },
      {
        type: "TextCaption",
        text: "Please choose your preferred specialist, date, time slot, and details below to confirm your appointment."
      }
    ];

    const payloadObj: Record<string, string> = {};

    // 1. Specialist dropdown if masters exist
    const allMasters = await db
      .select()
      .from(schema.serviceMasters)
      .where(and(eq(schema.serviceMasters.tenantId, config.tenantId), eq(schema.serviceMasters.isActive, true)));

    const hasMasters = config.requireMasterSelection && allMasters.length > 0;

    if (hasMasters) {
      payloadObj["master_id"] = "${form.master_id}";
      children.push({
        type: "Dropdown",
        name: "master_id",
        label: "Preferred Specialist",
        required: true,
        "data-source": "${data.available_masters}"
      });
    }

    // 2. Dynamic Booking Date & Time Slot Dropdowns
    payloadObj["booking_date"] = "${form.booking_date}";
    children.push({
      type: "Dropdown",
      name: "booking_date",
      label: "Select Appointment Date",
      required: true,
      "data-source": "${data.available_dates}"
    });

    payloadObj["booking_slot"] = "${form.booking_slot}";
    children.push({
      type: "Dropdown",
      name: "booking_slot",
      label: "Select Available Time Slot",
      required: true,
      "data-source": "${data.available_slots}"
    });

    // 3. Dynamic Customer Fields
    for (const f of fields) {
      const v = f.variable;
      const label = f.text || this.getFieldLabel(v);
      payloadObj[v] = "${form." + v + "}";

      if (v === "notes" || v === "address") {
        children.push({
          type: "TextArea",
          name: v,
          label: label,
          required: false
        });
      } else if (v === "phone" || v === "mobile") {
        children.push({
          type: "TextInput",
          name: v,
          label: label,
          required: true,
          "input-type": "phone"
        });
      } else if (v === "email") {
        children.push({
          type: "TextInput",
          name: v,
          label: label,
          required: false,
          "input-type": "email"
        });
      } else {
        children.push({
          type: "TextInput",
          name: v,
          label: label,
          required: true
        });
      }
    }

    // 4. Payment options
    const paymentDataSource = [];
    paymentDataSource.push({ id: "cod", title: config.labelCod || "Pay at Venue (Cash/Card)" });
    if (config.upiId) {
      paymentDataSource.push({ id: "upi_direct", title: config.labelUpiDirect || "GPay / PhonePe (UPI)" });
    }
    if (config.qrCodeUrl) {
      paymentDataSource.push({ id: "qr_pay", title: config.labelQrPay || "Acc. Info (QR Code)" });
    }
    if ((config.razorpayKeyId && config.razorpayKeySecret) || (config.instamojoApiKey && config.instamojoAuthToken)) {
      paymentDataSource.push({ id: "gateway", title: config.labelGateway || "Online Payment" });
    }

    payloadObj["payment_method"] = "${form.payment_method}";
    children.push({
      type: "RadioButtonsGroup",
      name: "payment_method",
      label: "Select Payment Option",
      required: true,
      "data-source": paymentDataSource
    });

    children.push({
      type: "Footer",
      label: "Confirm Appointment",
      "on-click-action": {
        name: "complete",
        payload: payloadObj
      }
    });

    const screenData: Record<string, any> = {
      available_dates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" }
          }
        },
        __example__: [
          { id: "2026-09-12", title: "Today (2026-09-12)" },
          { id: "2026-09-13", title: "Tomorrow (2026-09-13)" }
        ]
      },
      available_slots: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" }
          }
        },
        __example__: [
          { id: "10:00 AM - 10:30 AM", title: "10:00 AM - 10:30 AM" },
          { id: "10:30 AM - 11:00 AM", title: "10:30 AM - 11:00 AM" },
          { id: "11:00 AM - 11:30 AM", title: "11:00 AM - 11:30 AM" }
        ]
      }
    };

    if (hasMasters) {
      screenData.available_masters = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" }
          }
        },
        __example__: [
          { id: "any", title: "Any Available Specialist" }
        ]
      };
    }

    const flowJson = {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_BOOKING",
          title: "Book Appointment",
          terminal: true,
          data: screenData,
          layout: {
            type: "SingleColumnLayout",
            children
          }
        }
      ]
    };

    let targetFlow: any = null;

    if (config.whatsappFlowId) {
      const [existingFlow] = await db
        .select()
        .from(schema.whatsappFlows)
        .where(eq(schema.whatsappFlows.id, config.whatsappFlowId))
        .limit(1);
      targetFlow = existingFlow;
    }

    if (targetFlow) {
      const [updatedFlow] = await db
        .update(schema.whatsappFlows)
        .set({
          name: flowName,
          flowJson,
          headerText: `📅 ${config.businessName || "Service"} Booking`,
          bodyText: "Please fill in your appointment details to complete your booking:",
          footerText: "Fast WhatsApp Appointment Booking",
          ctaButtonText: config.whatsappFlowCtaText || "Book Appointment 📅",
          updatedAt: new Date()
        })
        .where(eq(schema.whatsappFlows.id, targetFlow.id))
        .returning();

      targetFlow = updatedFlow;

      if (channelRow.connectionMethod !== "qr_code" && targetFlow.flowId) {
        try {
          await WhatsappFlowsService.updateFlowJsonOnMeta(channelRow.id, targetFlow.flowId, flowJson);
        } catch (mErr: any) {
          console.warn("[ServiceBookingService] Meta Flow JSON sync notice:", mErr.message);
        }
      }
    } else {
      const [newFlow] = await db
        .insert(schema.whatsappFlows)
        .values({
          tenantId: config.tenantId,
          channelId: channelRow.id,
          name: flowName,
          categories: ["OTHER"],
          status: "DRAFT",
          flowJson,
          headerText: `📅 ${config.businessName || "Service"} Booking`,
          bodyText: "Please fill in your appointment details to complete your booking:",
          footerText: "Fast WhatsApp Appointment Booking",
          ctaButtonText: config.whatsappFlowCtaText || "Book Appointment 📅",
          autoSaveContactFields: true,
          isSample: false
        })
        .returning();

      targetFlow = newFlow;

      if (channelRow.connectionMethod !== "qr_code") {
        try {
          const metaRes = await WhatsappFlowsService.createFlowOnMeta(channelRow.id, {
            name: flowName,
            categories: ["OTHER"]
          });
          if (metaRes?.flowId) {
            await WhatsappFlowsService.updateFlowJsonOnMeta(channelRow.id, metaRes.flowId, flowJson);
            try {
              await WhatsappFlowsService.publishFlowOnMeta(channelRow.id, metaRes.flowId);
            } catch (pErr: any) {
              console.warn("[ServiceBookingService] Meta publish notice:", pErr.message);
            }

            const [publishedFlow] = await db
              .update(schema.whatsappFlows)
              .set({
                flowId: metaRes.flowId,
                status: "PUBLISHED",
                updatedAt: new Date()
              })
              .where(eq(schema.whatsappFlows.id, targetFlow.id))
              .returning();
            targetFlow = publishedFlow;
          }
        } catch (cErr: any) {
          console.warn("[ServiceBookingService] Auto Meta Flow registration notice:", cErr.message);
        }
      }

      await db
        .update(schema.serviceConfigs)
        .set({
          useWhatsappFlowForm: true,
          whatsappFlowId: targetFlow.id,
          updatedAt: new Date()
        })
        .where(eq(schema.serviceConfigs.id, config.id));
    }

    return targetFlow;
  }

  /**
   * Generate PDF Confirmation Slip Buffer for a Booking
   */
  public static async generateBookingPdf(
    booking: schema.ServiceBooking,
    config?: schema.ServiceConfig | null
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const businessName = config?.businessName || "Service Booking Center";
        const businessAddress = config?.businessAddress || "";
        const businessWebsite = config?.businessWebsite || "";

        // Header Background Banner
        doc.rect(0, 0, doc.page.width, 100).fill("#1E293B");

        // Header Text
        doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text(businessName.toUpperCase(), 40, 30);
        doc.fontSize(10).font("Helvetica").text("APPOINTMENT BOOKING SLIP", 40, 58);
        doc.text(`Booking Ref: #${booking.bookingNumber}`, doc.page.width - 200, 30, { align: "right" });
        doc.text(`Date: ${new Date(booking.createdAt || new Date()).toLocaleDateString()}`, doc.page.width - 200, 46, { align: "right" });

        // Contact Info Box
        doc.rect(40, 120, doc.page.width - 80, 80).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("CLIENT INFORMATION", 55, 132);
        doc.fontSize(9).font("Helvetica").text(`Name: ${booking.customerName || "Customer"}`, 55, 150);
        doc.text(`Phone: ${booking.customerPhone}`, 55, 165);

        doc.font("Helvetica-Bold").text("STATUS & PAYMENT", 320, 132);
        doc.fontSize(9).font("Helvetica").text(`Status: ${(booking.status || "CONFIRMED").toUpperCase()}`, 320, 150);
        doc.text(`Payment Mode: ${(booking.paymentMethod || "N/A").toUpperCase()} (${(booking.paymentStatus || "PENDING").toUpperCase()})`, 320, 165);

        // Appointment Details Table
        let y = 220;
        doc.rect(40, y, doc.page.width - 80, 24).fill("#0F172A");
        doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold");
        doc.text("SERVICE DETAILS", 50, y + 7);
        doc.text("SPECIALIST", 220, y + 7);
        doc.text("DATE & TIME", 340, y + 7);
        doc.text("AMOUNT", doc.page.width - 110, y + 7, { align: "right" });

        y += 24;
        doc.rect(40, y, doc.page.width - 80, 45).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#1E293B").fontSize(9).font("Helvetica-Bold");
        doc.text(booking.serviceName, 50, y + 12);
        doc.fontSize(8).font("Helvetica").fillColor("#64748B").text(`Duration: ${booking.durationMinutes || 30} mins`, 50, y + 26);

        doc.fillColor("#1E293B").fontSize(9).font("Helvetica").text(booking.masterName || "Next Available Specialist", 220, y + 12);
        doc.text(`${booking.bookingDate}\n${booking.startTime} - ${booking.endTime}`, 340, y + 12);
        doc.font("Helvetica-Bold").text(`${booking.currency} ${Number(booking.totalAmount).toFixed(2)}`, doc.page.width - 110, y + 15, { align: "right" });

        // Total summary box
        y += 65;
        doc.rect(doc.page.width - 240, y, 200, 35).fillAndStroke("#F1F5F9", "#CBD5E1");
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("TOTAL AMOUNT:", doc.page.width - 230, y + 12);
        doc.fillColor("#059669").text(`${booking.currency} ${Number(booking.totalAmount).toFixed(2)}`, doc.page.width - 110, y + 12, { align: "right" });

        // Notes / Instructions
        y += 55;
        if (booking.notes) {
          doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold").text("Customer Notes:", 40, y);
          doc.font("Helvetica").text(booking.notes, 40, y + 14);
          y += 35;
        }

        doc.fillColor("#475569").fontSize(8).font("Helvetica").text(
          "Important: Please arrive 5 minutes prior to your scheduled appointment time. If you need to reschedule or cancel, please notify us in advance via WhatsApp.",
          40,
          y,
          { width: doc.page.width - 80 }
        );

        // Footer
        if (businessAddress || businessWebsite) {
          doc.fontSize(8).fillColor("#94A3B8").text(`${businessAddress} ${businessWebsite ? `• ${businessWebsite}` : ""}`, 40, doc.page.height - 40, { align: "center" });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate Daily Bookings Excel Buffer (.xlsx)
   */
  public static async generateDailyBookingsExcelBuffer(
    bookings: schema.ServiceBooking[],
    config: schema.ServiceConfig,
    businessName: string,
    dateStr: string
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LINALA Service Booking";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Bookings ${dateStr}`);

    sheet.columns = [
      { header: "Booking #", key: "bookingNumber", width: 16 },
      { header: "Customer Name", key: "customerName", width: 22 },
      { header: "Phone Number", key: "customerPhone", width: 18 },
      { header: "Service", key: "serviceName", width: 24 },
      { header: "Specialist", key: "masterName", width: 20 },
      { header: "Date", key: "bookingDate", width: 14 },
      { header: "Time Slot", key: "timeSlot", width: 18 },
      { header: "Price", key: "price", width: 14 },
      { header: "Payment Mode", key: "paymentMethod", width: 18 },
      { header: "Payment Status", key: "paymentStatus", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Notes", key: "notes", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 }
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }
    };
    headerRow.height = 24;

    bookings.forEach(b => {
      sheet.addRow({
        bookingNumber: b.bookingNumber,
        customerName: b.customerName || "Customer",
        customerPhone: b.customerPhone,
        serviceName: b.serviceName,
        masterName: b.masterName || "Next Available",
        bookingDate: b.bookingDate,
        timeSlot: `${b.startTime} - ${b.endTime}`,
        price: `${b.currency || "INR"} ${b.totalAmount}`,
        paymentMethod: (b.paymentMethod || "N/A").toUpperCase(),
        paymentStatus: (b.paymentStatus || "PENDING").toUpperCase(),
        status: (b.status || "CONFIRMED").toUpperCase(),
        notes: b.notes || "",
        createdAt: new Date(b.createdAt || new Date()).toLocaleString()
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Send Daily Bookings Summary Email Report with Excel Attachment
   */
  public static async sendDailyBookingsReport(
    config: schema.ServiceConfig,
    options?: { isManualTest?: boolean; targetEmails?: string[]; date?: Date }
  ): Promise<{ success: boolean; message: string; bookingsCount: number }> {
    try {
      const recipients: string[] = options?.targetEmails && options.targetEmails.length > 0
        ? options.targetEmails
        : (Array.isArray(config.dailyReportEmails) ? config.dailyReportEmails : []).filter(e => typeof e === "string" && e.trim().length > 0);

      if (recipients.length === 0) {
        return { success: false, message: "No recipient emails configured for daily bookings report.", bookingsCount: 0 };
      }

      const targetDate = options?.date || new Date();
      const dateStr = targetDate.toISOString().split("T")[0];

      // Fetch bookings for this channel/tenant for the target date
      const bookings = await db
        .select()
        .from(schema.serviceBookings)
        .where(
          and(
            eq(schema.serviceBookings.tenantId, config.tenantId),
            eq(schema.serviceBookings.bookingDate, dateStr)
          )
        )
        .orderBy(desc(schema.serviceBookings.createdAt));

      const businessName = config.businessName || "Service Center";
      const excelBuffer = await this.generateDailyBookingsExcelBuffer(bookings, config, businessName, dateStr);

      let totalRevenue = 0;
      let confirmedCount = 0;
      let pendingCount = 0;

      bookings.forEach(b => {
        totalRevenue += parseFloat(String(b.totalAmount || "0")) || 0;
        if (b.status === "confirmed" || b.status === "completed") confirmedCount++;
        if (b.paymentStatus === "pending") pendingCount++;
      });

      const currency = config.currency || "INR";
      const transporter = await getTransporter();
      const fromAddr = getSystemFromAddress();

      const bookingRows = bookings.slice(0, 30).map(b => `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 13px;">
          <td style="padding: 10px 8px; font-weight: 600; color: #1E293B;">${b.bookingNumber}</td>
          <td style="padding: 10px 8px; color: #334155;">${b.customerName || "Customer"}<br><span style="font-size: 11px; color: #64748B;">${b.customerPhone}</span></td>
          <td style="padding: 10px 8px; color: #334155;"><strong>${b.serviceName}</strong><br><span style="font-size: 11px; color: #64748B;">Specialist: ${b.masterName || "Next Available"}</span></td>
          <td style="padding: 10px 8px; color: #334155;">${b.startTime} - ${b.endTime}</td>
          <td style="padding: 10px 8px; font-weight: 600; color: #059669;">${currency} ${Number(b.totalAmount || 0).toFixed(2)}</td>
          <td style="padding: 10px 8px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: #DEF7EC; color: #03543F;">
              ${(b.status || 'CONFIRMED').toUpperCase()}
            </span>
          </td>
        </tr>
      `).join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
            .card { max-width: 680px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }
            .header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color: #FFFFFF; padding: 28px 32px; }
            .content { padding: 32px; }
            .table-container { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table-container th { background: #F1F5F9; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #CBD5E1; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700;">📅 Daily Appointments Summary Report</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.85;">${businessName} &bull; ${dateStr}</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; line-height: 1.5; margin-top: 0; color: #334155;">
                Hello, here is your daily appointments schedule for <strong>${businessName}</strong> for <strong>${dateStr}</strong>.
              </p>
              <div style="display: flex; gap: 12px; margin: 20px 0;">
                <div style="flex: 1; padding: 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                  <div style="font-size: 12px; font-weight: 600; color: #64748B;">Total Bookings</div>
                  <div style="font-size: 24px; font-weight: 700; color: #1E293B; margin-top: 4px;">${bookings.length}</div>
                </div>
                <div style="flex: 1; padding: 16px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px;">
                  <div style="font-size: 12px; font-weight: 600; color: #047857;">Expected Revenue</div>
                  <div style="font-size: 24px; font-weight: 700; color: #065F46; margin-top: 4px;">${currency} ${totalRevenue.toFixed(2)}</div>
                </div>
              </div>
              <table class="table-container">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Customer</th>
                    <th>Service & Specialist</th>
                    <th>Slot</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${bookingRows || `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #64748B;">No appointments booked for this date yet.</td></tr>`}
                </tbody>
              </table>
              <p style="font-size: 12px; color: #64748B; margin-top: 24px;">
                📎 The full appointments schedule is attached below as an Excel spreadsheet (.xlsx).
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (transporter) {
        await transporter.sendMail({
          from: fromAddr,
          to: recipients.join(", "),
          subject: `📅 Daily Appointments Summary - ${businessName} (${dateStr})`,
          html,
          attachments: [
            {
              filename: `bookings-report-${dateStr}.xlsx`,
              content: excelBuffer,
              contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
          ]
        });
      }

      if (!options?.isManualTest) {
        await db
          .update(schema.serviceConfigs)
          .set({ dailyReportLastSentAt: new Date() })
          .where(eq(schema.serviceConfigs.id, config.id));
      }

      return {
        success: true,
        message: `Daily report successfully emailed to ${recipients.length} recipients.`,
        bookingsCount: bookings.length
      };
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send daily bookings email report:", err.message);
      return { success: false, message: err.message, bookingsCount: 0 };
    }
  }

  /**
   * Send Daily Bookings Summary WhatsApp Forwarding with Excel attachment
   */
  public static async sendDailyBookingsWaReport(
    config: schema.ServiceConfig,
    options?: { isManualTest?: boolean; targetNumbers?: string[]; targetChannelId?: string; date?: Date }
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const numbers: string[] = options?.targetNumbers && options.targetNumbers.length > 0
        ? options.targetNumbers
        : (Array.isArray(config.dailyReportWaNumbers) ? config.dailyReportWaNumbers : []).filter(n => typeof n === "string" && n.trim().length > 0);

      if (numbers.length === 0) {
        return { success: false, message: "No WhatsApp recipient phone numbers configured.", count: 0 };
      }

      const channelId = options?.targetChannelId || config.dailyReportWaChannelId || config.channelId;
      if (!channelId) {
        return { success: false, message: "No WhatsApp channel available for sending report.", count: 0 };
      }

      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId))
        .limit(1);

      if (!channelRow) {
        return { success: false, message: "Selected WhatsApp channel was not found.", count: 0 };
      }

      const targetDate = options?.date || new Date();
      const dateStr = targetDate.toISOString().split("T")[0];

      const bookings = await db
        .select()
        .from(schema.serviceBookings)
        .where(
          and(
            eq(schema.serviceBookings.tenantId, config.tenantId),
            eq(schema.serviceBookings.bookingDate, dateStr)
          )
        );

      let totalRevenue = 0;
      bookings.forEach(b => {
        totalRevenue += parseFloat(String(b.totalAmount || "0")) || 0;
      });

      const businessName = config.businessName || "Service Center";
      const currency = config.currency || "INR";
      const summaryText = `📅 *Daily Appointments Summary Report*\n\n` +
        `🏢 *${businessName}*\n` +
        `📆 *Date:* ${dateStr}\n\n` +
        `📊 *Total Bookings:* ${bookings.length}\n` +
        `💰 *Expected Revenue:* ${currency} ${totalRevenue.toFixed(2)}\n\n` +
        `Attached is the complete appointments Excel (.xlsx) schedule.`;

      const excelBuffer = await this.generateDailyBookingsExcelBuffer(bookings, config, businessName, dateStr);

      const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
      let sentCount = 0;

      for (const phone of numbers) {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length >= 7) {
          try {
            if (isCloudApi) {
              const waApi = new WhatsAppApiService(channelRow);
              await waApi.sendDocumentBuffer(
                cleanPhone,
                excelBuffer,
                `bookings-report-${dateStr}.xlsx`,
                summaryText
              );
            } else {
              const { baileysManager } = await import("./baileys-manager");
              await baileysManager.sendMessage(channelRow.id, `${cleanPhone}@s.whatsapp.net`, {
                document: excelBuffer,
                mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName: `bookings-report-${dateStr}.xlsx`,
                caption: summaryText
              });
            }
            sentCount++;
          } catch (err: any) {
            console.error(`[ServiceBookingService] Failed to send WhatsApp daily report to ${cleanPhone}:`, err.message);
          }
        }
      }

      return {
        success: true,
        message: `Daily report WhatsApp forwarded to ${sentCount} numbers.`,
        count: sentCount
      };
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send daily bookings WhatsApp report:", err.message);
      return { success: false, message: err.message, count: 0 };
    }
  }

  /**
   * Helper: Send and save plain text message
   */
  public static async sendAndSaveTextMessage(
    channelRow: any,
    conversationId: string,
    to: string,
    text: string
  ): Promise<void> {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
    const cleanPhone = to.replace(/[^0-9]/g, "");

    let whatsappMsgId: string | null = null;
    if (isCloudApi) {
      const waApi = new WhatsAppApiService(channelRow);
      const res = await waApi.sendTextMessage(cleanPhone, text);
      whatsappMsgId = res?.messages?.[0]?.id || null;
    } else {
      const { baileysManager } = await import("./baileys-manager");
      const jid = to.includes("@") ? to : `${cleanPhone}@s.whatsapp.net`;
      const res = await baileysManager.sendMessage(channelRow.id, jid, { text });
      whatsappMsgId = res?.key?.id || null;
    }

    await storage.createMessage({
      conversationId,
      sender: "system",
      content: text,
      messageType: "text",
      status: "delivered",
      whatsappMessageId: whatsappMsgId,
      metadata: { source: "service_booking" }
    });
  }

  /**
   * Helper: Send and save media message
   */
  public static async sendAndSaveMediaMessage(
    channelRow: any,
    conversationId: string,
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "audio" | "document",
    caption?: string
  ): Promise<void> {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
    const cleanPhone = to.replace(/[^0-9]/g, "");

    let whatsappMsgId: string | null = null;
    if (isCloudApi) {
      const waApi = new WhatsAppApiService(channelRow);
      const res = await waApi.sendMediaMessage(cleanPhone, mediaType, mediaUrl, caption);
      whatsappMsgId = res?.messages?.[0]?.id || null;
    } else {
      const { baileysManager } = await import("./baileys-manager");
      const jid = to.includes("@") ? to : `${cleanPhone}@s.whatsapp.net`;
      const payload: any = { caption };
      if (mediaType === "image") payload.image = { url: mediaUrl };
      else if (mediaType === "video") payload.video = { url: mediaUrl };
      else if (mediaType === "audio") payload.audio = { url: mediaUrl };
      else payload.document = { url: mediaUrl };
      const res = await baileysManager.sendMessage(channelRow.id, jid, payload);
      whatsappMsgId = res?.key?.id || null;
    }

    await storage.createMessage({
      conversationId,
      sender: "system",
      content: caption || `[${mediaType.toUpperCase()}]`,
      messageType: mediaType,
      mediaUrl,
      status: "delivered",
      whatsappMessageId: whatsappMsgId,
      metadata: { source: "service_booking" }
    });
  }

  /**
   * Helper: Send Cloud API Interactive Button Message
   */
  public static async sendCloudApiButtonMessage(
    channelRow: any,
    conversationId: string,
    to: string,
    bodyText: string,
    headerText: string | null,
    buttons: { id: string; title: string }[]
  ): Promise<void> {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
    const cleanPhone = to.replace(/[^0-9]/g, "");

    if (isCloudApi && buttons.length <= 3) {
      const waApi = new WhatsAppApiService(channelRow);
      const res = await waApi.sendInteractiveButtonsMessage(cleanPhone, bodyText, buttons, headerText || undefined);
      await storage.createMessage({
        conversationId,
        sender: "system",
        content: bodyText,
        messageType: "interactive",
        status: "delivered",
        whatsappMessageId: res?.messages?.[0]?.id || null,
        metadata: { source: "service_booking", buttons }
      });
    } else {
      let text = `${bodyText}\n\n`;
      buttons.forEach((b, idx) => {
        text += `👉 Reply *${idx + 1}* for *${b.title}*\n`;
      });
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, text);
    }
  }

  /**
   * Send Customer Booking Alert (WhatsApp Confirmation + PDF Attachment)
   */
  public static async sendCustomerBookingAlert(
    booking: schema.ServiceBooking,
    channelRow: any
  ): Promise<void> {
    try {
      const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
      const cleanPhone = booking.customerPhone.replace(/[^0-9]/g, "");
      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.channelId, channelRow.id))
        .limit(1);

      const msgText = `🎉 *Appointment Confirmed!*\n\n` +
        `Booking Ref: *${booking.bookingNumber}*\n` +
        `Service: *${booking.serviceName}*\n` +
        `Specialist: *${booking.masterName || "Assigned Specialist"}*\n` +
        `Date: *${booking.bookingDate}*\n` +
        `Time Slot: *${booking.startTime} - ${booking.endTime}* (${booking.durationMinutes || 30} mins)\n` +
        `Total Amount: *${booking.currency} ${booking.totalAmount}*\n` +
        `Payment Mode: *${(booking.paymentMethod || "Venue").toUpperCase()}*\n\n` +
        `Your official booking slip is attached below. Thank you for booking with us! 🌟`;

      const pdfBuffer = await this.generateBookingPdf(booking, config);

      if (isCloudApi) {
        const waApi = new WhatsAppApiService(channelRow);
        await waApi.sendDocumentBuffer(
          cleanPhone,
          pdfBuffer,
          `Booking_${booking.bookingNumber}.pdf`,
          msgText
        );
      } else {
        const { baileysManager } = await import("./baileys-manager");
        const jid = booking.customerPhone.includes("@") ? booking.customerPhone : `${cleanPhone}@s.whatsapp.net`;
        await baileysManager.sendMessage(channelRow.id, jid, {
          document: pdfBuffer,
          mimetype: "application/pdf",
          fileName: `Booking_${booking.bookingNumber}.pdf`,
          caption: msgText
        });
      }

      if (booking.conversationId) {
        await storage.createMessage({
          conversationId: booking.conversationId,
          sender: "system",
          content: msgText,
          messageType: "document",
          status: "delivered",
          metadata: { source: "service_booking_alert", bookingNumber: booking.bookingNumber }
        });
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send customer booking alert:", err.message);
    }
  }

  /**
   * Send Merchant Instant Notification (WhatsApp + Email with PDF Booking Slip)
   */
  public static async sendMerchantBookingAlert(
    booking: schema.ServiceBooking,
    config: schema.ServiceConfig,
    channelRow: any
  ): Promise<void> {
    try {
      const pdfBuffer = await this.generateBookingPdf(booking, config);

      // 1. WhatsApp Forwarding to Merchant / Staff numbers
      const merchantNumbers = Array.isArray(config.dailyReportWaNumbers) ? config.dailyReportWaNumbers : [];
      if (merchantNumbers.length > 0) {
        const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
        const alertMsg = `🔔 *New Appointment Booking Alert!*\n\n` +
          `Ref: *#${booking.bookingNumber}*\n` +
          `Customer: *${booking.customerName || "Customer"}* (${booking.customerPhone})\n` +
          `Service: *${booking.serviceName}*\n` +
          `Specialist: *${booking.masterName || "Next Available"}*\n` +
          `Date & Slot: *${booking.bookingDate}* at *${booking.startTime} - ${booking.endTime}*\n` +
          `Price: *${booking.currency} ${booking.totalAmount}*\n` +
          `Payment: *${(booking.paymentMethod || "Venue").toUpperCase()}* (${(booking.paymentStatus || "pending").toUpperCase()})\n` +
          (booking.notes ? `Notes: *${booking.notes}*\n` : "");

        for (const phone of merchantNumbers) {
          const cleanPhone = phone.replace(/[^0-9]/g, "");
          if (cleanPhone.length >= 7) {
            try {
              if (isCloudApi) {
                const waApi = new WhatsAppApiService(channelRow);
                await waApi.sendDocumentBuffer(cleanPhone, pdfBuffer, `Booking_${booking.bookingNumber}.pdf`, alertMsg);
              } else {
                const { baileysManager } = await import("./baileys-manager");
                await baileysManager.sendMessage(channelRow.id, `${cleanPhone}@s.whatsapp.net`, {
                  document: pdfBuffer,
                  mimetype: "application/pdf",
                  fileName: `Booking_${booking.bookingNumber}.pdf`,
                  caption: alertMsg
                });
              }
            } catch (wErr: any) {
              console.warn(`[ServiceBookingService] Failed to send merchant WA alert to ${cleanPhone}:`, wErr.message);
            }
          }
        }
      }

      // 2. Email Forwarding to configured Merchant Notification Emails
      const merchantEmails = Array.isArray(config.merchantAlertEmails) ? config.merchantAlertEmails : [];
      if (merchantEmails.length > 0) {
        const transporter = await getTransporter();
        const fromAddr = getSystemFromAddress();
        if (transporter) {
          const businessName = config.businessName || "Service Center";
          await transporter.sendMail({
            from: fromAddr,
            to: merchantEmails.join(", "),
            subject: `🔔 New Booking Alert: #${booking.bookingNumber} - ${booking.customerName || "Customer"} (${booking.serviceName})`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
                <h2>🔔 New Appointment Booked</h2>
                <p>A new appointment has been scheduled at <strong>${businessName}</strong>.</p>
                <table style="width: 100%; max-width: 500px; border-collapse: collapse;">
                  <tr><td style="padding: 6px; font-weight: bold;">Booking Number:</td><td>${booking.bookingNumber}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Customer:</td><td>${booking.customerName || "Customer"} (${booking.customerPhone})</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Service:</td><td>${booking.serviceName}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Specialist:</td><td>${booking.masterName || "Next Available"}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Date & Time:</td><td>${booking.bookingDate} (${booking.startTime} - ${booking.endTime})</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Amount:</td><td>${booking.currency} ${booking.totalAmount}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Payment Mode:</td><td>${(booking.paymentMethod || "Venue").toUpperCase()}</td></tr>
                  ${booking.notes ? `<tr><td style="padding: 6px; font-weight: bold;">Notes:</td><td>${booking.notes}</td></tr>` : ""}
                </table>
                <p style="margin-top: 20px; font-size: 12px; color: #64748B;">The official booking PDF slip is attached.</p>
              </div>
            `,
            attachments: [
              {
                filename: `Booking_${booking.bookingNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf"
              }
            ]
          });
        }
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send merchant booking alert:", err.message);
    }
  }

  /**
   * Send Email to Customer if Email is present in Customer Data
   */
  public static async sendBookingEmail(booking: schema.ServiceBooking): Promise<void> {
    try {
      const email = (booking.customerData as any)?.email;
      if (!email || !email.includes("@")) return;

      const transporter = await getTransporter();
      const fromAddr = getSystemFromAddress();
      if (!transporter) return;

      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.tenantId, booking.tenantId))
        .limit(1);

      const pdfBuffer = await this.generateBookingPdf(booking, config);
      const businessName = config?.businessName || "Service Center";

      await transporter.sendMail({
        from: fromAddr,
        to: email,
        subject: `Appointment Confirmation - #${booking.bookingNumber} (${businessName})`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1E293B; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h2 style="color: #0F172A; margin-top: 0;">🎉 Appointment Confirmed!</h2>
            <p>Dear ${booking.customerName || "Customer"},</p>
            <p>Thank you for booking with <strong>${businessName}</strong>. Your appointment has been confirmed:</p>
            <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Booking Ref:</strong> #${booking.bookingNumber}</p>
              <p style="margin: 4px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 4px 0;"><strong>Specialist:</strong> ${booking.masterName || "Assigned Specialist"}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${booking.bookingDate}</p>
              <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${booking.startTime} - ${booking.endTime}</p>
              <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${booking.currency} ${booking.totalAmount}</p>
            </div>
            <p>Please find attached your official appointment booking slip. We look forward to seeing you!</p>
          </div>
        `,
        attachments: [
          {
            filename: `Booking_${booking.bookingNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      });
    } catch (err: any) {
      console.warn("[ServiceBookingService] Failed to send customer booking email:", err.message);
    }
  }

  /**
   * Main Inbound Interceptor: Process Incoming Message for Service Booking Flow
   */
  public static async handleIncomingMessage(
    channelRow: any,
    message: any,
    conversationId: string
  ): Promise<boolean> {
    try {
      const tenantId = channelRow.createdBy;
      if (!tenantId) return false;

      const isPluginActive = await this.isServiceBookingActive(tenantId);
      if (!isPluginActive) {
        return false;
      }

      // 1. Fetch channel config
      const [config] = await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.channelId, channelRow.id))
        .limit(1);

      if (!config || !config.isBookingFlowActive) {
        return false;
      }

      const to = message.from || message.key?.remoteJid?.replace("@s.whatsapp.net", "") || "";
      const textContent = (
        message.text?.body ||
        message.body ||
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        ""
      ).trim();

      const buttonReplyId = message.interactive?.button_reply?.id || (message as any)?.button?.payload || (message as any)?.interactive?.buttonReply?.id;
      const listReplyId = message.interactive?.list_reply?.id || (message as any)?.interactive?.listReply?.id;
      const cleanInput = (buttonReplyId || listReplyId || textContent).toLowerCase().trim();

      // Auto-assign conversation if routing enabled
      await this.assignConversationIfNeeded(channelRow, config, conversationId);

      // Handle Meta WhatsApp Flow Form submissions (nfm_reply)
      const isNfmReply = message.type === "interactive" && (
        (message as any).interactive?.type === "nfm_reply" ||
        (message as any)?.metadata?.type === "nfm_reply"
      );

      if (isNfmReply) {
        const rawJson = message.interactive?.nfm_reply?.response_json ||
          (message as any)?.metadata?.flowResponse ||
          (message as any)?.flowResponse;

        let parsedPayload: Record<string, any> = (message as any)?.parsedPayload || {};
        try {
          if (rawJson && typeof rawJson === "string") {
            parsedPayload = JSON.parse(rawJson);
          } else if (rawJson && typeof rawJson === "object") {
            parsedPayload = rawJson;
          }
        } catch (e) {}

        const [activeSession] = await db
          .select()
          .from(schema.serviceSessions)
          .where(eq(schema.serviceSessions.conversationId, conversationId))
          .limit(1);

        if (activeSession) {
          console.log("[ServiceBookingService] Processing WhatsApp Flow Form submission for session:", activeSession.id);
          const [service] = await db
            .select()
            .from(schema.services)
            .where(eq(schema.services.id, activeSession.serviceId))
            .limit(1);

          if (service) {
            const customerData = { ...(activeSession.customerData || {}), ...parsedPayload };
            const masterId = parsedPayload.master_id && parsedPayload.master_id !== "any" ? parsedPayload.master_id : activeSession.masterId;
            let masterName = "";
            if (masterId) {
              const [m] = await db.select().from(schema.serviceMasters).where(eq(schema.serviceMasters.id, masterId)).limit(1);
              masterName = m?.name || "";
            }

            const bookingDate = parsedPayload.booking_date || new Date().toISOString().split("T")[0];
            const slotStr = parsedPayload.booking_slot || "10:00 AM - 10:30 AM";
            const [startTime, endTime] = slotStr.includes("-") ? slotStr.split("-").map((s: string) => s.trim()) : [slotStr, slotStr];

            const bookingNumber = await this.generateNextBookingNumber(config.tenantId);
            const selectedMethod = parsedPayload.payment_method || "cod";

            const [newBooking] = await db
              .insert(schema.serviceBookings)
              .values({
                bookingNumber,
                tenantId: config.tenantId,
                channelId: channelRow.id,
                conversationId,
                customerPhone: to,
                customerName: parsedPayload.name || parsedPayload.full_name || "Customer",
                customerData,
                serviceId: service.id,
                serviceName: service.name,
                masterId: masterId || null,
                masterName: masterName || null,
                bookingDate,
                startTime,
                endTime,
                durationMinutes: service.durationMinutes || 30,
                price: service.price || "0",
                totalAmount: service.price || "0",
                currency: service.currency || config.currency || "INR",
                paymentMethod: selectedMethod,
                paymentStatus: selectedMethod === "cod" ? "pending" : "pending_verification",
                status: "confirmed",
                notes: parsedPayload.notes || null
              })
              .returning();

            await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, activeSession.id));
            await this.markAbandonedBookingRecovered(conversationId, newBooking.id);
            await this.sendCustomerBookingAlert(newBooking, channelRow);
            await this.sendBookingEmail(newBooking);
            await this.sendMerchantBookingAlert(newBooking, config, channelRow);
            return true;
          }
        }
      }

      // 2. Check for active session
      const [existingSession] = await db
        .select()
        .from(schema.serviceSessions)
        .where(eq(schema.serviceSessions.conversationId, conversationId))
        .limit(1);

      // Check if trigger keyword matched to start fresh flow
      const triggerKeyword = (config.bookingTriggerKeyword || "book").toLowerCase().trim();
      const isGlobalTrigger = cleanInput === triggerKeyword || cleanInput.startsWith(triggerKeyword + " ");

      // Check individual service trigger keywords
      let matchedServiceTrigger: schema.Service | null = null;
      if (!existingSession && !isGlobalTrigger) {
        const allServices = await db
          .select()
          .from(schema.services)
          .where(and(eq(schema.services.tenantId, tenantId), eq(schema.services.isActive, true)));

        for (const s of allServices) {
          if (s.triggerKeyword && s.triggerKeyword.trim()) {
            if (s.isTriggerEnabled !== false) {
              const kw = s.triggerKeyword.toLowerCase().trim();
              if (kw && (cleanInput === kw || cleanInput.startsWith(kw + " "))) {
                matchedServiceTrigger = s;
                break;
              }
            }
          }
        }
      }

      // If user typed "cancel" or "restart" during active session
      if (existingSession && (cleanInput === "cancel" || cleanInput === "restart" || cleanInput === "exit")) {
        await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, existingSession.id));
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "❌ Your appointment booking session has been cancelled. Reply *book* anytime to start a new appointment!");
        return true;
      }

      // START FLOW
      if (!existingSession && (isGlobalTrigger || matchedServiceTrigger)) {
        console.log(`[ServiceBookingService] Starting new booking flow for ${to}`);
        await this.startBookingFlow(channelRow, config, conversationId, to, matchedServiceTrigger);
        return true;
      }

      // PROCESS EXISTING SESSION INPUT
      if (existingSession) {
        await this.processSessionStep(channelRow, config, existingSession, message, conversationId, to, cleanInput, textContent, buttonReplyId, listReplyId);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error("[ServiceBookingService] Error in handleIncomingMessage:", err.message);
      return false;
    }
  }

  /**
   * Start Booking Flow: Send Repeating Welcome Messages Sequence + Services List
   */
  private static async startBookingFlow(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    specificService: schema.Service | null
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    // Repeating Welcome Messages Sequence (Multi-Message Sequence)
    const welcomeMessagesSeq = Array.isArray(config.welcomeMessages) ? config.welcomeMessages : [];
    if (welcomeMessagesSeq.length > 0) {
      const sortedSeq = [...welcomeMessagesSeq].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      for (const msg of sortedSeq) {
        if (msg.mediaUrl && msg.mediaType && msg.mediaType !== "none") {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, msg.mediaUrl, msg.mediaType, msg.text || undefined);
          } catch (mErr: any) {
            console.warn("[ServiceBookingService] Sequence media error:", mErr.message);
          }
        } else if (msg.text) {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, msg.text);
        }
        await new Promise(r => setTimeout(r, 400));
      }
    } else {
      // Fallback single welcome header media
      if (config.welcomeHeaderUrl && config.welcomeHeaderType !== "none") {
        try {
          await this.sendAndSaveMediaMessage(
            channelRow,
            conversationId,
            to,
            config.welcomeHeaderUrl,
            config.welcomeHeaderType as any
          );
        } catch (err: any) {
          console.warn("[ServiceBookingService] Could not send welcome header media:", err.message);
        }
      }
    }

    // If a specific service was triggered directly
    if (specificService) {
      await this.initSessionForService(channelRow, config, conversationId, to, specificService);
      return;
    }

    // Fetch all active services for this tenant
    const servicesList = await db
      .select()
      .from(schema.services)
      .where(and(eq(schema.services.tenantId, config.tenantId), eq(schema.services.isActive, true)))
      .orderBy(desc(schema.services.createdAt));

    if (servicesList.length === 0) {
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, "No services are currently available for booking. Please check back later!");
      return;
    }

    // If only 1 service exists, select it directly
    if (servicesList.length === 1) {
      await this.initSessionForService(channelRow, config, conversationId, to, servicesList[0]);
      return;
    }

    // Create session in waiting_for_service step
    await db.insert(schema.serviceSessions).values({
      conversationId,
      serviceId: servicesList[0].id,
      currentStep: "waiting_for_service",
      customerData: {}
    });

    await this.trackAbandonedBooking({
      tenantId: config.tenantId,
      channelId: channelRow.id,
      conversationId,
      customerPhone: to,
      currentStep: "waiting_for_service"
    });

    const welcomeMsg = config.welcomeMessage || "Welcome! Please choose a service to book your appointment:";

    if (isCloudApi && servicesList.length <= 3) {
      const buttons = servicesList.map(s => ({
        id: `srv_${s.id}`,
        title: s.name.substring(0, 20)
      }));
      await this.sendCloudApiButtonMessage(channelRow, conversationId, to, welcomeMsg, null, buttons);
    } else {
      let promptText = `${welcomeMsg}\n\n`;
      servicesList.forEach((s, idx) => {
        promptText += `👉 Reply *${idx + 1}* for *${s.name}* (${s.currency || "INR"} ${s.price} - ${s.durationMinutes || 30} mins)\n`;
      });
      promptText += `\nReply *cancel* anytime to exit.`;
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, promptText);
    }
  }

  /**
   * Initialize Session for a specific chosen Service & Advance to Flow Form, Master, or Date
   */
  private static async initSessionForService(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    service: schema.Service
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    // Send service messages (attachments/photos) if configured
    if (Array.isArray(service.serviceMessages) && service.serviceMessages.length > 0) {
      for (const msg of service.serviceMessages as any[]) {
        if (msg.mediaUrl || msg.url) {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, msg.mediaUrl || msg.url, msg.mediaType || msg.type || "image", msg.text || msg.caption || undefined);
          } catch (mErr: any) {
            console.warn("[ServiceBookingService] Failed to send service message:", mErr.message);
          }
        }
      }
    }

    // Delete any old session
    await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.conversationId, conversationId));

    // WhatsApp Flow Form Check (Meta Native Flow for Cloud API)
    if (config.useWhatsappFlowForm && config.whatsappFlowId && isCloudApi) {
      const [flowRecord] = await db
        .select()
        .from(schema.whatsappFlows)
        .where(eq(schema.whatsappFlows.id, config.whatsappFlowId))
        .limit(1);

      if (flowRecord && (flowRecord.status === "PUBLISHED" || flowRecord.flowId)) {
        await db.insert(schema.serviceSessions).values({
          conversationId,
          serviceId: service.id,
          currentStep: "waiting_for_flow_form",
          customerData: {
            serviceName: service.name,
            servicePrice: service.price,
            serviceId: service.id
          }
        });

        await this.trackAbandonedBooking({
          tenantId: config.tenantId,
          channelId: channelRow.id,
          conversationId,
          customerPhone: to,
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: String(service.price || "0"),
          currentStep: "waiting_for_flow_form"
        });

        const header = flowRecord.headerText || `📅 ${service.name} Booking`;
        const body = flowRecord.bodyText || `Please complete your specialist, date & time details for *${service.name}* (Price: ${service.currency || config.currency || "INR"} ${service.price}).`;
        const cta = config.whatsappFlowCtaText || flowRecord.ctaButtonText || "Book Appointment 📅";

        // Generate dynamic available dates for configured maxDaysInAdvance (default 7 days) in business timezone
        const activeTz = config.timezone || "Asia/Kolkata";
        const upcomingDateObjects = this.getUpcomingDates(activeTz, config.maxDaysInAdvance || 7);
        const availableDates = upcomingDateObjects.map(d => ({ id: d.dateStr, title: d.fullLabel }));

        // Generate dynamic available slots for initial date
        const primaryDateStr = availableDates[0]?.id || this.getNowInTimezone(activeTz).todayStr;
        const { availableSlots } = await this.getAvailableSlots({
          tenantId: config.tenantId,
          serviceId: service.id,
          masterId: null,
          date: primaryDateStr,
          channelId: channelRow.id
        });

        let dynamicSlots: { id: string; title: string }[] = [];
        if (availableSlots && availableSlots.length > 0) {
          dynamicSlots = availableSlots.map(s => ({ id: s.label, title: s.label }));
        } else {
          dynamicSlots = [
            { id: "09:00 AM - 10:00 AM", title: "09:00 AM - 10:00 AM" },
            { id: "10:00 AM - 11:00 AM", title: "10:00 AM - 11:00 AM" },
            { id: "11:00 AM - 12:00 PM", title: "11:00 AM - 12:00 PM" },
            { id: "02:00 PM - 03:00 PM", title: "02:00 PM - 03:00 PM" },
            { id: "03:00 PM - 04:00 PM", title: "03:00 PM - 04:00 PM" },
            { id: "04:00 PM - 05:00 PM", title: "04:00 PM - 05:00 PM" },
            { id: "05:00 PM - 06:00 PM", title: "05:00 PM - 06:00 PM" }
          ];
        }

        const allMasters = await db
          .select()
          .from(schema.serviceMasters)
          .where(and(eq(schema.serviceMasters.tenantId, config.tenantId), eq(schema.serviceMasters.isActive, true)));

        const assignedMasters = allMasters.filter(m => {
          const sIds = Array.isArray(m.serviceIds) ? m.serviceIds : [];
          return sIds.includes(service.id) || sIds.length === 0;
        });

        const availableMasters = assignedMasters.map(m => ({
          id: m.id,
          title: `${m.name} (${m.title || "Specialist"})`
        }));
        availableMasters.push({ id: "any", title: "Any Available Specialist" });

        try {
          await WhatsappFlowsService.sendFlowMessage(
            channelRow.id,
            to,
            {
              ...flowRecord,
              headerText: header,
              bodyText: body,
              ctaButtonText: cta
            },
            {
              token: `sb_${conversationId.replace(/-/g, "").substring(0, 16)}`,
              initialData: {
                service_name: service.name,
                service_price: String(service.price),
                available_dates: availableDates,
                available_slots: dynamicSlots,
                available_masters: availableMasters
              }
            }
          );
          return;
        } catch (flowSendErr: any) {
          console.warn("[ServiceBookingService] Failed to send WhatsApp Flow Form, falling back to standard Q&A:", flowSendErr.message);
          await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.conversationId, conversationId));
        }
      }
    }

    if (config.requireMasterSelection) {
      const allMasters = await db
        .select()
        .from(schema.serviceMasters)
        .where(and(eq(schema.serviceMasters.tenantId, config.tenantId), eq(schema.serviceMasters.isActive, true)));

      const assignedMasters = allMasters.filter(m => {
        const sIds = Array.isArray(m.serviceIds) ? m.serviceIds : [];
        return sIds.includes(service.id) || sIds.length === 0;
      });

      if (assignedMasters.length > 0) {
        await this.promptMasterSelection(channelRow, config, conversationId, to, service, assignedMasters);
        return;
      }
    }

    // Skip master selection, go straight to Date Selection
    await this.promptDateSelection(channelRow, config, conversationId, to, service.id, null);
  }

  /**
   * Prompt Date Selection: Suggest Today, Tomorrow, or custom date in business/master timezone
   */
  private static async promptDateSelection(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    serviceId: string,
    masterId: string | null
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    // Fetch master if selected to determine timezone
    let master: schema.ServiceMaster | null = null;
    if (masterId && masterId !== "any") {
      const [m] = await db
        .select()
        .from(schema.serviceMasters)
        .where(eq(schema.serviceMasters.id, masterId))
        .limit(1);
      master = m || null;
    }

    const activeTz = master?.timezone || config.timezone || "Asia/Kolkata";
    const upcomingDates = this.getUpcomingDates(activeTz, config.maxDaysInAdvance || 7);

    await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.conversationId, conversationId));
    await db.insert(schema.serviceSessions).values({
      conversationId,
      serviceId,
      masterId: masterId || null,
      currentStep: "waiting_for_date",
      customerData: {
        upcomingDatesCache: upcomingDates
      }
    });

    await this.trackAbandonedBooking({
      tenantId: config.tenantId,
      channelId: channelRow.id,
      conversationId,
      customerPhone: to,
      serviceId,
      masterId,
      currentStep: "waiting_for_date"
    });

    const promptText = `📅 *Select Appointment Date*\n\nPlease select or type your preferred booking date:`;

    if (isCloudApi) {
      const buttons = [
        { id: `date_${upcomingDates[0].dateStr}`, title: `Today (${upcomingDates[0].dateStr.slice(5)})` },
        { id: `date_${upcomingDates[1].dateStr}`, title: `Tomorrow (${upcomingDates[1].dateStr.slice(5)})` }
      ];
      await this.sendCloudApiButtonMessage(channelRow, conversationId, to, promptText, null, buttons);
    } else {
      let listText = `${promptText}\n\n`;
      upcomingDates.forEach((ud, idx) => {
        listText += `👉 Reply *${idx + 1}* for *${ud.fullLabel}*\n`;
      });
      listText += `👉 Or type any custom date in *YYYY-MM-DD* format\n\n` +
        `Reply *cancel* anytime to exit.`;
      await this.sendAndSaveTextMessage(channelRow, conversationId, to, listText);
    }
  }

  /**
   * Prompt Dynamic Slot Selection for Chosen Date & Master
   */
  private static async promptSlotSelection(
    channelRow: any,
    config: schema.ServiceConfig,
    session: schema.ServiceSession,
    to: string,
    dateStr: string
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    const { availableSlots, message, isOffDay } = await this.getAvailableSlots({
      tenantId: config.tenantId,
      serviceId: session.serviceId,
      masterId: session.masterId,
      date: dateStr,
      channelId: channelRow.id
    });

    if (isOffDay || availableSlots.length === 0) {
      await this.sendAndSaveTextMessage(
        channelRow,
        session.conversationId,
        to,
        `⚠️ ${message || "No available time slots for this date."}\n\nPlease choose another date (reply with *YYYY-MM-DD*, or reply *cancel* to restart).`
      );
      return;
    }

    // Save date in session
    await db
      .update(schema.serviceSessions)
      .set({
        bookingDate: dateStr,
        currentStep: "waiting_for_slot",
        customerData: { ...(session.customerData || {}), availableSlotsCache: availableSlots }
      })
      .where(eq(schema.serviceSessions.id, session.id));

    await this.trackAbandonedBooking({
      tenantId: config.tenantId,
      channelId: channelRow.id,
      conversationId: session.conversationId,
      customerPhone: to,
      serviceId: session.serviceId,
      masterId: session.masterId,
      bookingDate: dateStr,
      currentStep: "waiting_for_slot"
    });

    const promptText = `⏰ *Available Slots for ${dateStr}*\n\nPlease choose your preferred time slot:`;

    if (isCloudApi && availableSlots.length <= 3) {
      const buttons = availableSlots.slice(0, 3).map(s => ({
        id: `slot_${s.startTime}`,
        title: s.startTime
      }));
      await this.sendCloudApiButtonMessage(channelRow, session.conversationId, to, promptText, null, buttons);
    } else {
      let listText = `${promptText}\n\n`;
      availableSlots.slice(0, 25).forEach((s, idx) => {
        listText += `👉 Reply *${idx + 1}* for *${s.label}*\n`;
      });
      listText += `\nReply *cancel* to exit.`;
      await this.sendAndSaveTextMessage(channelRow, session.conversationId, to, listText);
    }
  }

  /**
   * Process State Transitions across Service Booking Steps
   */
  private static async processSessionStep(
    channelRow: any,
    config: schema.ServiceConfig,
    session: schema.ServiceSession,
    message: any,
    conversationId: string,
    to: string,
    cleanInput: string,
    rawText: string,
    buttonReplyId?: string,
    listReplyId?: string
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    // STEP 1: WAITING FOR SERVICE
    if (session.currentStep === "waiting_for_service") {
      const servicesList = await db
        .select()
        .from(schema.services)
        .where(and(eq(schema.services.tenantId, config.tenantId), eq(schema.services.isActive, true)))
        .orderBy(desc(schema.services.createdAt));

      let selectedService: schema.Service | null = null;
      if (buttonReplyId?.startsWith("srv_")) {
        const id = buttonReplyId.replace("srv_", "");
        selectedService = servicesList.find(s => s.id === id) || null;
      } else {
        const num = parseInt(cleanInput, 10);
        if (!isNaN(num) && num >= 1 && num <= servicesList.length) {
          selectedService = servicesList[num - 1];
        } else {
          selectedService = servicesList.find(s => s.name.toLowerCase().includes(cleanInput)) || null;
        }
      }

      if (!selectedService) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please reply with a valid service number or name.");
        return;
      }

      await this.initSessionForService(channelRow, config, conversationId, to, selectedService);
      return;
    }

    // STEP 2: WAITING FOR MASTER / SPECIALIST
    if (session.currentStep === "waiting_for_master") {
      const allMasters = await db
        .select()
        .from(schema.serviceMasters)
        .where(and(eq(schema.serviceMasters.tenantId, config.tenantId), eq(schema.serviceMasters.isActive, true)));

      const assignedMasters = allMasters.filter(m => {
        const sIds = Array.isArray(m.serviceIds) ? m.serviceIds : [];
        return sIds.includes(session.serviceId) || sIds.length === 0;
      });

      let selectedMasterId: string | null = null;
      if (buttonReplyId === "mst_any" || cleanInput === String(assignedMasters.length + 1) || cleanInput.includes("any")) {
        selectedMasterId = null;
      } else if (buttonReplyId?.startsWith("mst_")) {
        selectedMasterId = buttonReplyId.replace("mst_", "");
      } else {
        const num = parseInt(cleanInput, 10);
        if (!isNaN(num) && num >= 1 && num <= assignedMasters.length) {
          selectedMasterId = assignedMasters[num - 1].id;
        } else {
          const found = assignedMasters.find(m => m.name.toLowerCase().includes(cleanInput));
          if (found) selectedMasterId = found.id;
        }
      }

      await this.promptDateSelection(channelRow, config, conversationId, to, session.serviceId, selectedMasterId);
      return;
    }

    // STEP 3: WAITING FOR DATE
    if (session.currentStep === "waiting_for_date") {
      let chosenDate = "";
      const cachedDates: { dateStr: string; label: string; fullLabel: string }[] = (session.customerData as any)?.upcomingDatesCache || [];
      const activeTz = config.timezone || "Asia/Kolkata";
      const { todayStr } = this.getNowInTimezone(activeTz);
      const upcoming = this.getUpcomingDates(activeTz, 2);
      const tomorrowStr = upcoming[1]?.dateStr || todayStr;

      if (buttonReplyId?.startsWith("date_")) {
        chosenDate = buttonReplyId.replace("date_", "");
      } else {
        const num = parseInt(cleanInput, 10);
        if (!isNaN(num) && num >= 1 && num <= cachedDates.length) {
          chosenDate = cachedDates[num - 1].dateStr;
        } else if (cleanInput === "1" || cleanInput.includes("today")) {
          chosenDate = todayStr;
        } else if (cleanInput === "2" || cleanInput.includes("tomorrow")) {
          chosenDate = tomorrowStr;
        } else {
          const dateMatch = cleanInput.match(/\d{4}-\d{2}-\d{2}/);
          if (dateMatch) {
            chosenDate = dateMatch[0];
          }
        }
      }

      if (!chosenDate) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please enter a valid date in *YYYY-MM-DD* format (e.g. 2026-09-15), or reply with the option number from the list above.");
        return;
      }

      await this.promptSlotSelection(channelRow, config, session, to, chosenDate);
      return;
    }

    // STEP 4: WAITING FOR SLOT
    if (session.currentStep === "waiting_for_slot") {
      const cachedSlots: AvailableSlot[] = (session.customerData as any)?.availableSlotsCache || [];
      let selectedSlot: AvailableSlot | null = null;

      if (buttonReplyId?.startsWith("slot_")) {
        const start = buttonReplyId.replace("slot_", "");
        selectedSlot = cachedSlots.find(s => s.startTime === start) || null;
      } else {
        const num = parseInt(cleanInput, 10);
        if (!isNaN(num) && num >= 1 && num <= cachedSlots.length) {
          selectedSlot = cachedSlots[num - 1];
        } else {
          selectedSlot = cachedSlots.find(s => s.startTime.includes(cleanInput) || s.label.toLowerCase().includes(cleanInput)) || null;
        }
      }

      if (!selectedSlot) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please select a valid time slot number from the list above.");
        return;
      }

      // Check dynamic fields to collect
      const rawFields = Array.isArray(config.checkoutFields) ? config.checkoutFields : [
        { text: "Please enter your full name:", variable: "name" },
        { text: "Please enter your phone number:", variable: "phone" },
        { text: "Any notes / special requests:", variable: "notes" }
      ];

      const fields = rawFields.map((f: any) => {
        if (typeof f === "string") return { text: `Please enter your *${this.getFieldLabel(f)}*:`, variable: f };
        return { text: f.text || `Please enter your *${this.getFieldLabel(f.variable)}*:`, variable: f.variable || "custom_field" };
      });

      const nextStep = fields.length > 0 ? `waiting_for_field:${fields[0].variable}` : "waiting_for_payment_method";

      await db
        .update(schema.serviceSessions)
        .set({
          selectedSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
          currentStep: nextStep,
          customerData: {
            ...(session.customerData || {}),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime
          }
        })
        .where(eq(schema.serviceSessions.id, session.id));

      await this.trackAbandonedBooking({
        tenantId: config.tenantId,
        channelId: channelRow.id,
        conversationId,
        customerPhone: to,
        serviceId: session.serviceId,
        masterId: session.masterId,
        bookingDate: session.bookingDate,
        selectedSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
        currentStep: nextStep
      });

      if (fields.length > 0) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, fields[0].text);
      } else {
        await this.promptPaymentMethod(channelRow, config, session, to);
      }
      return;
    }

    // STEP 5: WAITING FOR DYNAMIC CHECKOUT FIELDS
    if (session.currentStep.startsWith("waiting_for_field:")) {
      const currentVar = session.currentStep.replace("waiting_for_field:", "");
      const rawFields = Array.isArray(config.checkoutFields) ? config.checkoutFields : [
        { text: "Please enter your full name:", variable: "name" },
        { text: "Please enter your phone number:", variable: "phone" },
        { text: "Any notes / special requests:", variable: "notes" }
      ];

      const fields = rawFields.map((f: any) => {
        if (typeof f === "string") return { text: `Please enter your *${this.getFieldLabel(f)}*:`, variable: f };
        return { text: f.text || `Please enter your *${this.getFieldLabel(f.variable)}*:`, variable: f.variable || "custom_field" };
      });

      const currentIdx = fields.findIndex(f => f.variable === currentVar);
      const customerData = { ...(session.customerData || {}), [currentVar]: rawText };

      if (currentVar === "name") {
        customerData.name = rawText;
      }

      if (currentIdx >= 0 && currentIdx < fields.length - 1) {
        const nextField = fields[currentIdx + 1];
        const nextStep = `waiting_for_field:${nextField.variable}`;

        await db
          .update(schema.serviceSessions)
          .set({
            currentStep: nextStep,
            customerData
          })
          .where(eq(schema.serviceSessions.id, session.id));

        await this.trackAbandonedBooking({
          tenantId: config.tenantId,
          channelId: channelRow.id,
          conversationId,
          customerPhone: to,
          customerName: customerData.name || null,
          customerData,
          currentStep: nextStep
        });

        await this.sendAndSaveTextMessage(channelRow, conversationId, to, nextField.text);
        return;
      }

      // All fields collected -> Go to payment method
      await db
        .update(schema.serviceSessions)
        .set({
          currentStep: "waiting_for_payment_method",
          customerData
        })
        .where(eq(schema.serviceSessions.id, session.id));

      await this.trackAbandonedBooking({
        tenantId: config.tenantId,
        channelId: channelRow.id,
        conversationId,
        customerPhone: to,
        customerName: customerData.name || null,
        customerData,
        currentStep: "waiting_for_payment_method"
      });

      await this.promptPaymentMethod(channelRow, config, { ...session, customerData }, to);
      return;
    }

    // STEP 6: WAITING FOR PAYMENT METHOD OR RECEIPT
    if (session.currentStep === "waiting_for_payment_method" || session.currentStep === "waiting_for_qr_receipt") {
      // Check for receipt image upload
      const mediaId = message.image?.id || message.mediaId;
      const isImage = message.type === "image" || !!mediaId;
      if (session.currentStep === "waiting_for_qr_receipt" && isImage) {
        let fileUrl = "";
        if (mediaId) {
          try {
            const waApi = new WhatsAppApiService(channelRow);
            fileUrl = await waApi.fetchMediaUrl(mediaId);
          } catch (err) {
            fileUrl = `receipt_${mediaId}`;
          }
        }

        const bookingId = (session.customerData as any)?.bookingId;
        if (bookingId) {
          const [updatedBooking] = await db
            .update(schema.serviceBookings)
            .set({
              receiptUrl: fileUrl,
              paymentStatus: "pending_verification",
              updatedAt: new Date()
            })
            .where(eq(schema.serviceBookings.id, bookingId))
            .returning();

          await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, session.id));
          await this.markAbandonedBookingRecovered(conversationId, bookingId);

          await this.sendAndSaveTextMessage(
            channelRow,
            conversationId,
            to,
            `✅ *Payment Receipt Received!*\n\nBooking Reference: *${updatedBooking.bookingNumber}*\nOur team is verifying your payment. We will notify you once confirmed!`
          );

          await this.sendBookingEmail(updatedBooking);
          await this.sendMerchantBookingAlert(updatedBooking, config, channelRow);
          return;
        }
      }

      // Check selected payment method
      let selectedMethod = buttonReplyId || listReplyId || "";
      if (!selectedMethod) {
        if (cleanInput === "1" || cleanInput.includes("venue") || cleanInput.includes("cod") || cleanInput.includes("cash")) {
          selectedMethod = "cod";
        } else if (cleanInput === "2" || cleanInput.includes("upi") || cleanInput.includes("gpay")) {
          selectedMethod = "upi_direct";
        } else if (cleanInput === "3" || cleanInput.includes("qr") || cleanInput.includes("account")) {
          selectedMethod = "qr_pay";
        } else if (cleanInput === "4" || cleanInput.includes("online") || cleanInput.includes("gateway")) {
          selectedMethod = "gateway";
        }
      }

      if (!selectedMethod) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please choose a valid payment method from above.");
        return;
      }

      // Fetch service & master
      const [service] = await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.id, session.serviceId))
        .limit(1);

      let masterName = "";
      if (session.masterId) {
        const [m] = await db
          .select()
          .from(schema.serviceMasters)
          .where(eq(schema.serviceMasters.id, session.masterId))
          .limit(1);
        masterName = m?.name || "";
      }

      const bookingNumber = await this.generateNextBookingNumber(config.tenantId);
      const startTime = (session.customerData as any)?.startTime || "10:00";
      const endTime = (session.customerData as any)?.endTime || "10:30";

      const [newBooking] = await db
        .insert(schema.serviceBookings)
        .values({
          bookingNumber,
          tenantId: config.tenantId,
          channelId: channelRow.id,
          conversationId,
          customerPhone: to,
          customerName: (session.customerData as any)?.name || (session.customerData as any)?.full_name || "Customer",
          customerData: session.customerData,
          serviceId: service.id,
          serviceName: service.name,
          masterId: session.masterId || null,
          masterName: masterName || null,
          bookingDate: session.bookingDate || new Date().toISOString().split("T")[0],
          startTime,
          endTime,
          durationMinutes: service.durationMinutes || 30,
          price: service.price || "0",
          totalAmount: service.price || "0",
          currency: service.currency || config.currency || "INR",
          paymentMethod: selectedMethod,
          paymentStatus: selectedMethod === "cod" ? "pending" : (selectedMethod === "gateway" ? "pending_payment" : "pending_verification"),
          status: "confirmed",
          notes: (session.customerData as any)?.notes || null
        })
        .returning();

      await this.markAbandonedBookingRecovered(conversationId, newBooking.id);

      if (selectedMethod === "cod") {
        await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, session.id));
        await this.sendCustomerBookingAlert(newBooking, channelRow);
        await this.sendBookingEmail(newBooking);
        await this.sendMerchantBookingAlert(newBooking, config, channelRow);
      } else if (selectedMethod === "upi_direct") {
        await db
          .update(schema.serviceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt",
            customerData: { ...(session.customerData || {}), bookingId: newBooking.id }
          })
          .where(eq(schema.serviceSessions.id, session.id));

        const redirectUrl = `https://wa.linalapro.com/api/service-booking/checkout/pay?bookingId=${newBooking.id}`;
        const msgText = `📱 *UPI Mobile Direct Pay*\n\nBooking Ref: *${bookingNumber}*\nTo pay *${newBooking.currency} ${newBooking.totalAmount}* directly using GPay / PhonePe:\n\n👉 *Click here to Pay:* ${redirectUrl}\n\nOnce paid, *please send the receipt/screenshot here* to complete verification.`;

        if (isCloudApi) {
          const buttons = [
            { id: "cod", title: "Pay at Venue" }
          ];
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, msgText, null, buttons);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `${msgText}\n\nReply *cod* to switch to Pay at Venue.`);
        }
      } else if (selectedMethod === "qr_pay") {
        await db
          .update(schema.serviceSessions)
          .set({
            currentStep: "waiting_for_qr_receipt",
            customerData: { ...(session.customerData || {}), bookingId: newBooking.id }
          })
          .where(eq(schema.serviceSessions.id, session.id));

        if (config.qrCodeUrl) {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, config.qrCodeUrl, "image");
          } catch (e: any) {}
        }

        const msgText = `Please scan the QR code to pay a total of *${newBooking.currency} ${newBooking.totalAmount}* via GPay / PhonePe.\n\nBooking Ref: *${bookingNumber}*\n\nAfter payment, *please upload your receipt/screenshot here* to verify your appointment.`;
        if (isCloudApi) {
          const buttons = [{ id: "cod", title: "Pay at Venue" }];
          await this.sendCloudApiButtonMessage(channelRow, conversationId, to, msgText, null, buttons);
        } else {
          await this.sendAndSaveTextMessage(channelRow, conversationId, to, `${msgText}\n\nReply *cod* to switch to Pay at Venue.`);
        }
      } else if (selectedMethod === "gateway") {
        await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, session.id));
        await this.sendCustomerBookingAlert(newBooking, channelRow);
        await this.sendBookingEmail(newBooking);
        await this.sendMerchantBookingAlert(newBooking, config, channelRow);
      }
    }
  }

  /**
   * Prompt Payment Methods
   */
  private static async promptPaymentMethod(
    channelRow: any,
    config: schema.ServiceConfig,
    session: schema.ServiceSession,
    to: string
  ) {
    const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);

    const paymentOptions: { id: string; title: string }[] = [];
    paymentOptions.push({ id: "cod", title: config.labelCod || "Pay at Venue (Cash/Card)" });
    if (config.upiId) {
      paymentOptions.push({ id: "upi_direct", title: config.labelUpiDirect || "GPay/PhonePe(UPI)" });
    }
    if (config.qrCodeUrl) {
      paymentOptions.push({ id: "qr_pay", title: config.labelQrPay || "Acc. Info(QR Code)" });
    }
    if ((config.razorpayKeyId && config.razorpayKeySecret) || (config.instamojoApiKey && config.instamojoAuthToken)) {
      paymentOptions.push({ id: "gateway", title: config.labelGateway || "Online Payment" });
    }

    const summaryText = `💳 *Payment Method Selection*\n\nPlease choose how you would like to pay:`;

    if (isCloudApi && paymentOptions.length <= 3) {
      await this.sendCloudApiButtonMessage(channelRow, session.conversationId, to, summaryText, null, paymentOptions);
    } else {
      let listText = `${summaryText}\n\n`;
      paymentOptions.forEach((opt, idx) => {
        listText += `👉 Reply *${idx + 1}* for *${opt.title}*\n`;
      });
      listText += `\nReply *cancel* to exit.`;
      await this.sendAndSaveTextMessage(channelRow, session.conversationId, to, listText);
    }
  }

  /**
   * Send Automated Recovery Message for Abandoned Booking
   */
  public static async sendAbandonedBookingRecoveryMessage(
    cart: schema.ServiceAbandonedBooking,
    config: schema.ServiceConfig,
    followupNum: 1 | 2
  ): Promise<boolean> {
    try {
      const [channelRow] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, cart.channelId))
        .limit(1);

      if (!channelRow) return false;

      const customerName = cart.customerName || "there";
      const serviceName = cart.serviceName || "your appointment";
      const price = `${config.currency || "INR"} ${cart.servicePrice || "0"}`;

      let msgText = "";
      let discountInfo = "";
      if (config.abandonedBookingDiscountCode) {
        discountInfo = `\n\n🎁 *Special Discount:* Use coupon code *${config.abandonedBookingDiscountCode}* for *${config.abandonedBookingDiscountPercent || 10}% OFF*!`;
      }

      if (followupNum === 1) {
        const rawTemplate = config.abandonedBookingMessage1 ||
          "👋 Hi {name}! We noticed you started booking an appointment for *{service_name}* ({price}) but did not finish.\n\nSlots fill up quickly! Would you like help choosing your date and time? Reply *1* or *book* to complete your booking!";
        msgText = rawTemplate
          .replace(/{name}/g, customerName)
          .replace(/{service_name}/g, serviceName)
          .replace(/{price}/g, price);
      } else {
        const rawTemplate = config.abandonedBookingMessage2 ||
          "⏰ *Last chance!* Your reserved appointment for *{service_name}* is about to be released.{discount_info}\n\nReply *1* or *book* now to lock in your appointment before time slots fill up!";
        msgText = rawTemplate
          .replace(/{name}/g, customerName)
          .replace(/{service_name}/g, serviceName)
          .replace(/{discount_info}/g, discountInfo);
      }

      const isCloudApi = ServiceBookingService.isCloudApiChannel(channelRow);
      const cleanPhone = cart.customerPhone.replace(/[^0-9]/g, "");

      if (isCloudApi) {
        const tplName = followupNum === 1 ? "service_booking_abandoned_1" : "service_booking_abandoned_2";
        const [tplRecord] = await db
          .select()
          .from(schema.templates)
          .where(and(eq(schema.templates.channelId, channelRow.id), eq(schema.templates.name, tplName)))
          .limit(1);

        if (tplRecord && tplRecord.status === "APPROVED") {
          const waApi = new WhatsAppApiService(channelRow);
          const variables = followupNum === 1
            ? [customerName, serviceName, price]
            : [customerName, serviceName, config.abandonedBookingDiscountCode || "SLOT10", `${config.abandonedBookingDiscountPercent || 10}%`];
          await waApi.sendTemplateMessage(cleanPhone, tplName, tplRecord.language || "en_US", variables);
        } else {
          await this.sendAndSaveTextMessage(channelRow, cart.conversationId, cart.customerPhone, msgText);
        }
      } else {
        await this.sendAndSaveTextMessage(channelRow, cart.conversationId, cart.customerPhone, msgText);
      }

      const now = new Date();
      const updateData: any = {
        followupCount: (cart.followupCount || 0) + 1,
        updatedAt: now
      };
      if (followupNum === 1) updateData.followup1SentAt = now;
      if (followupNum === 2) updateData.followup2SentAt = now;

      await db
        .update(schema.serviceAbandonedBookings)
        .set(updateData)
        .where(eq(schema.serviceAbandonedBookings.id, cart.id));

      return true;
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send abandoned booking recovery message:", err.message);
      return false;
    }
  }

  /**
   * Cron check: runs periodically to find abandoned bookings eligible for automated recovery follow-ups.
   */
  public static async checkAbandonedBookingsCron(): Promise<void> {
    try {
      const activeConfigs = await db
        .select()
        .from(schema.serviceConfigs)
        .where(
          and(
            eq(schema.serviceConfigs.abandonedBookingRecoveryEnabled, true),
            eq(schema.serviceConfigs.isActive, true)
          )
        );

      if (activeConfigs.length === 0) return;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const config of activeConfigs) {
        const delay1Minutes = config.abandonedBookingDelay1Minutes || 60;
        const delay2Hours = config.abandonedBookingDelay2Hours || 18;

        const delay1Threshold = new Date(now.getTime() - delay1Minutes * 60 * 1000);
        const delay2Threshold = new Date(now.getTime() - delay2Hours * 60 * 60 * 1000);

        const abandonedList = await db
          .select()
          .from(schema.serviceAbandonedBookings)
          .where(
            and(
              eq(schema.serviceAbandonedBookings.tenantId, config.tenantId),
              eq(schema.serviceAbandonedBookings.status, "abandoned"),
              gte(schema.serviceAbandonedBookings.createdAt, oneDayAgo)
            )
          );

        for (const cart of abandonedList) {
          const createdAt = new Date(cart.createdAt || new Date());
          if (!cart.followup1SentAt && createdAt <= delay1Threshold) {
            console.log(`[Service Recovery] 📅 Sending Follow-up 1 to ${cart.customerPhone} for ${cart.serviceName}`);
            await this.sendAbandonedBookingRecoveryMessage(cart, config, 1);
          } else if (cart.followup1SentAt && !cart.followup2SentAt && createdAt <= delay2Threshold) {
            console.log(`[Service Recovery] ⏰ Sending Follow-up 2 to ${cart.customerPhone} for ${cart.serviceName}`);
            await this.sendAbandonedBookingRecoveryMessage(cart, config, 2);
          }
        }
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Error in checkAbandonedBookingsCron:", err.message);
    }
  }

  /**
   * Cron check: runs every minute to find configs eligible for scheduled daily reports.
   */
  public static async checkDailyBookingsReportCron(): Promise<void> {
    try {
      const activeConfigs = await db
        .select()
        .from(schema.serviceConfigs)
        .where(
          and(
            eq(schema.serviceConfigs.isActive, true),
            or(
              eq(schema.serviceConfigs.dailyReportEnabled, true),
              eq(schema.serviceConfigs.dailyReportWaEnabled, true)
            )
          )
        );

      if (activeConfigs.length === 0) return;

      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, "0");
      const currentM = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentH}:${currentM}`;

      for (const config of activeConfigs) {
        const reportTime = (config.dailyReportTime || "21:00").trim();
        if (reportTime === currentTimeStr) {
          if (config.dailyReportLastSentAt) {
            const lastSent = new Date(config.dailyReportLastSentAt);
            if (lastSent.toDateString() === now.toDateString()) {
              continue; // already sent today
            }
          }

          console.log(`[ServiceBookingService] Triggering scheduled daily report for tenant ${config.tenantId} at ${currentTimeStr}`);

          if (config.dailyReportEnabled) {
            await this.sendDailyBookingsReport(config);
          }
          if (config.dailyReportWaEnabled) {
            await this.sendDailyBookingsWaReport(config);
          }

          await db
            .update(schema.serviceConfigs)
            .set({ dailyReportLastSentAt: now })
            .where(eq(schema.serviceConfigs.id, config.id));
        }
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Error in checkDailyBookingsReportCron:", err.message);
    }
  }
}
