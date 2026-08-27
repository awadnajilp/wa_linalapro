import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { getTransporter } from "./email.service";
import { WhatsAppApiService } from "./whatsapp-api";
import { AddonManager } from "./addon-manager";

export function initTicketReportCron() {
  console.log("⏰ Initializing Support Ticket Report Cron (every hour)...");
  
  // Run checks immediately, and then every hour
  checkAndSendTicketReports().catch(console.error);
  
  setInterval(async () => {
    try {
      await checkAndSendTicketReports();
    } catch (err: any) {
      console.error("[TicketReportCron] Error in reporting cron execution:", err.message);
    }
  }, 60 * 60 * 1000); // 1 hour
}

async function checkAndSendTicketReports() {
  const now = new Date();
  
  // Find all active configs where report interval is due
  const configs = await db
    .select()
    .from(schema.whatsappSupportTicketConfigs)
    .where(
      and(
        sql`${schema.whatsappSupportTicketConfigs.reportingNumber} IS NOT NULL`,
        sql`${schema.whatsappSupportTicketConfigs.nextReportAt} IS NULL OR ${schema.whatsappSupportTicketConfigs.nextReportAt} <= ${now}`
      )
    );

  console.log(`[TicketReportCron] Found ${configs.length} configs to check for support ticket report generation`);

  for (const config of configs) {
    try {
      // 1. Double check if this tenant has the active support-tickets addon subscription
      const isPluginActive = await AddonManager.isAddonActive(config.tenantId, "support-tickets");
      if (!isPluginActive) {
        console.log(`[TicketReportCron] Support Tickets plugin inactive for tenant ${config.tenantId}, skipping report.`);
        continue;
      }

      // Calculate time boundaries
      const interval = config.reportInterval || "daily";
      let startDate = new Date();
      if (interval === "daily") {
        startDate.setDate(now.getDate() - 1);
      } else if (interval === "weekly") {
        startDate.setDate(now.getDate() - 7);
      } else if (interval === "monthly") {
        startDate.setDate(now.getDate() - 30);
      }

      // 2. Fetch ticket records inside this date range
      const ticketsList = await db
        .select()
        .from(schema.whatsappSupportTickets)
        .where(
          and(
            eq(schema.whatsappSupportTickets.tenantId, config.tenantId),
            eq(schema.whatsappSupportTickets.channelId, config.channelId),
            gte(schema.whatsappSupportTickets.createdAt, startDate),
            lte(schema.whatsappSupportTickets.createdAt, now)
          )
        );

      if (ticketsList.length === 0) {
        console.log(`[TicketReportCron] No tickets logged for channel ${config.channelId} since ${startDate.toISOString()}. Skipping.`);
        
        // Update next report time to prevent looping
        await updateNextReportTime(config.id, interval, now);
        continue;
      }

      // 3. Compile report metrics
      let totalTickets = ticketsList.length;
      let openCount = 0;
      let pendingCount = 0;
      let resolvedCount = 0;
      const categorySummary: Record<string, number> = {};
      
      for (const tkt of ticketsList) {
        if (tkt.status === "open") openCount++;
        else if (tkt.status === "pending") pendingCount++;
        else if (tkt.status === "resolved" || tkt.status === "closed") resolvedCount++;

        const cat = tkt.category || "General";
        categorySummary[cat] = (categorySummary[cat] || 0) + 1;
      }

      // 4. Send WhatsApp Notification
      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, config.channelId))
        .limit(1);

      if (channel) {
        const waApi = new WhatsAppApiService(channel);
        
        let reportSummary = `📊 *WhatsApp Support Tickets - ${interval.toUpperCase()} REPORT*\n`;
        reportSummary += `Period: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}\n`;
        reportSummary += `───────────────────\n`;
        reportSummary += `Total Tickets Logged: *${totalTickets}*\n`;
        reportSummary += `🟢 Open: *${openCount}* | 🟡 Pending: *${pendingCount}* | ✅ Resolved: *${resolvedCount}*\n\n`;
        reportSummary += `*Category Breakdown:*\n`;
        
        for (const [cat, val] of Object.entries(categorySummary)) {
          reportSummary += `• ${cat}: *${val} ticket(s)*\n`;
        }
        
        reportSummary += `\nReport generated automatically by Linala Support Bot.`;

        await waApi.sendDirectMessage({
          to: config.reportingNumber,
          type: "text",
          text: { body: reportSummary }
        }).catch(err => {
          console.error(`[TicketReportCron] Failed to send WhatsApp report to ${config.reportingNumber}:`, err.message);
        });
      }

      // 5. Send Email with Excel attachment (if enabled)
      if (config.emailEnabled && config.reportEmail) {
        console.log(`[TicketReportCron] Generating Excel sheet report for email ${config.reportEmail}...`);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Support Tickets");
        
        worksheet.columns = [
          { header: "Ticket ID", key: "ticketId", width: 15 },
          { header: "Date Created", key: "createdAt", width: 20 },
          { header: "Subject", key: "subject", width: 25 },
          { header: "Description", key: "description", width: 35 },
          { header: "Category", key: "category", width: 15 },
          { header: "Priority", key: "priority", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "Logged By Name", key: "loggedByName", width: 20 },
          { header: "Logged By Phone", key: "loggedByPhone", width: 18 },
          { header: "Assigned To", key: "assignedTo", width: 20 },
        ];

        // Format header
        worksheet.getRow(1).font = { bold: true };

        for (const tkt of ticketsList) {
          worksheet.addRow({
            ticketId: tkt.ticketId,
            createdAt: tkt.createdAt ? new Date(tkt.createdAt).toLocaleString() : "",
            subject: tkt.subject,
            description: tkt.description || "",
            category: tkt.category || "General",
            priority: tkt.priority || "Medium",
            status: tkt.status || "open",
            loggedByName: tkt.loggedByName || "N/A",
            loggedByPhone: tkt.loggedByPhone || "N/A",
            assignedTo: tkt.assignedTo || "Unassigned",
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        
        // Send email via system nodemailer config
        const transporter = await getTransporter();
        await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL || "info@linalapro.com",
          to: config.reportEmail,
          subject: `📊 WhatsApp Support Tickets Report (${interval.toUpperCase()}) - ${now.toLocaleDateString()}`,
          html: `
            <h3>Your Scheduled Support Tickets Report</h3>
            <p>Hello,</p>
            <p>Please find attached the automated Excel report containing your logged support tickets from WhatsApp for the period <strong>${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}</strong>.</p>
            <ul>
              <li><strong>Total Tickets Logged:</strong> ${totalTickets}</li>
              <li><strong>Open:</strong> ${openCount}</li>
              <li><strong>Pending:</strong> ${pendingCount}</li>
              <li><strong>Resolved:</strong> ${resolvedCount}</li>
            </ul>
            <p>Best regards,<br/>Linala Team</p>
          `,
          attachments: [
            {
              filename: `tickets_report_${now.toISOString().split("T")[0]}.xlsx`,
              content: buffer,
            }
          ]
        });
        console.log(`[TicketReportCron] Sent Excel report email successfully to ${config.reportEmail}`);
      }

      // Update next execution date
      await updateNextReportTime(config.id, interval, now);

    } catch (configErr: any) {
      console.error(`[TicketReportCron] Failed to process report for config ${config.id}:`, configErr.message);
    }
  }
}

async function updateNextReportTime(configId: string, interval: string, now: Date) {
  let nextReport = new Date(now);
  if (interval === "daily") {
    nextReport.setDate(now.getDate() + 1);
  } else if (interval === "weekly") {
    nextReport.setDate(now.getDate() + 7);
  } else if (interval === "monthly") {
    nextReport.setDate(now.getDate() + 30);
  }

  await db
    .update(schema.whatsappSupportTicketConfigs)
    .set({ nextReportAt: nextReport })
    .where(eq(schema.whatsappSupportTicketConfigs.id, configId));

  console.log(`[TicketReportCron] Support Ticket Config ${configId} scheduled for next report at ${nextReport.toISOString()}`);
}
