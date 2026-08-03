import { db } from "../db";
import { crmSettings, crmDeals, users, channels, crmAgentTargets } from "@shared/schema";
import { eq, and, or, gte } from "drizzle-orm";
import { getTransporter, getConfig, getPanelConfig } from "./email.service";

export async function generateCrmReport(channelId: string, period: 'daily' | 'weekly') {
  try {
    const [settings] = await db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.channelId, channelId))
      .limit(1);

    if (!settings) return null;

    // Check if report is enabled
    const isEnabled = period === 'daily' ? settings.isDailyReportEnabled : settings.isWeeklyReportEnabled;
    if (!isEnabled) return null;

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) return null;

    // Retrieve recipient emails
    const recipientEmails: string[] = [];

    // 1. Channel Owner
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, channel.createdBy))
      .limit(1);
    if (owner && owner.email) {
      recipientEmails.push(owner.email);
    }

    // 2. Team members with admin privileges
    const adminMembers = await db
      .select()
      .from(users)
      .where(and(eq(users.channelId, channelId), eq(users.isAdminMember, true)));
    
    for (const m of adminMembers) {
      if (m.email && !recipientEmails.includes(m.email)) {
        recipientEmails.push(m.email);
      }
    }

    // 3. Optional Settings Override Recipient
    if (settings.reportEmailRecipient) {
      const overrides = settings.reportEmailRecipient.split(',').map(e => e.trim());
      for (const email of overrides) {
        if (email && !recipientEmails.includes(email)) {
          recipientEmails.push(email);
        }
      }
    }

    if (recipientEmails.length === 0) return null;

    // Calculate dates
    let dateLimit = new Date();
    if (period === 'daily') {
      dateLimit.setHours(0, 0, 0, 0);
    } else {
      // weekly
      const day = dateLimit.getDay();
      const diff = dateLimit.getDate() - day + (day === 0 ? -6 : 1);
      dateLimit = new Date(dateLimit.setDate(diff));
      dateLimit.setHours(0, 0, 0, 0);
    }

    // Fetch channel deals
    const allDeals = await db
      .select()
      .from(crmDeals)
      .where(eq(crmDeals.channelId, channelId));

    // Fetch team members
    const teamMembers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.channelId, channelId),
        eq(users.id, channel.createdBy),
        eq(users.createdBy, channel.createdBy)
      ));

    // Unique members
    const uniqueMembersMap = new Map();
    for (const m of teamMembers) {
      uniqueMembersMap.set(m.id, m);
    }
    const uniqueMembers = Array.from(uniqueMembersMap.values());

    // Fetch targets
    const allTargets = await db
      .select()
      .from(crmAgentTargets)
      .where(and(eq(crmAgentTargets.channelId, channelId), eq(crmAgentTargets.period, period === 'daily' ? 'weekly' : 'monthly')));

    // Filter deals in the period
    const periodDeals = allDeals.filter(d => d.createdAt && d.createdAt >= dateLimit);
    const wonDeals = periodDeals.filter(d => d.status === "won");
    const lostDeals = periodDeals.filter(d => d.status === "lost");
    const openDeals = allDeals.filter(d => d.status === "open");

    const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const totalPeriodDeals = periodDeals.length;
    const winRate = totalPeriodDeals > 0 ? ((wonDeals.length / totalPeriodDeals) * 100).toFixed(1) : "0";

    // Build agent performance table HTML
    let agentRowsHtml = "";
    for (const m of uniqueMembers) {
      const agentDeals = periodDeals.filter(d => d.assignedTo === m.id);
      const agentWon = agentDeals.filter(d => d.status === "won");
      const agentLost = agentDeals.filter(d => d.status === "lost");
      const agentRevenue = agentWon.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      const target = allTargets.find(t => t.userId === m.id) || {
        targetDealsWon: 10,
        targetValueWon: "1000.00"
      };

      const dealsProgressPercent = Number(target.targetDealsWon) > 0 
        ? Math.min(100, Math.round((agentWon.length / Number(target.targetDealsWon)) * 100)) 
        : 0;

      const valueProgressPercent = Number(target.targetValueWon) > 0 
        ? Math.min(100, Math.round((agentRevenue / Number(target.targetValueWon)) * 100)) 
        : 0;

      const name = m.firstName ? `${m.firstName} ${m.lastName || ""}` : m.username;

      agentRowsHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-size: 14px; color: #1f2937;"><strong>${name}</strong></td>
          <td style="padding: 12px; font-size: 14px; color: #4b5563; text-align: center;">${agentDeals.length}</td>
          <td style="padding: 12px; font-size: 14px; color: #10b981; text-align: center;">${agentWon.length}</td>
          <td style="padding: 12px; font-size: 14px; color: #ef4444; text-align: center;">${agentLost.length}</td>
          <td style="padding: 12px; font-size: 14px; color: #1f2937; text-align: right; font-weight: 600;">$${agentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="padding: 12px; font-size: 14px; color: #4b5563; min-width: 120px;">
            <div style="font-size: 11px; margin-bottom: 4px;">Deals: ${agentWon.length}/${target.targetDealsWon} (${dealsProgressPercent}%)</div>
            <div style="background-color: #e5e7eb; border-radius: 4px; height: 8px; width: 100%; overflow: hidden;">
              <div style="background-color: #6366f1; height: 100%; width: ${dealsProgressPercent}%;"></div>
            </div>
          </td>
        </tr>
      `;
    }

    const reportTitle = period === 'daily' ? 'Daily CRM Performance Summary' : 'Weekly CRM Performance Summary';
    const periodLabel = period === 'daily' ? 'Today' : 'This Week';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px;">
          <h2 style="color: #4f46e5; margin: 0 0 8px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${reportTitle}</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">WhatsApp Marketing CRM — Channel: <strong>${channel.name}</strong></p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Generated on ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
        </div>

        <!-- Summary Cards -->
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 30px;">
          <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Total Active Leads</div>
            <div style="font-size: 22px; font-weight: 700; color: #1e293b;">${openDeals.length}</div>
          </div>
          <div style="flex: 1; min-width: 140px; background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Deals Won (${periodLabel})</div>
            <div style="font-size: 22px; font-weight: 700; color: #166534;">${wonDeals.length}</div>
          </div>
          <div style="flex: 1; min-width: 140px; background-color: #eef2ff; border: 1px solid #e0e7ff; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 12px; color: #4338ca; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Revenue (${periodLabel})</div>
            <div style="font-size: 22px; font-weight: 700; color: #3730a3;">$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
          </div>
          <div style="flex: 1; min-width: 140px; background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 15px; border-radius: 10px; text-align: center;">
            <div style="font-size: 12px; color: #7e22ce; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Win Rate (${periodLabel})</div>
            <div style="font-size: 22px; font-weight: 700; color: #6b21a8;">${winRate}%</div>
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Team Performance Leaderboard</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase;">Team Member</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: center;">Leads</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: center;">Won</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: center;">Lost</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: right;">Revenue</th>
                  <th style="padding: 10px 12px; font-size: 12px; color: #475569; text-transform: uppercase;">Target Progress</th>
                </tr>
              </thead>
              <tbody>
                ${agentRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Call to action / Footer -->
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #f1f5f9;">
          <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0;">Want to update targets or adjust settings?</p>
          <a href="${process.env.APP_URL || 'https://linalapro.com'}/crm" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;">Go to CRM Dashboard</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">This is an automated performance report from LINALA. To disable these reports, adjust settings in your CRM Settings panel.</p>
      </div>
    `;

    return {
      html,
      subject: `[CRM Performance] ${periodLabel} Summary Report - ${channel.name}`,
      recipientEmails
    };

  } catch (error) {
    console.error("Error generating CRM report:", error);
    return null;
  }
}

export async function sendCrmPerformanceReports(period: 'daily' | 'weekly') {
  try {
    const list = await db.select().from(crmSettings);
    const config = await getConfig();
    const configs = await getPanelConfig();
    const mailer = await getTransporter();

    const companyName = configs?.name || "LINALA";
    const fromName = config?.fromName || companyName;
    const fromEmail = config?.fromEmail || "reports@linalapro.com";

    for (const settingsItem of list) {
      const report = await generateCrmReport(settingsItem.channelId, period);
      if (!report) continue;

      for (const email of report.recipientEmails) {
        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to: email,
          subject: report.subject,
          html: report.html
        };

        try {
          await mailer.sendMail(mailOptions);
          console.log(`[CRM Report] Sent ${period} report to ${email} for channel ${settingsItem.channelId}`);
        } catch (mailErr) {
          console.error(`[CRM Report] Failed to send report to ${email}:`, mailErr);
        }
      }
    }
  } catch (error) {
    console.error(`Error sending ${period} CRM performance reports:`, error);
  }
}
