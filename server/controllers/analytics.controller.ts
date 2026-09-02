/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import type { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db, dbRead } from '../db';
import { messages, campaigns, conversations, whatsappChannels, campaignRecipients, messageQueue, contacts as contactsTable } from '@shared/schema';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import { eq, and, gte, lte, count, sql, desc } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import ExcelJS from "exceljs";
import { storage } from 'server/storage';

// Get message analytics with real-time data
export const getMessageAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { channelId, days = '30', startDate, endDate } = req.query;
  
  const daysNum = parseInt(days as string, 10);
  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const conditions = [];
  
  if (channelId) {
    conditions.push(eq(conversations.channelId, channelId as string));
  }
  
  conditions.push(gte(messages.createdAt, start));
  conditions.push(lte(messages.createdAt, end));

  // Get daily message statistics (outbound only for rate charts)
  const messageStats = await dbRead
    .select({
      date: sql<string>`DATE(${messages.createdAt})`,
      totalSent: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      delivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'pending' THEN 1 END)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  // Get overall statistics
  const overallStats = await dbRead
    .select({
      totalMessages: count(messages.id),
      totalOutbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      totalInbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
      totalDelivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      totalRead: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      totalFailed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      totalReplied: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' AND ${messages.status} != 'failed' THEN 1 END)`,
      uniqueContacts: sql<number>`COUNT(DISTINCT ${conversations.contactPhone})`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions));

  // Calculate average response time (nearest inbound reply after each outbound message)
  let avgResponseResult: { avgResponseMs: number | null }[] = [{ avgResponseMs: null }];
  try {
    avgResponseResult = await dbRead
      .select({
        avgResponseMs: sql<number>`AVG(response_time_ms)`,
      })
      .from(sql`(
        SELECT EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) * 1000 AS response_time_ms
        FROM messages outb
        INNER JOIN conversations c ON outb.conversation_id = c.id
        CROSS JOIN LATERAL (
          SELECT inb.created_at
          FROM messages inb
          WHERE inb.conversation_id = outb.conversation_id
            AND inb.direction = 'inbound'
            AND inb.created_at > outb.created_at
            AND inb.created_at <= ${end}
            AND inb.status != 'failed'
          ORDER BY inb.created_at ASC
          LIMIT 1
        ) first_reply
        WHERE outb.direction = 'outbound'
          ${channelId ? sql`AND c.channel_id = ${channelId as string}` : sql``}
          AND outb.created_at >= ${start}
          AND outb.created_at <= ${end}
          AND EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) BETWEEN 0 AND 86400
        ) sub`);
  } catch (e) {
    // If the query fails, we just don't have response time data
  }

  // Get message type breakdown
  const messageTypes = await dbRead
    .select({
      direction: messages.direction,
      count: count(messages.id),
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(messages.direction);

  // Get hourly distribution
  const hourlyDistribution = await dbRead
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})`,
      count: count(messages.id),
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`);

  const avgResponseMs = avgResponseResult[0]?.avgResponseMs || null;
  let avgResponseTime: string | null = null;
  if (avgResponseMs) {
    const totalSeconds = Math.round(avgResponseMs / 1000);
    if (totalSeconds < 60) {
      avgResponseTime = `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      avgResponseTime = `${Math.round(totalSeconds / 60)}m`;
    } else {
      avgResponseTime = `${(totalSeconds / 3600).toFixed(1)}h`;
    }
  }

  res.json({
    dailyStats: messageStats,
    overall: overallStats[0] || {},
    messageTypes,
    hourlyDistribution,
    avgResponseTime,
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: daysNum,
    },
  });
});

// Get campaign analytics
export const getCampaignAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.query;
  
  const conditions = [];
  if (channelId) {
    conditions.push(eq(campaigns.channelId, channelId as string));
  }

  // Get campaign performance data - simplified query
  const campaignStats = await dbRead
    .select()
    .from(campaigns)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(campaigns.createdAt));

  const campaignsWithRates = campaignStats.map((campaign: any) => ({
    ...campaign,
    deliveryRate: (campaign.sentCount && campaign.sentCount > 0)
      ? Math.min(((campaign.deliveredCount || 0) / campaign.sentCount) * 100, 100)
      : 0,
    readRate: (campaign.deliveredCount && campaign.deliveredCount > 0)
      ? Math.min(((campaign.readCount || 0) / campaign.deliveredCount) * 100, 100)
      : 0,
    replyRate: (campaign.deliveredCount && campaign.deliveredCount > 0)
      ? Math.min(((campaign.repliedCount || 0) / campaign.deliveredCount) * 100, 100)
      : 0,
  }));

  // Calculate aggregated stats in JavaScript
  const aggregatedStats = campaignStats.reduce((acc: any, campaign: any) => ({
    totalCampaigns: acc.totalCampaigns + 1,
    activeCampaigns: acc.activeCampaigns + (campaign.status === 'active' ? 1 : 0),
    completedCampaigns: acc.completedCampaigns + (campaign.status === 'completed' ? 1 : 0),
    totalRecipients: acc.totalRecipients + (campaign.recipientCount || 0),
    totalSent: acc.totalSent + (campaign.sentCount || 0),
    totalDelivered: acc.totalDelivered + (campaign.deliveredCount || 0),
    totalRead: acc.totalRead + (campaign.readCount || 0),
    totalReplied: acc.totalReplied + (campaign.repliedCount || 0),
    totalFailed: acc.totalFailed + (campaign.failedCount || 0),
  }), {
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalRecipients: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalReplied: 0,
    totalFailed: 0,
  });

  res.json({
    campaigns: campaignsWithRates,
    summary: aggregatedStats,
  });
});

// Get individual campaign analytics
export const getCampaignAnalyticsById = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  // Get campaign details
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  // Count replied contacts fast using indexed count
  const [repliedCountResult] = await dbRead
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        or(eq(campaignRecipients.status, 'replied'), sql`${campaignRecipients.repliedAt} IS NOT NULL`)
      )
    );

  const computedRepliedCount = Number(repliedCountResult?.count || 0);
  const campaignWithStats = {
    ...campaign,
    repliedCount: Math.max(campaign.repliedCount || 0, computedRepliedCount)
  };

  // Get daily message stats from campaignRecipients (indexed & fast)
  const dailyStats = await dbRead
    .select({
      date: sql<string>`DATE(COALESCE(${campaignRecipients.sentAt}, ${campaignRecipients.createdAt}))`,
      sent: count(campaignRecipients.id),
      delivered: sql<number>`COUNT(CASE WHEN ${campaignRecipients.status} IN ('delivered', 'read', 'replied') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${campaignRecipients.status} IN ('read', 'replied') THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${campaignRecipients.status} = 'failed' THEN 1 END)`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .groupBy(sql`DATE(COALESCE(${campaignRecipients.sentAt}, ${campaignRecipients.createdAt}))`)
    .orderBy(sql`DATE(COALESCE(${campaignRecipients.sentAt}, ${campaignRecipients.createdAt}))`);

  // Get recipient status distribution from campaignRecipients
  const recipientStats = await dbRead
    .select({
      status: campaignRecipients.status,
      count: count(campaignRecipients.id),
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .groupBy(campaignRecipients.status);

  // Get error analysis from campaignRecipients
  const errorAnalysis = await dbRead
    .select({
      errorCode: campaignRecipients.errorCode,
      errorMessage: campaignRecipients.errorMessage,
      count: count(campaignRecipients.id),
    })
    .from(campaignRecipients)
    .where(and(
      eq(campaignRecipients.campaignId, campaignId),
      eq(campaignRecipients.status, 'failed')
    ))
    .groupBy(campaignRecipients.errorCode, campaignRecipients.errorMessage)
    .orderBy(desc(count(campaignRecipients.id)));

  res.status(200).json({
    campaign: campaignWithStats,
    dailyStats,
    recipientStats,
    errorAnalysis,
    recipients: [],
  });
});

// Dedicated paginated recipients endpoint for fast rendering of large campaigns
export const getCampaignRecipientsPaginated = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const conditions = [eq(campaignRecipients.campaignId, campaignId)];

  if (status && status !== "all") {
    if (status === "replied") {
      conditions.push(or(eq(campaignRecipients.status, "replied"), sql`${campaignRecipients.repliedAt} IS NOT NULL`));
    } else if (status === "non-deliverable") {
      conditions.push(and(
        eq(campaignRecipients.status, "failed"),
        sql`${campaignRecipients.errorCode} IN ('368', '100', '190', '200', '131047', '131026', '130429')`
      ));
    } else {
      conditions.push(eq(campaignRecipients.status, status));
    }
  }

  if (search && typeof search === "string" && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    conditions.push(or(
      ilike(campaignRecipients.name, s),
      ilike(campaignRecipients.phone, s),
      ilike(campaignRecipients.errorCode, s),
      ilike(campaignRecipients.errorMessage, s)
    ));
  }

  const whereClause = and(...conditions);

  const [totalResult, data] = await Promise.all([
    dbRead
      .select({ count: sql<number>`count(*)` })
      .from(campaignRecipients)
      .where(whereClause),
    dbRead
      .select({
        id: campaignRecipients.id,
        campaignId: campaignRecipients.campaignId,
        phone: campaignRecipients.phone,
        name: campaignRecipients.name,
        status: campaignRecipients.status,
        whatsappMessageId: campaignRecipients.whatsappMessageId,
        sentAt: campaignRecipients.sentAt,
        deliveredAt: campaignRecipients.deliveredAt,
        readAt: campaignRecipients.readAt,
        repliedAt: campaignRecipients.repliedAt,
        replyText: campaignRecipients.replyText,
        errorCode: campaignRecipients.errorCode,
        errorMessage: campaignRecipients.errorMessage,
        contactId: campaignRecipients.contactId,
      })
      .from(campaignRecipients)
      .where(whereClause)
      .orderBy(desc(campaignRecipients.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalResult[0]?.count || 0);

  res.json({
    status: "success",
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get individual campaign details
export const getCampaignDetails = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  const campaign = await dbRead
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign.length) {
    throw new AppError(404, 'Campaign not found');
  }

  // Get message statistics for this campaign
  const messageStats = await dbRead
    .select({
      date: sql<string>`DATE(${messages.createdAt})`,
      sent: count(messages.id),
      delivered: sql<number>`COUNT(CASE WHEN ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.status} = 'failed' THEN 1 END)`,
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  // Get recipient performance
  const recipientStats = await dbRead
    .select({
      status: messages.status,
      count: count(messages.id),
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(messages.status);

  // Get error analysis
  const errorAnalysis = await dbRead
    .select({
      errorCode: messages.errorCode,
      errorMessage: messages.errorMessage,
      count: count(messages.id),
    })
    .from(messages)
    .where(and(
      eq(messages.campaignId, campaignId),
      eq(messages.status, 'failed')
    ))
    .groupBy(messages.errorCode, messages.errorMessage);

  res.json({
    campaign: campaign[0],
    dailyStats: messageStats,
    recipientStats,
    errorAnalysis,
  });
});

// Export analytics report
export const exportAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'pdf', type = 'messages', channelId, days = '30' } = req.query;
  
  if (format === 'pdf') {
    await exportPDF(req, res);
  } else if (format === 'excel') {
    await exportExcel(req, res);
  } else {
    throw new AppError(400, 'Invalid export format');
  }
});

// Helper function to export PDF
async function exportPDF(req: Request, res: Response) {
  const { type, channelId, days = '30' } = req.query;
  
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
  
  doc.pipe(res);
  
  // Add title
  doc.fontSize(20).text('WhatsApp Analytics Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  // Get data based on type
  if (type === 'messages' || type === 'all') {
    // Fetch message analytics data
    const daysNum = parseInt(days as string);
    const start = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    
    const conditions = [];
    if (channelId) {
      conditions.push(eq(conversations.channelId, channelId as string));
    }
    conditions.push(gte(messages.createdAt, start));

    const stats = await dbRead
      .select({
        totalMessages: count(messages.id),
        totalOutbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
        totalInbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
        delivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
        read: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...conditions));

    const s = stats[0];
    const outbound = Number(s?.totalOutbound) || 0;
    const deliv = Number(s?.delivered) || 0;
    const readCount = Number(s?.read) || 0;
    const failCount = Number(s?.failed) || 0;
    const delivRate = outbound > 0 ? Math.min((deliv / outbound) * 100, 100).toFixed(1) : '0.0';
    const readRatePdf = deliv > 0 ? Math.min((readCount / deliv) * 100, 100).toFixed(1) : '0.0';
    const failRate = outbound > 0 ? Math.min((failCount / outbound) * 100, 100).toFixed(1) : '0.0';

    doc.fontSize(16).text('Message Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Messages: ${s?.totalMessages || 0}`);
    doc.text(`Outbound: ${outbound}`);
    doc.text(`Inbound: ${Number(s?.totalInbound) || 0}`);
    doc.text(`Delivered: ${deliv} (${delivRate}%)`);
    doc.text(`Read: ${readCount} (${readRatePdf}%)`);
    doc.text(`Failed: ${failCount} (${failRate}%)`);
    doc.moveDown(2);
  }

  if (type === 'campaigns' || type === 'all') {
    // Add campaign statistics
    const campaignStats = await dbRead
      .select({
        totalCampaigns: count(campaigns.id),
        totalSent: sql<number>`SUM(${campaigns.sentCount})`,
        totalDelivered: sql<number>`SUM(${campaigns.deliveredCount})`,
      })
      .from(campaigns)
      .where(channelId ? eq(campaigns.channelId, channelId as string) : undefined);

    doc.fontSize(16).text('Campaign Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Campaigns: ${campaignStats[0]?.totalCampaigns || 0}`);
    doc.text(`Total Sent: ${campaignStats[0]?.totalSent || 0}`);
    doc.text(`Total Delivered: ${campaignStats[0]?.totalDelivered || 0}`);
  }

  doc.end();
}

// Helper function to export Excel
export async function exportExcel(req: Request, res: Response) {
  const { type, channelId, days = "30", campaignId } = req.query;

  const workbook = new ExcelJS.Workbook();

  if (campaignId) {
    const campaign = await storage.getCampaign(campaignId as string);
    if (!campaign) {
      return res.status(404).send("Campaign not found");
    }

    // 1. Overview Sheet
    const overviewSheet = workbook.addWorksheet("Campaign Overview");
    overviewSheet.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 45 }
    ];
    overviewSheet.addRows([
      { metric: "Campaign Name", value: campaign.name },
      { metric: "Description", value: campaign.description || "N/A" },
      { metric: "Campaign Type", value: campaign.campaignType || "contacts" },
      { metric: "Channel ID", value: campaign.channelId },
      { metric: "Status", value: campaign.status },
      { metric: "Total Recipients", value: campaign.recipientCount || 0 },
      { metric: "Sent Count", value: campaign.sentCount || 0 },
      { metric: "Delivered Count", value: campaign.deliveredCount || 0 },
      { metric: "Read Count", value: campaign.readCount || 0 },
      { metric: "Failed Count", value: campaign.failedCount || 0 },
      { metric: "Created At", value: campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : "N/A" }
    ]);

    // 2. Load recipients list (matching controller logic)
    let recipientsList = await dbRead
      .select()
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaign.id));

    if (recipientsList.length === 0) {
      const queueEntries = await dbRead
        .select({
          id: messageQueue.id,
          campaignId: messageQueue.campaignId,
          phone: messageQueue.recipientPhone,
          status: messageQueue.status,
          sentAt: messageQueue.processedAt,
          deliveredAt: messageQueue.deliveredAt,
          readAt: messageQueue.readAt,
          errorCode: messageQueue.errorCode,
          errorMessage: messageQueue.errorMessage,
          name: contactsTable.name,
        })
        .from(messageQueue)
        .leftJoin(contactsTable, and(
          eq(contactsTable.phone, messageQueue.recipientPhone),
          eq(contactsTable.channelId, messageQueue.channelId)
        ))
        .where(eq(messageQueue.campaignId, campaign.id));

      if (queueEntries.length > 0) {
        recipientsList = queueEntries.map(e => ({
          id: e.id,
          campaignId: e.campaignId || "",
          phone: e.phone,
          status: e.status,
          sentAt: e.sentAt || null,
          deliveredAt: e.deliveredAt || null,
          readAt: e.readAt || null,
          errorCode: e.errorCode || null,
          errorMessage: e.errorMessage || null,
          name: e.name || "Unknown",
        })) as any[];
      }
    }

    // 3. All Recipients Sheet
    const allRecipientsSheet = workbook.addWorksheet("All Recipients");
    allRecipientsSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Phone Number", key: "phone", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Sent At", key: "sentAt", width: 25 },
      { header: "Delivered At", key: "deliveredAt", width: 25 },
      { header: "Read At", key: "readAt", width: 25 },
      { header: "Error Code", key: "errorCode", width: 15 },
      { header: "Error Message", key: "errorMessage", width: 40 }
    ];

    recipientsList.forEach(r => {
      allRecipientsSheet.addRow({
        name: r.name || "Unknown",
        phone: r.phone,
        status: r.status,
        sentAt: r.sentAt ? new Date(r.sentAt).toLocaleString() : "N/A",
        deliveredAt: r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "N/A",
        readAt: r.readAt ? new Date(r.readAt).toLocaleString() : "N/A",
        errorCode: r.errorCode || "N/A",
        errorMessage: r.errorMessage || "N/A"
      });
    });

    // 4. Failed Deliveries Sheet
    const failedSheet = workbook.addWorksheet("Failed Deliveries");
    failedSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Phone Number", key: "phone", width: 20 },
      { header: "Error Code", key: "errorCode", width: 15 },
      { header: "Error Message", key: "errorMessage", width: 45 },
      { header: "Sent At", key: "sentAt", width: 25 }
    ];

    const failedRecipients = recipientsList.filter(r => r.status === "failed");
    failedRecipients.forEach(r => {
      failedSheet.addRow({
        name: r.name || "Unknown",
        phone: r.phone,
        errorCode: r.errorCode || "N/A",
        errorMessage: r.errorMessage || "Unknown issue",
        sentAt: r.sentAt ? new Date(r.sentAt).toLocaleString() : "N/A"
      });
    });
  } else {
    // ----------------------
    // Message Analytics Sheet
    // ----------------------
    if (type === "messages" || type === "all") {
      const daysNum = parseInt(days as string, 10);
      const start = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const conditions = [];
      if (channelId) {
        conditions.push(eq(conversations.channelId, channelId as string));
      }
      conditions.push(gte(messages.createdAt, start));

      const messageData = await dbRead
        .select({
          date: sql<string>`DATE(${messages.createdAt})`,
          totalMessages: count(messages.id),
          outbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
          inbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
          delivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
          read: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(...conditions))
        .groupBy(sql`DATE(${messages.createdAt})`)
        .orderBy(sql`DATE(${messages.createdAt})`);

      const ws = workbook.addWorksheet("Message Analytics");

      if (messageData.length > 0) {
        // Add header row
        ws.columns = Object.keys(messageData[0]).map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1),
          key,
          width: 15,
        }));

        // Add data rows
        messageData.forEach((row) => ws.addRow(row));
      }
    }

    // ----------------------
    // Campaign Analytics Sheet
    // ----------------------
    if (type === "campaigns" || type === "all") {
      const campaignData = await dbRead
        .select({
          name: campaigns.name,
          type: campaigns.type,
          status: campaigns.status,
          recipients: campaigns.recipientCount,
          sent: campaigns.sentCount,
          delivered: campaigns.deliveredCount,
          read: campaigns.readCount,
          replied: campaigns.repliedCount,
          failed: campaigns.failedCount,
        })
        .from(campaigns)
        .where(channelId ? eq(campaigns.channelId, channelId as string) : undefined)
        .orderBy(desc(campaigns.createdAt));

      const ws = workbook.addWorksheet("Campaign Analytics");

      if (campaignData.length > 0) {
        ws.columns = Object.keys(campaignData[0]).map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1),
          key,
          width: 15,
        }));

        campaignData.forEach((row) => ws.addRow(row));
      }
    }
  }

  // ----------------------
  // Write Excel to buffer
  // ----------------------
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=analytics-report-${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`
  );
  res.send(buffer);
}
