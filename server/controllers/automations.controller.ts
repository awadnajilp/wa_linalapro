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
import { storage } from '../storage';
import { insertAutomationSchema } from '@shared/schema';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import type { RequestWithChannel } from '../middlewares/channel.middleware';
import { db } from "../db";
import { automationExecutions, automations, contacts } from "@shared/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";

export const getAutomations = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const channelId = req.query.channelId as string | undefined;
  const automations = channelId 
    ? await storage.getAutomationsByChannel(channelId)
    : await storage.getAutomations();
  res.json(automations);
});

export const getAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const automation = await storage.getAutomation(id);
  if (!automation) {
    throw new AppError(404, 'Automation not found');
  }
  res.json(automation);
});

export const createAutomation = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  console.log('Request body:', req.body); // Debug log  
  const validatedAutomation = insertAutomationSchema.parse(req.body);
  
  // Get active channel if channelId not provided
  let channelId = validatedAutomation.channelId;
  if (!channelId) {
    const activeChannel = await storage.getActiveChannel();
    if (activeChannel) {
      channelId = activeChannel.id;
    }
  }
  
  const automation = await storage.createAutomation({
    ...validatedAutomation,
    channelId
  });
  
  res.json(automation);
});

export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const automation = await storage.updateAutomation(id, req.body);
  if (!automation) {
    throw new AppError(404, 'Automation not found');
  }
  res.json(automation);
});

export const deleteAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = await storage.deleteAutomation(id);
  if (!success) {
    throw new AppError(404, 'Automation not found');
  }
  res.status(204).send();
});

export const toggleAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const automation = await storage.getAutomation(id);
  
  if (!automation) {
    throw new AppError(404, 'Automation not found');
  }
  
  const updated = await storage.updateAutomation(id, {
    status: !automation.status ? 'active' : 'inactive'
  });
  
  if (updated.status === 'inactive') {
    await db.update(automationExecutions)
      .set({ 
        status: 'failed', 
        result: 'Automation flow disabled by user' 
      })
      .where(
        and(
          eq(automationExecutions.automationId, id),
          or(
            eq(automationExecutions.status, 'paused'),
            eq(automationExecutions.status, 'running')
          )
        )
      );
  }
  
  res.json(updated);
});

export const getFlowData = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const channelId = req.channelId || req.query.channelId as string;
  if (!channelId) {
    return res.status(400).json({ error: "channelId is required" });
  }

  const search = req.query.search as string | undefined;
  const searchType = req.query.searchType as string | undefined;
  const automationId = req.query.automationId as string | undefined;

  let query = db
    .select({
      executionId: automationExecutions.id,
      startedAt: automationExecutions.startedAt,
      completedAt: automationExecutions.completedAt,
      status: automationExecutions.status,
      variables: automationExecutions.variables,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      flowName: automations.name,
    })
    .from(automationExecutions)
    .innerJoin(automations, eq(automationExecutions.automationId, automations.id))
    .leftJoin(contacts, eq(automationExecutions.contactId, contacts.id))
    .where(
      and(
        eq(automations.channelId, channelId),
        automationId && automationId !== "all"
          ? eq(automationExecutions.automationId, automationId)
          : undefined,
        search 
          ? (
              searchType === "name"
                ? ilike(contacts.name, `%${search}%`)
                : searchType === "phone"
                ? ilike(contacts.phone, `%${search}%`)
                : or(
                    ilike(contacts.name, `%${search}%`),
                    ilike(contacts.phone, `%${search}%`)
                  )
            )
          : undefined
      )
    )
    .orderBy(desc(automationExecutions.startedAt));

  const results = await query;
  res.json(results);
});

export const getExecutionsSummary = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const channelId = req.channelId || req.query.channelId as string;
  if (!channelId) {
    return res.status(400).json({ error: "channelId is required" });
  }

  const query = db
    .select({
      contactId: contacts.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      totalRuns: sql<number>`count(${automationExecutions.id})::int`,
      lastRunAt: sql<string>`max(${automationExecutions.startedAt})`,
    })
    .from(automationExecutions)
    .innerJoin(automations, eq(automationExecutions.automationId, automations.id))
    .innerJoin(contacts, eq(automationExecutions.contactId, contacts.id))
    .where(eq(automations.channelId, channelId))
    .groupBy(contacts.id, contacts.name, contacts.phone)
    .orderBy(desc(sql`max(${automationExecutions.startedAt})`));

  const results = await query;
  res.json(results);
});

export const getContactExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;

  const query = db
    .select({
      executionId: automationExecutions.id,
      startedAt: automationExecutions.startedAt,
      completedAt: automationExecutions.completedAt,
      status: automationExecutions.status,
      result: automationExecutions.result,
      error: automationExecutions.error,
      flowName: automations.name,
    })
    .from(automationExecutions)
    .innerJoin(automations, eq(automationExecutions.automationId, automations.id))
    .where(eq(automationExecutions.contactId, contactId))
    .orderBy(desc(automationExecutions.startedAt));

  const results = await query;
  res.json(results);
});

export const clearContactExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;

  const result = await db
    .delete(automationExecutions)
    .where(eq(automationExecutions.contactId, contactId))
    .returning();

  res.json({ success: true, clearedCount: result.length });
});

export const getActiveConversationExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  let contactId = null;
  if (conversationId) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId)
    });
    if (conv) {
      contactId = conv.contactId;
    }
  }

  const query = db
    .select({
      executionId: automationExecutions.id,
      startedAt: automationExecutions.startedAt,
      status: automationExecutions.status,
      flowName: automations.name,
      flowId: automations.id,
      currentNodeId: automationExecutions.currentNodeId,
    })
    .from(automationExecutions)
    .innerJoin(automations, eq(automationExecutions.automationId, automations.id))
    .where(
      and(
        contactId 
          ? or(
              eq(automationExecutions.conversationId, conversationId),
              eq(automationExecutions.contactId, contactId)
            )
          : eq(automationExecutions.conversationId, conversationId),
        or(
          eq(automationExecutions.status, 'running'),
          eq(automationExecutions.status, 'paused'),
          eq(automationExecutions.status, 'suspended')
        )
      )
    )
    .orderBy(desc(automationExecutions.startedAt));

  const results = await query;
  res.json(results);
});

export const pauseConversationExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  let contactId = null;
  if (conversationId) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId)
    });
    if (conv) {
      contactId = conv.contactId;
    }
  }

  // Suspend from memory
  const { executionService } = await import("../services/automation-execution-service");
  await executionService.suspendExecution(conversationId);

  // Set active executions to suspended
  const result = await db
    .update(automationExecutions)
    .set({
      status: 'suspended',
      result: 'Suspended by user in Inbox'
    })
    .where(
      and(
        contactId 
          ? or(
              eq(automationExecutions.conversationId, conversationId),
              eq(automationExecutions.contactId, contactId)
            )
          : eq(automationExecutions.conversationId, conversationId),
        or(
          eq(automationExecutions.status, 'running'),
          eq(automationExecutions.status, 'paused')
        )
      )
    )
    .returning();

  res.json({ success: true, count: result.length });
});

export const resumeConversationExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  let contactId = null;
  if (conversationId) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId)
    });
    if (conv) {
      contactId = conv.contactId;
    }
  }

  // Set suspended executions back to paused/running
  const result = await db
    .update(automationExecutions)
    .set({
      status: 'paused',
      result: 'Resumed by user in Inbox'
    })
    .where(
      and(
        contactId 
          ? or(
              eq(automationExecutions.conversationId, conversationId),
              eq(automationExecutions.contactId, contactId)
            )
          : eq(automationExecutions.conversationId, conversationId),
        eq(automationExecutions.status, 'suspended')
      )
    )
    .returning();

  res.json({ success: true, count: result.length });
});

export const resetConversationExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  let contactId = null;
  if (conversationId) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId)
    });
    if (conv) {
      contactId = conv.contactId;
    }
  }

  // Cancel from memory
  const { executionService } = await import("../services/automation-execution-service");
  await executionService.cancelExecution(conversationId);

  // Fail/Cancel all in DB
  const result = await db
    .update(automationExecutions)
    .set({
      status: 'failed',
      completedAt: new Date(),
      result: 'Cancelled by user in Inbox'
    })
    .where(
      and(
        contactId 
          ? or(
              eq(automationExecutions.conversationId, conversationId),
              eq(automationExecutions.contactId, contactId)
            )
          : eq(automationExecutions.conversationId, conversationId),
        or(
          eq(automationExecutions.status, 'running'),
          eq(automationExecutions.status, 'paused'),
          eq(automationExecutions.status, 'suspended')
        )
      )
    )
    .returning();

  res.json({ success: true, count: result.length });
});