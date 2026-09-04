import { Request, Response } from "express";
import { db, dbRead } from "../db";
import { whatsappFlows, whatsappFlowResponses, channels, users, contacts } from "@shared/schema";
import { eq, and, desc, sql, or, ilike, inArray } from "drizzle-orm";
import { WhatsappFlowsService, SAMPLE_FLOW_TEMPLATES } from "../services/whatsapp-flows.service";
import { asyncHandler } from "../middlewares/error.middleware";
import ExcelJS from "exceljs";

export class WhatsappFlowsController {
  /**
   * Get all Flows for the tenant / active channel
   */
  static getFlows = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const channelId = req.headers["x-channel-id"] as string || req.query.channelId as string;

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conditions = [eq(whatsappFlows.tenantId, tenantId)];
    if (channelId) {
      conditions.push(eq(whatsappFlows.channelId, channelId));
    }

    const flowsList = await dbRead
      .select({
        id: whatsappFlows.id,
        flowId: whatsappFlows.flowId,
        channelId: whatsappFlows.channelId,
        tenantId: whatsappFlows.tenantId,
        name: whatsappFlows.name,
        categories: whatsappFlows.categories,
        status: whatsappFlows.status,
        headerText: whatsappFlows.headerText,
        bodyText: whatsappFlows.bodyText,
        footerText: whatsappFlows.footerText,
        ctaButtonText: whatsappFlows.ctaButtonText,
        previewUrl: whatsappFlows.previewUrl,
        endpointUri: whatsappFlows.endpointUri,
        triggerKeywords: whatsappFlows.triggerKeywords,
        autoSaveContactFields: whatsappFlows.autoSaveContactFields,
        isSample: whatsappFlows.isSample,
        createdAt: whatsappFlows.createdAt,
        updatedAt: whatsappFlows.updatedAt,
      })
      .from(whatsappFlows)
      .where(and(...conditions))
      .orderBy(desc(whatsappFlows.createdAt));

    // Get response counts per flow
    const flowIds = flowsList.map(f => f.id);
    const countMap = new Map<string, number>();

    if (flowIds.length > 0) {
      const counts = await dbRead
        .select({
          flowId: whatsappFlowResponses.flowId,
          count: sql<number>`count(*)`,
        })
        .from(whatsappFlowResponses)
        .where(inArray(whatsappFlowResponses.flowId, flowIds))
        .groupBy(whatsappFlowResponses.flowId);

      for (const c of counts) {
        if (c.flowId) countMap.set(c.flowId, Number(c.count));
      }
    }

    const data = flowsList.map(f => ({
      ...f,
      responseCount: countMap.get(f.id) || 0,
    }));

    res.json({
      status: "success",
      data,
    });
  });

  /**
   * Get single Flow by ID with full flowJson
   */
  static getFlowById = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const isSuperadmin = user?.role === "superadmin";

    const { id } = req.params;
    const [flow] = await dbRead
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, id))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (!isSuperadmin && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this WhatsApp Flow" });
    }

    const [respCount] = await dbRead
      .select({ count: sql<number>`count(*)` })
      .from(whatsappFlowResponses)
      .where(eq(whatsappFlowResponses.flowId, id));

    res.json({
      status: "success",
      data: {
        ...flow,
        responseCount: Number(respCount?.count || 0),
      },
    });
  });

  /**
   * Create a new Flow (Local + Optional Meta Graph API sync)
   */
  static createFlow = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const {
      channelId,
      name,
      categories,
      flowJson,
      headerText,
      bodyText,
      footerText,
      ctaButtonText,
      triggerKeywords,
      autoSaveContactFields,
      syncToMeta,
    } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Flow name is required" });
    }

    let metaFlowId: string | null = null;
    let metaStatus = "DRAFT";

    // If channel is selected and syncToMeta is true, create on Meta Graph API
    if (channelId && syncToMeta) {
      try {
        const metaRes = await WhatsappFlowsService.createFlowOnMeta(channelId, {
          name: name.trim(),
          categories: categories || ["OTHER"],
        });
        metaFlowId = metaRes.flowId;

        // Upload initial Flow JSON if provided
        if (flowJson && Object.keys(flowJson).length > 0) {
          await WhatsappFlowsService.updateFlowJsonOnMeta(channelId, metaFlowId, flowJson);
        }
      } catch (metaErr: any) {
        console.warn("[WhatsappFlowsController] Meta API creation warning:", metaErr.message);
        // We will still create local draft and report Meta warning
      }
    }

    const [inserted] = await db
      .insert(whatsappFlows)
      .values({
        tenantId,
        channelId: channelId || null,
        flowId: metaFlowId,
        name: name.trim(),
        categories: categories && categories.length > 0 ? categories : ["OTHER"],
        status: metaStatus,
        flowJson: flowJson || {},
        headerText: headerText || "",
        bodyText: bodyText || "Please complete the interactive form below:",
        footerText: footerText || "Powered by WhatsApp Flows",
        ctaButtonText: ctaButtonText || "Start Flow",
        triggerKeywords: Array.isArray(triggerKeywords) ? triggerKeywords : [],
        autoSaveContactFields: autoSaveContactFields !== false,
      })
      .returning();

    res.status(201).json({
      status: "success",
      data: inserted,
    });
  });

  /**
   * Update Flow metadata & JSON definition
   */
  static updateFlow = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name,
      categories,
      flowJson,
      headerText,
      bodyText,
      footerText,
      ctaButtonText,
      triggerKeywords,
      autoSaveContactFields,
      channelId,
      syncToMeta,
    } = req.body;

    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const isSuperadmin = user?.role === "superadmin";

    const [existing] = await db
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (!isSuperadmin && existing.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this WhatsApp Flow" });
    }

    const targetChannelId = channelId || existing.channelId;

    // Sync JSON update to Meta if flowId is present
    if (syncToMeta && existing.flowId && targetChannelId && flowJson) {
      try {
        await WhatsappFlowsService.updateFlowJsonOnMeta(targetChannelId, existing.flowId, flowJson);
      } catch (metaErr: any) {
        return res.status(400).json({ error: `Meta Flow JSON validation failed: ${metaErr.message}` });
      }
    }

    const [updated] = await db
      .update(whatsappFlows)
      .set({
        name: name !== undefined ? name.trim() : existing.name,
        categories: categories !== undefined ? categories : existing.categories,
        flowJson: flowJson !== undefined ? flowJson : existing.flowJson,
        headerText: headerText !== undefined ? headerText : existing.headerText,
        bodyText: bodyText !== undefined ? bodyText : existing.bodyText,
        footerText: footerText !== undefined ? footerText : existing.footerText,
        ctaButtonText: ctaButtonText !== undefined ? ctaButtonText : existing.ctaButtonText,
        triggerKeywords: triggerKeywords !== undefined ? triggerKeywords : existing.triggerKeywords,
        autoSaveContactFields: autoSaveContactFields !== undefined ? autoSaveContactFields : existing.autoSaveContactFields,
        channelId: targetChannelId,
        updatedAt: new Date(),
      })
      .where(eq(whatsappFlows.id, id))
      .returning();

    res.json({
      status: "success",
      data: updated,
    });
  });

  /**
   * Publish Flow to Meta
   */
  static publishFlow = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const isSuperadmin = user?.role === "superadmin";

    const { id } = req.params;
    const [flow] = await db
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, id))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (!isSuperadmin && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this WhatsApp Flow" });
    }

    if (!flow.channelId) {
      return res.status(400).json({ error: "A Meta WhatsApp Channel must be assigned to publish this flow." });
    }

    let metaFlowId = flow.flowId;

    // If flow hasn't been created on Meta yet, create and upload asset first
    if (!metaFlowId) {
      const created = await WhatsappFlowsService.createFlowOnMeta(flow.channelId, {
        name: flow.name,
        categories: flow.categories || ["OTHER"],
      });
      metaFlowId = created.flowId;
      await WhatsappFlowsService.updateFlowJsonOnMeta(flow.channelId, metaFlowId, flow.flowJson || {});
    }

    await WhatsappFlowsService.publishFlowOnMeta(flow.channelId, metaFlowId);

    const [updated] = await db
      .update(whatsappFlows)
      .set({
        flowId: metaFlowId,
        status: "PUBLISHED",
        updatedAt: new Date(),
      })
      .where(eq(whatsappFlows.id, id))
      .returning();

    res.json({
      status: "success",
      message: "Flow successfully published to WhatsApp Meta Cloud API",
      data: updated,
    });
  });

  /**
   * Deprecate Flow on Meta
   */
  static deprecateFlow = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const isSuperadmin = user?.role === "superadmin";

    const { id } = req.params;
    const [flow] = await db
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, id))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (!isSuperadmin && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this WhatsApp Flow" });
    }

    if (flow.channelId && flow.flowId) {
      try {
        await WhatsappFlowsService.deprecateFlowOnMeta(flow.channelId, flow.flowId);
      } catch (err: any) {
        console.warn("[WhatsappFlowsController] Meta deprecation notice:", err.message);
      }
    }

    const [updated] = await db
      .update(whatsappFlows)
      .set({
        status: "DEPRECATED",
        updatedAt: new Date(),
      })
      .where(eq(whatsappFlows.id, id))
      .returning();

    res.json({
      status: "success",
      message: "Flow marked as deprecated",
      data: updated,
    });
  });

  /**
   * Delete Flow
   */
  static deleteFlow = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const isSuperadmin = user?.role === "superadmin";

    const { id } = req.params;
    const [flow] = await db
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, id))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (!isSuperadmin && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this WhatsApp Flow" });
    }

    if (flow.channelId && flow.flowId && flow.status === "DRAFT") {
      try {
        await WhatsappFlowsService.deleteFlowOnMeta(flow.channelId, flow.flowId);
      } catch (err: any) {
        console.warn("[WhatsappFlowsController] Meta deletion notice:", err.message);
      }
    }

    await db.delete(whatsappFlows).where(eq(whatsappFlows.id, id));

    res.json({
      status: "success",
      message: "WhatsApp Flow deleted successfully",
    });
  });

  /**
   * Sync all Flows from Meta WABA
   */
  static syncMetaFlows = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const { channelId } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID is required for Meta sync" });
    }

    const result = await WhatsappFlowsService.syncFlowsFromMeta(channelId, tenantId);

    res.json({
      status: "success",
      message: `Successfully synced ${result.syncedCount} flows from Meta WABA`,
      data: result.flows,
    });
  });

  /**
   * Seed standard sample flow templates
   */
  static seedSampleTemplates = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user || (req as any).session?.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const { channelId } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const seeded = await WhatsappFlowsService.seedSampleFlows(tenantId, channelId || null);

    res.json({
      status: "success",
      message: `Seeded ${seeded.length} sample WhatsApp Flow templates`,
      data: seeded,
    });
  });

  /**
   * Send an interactive Flow to a phone number / contact
   */
  static sendFlow = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const { flowId, recipientPhone, channelId } = req.body;

    if (!flowId || !recipientPhone) {
      return res.status(400).json({ error: "flowId and recipientPhone are required" });
    }

    const [flow] = await dbRead
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, flowId))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (user?.role !== "superadmin" && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized access to this WhatsApp Flow" });
    }

    const targetChannelId = channelId || flow.channelId;
    if (!targetChannelId) {
      return res.status(400).json({ error: "No channel ID specified for sending the Flow." });
    }

    const sendRes = await WhatsappFlowsService.sendFlowMessage(targetChannelId, recipientPhone, flow);

    res.json({
      status: "success",
      message: "WhatsApp Flow sent successfully",
      data: sendRes,
    });
  });

  /**
   * Get paginated submissions & responses for a Flow
   */
  static getFlowResponses = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const { flowId } = req.params;

    const [flow] = await dbRead
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, flowId))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (user?.role !== "superadmin" && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized access to this WhatsApp Flow" });
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    const conditions = [eq(whatsappFlowResponses.flowId, flowId)];

    if (search && typeof search === "string" && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      conditions.push(or(
        ilike(whatsappFlowResponses.contactPhone, s),
        ilike(whatsappFlowResponses.contactName, s)
      ));
    }

    const whereClause = and(...conditions);

    const [totalResult, data] = await Promise.all([
      dbRead
        .select({ count: sql<number>`count(*)` })
        .from(whatsappFlowResponses)
        .where(whereClause),
      dbRead
        .select()
        .from(whatsappFlowResponses)
        .where(whereClause)
        .orderBy(desc(whatsappFlowResponses.submittedAt))
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

  /**
   * Export all responses for a Flow to Excel
   */
  static exportFlowResponses = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const tenantId = user?.role === "team" ? user.createdBy : user?.id;
    const { flowId } = req.params;
    const [flow] = await dbRead
      .select()
      .from(whatsappFlows)
      .where(eq(whatsappFlows.id, flowId))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: "WhatsApp Flow not found" });
    }

    if (user?.role !== "superadmin" && flow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Unauthorized access to this WhatsApp Flow" });
    }

    const responsesList = await dbRead
      .select()
      .from(whatsappFlowResponses)
      .where(eq(whatsappFlowResponses.flowId, flowId))
      .orderBy(desc(whatsappFlowResponses.submittedAt));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Flow Submissions");

    // Collect all dynamic response keys
    const allKeys = new Set<string>();
    for (const r of responsesList) {
      if (r.responsePayload && typeof r.responsePayload === "object") {
        for (const k of Object.keys(r.responsePayload)) {
          allKeys.add(k);
        }
      }
    }
    const dynamicKeys = Array.from(allKeys);

    // Build headers
    const columns = [
      { header: "Submission Date", key: "submittedAt", width: 22 },
      { header: "Phone Number", key: "phone", width: 18 },
      { header: "Contact Name", key: "name", width: 20 },
      { header: "Screen ID", key: "screenId", width: 16 },
      ...dynamicKeys.map(k => ({
        header: k.replace(/_/g, " ").toUpperCase(),
        key: k,
        width: 24,
      })),
    ];
    worksheet.columns = columns;

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7C3AED" }, // Purple brand color
    };

    for (const r of responsesList) {
      const rowData: Record<string, any> = {
        submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "N/A",
        phone: r.contactPhone,
        name: r.contactName || "Unknown",
        screenId: r.screenId || "N/A",
      };

      if (r.responsePayload) {
        for (const k of dynamicKeys) {
          const val = r.responsePayload[k];
          rowData[k] = Array.isArray(val) ? val.join(", ") : (val !== undefined && val !== null ? String(val) : "");
        }
      }
      worksheet.addRow(rowData);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${flow.name.replace(/[^a-zA-Z0-9]/g, "_")}_submissions.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  });
}
