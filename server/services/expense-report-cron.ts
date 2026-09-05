import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { getTransporter, getSystemFromAddress } from "./email.service";
import { WhatsAppApiService } from "./whatsapp-api";
import { AddonManager } from "./addon-manager";

export function initExpenseReportCron() {
  console.log("⏰ Initializing Expense Report Cron (every hour)...");
  
  // Run checks immediately, and then every hour
  checkAndSendReports().catch(console.error);
  
  setInterval(async () => {
    try {
      await checkAndSendReports();
    } catch (err: any) {
      console.error("[ExpenseReportCron] Error in reporting cron execution:", err.message);
    }
  }, 60 * 60 * 1000); // 1 hour
}

async function checkAndSendReports() {
  const now = new Date();
  
  // Find all active configs where report interval is due
  const configs = await db
    .select()
    .from(schema.expenseConfigs)
    .where(
      and(
        sql`${schema.expenseConfigs.reportingNumber} IS NOT NULL`,
        sql`${schema.expenseConfigs.nextReportAt} IS NULL OR ${schema.expenseConfigs.nextReportAt} <= ${now}`
      )
    );

  console.log(`[ExpenseReportCron] Found ${configs.length} configs to check for report generation`);

  for (const config of configs) {
    try {
      // 1. Double check if this tenant has the active expense-tracker addon subscription
      const isPluginActive = await AddonManager.isAddonActive(config.tenantId, "expense-tracker");
      if (!isPluginActive) {
        console.log(`[ExpenseReportCron] Expense plugin inactive for tenant ${config.tenantId}, skipping report.`);
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

      // 2. Fetch expense records inside this date range
      const expenseLogs = await db
        .select()
        .from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.tenantId, config.tenantId),
            eq(schema.expenses.channelId, config.channelId),
            gte(schema.expenses.date, startDate),
            lte(schema.expenses.date, now)
          )
        );

      if (expenseLogs.length === 0) {
        console.log(`[ExpenseReportCron] No expenses logged for channel ${config.channelId} since ${startDate.toISOString()}. Skipping.`);
        
        // Update next report time to prevent looping
        await updateNextReportTime(config.id, interval, now);
        continue;
      }

      // 3. Compile report metrics
      let totalAmount = 0;
      const categorySummary: Record<string, number> = {};
      
      for (const log of expenseLogs) {
        const amt = Number(log.amount || 0);
        totalAmount += amt;
        categorySummary[log.category] = (categorySummary[log.category] || 0) + amt;
      }

      // 4. Send WhatsApp Notification
      const [channel] = await db
        .select()
        .from(schema.channels)
        .where(eq(schema.channels.id, config.channelId))
        .limit(1);

      if (channel) {
        const waApi = new WhatsAppApiService(channel);
        
        let reportSummary = `📊 *WhatsApp Expense Tracker - ${interval.toUpperCase()} REPORT*\n`;
        reportSummary += `Period: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}\n`;
        reportSummary += `───────────────────\n`;
        reportSummary += `Total Transactions: *${expenseLogs.length}*\n`;
        reportSummary += `Total Amount Spent: *${totalAmount.toFixed(2)}*\n\n`;
        reportSummary += `*Category Breakdown:*\n`;
        
        for (const [cat, val] of Object.entries(categorySummary)) {
          reportSummary += `• ${cat}: *${val.toFixed(2)}*\n`;
        }
        
        reportSummary += `\nReport generated automatically by Linala Expense Bot.`;

        await waApi.sendDirectMessage({
          to: config.reportingNumber,
          type: "text",
          text: { body: reportSummary }
        }).catch(err => {
          console.error(`[ExpenseReportCron] Failed to send WhatsApp report to ${config.reportingNumber}:`, err.message);
        });
      }

      // 5. Send Email with Excel attachment (if enabled)
      if (config.emailEnabled && config.reportEmail) {
        console.log(`[ExpenseReportCron] Generating Excel sheet report for email ${config.reportEmail}...`);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Expenses Ledger");
        
        worksheet.columns = [
          { header: "Date", key: "date", width: 20 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Category", key: "category", width: 20 },
          { header: "Description", key: "description", width: 35 },
          { header: "Payment Account", key: "account", width: 25 },
          { header: "Logged By (Name)", key: "loggedByName", width: 25 },
          { header: "Logged By (Phone)", key: "loggedByPhone", width: 20 },
        ];

        // Format header
        worksheet.getRow(1).font = { bold: true };
        
        // Fetch accounts for name matching
        const accounts = await db
          .select()
          .from(schema.paymentAccounts)
          .where(eq(schema.paymentAccounts.tenantId, config.tenantId));
        
        const accountsMap = new Map(accounts.map(a => [a.id, a.name]));

        for (const log of expenseLogs) {
          worksheet.addRow({
            date: log.date ? new Date(log.date).toLocaleString() : "",
            amount: Number(log.amount || 0).toFixed(2),
            category: log.category,
            description: log.description || "",
            account: log.paymentAccountId ? (accountsMap.get(log.paymentAccountId) || "Unknown") : "Cash",
            loggedByName: log.loggedByName || "N/A",
            loggedByPhone: log.loggedByPhone || "N/A",
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        
        // Send email via system nodemailer config
        const transporter = await getTransporter();
        const { from: fromHeader } = await getSystemFromAddress("LINALA Expenses");
        await transporter.sendMail({
          from: fromHeader,
          to: config.reportEmail,
          subject: `📊 WhatsApp Expense Report (${interval.toUpperCase()}) - ${now.toLocaleDateString()}`,
          html: `
            <h3>Your Scheduled Expense Tracker Report</h3>
            <p>Hello,</p>
            <p>Please find attached the automated Excel report containing your logged expenses from WhatsApp for the period <strong>${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}</strong>.</p>
            <ul>
              <li><strong>Total Transactions:</strong> ${expenseLogs.length}</li>
              <li><strong>Total Spent:</strong> ${totalAmount.toFixed(2)}</li>
            </ul>
            <p>Best regards,<br/>Linala Team</p>
          `,
          attachments: [
            {
              filename: `expenses_report_${now.toISOString().split("T")[0]}.xlsx`,
              content: buffer,
            }
          ]
        });
        console.log(`[ExpenseReportCron] Sent Excel report email successfully to ${config.reportEmail}`);
      }

      // Update next execution date
      await updateNextReportTime(config.id, interval, now);

    } catch (configErr: any) {
      console.error(`[ExpenseReportCron] Failed to process report for config ${config.id}:`, configErr.message);
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
    .update(schema.expenseConfigs)
    .set({ nextReportAt: nextReport })
    .where(eq(schema.expenseConfigs.id, configId));

  console.log(`[ExpenseReportCron] Config ${configId} scheduled for next report at ${nextReport.toISOString()}`);
}
