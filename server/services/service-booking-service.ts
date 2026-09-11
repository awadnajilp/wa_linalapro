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

export interface AvailableSlot {
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  label: string;     // "10:00 AM - 10:30 AM"
  available: boolean;
}

export class ServiceBookingService {
  /**
   * Helper to format 24h time to 12h AM/PM label
   */
  public static formatTimeLabel(time24: string): string {
    const [hStr, mStr] = time24.split(":");
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
    const [h, m] = timeStr.split(":").map(Number);
    const totalMinutes = h * 60 + m + minutesToAdd;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  }

  /**
   * Helper to parse time string "HH:mm" to minutes from midnight
   */
  public static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
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
   * Calculate Dynamic Available Slots for a given service, master, and date.
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

    // 3. Fetch config for fallback working hours
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

    // 4. Resolve working hours & slot intervals
    const workingHours = master?.workingHours || config?.defaultWorkingHours || {
      days: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    };

    const slotInterval = master?.slotIntervalMinutes || config?.defaultSlotIntervalMinutes || duration || 30;

    // 5. Check day of week
    const targetDateObj = new Date(`${date}T00:00:00`);
    const dayOfWeek = targetDateObj.getDay(); // 0 = Sun, 1 = Mon ...
    const activeDays: number[] = Array.isArray(workingHours.days) ? workingHours.days : [1, 2, 3, 4, 5, 6];

    if (!activeDays.includes(dayOfWeek)) {
      return { availableSlots: [], isOffDay: true, message: "Specialist/Business is closed on this day." };
    }

    const startTimeStr = workingHours.startTime || "09:00";
    const endTimeStr = workingHours.endTime || "18:00";
    const breakStartStr = workingHours.breakStartTime;
    const breakEndStr = workingHours.breakEndTime;

    const startMinutes = this.timeToMinutes(startTimeStr);
    const endMinutes = this.timeToMinutes(endTimeStr);
    const breakStartMinutes = breakStartStr ? this.timeToMinutes(breakStartStr) : -1;
    const breakEndMinutes = breakEndStr ? this.timeToMinutes(breakEndStr) : -1;

    // 6. Fetch existing non-cancelled bookings on this date for the master (or service)
    const bookingConditions = [
      eq(schema.serviceBookings.tenantId, tenantId),
      eq(schema.serviceBookings.bookingDate, date),
      sql`${schema.serviceBookings.status} != 'cancelled'`
    ];

    if (master?.id) {
      bookingConditions.push(eq(schema.serviceBookings.masterId, master.id));
    }

    const existingBookings = await db
      .select()
      .from(schema.serviceBookings)
      .where(and(...bookingConditions));

    // 7. Check current time if date is today
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const isToday = date === todayStr;
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    // 8. Generate candidate slots
    const slots: AvailableSlot[] = [];
    let currentSlotStart = startMinutes;

    while (currentSlotStart + duration <= endMinutes) {
      const currentSlotEnd = currentSlotStart + duration;

      const slotStartStr = `${String(Math.floor(currentSlotStart / 60)).padStart(2, "0")}:${String(currentSlotStart % 60).padStart(2, "0")}`;
      const slotEndStr = `${String(Math.floor(currentSlotEnd / 60)).padStart(2, "0")}:${String(currentSlotEnd % 60).padStart(2, "0")}`;

      // Check if slot falls in break time
      let isBreak = false;
      if (breakStartMinutes >= 0 && breakEndMinutes >= 0) {
        if (
          (currentSlotStart >= breakStartMinutes && currentSlotStart < breakEndMinutes) ||
          (currentSlotEnd > breakStartMinutes && currentSlotEnd <= breakEndMinutes) ||
          (currentSlotStart <= breakStartMinutes && currentSlotEnd >= breakEndMinutes)
        ) {
          isBreak = true;
        }
      }

      // Check if slot is in the past for today
      let isPast = false;
      if (isToday && currentSlotStart <= currentMinutesNow + 15) { // 15 mins buffer
        isPast = true;
      }

      // Check if slot collides with existing booking
      let isBooked = false;
      for (const b of existingBookings) {
        const bStart = this.timeToMinutes(b.startTime);
        const bEnd = this.timeToMinutes(b.endTime);
        if (
          (currentSlotStart >= bStart && currentSlotStart < bEnd) ||
          (currentSlotEnd > bStart && currentSlotEnd <= bEnd) ||
          (currentSlotStart <= bStart && currentSlotEnd >= bEnd)
        ) {
          isBooked = true;
          break;
        }
      }

      const isAvailable = !isBreak && !isPast && !isBooked;

      if (isAvailable) {
        slots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          label: `${this.formatTimeLabel(slotStartStr)} - ${this.formatTimeLabel(slotEndStr)}`,
          available: true
        });
      }

      currentSlotStart += slotInterval;
    }

    return { availableSlots: slots };
  }

  /**
   * Helper: Send and save text message to conversation
   */
  public static async sendAndSaveTextMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    text: string
  ) {
    try {
      const waApi = new WhatsAppApiService(channelRow);
      await waApi.sendTextMessage(to, text);
    } catch (err: any) {
      console.error(`[ServiceBookingService] Failed to send text to ${to}:`, err.message);
    }

    if (conversationId) {
      try {
        await storage.createMessage({
          conversationId,
          senderId: null,
          content: text,
          direction: "outbound",
          status: "sent",
          type: "text",
          fromUser: false,
          isSystem: false,
          metadata: { serviceBooking: true }
        });
      } catch (e: any) {
        console.error("[ServiceBookingService] Failed to save outbound message to DB:", e?.message);
      }
    }
  }

  /**
   * Helper: Send and save interactive button message
   */
  public static async sendCloudApiButtonMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    bodyText: string,
    header: any,
    buttons: { id: string; title: string }[]
  ) {
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;
    if (isCloudApi) {
      try {
        const waApi = new WhatsAppApiService(channelRow);
        await waApi.sendInteractiveButtonMessage(to, bodyText, buttons, header || undefined);
        if (conversationId) {
          await storage.createMessage({
            conversationId,
            senderId: null,
            content: bodyText,
            direction: "outbound",
            status: "sent",
            type: "interactive",
            fromUser: false,
            metadata: { buttons, header, serviceBooking: true }
          });
        }
        return;
      } catch (err: any) {
        console.warn("[ServiceBookingService] Button send failed on Cloud API, falling back to text:", err.message);
      }
    }

    // QR Code / Fallback Text
    let fallbackText = bodyText + "\n\n";
    buttons.forEach((btn, idx) => {
      fallbackText += `👉 Reply *${idx + 1}* for ${btn.title}\n`;
    });
    await this.sendAndSaveTextMessage(channelRow, conversationId, to, fallbackText);
  }

  /**
   * Helper: Send media message
   */
  public static async sendAndSaveMediaMessage(
    channelRow: any,
    conversationId: string | null,
    to: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "audio" | "document",
    caption?: string
  ) {
    try {
      const waApi = new WhatsAppApiService(channelRow);
      await waApi.sendMediaMessage(to, mediaUrl, mediaType, caption);
    } catch (err: any) {
      console.error(`[ServiceBookingService] Failed to send media (${mediaType}) to ${to}:`, err.message);
    }

    if (conversationId) {
      try {
        await storage.createMessage({
          conversationId,
          senderId: null,
          content: caption || mediaUrl,
          direction: "outbound",
          status: "sent",
          type: mediaType,
          mediaUrl,
          fromUser: false,
          metadata: { serviceBooking: true }
        });
      } catch (e: any) {
        console.error("[ServiceBookingService] Failed to save outbound media to DB:", e?.message);
      }
    }
  }

  /**
   * Helper: Send PDF Document Buffer
   */
  public static async sendAndSaveDocumentBuffer(
    channelRow: any,
    conversationId: string | null,
    to: string,
    pdfBuffer: Buffer,
    fileName: string,
    caption?: string
  ) {
    try {
      const waApi = new WhatsAppApiService(channelRow);
      const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

      if (isCloudApi) {
        const mediaId = await waApi.uploadMedia(pdfBuffer, "application/pdf", fileName);
        if (mediaId) {
          await waApi.sendMediaMessage(to, mediaId, "document", caption, fileName);
        }
      } else {
        await waApi.sendMediaBuffer(to, pdfBuffer, "document", "application/pdf", fileName, caption);
      }
    } catch (err: any) {
      console.error(`[ServiceBookingService] Failed to send document buffer to ${to}:`, err.message);
    }

    if (conversationId) {
      try {
        await storage.createMessage({
          conversationId,
          senderId: null,
          content: caption || fileName,
          direction: "outbound",
          status: "sent",
          type: "document",
          fromUser: false,
          metadata: { fileName, serviceBooking: true }
        });
      } catch (e: any) {
        console.error("[ServiceBookingService] Failed to save document to DB:", e?.message);
      }
    }
  }

  /**
   * Generate Professional PDF Confirmation / Invoice
   */
  public static async generateBookingPdf(booking: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 20, size: [288, 432] }); // 4x6 inches
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const [config] = await db
          .select()
          .from(schema.serviceConfigs)
          .where(eq(schema.serviceConfigs.tenantId, booking.tenantId))
          .limit(1);

        const businessName = config?.businessName || "Service Provider";
        const businessAddress = config?.businessAddress || "";

        // 1. Header
        doc.fillColor("#0F172A").fontSize(14).font("Helvetica-Bold").text(businessName, 20, 20, { align: "center" });
        if (businessAddress) {
          doc.fontSize(7).font("Helvetica").fillColor("#64748B").text(businessAddress, 20, 36, { align: "center" });
        }

        doc.moveTo(15, 48).lineTo(273, 48).strokeColor("#E2E8F0").lineWidth(1).stroke();

        // 2. Booking Reference & Status
        doc.rect(15, 54, 258, 28).fillAndStroke("#F1F5F9", "#CBD5E1");
        doc.fillColor("#0F172A").fontSize(9).font("Helvetica-Bold").text(`BOOKING #: ${booking.bookingNumber}`, 25, 60);
        doc.fontSize(8).font("Helvetica").fillColor("#2563EB").text(`STATUS: ${booking.status?.toUpperCase() || "CONFIRMED"}`, 25, 71);

        // 3. Appointment Schedule Box
        doc.rect(15, 90, 258, 64).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold").text("APPOINTMENT SCHEDULE", 25, 96);
        doc.fontSize(8).font("Helvetica").fillColor("#334155")
          .text(`Service: ${booking.serviceName}`, 25, 110)
          .text(`Specialist: ${booking.masterName || "Assigned Specialist"}`, 25, 122)
          .text(`Date & Time: ${booking.bookingDate} | ${this.formatTimeLabel(booking.startTime)} - ${this.formatTimeLabel(booking.endTime)}`, 25, 134)
          .text(`Duration: ${booking.durationMinutes || 30} mins`, 25, 146);

        // 4. Customer Details Box
        doc.rect(15, 162, 258, 50).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold").text("CUSTOMER DETAILS", 25, 168);
        doc.fontSize(8).font("Helvetica").fillColor("#334155")
          .text(`Name: ${booking.customerName || "Customer"}`, 25, 180)
          .text(`Phone: ${booking.customerPhone}`, 25, 192);
        if (booking.notes) {
          doc.text(`Notes: ${booking.notes}`, 25, 204, { width: 238, ellipsis: true });
        }

        // 5. Payment Summary Box
        doc.rect(15, 220, 258, 50).fillAndStroke("#F0FDF4", "#BBF7D0");
        doc.fillColor("#166534").fontSize(8).font("Helvetica-Bold").text("PAYMENT DETAILS", 25, 226);
        doc.fontSize(8).font("Helvetica").fillColor("#166534")
          .text(`Payment Method: ${booking.paymentMethod?.toUpperCase() || "PAY AT VENUE"}`, 25, 238)
          .text(`Payment Status: ${booking.paymentStatus?.toUpperCase() || "PENDING"}`, 25, 250);

        doc.fillColor("#15803D").fontSize(11).font("Helvetica-Bold")
          .text(`TOTAL: ${booking.currency || "INR"} ${Number(booking.totalAmount || 0).toFixed(2)}`, 25, 264, { align: "right" });

        // 6. Footer Notes
        doc.moveTo(15, 280).lineTo(273, 280).strokeColor("#E2E8F0").lineWidth(1).stroke();
        doc.fillColor("#64748B").fontSize(7).font("Helvetica")
          .text("Please arrive 5 minutes prior to your scheduled appointment time.", 20, 290, { align: "center", width: 248 })
          .text("Thank you for booking with us!", 20, 302, { align: "center" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send Customer Booking Confirmation Alert + PDF
   */
  public static async sendCustomerBookingAlert(booking: any, channelRow: any): Promise<void> {
    try {
      if (!booking || !channelRow) return;

      const customerName = booking.customerName || "Customer";
      const bookingNumber = booking.bookingNumber;
      const serviceName = booking.serviceName;
      const masterName = booking.masterName ? `• *Specialist:* ${booking.masterName}\n` : "";
      const dateStr = booking.bookingDate;
      const timeStr = `${this.formatTimeLabel(booking.startTime)} - ${this.formatTimeLabel(booking.endTime)}`;
      const totalAmount = `${booking.currency || "INR"} ${Number(booking.totalAmount || 0).toFixed(2)}`;
      const paymentMethod = booking.paymentMethod === "cod" ? "Pay at Venue" :
        booking.paymentMethod === "upi_direct" ? "UPI Direct" :
        booking.paymentMethod === "qr_pay" ? "QR Code Payment" :
        booking.paymentMethod === "gateway" ? "Online Payment" : booking.paymentMethod.toUpperCase();

      const to = booking.customerPhone;
      const convId = booking.conversationId || null;

      const formattedText = `🎉 *Booking Confirmed!*\n\n` +
        `Dear *${customerName}*, your service appointment has been successfully booked!\n\n` +
        `📋 *Appointment Details:*\n` +
        `• *Booking #:* *${bookingNumber}*\n` +
        `• *Service:* ${serviceName}\n` +
        masterName +
        `• *Date:* 📅 *${dateStr}*\n` +
        `• *Time:* ⏰ *${timeStr}*\n` +
        `• *Total Amount:* *${totalAmount}*\n` +
        `• *Payment Mode:* ${paymentMethod}\n\n` +
        `📍 Please arrive 5 minutes before your scheduled slot.\n` +
        `📄 Your booking confirmation PDF is attached below.`;

      await this.sendAndSaveTextMessage(channelRow, convId, to, formattedText);

      // Generate and send PDF confirmation
      try {
        const pdfBuffer = await this.generateBookingPdf(booking);
        await this.sendAndSaveDocumentBuffer(
          channelRow,
          convId,
          to,
          pdfBuffer,
          `Booking_${bookingNumber}.pdf`,
          `📄 *Booking Confirmation Slip* for #${bookingNumber}`
        );
      } catch (pdfErr: any) {
        console.error("[ServiceBookingService] Failed to send booking PDF to customer:", pdfErr.message);
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send customer booking alert:", err.message);
    }
  }

  /**
   * Send Instant Merchant Booking Alert (WhatsApp + PDF + Receipt)
   */
  public static async sendMerchantBookingAlert(booking: any, customConfig?: any, customChannelRow?: any): Promise<void> {
    try {
      if (!booking) return;

      const config = customConfig || (await db
        .select()
        .from(schema.serviceConfigs)
        .where(eq(schema.serviceConfigs.tenantId, booking.tenantId))
        .limit(1)
        .then(rows => rows[0]));

      if (!config) return;

      const numbers: string[] = (Array.isArray(config.dailyReportWaNumbers) ? config.dailyReportWaNumbers : [])
        .filter((n: any) => typeof n === "string" && n.trim().length > 0);

      if (numbers.length === 0) return;

      const channelId = config.dailyReportWaChannelId || config.channelId || booking.channelId;
      const channelRow = customChannelRow || (await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId))
        .limit(1)
        .then(rows => rows[0]));

      if (!channelRow) return;

      const customerName = booking.customerName || "Customer";
      const bookingNumber = booking.bookingNumber;
      const serviceName = booking.serviceName;
      const masterName = booking.masterName ? `• *Specialist:* ${booking.masterName}\n` : "";
      const dateStr = booking.bookingDate;
      const timeStr = `${this.formatTimeLabel(booking.startTime)} - ${this.formatTimeLabel(booking.endTime)}`;
      const totalAmount = `${booking.currency || "INR"} ${Number(booking.totalAmount || 0).toFixed(2)}`;

      const alertText = `🔔 *NEW SERVICE APPOINTMENT BOOKED!*\n\n` +
        `• *Booking #:* *${bookingNumber}*\n` +
        `• *Customer:* ${customerName} (${booking.customerPhone})\n` +
        `• *Service:* ${serviceName}\n` +
        masterName +
        `• *Date & Time:* 📅 ${dateStr} at ⏰ ${timeStr}\n` +
        `• *Total Amount:* *${totalAmount}*\n` +
        `• *Payment Mode:* ${booking.paymentMethod?.toUpperCase()}\n` +
        `• *Payment Status:* ${booking.paymentStatus?.toUpperCase() || "PENDING"}`;

      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await this.generateBookingPdf(booking);
      } catch (pdfErr: any) {
        console.error("[ServiceBookingService] Failed to generate PDF for merchant alert:", pdfErr.message);
      }

      for (const rawPhone of numbers) {
        const merchantPhone = rawPhone.trim().replace(/[^\d]/g, "");
        if (!merchantPhone) continue;

        try {
          // 1. Text Summary
          await this.sendAndSaveTextMessage(channelRow, null, merchantPhone, alertText);

          // 2. PDF Document
          if (pdfBuffer) {
            await this.sendAndSaveDocumentBuffer(
              channelRow,
              null,
              merchantPhone,
              pdfBuffer,
              `Booking_${bookingNumber}.pdf`,
              `📄 Booking Slip #${bookingNumber}`
            );
          }

          // 3. Receipt if uploaded
          if (booking.receiptUrl) {
            await this.sendAndSaveMediaMessage(
              channelRow,
              null,
              merchantPhone,
              booking.receiptUrl,
              "image",
              `💳 *Payment Receipt* for Booking #${bookingNumber}`
            );
          }
        } catch (phoneErr: any) {
          console.error(`[ServiceBookingService] Failed to send merchant alert to ${merchantPhone}:`, phoneErr.message);
        }
      }
    } catch (err: any) {
      console.error("[ServiceBookingService] Error sending merchant booking alert:", err.message);
    }
  }

  /**
   * Send Email to Store/Business Owner on Booking Confirmation
   */
  public static async sendBookingEmail(booking: any) {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, booking.tenantId))
        .limit(1);

      if (!user || !user.email) return;

      const transporter = await getTransporter();
      if (!transporter) return;

      const pdfBuffer = await this.generateBookingPdf(booking);
      const { from: fromHeader } = await getSystemFromAddress("Service Bookings");

      const attachments: any[] = [
        {
          filename: `booking_${booking.bookingNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ];

      if (booking.receiptUrl) {
        try {
          const receiptBuf = await this.readMediaBuffer(booking.receiptUrl);
          if (receiptBuf) {
            attachments.push({
              filename: `payment_receipt_${booking.bookingNumber}.jpg`,
              content: receiptBuf,
              contentType: "image/jpeg"
            });
          }
        } catch (rErr: any) {
          console.error("[ServiceBookingService] Failed to attach receipt to booking email:", rErr.message);
        }
      }

      const mailOptions = {
        from: fromHeader,
        to: user.email,
        subject: `[New Service Booking] ${booking.bookingNumber} - ${booking.serviceName} (${booking.bookingDate})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h2 style="color: #2563EB; margin-top: 0;">New Appointment Booked!</h2>
            <p>Hello Business Owner,</p>
            <p>A customer has booked an appointment through your WhatsApp booking system:</p>
            
            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; border-color: #E5E7EB; margin-bottom: 20px;">
              <tr style="background-color: #F8FAFC;">
                <td style="font-weight: bold;">Booking Number</td>
                <td>${booking.bookingNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Service</td>
                <td>${booking.serviceName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Specialist / Master</td>
                <td>${booking.masterName || "Any Available"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Date & Time</td>
                <td><strong>${booking.bookingDate}</strong> at <strong>${this.formatTimeLabel(booking.startTime)} - ${this.formatTimeLabel(booking.endTime)}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Customer</td>
                <td>${booking.customerName || "Customer"} (${booking.customerPhone})</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Total Amount</td>
                <td style="color: #10B981; font-weight: bold;">${booking.currency || "INR"} ${booking.totalAmount}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Payment Method</td>
                <td>${booking.paymentMethod?.toUpperCase()} (${booking.paymentStatus?.toUpperCase()})</td>
              </tr>
            </table>

            <p>The appointment slip is attached as a PDF document.</p>
          </div>
        `,
        attachments
      };

      await transporter.sendMail(mailOptions);
      console.log(`[ServiceBookingService] Email sent to ${user.email} for booking ${booking.bookingNumber}`);
    } catch (err: any) {
      console.error("[ServiceBookingService] Failed to send booking email:", err.message);
    }
  }

  /**
   * Main Handler: Process Incoming Message for Service Booking Flow
   */
  public static async handleIncomingMessage(
    channelRow: any,
    message: any,
    conversationId: string
  ): Promise<boolean> {
    try {
      const tenantId = channelRow.createdBy;
      if (!tenantId) return false;

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
          if (s.isTriggerEnabled && s.triggerKeyword) {
            const kw = s.triggerKeyword.toLowerCase().trim();
            if (cleanInput === kw || cleanInput.startsWith(kw + " ")) {
              matchedServiceTrigger = s;
              break;
            }
          }
        }
      }

      // If user typed "cancel" or "restart" during active session
      if (existingSession && (cleanInput === "cancel" || cleanInput === "restart" || cleanInput === "exit")) {
        await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.id, existingSession.id));
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "❌ Your booking session has been cancelled. Reply *book* anytime to start a new appointment!");
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
        await this.processSessionStep(channelRow, config, existingSession, message, conversationId, to, cleanInput, buttonReplyId, listReplyId);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error("[ServiceBookingService] Error in handleIncomingMessage:", err.message);
      return false;
    }
  }

  /**
   * Start Booking Flow: Send Welcome Message + Services List or Direct to Specialist/Date
   */
  private static async startBookingFlow(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    specificService: schema.Service | null
  ) {
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

    // Send Welcome Header / Media if configured
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
   * Initialize Session for a specific chosen Service & Advance to Master or Date
   */
  private static async initSessionForService(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    service: schema.Service
  ) {
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

    // Send service messages (attachments/photos) if configured
    if (Array.isArray(service.serviceMessages) && service.serviceMessages.length > 0) {
      for (const msg of service.serviceMessages as any[]) {
        if (msg.url) {
          try {
            await this.sendAndSaveMediaMessage(channelRow, conversationId, to, msg.url, msg.type || "image", msg.caption || undefined);
          } catch (mErr: any) {
            console.warn("[ServiceBookingService] Failed to send service message:", mErr.message);
          }
        }
      }
    }

    // Fetch specialists / masters assigned to this service
    const allMasters = await db
      .select()
      .from(schema.serviceMasters)
      .where(and(eq(schema.serviceMasters.tenantId, config.tenantId), eq(schema.serviceMasters.isActive, true)));

    const assignedMasters = allMasters.filter(m => {
      const sIds = Array.isArray(m.serviceIds) ? m.serviceIds : [];
      return sIds.includes(service.id) || sIds.length === 0; // if empty, master does all services
    });

    // Delete any old session and create fresh
    await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.conversationId, conversationId));

    if (config.requireMasterSelection && assignedMasters.length > 0) {
      // Prompt for master selection
      await db.insert(schema.serviceSessions).values({
        conversationId,
        serviceId: service.id,
        currentStep: "waiting_for_master",
        customerData: {}
      });

      const promptText = `✨ You selected *${service.name}* (${service.currency || "INR"} ${service.price} - ${service.durationMinutes} mins).\n\nPlease choose your preferred specialist:`;

      if (isCloudApi && assignedMasters.length <= 2) {
        const buttons = assignedMasters.map(m => ({
          id: `mst_${m.id}`,
          title: m.name.substring(0, 20)
        }));
        buttons.push({ id: "mst_any", title: "Any Specialist" });
        await this.sendCloudApiButtonMessage(channelRow, conversationId, to, promptText, null, buttons);
      } else {
        let listText = `${promptText}\n\n`;
        assignedMasters.forEach((m, idx) => {
          listText += `👉 Reply *${idx + 1}* for *${m.name}* (${m.title || "Specialist"})\n`;
        });
        listText += `👉 Reply *${assignedMasters.length + 1}* for *Any Specialist (Next Available)*\n`;
        listText += `\nReply *cancel* anytime to exit.`;
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, listText);
      }
    } else {
      // Skip master selection, go straight to Date Selection
      await this.promptDateSelection(channelRow, config, conversationId, to, service.id, null);
    }
  }

  /**
   * Prompt Date Selection: Suggest Today, Tomorrow, or specific date
   */
  private static async promptDateSelection(
    channelRow: any,
    config: schema.ServiceConfig,
    conversationId: string,
    to: string,
    serviceId: string,
    masterId: string | null
  ) {
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

    await db.delete(schema.serviceSessions).where(eq(schema.serviceSessions.conversationId, conversationId));
    await db.insert(schema.serviceSessions).values({
      conversationId,
      serviceId,
      masterId: masterId || null,
      currentStep: "waiting_for_date",
      customerData: {}
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const promptText = `📅 *Select Appointment Date*\n\nPlease select or type your preferred booking date:`;

    if (isCloudApi) {
      const buttons = [
        { id: `date_${todayStr}`, title: `Today (${todayStr.slice(5)})` },
        { id: `date_${tomorrowStr}`, title: `Tomorrow (${tomorrowStr.slice(5)})` }
      ];
      await this.sendCloudApiButtonMessage(channelRow, conversationId, to, promptText, null, buttons);
    } else {
      const listText = `${promptText}\n\n` +
        `👉 Reply *1* for *Today* (${todayStr})\n` +
        `👉 Reply *2* for *Tomorrow* (${tomorrowStr})\n` +
        `👉 Or type any date in *YYYY-MM-DD* format (e.g. ${tomorrowStr})`;
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
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

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

    const promptText = `⏰ *Available Slots for ${dateStr}*\n\nPlease choose your preferred time slot:`;

    if (isCloudApi && availableSlots.length <= 3) {
      const buttons = availableSlots.slice(0, 3).map(s => ({
        id: `slot_${s.startTime}`,
        title: s.startTime
      }));
      await this.sendCloudApiButtonMessage(channelRow, session.conversationId, to, promptText, null, buttons);
    } else {
      let listText = `${promptText}\n\n`;
      availableSlots.slice(0, 10).forEach((s, idx) => {
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
    buttonReplyId?: string,
    listReplyId?: string
  ) {
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

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
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      if (buttonReplyId?.startsWith("date_")) {
        chosenDate = buttonReplyId.replace("date_", "");
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

      if (!chosenDate) {
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please enter a valid date in *YYYY-MM-DD* format (e.g. 2026-09-15), or reply *1* for Today, *2* for Tomorrow.");
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

      // Check fields to collect
      const fields: string[] = Array.isArray(config.checkoutFields) ? config.checkoutFields : ["name", "phone", "notes"];
      const nextStep = fields.length > 0 ? `waiting_for_field:${fields[0]}` : "waiting_for_payment_method";

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

      if (fields.length > 0) {
        const prompt = fields[0] === "name" ? "👤 Please enter your *Full Name*:" :
          fields[0] === "phone" ? "📱 Please enter your *Phone Number*:" :
          fields[0] === "notes" ? "📝 Any special requests or notes? (or reply *none*):" : `Please enter your *${fields[0]}*:`;
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, prompt);
      } else {
        await this.promptPaymentMethod(channelRow, config, session, to);
      }
      return;
    }

    // STEP 5: WAITING FOR DYNAMIC CHECKOUT FIELDS
    if (session.currentStep.startsWith("waiting_for_field:")) {
      const currentField = session.currentStep.replace("waiting_for_field:", "");
      const fields: string[] = Array.isArray(config.checkoutFields) ? config.checkoutFields : ["name", "phone", "notes"];
      const currentIdx = fields.indexOf(currentField);

      const customerData = { ...(session.customerData || {}), [currentField]: textContent };

      if (currentIdx >= 0 && currentIdx < fields.length - 1) {
        const nextField = fields[currentIdx + 1];
        await db
          .update(schema.serviceSessions)
          .set({
            currentStep: `waiting_for_field:${nextField}`,
            customerData
          })
          .where(eq(schema.serviceSessions.id, session.id));

        const prompt = nextField === "name" ? "👤 Please enter your *Full Name*:" :
          nextField === "phone" ? "📱 Please enter your *Phone Number*:" :
          nextField === "notes" ? "📝 Any special requests or notes? (or reply *none*):" : `Please enter your *${nextField}*:`;
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, prompt);
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
        await this.sendAndSaveTextMessage(channelRow, conversationId, to, "Please choose a valid payment method.");
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
          customerName: (session.customerData as any)?.name || "Customer",
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
    const isCloudApi = channelRow.connectionMethod === "embedded" || channelRow.connectionMethod === "waba" || !channelRow.connectionMethod;

    const paymentOptions: { id: string; title: string }[] = [];
    paymentOptions.push({ id: "cod", title: config.labelCod || "Pay at Venue (COD)" });
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
}
