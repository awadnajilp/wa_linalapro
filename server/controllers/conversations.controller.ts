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
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import type { RequestWithChannel } from '../middlewares/channel.middleware';
import { conversations, messages, users , contacts , conversationAssignments , insertConversationAssignmentSchema, insertConversationSchema } from "@shared/schema";
import { eq, desc, and, or, gt, ilike, sql } from "drizzle-orm";
import { db, dbRead } from "../db";
import { triggerService } from "../services/automation-execution-service";


// export const getConversations = asyncHandler(async (req: RequestWithChannel, res: Response) => {
//   const channelId = req.query.channelId as string | undefined;
//   const conversations = channelId 
//     ? await storage.getConversationsByChannelNew(channelId)
//     : await storage.getConversationsNew();
//   res.json(conversations);
// });

export async function getConversations(req: Request, res: Response) {
  try {
    const channelId = (req as RequestWithChannel).channelId || String(req.query.channelId || "");
    if (!channelId) {
      return res.json([]);
    }
    const user = (req.session as any)?.user;
    
    if (user && user.role !== 'superadmin') {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(channelId)) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    }

    const conditions = [eq(conversations.channelId, channelId)];
    if (user && user.role === 'team' && user.showOnlyAssigned) {
      conditions.push(eq(conversations.assignedTo, user.id));
    }

    // 1. Tag Filter
    if (req.query.tag && typeof req.query.tag === "string") {
      const tagList = req.query.tag.split(',').map(t => t.trim());
      if (tagList.length > 0) {
        const jsonArray = JSON.stringify(tagList);
        conditions.push(
          sql`${conversations.tags} @> ${sql.raw(`'${jsonArray}'::jsonb`)}`
        );
      }
    }

    // 2. Status/Filter Tab
    const filterTab = req.query.filterTab as string | undefined;
    if (filterTab) {
      if (filterTab === "unread") {
        conditions.push(gt(conversations.unreadCount, 0));
      } else if (filterTab === "open") {
        conditions.push(eq(conversations.status, "open"));
      } else if (filterTab === "resolved") {
        conditions.push(eq(conversations.status, "resolved"));
      } else if (filterTab === "whatsapp") {
        conditions.push(eq(conversations.type, "whatsapp"));
      } else if (filterTab === "chatbot") {
        conditions.push(eq(conversations.type, "chatbot"));
      } else if (filterTab === "assigned") {
        conditions.push(eq(conversations.status, "assigned"));
        if (user && user.role === 'team') {
          conditions.push(eq(conversations.assignedTo, user.id));
        }
      }
    }

    // 3. Search Filter
    const search = req.query.search as string | undefined;
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(contacts.name, searchPattern),
          ilike(conversations.contactPhone, searchPattern),
          ilike(conversations.contactName, searchPattern)
        )
      );
    }

    // 4. Pagination
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const rows = await dbRead
      .select({
        conversation: conversations,
        contact: contacts,
        assignedToName: sql`${users.firstName} || ' ' || ${users.lastName}`.as("assignedBy"),
        lastMessageDirection: sql<string | null>`(
          SELECT direction FROM messages 
          WHERE messages.conversation_id = ${conversations.id} 
          ORDER BY messages.created_at DESC 
          LIMIT 1
        )`,
        lastMessageStatus: sql<string | null>`(
          SELECT status FROM messages 
          WHERE messages.conversation_id = ${conversations.id} 
          ORDER BY messages.created_at DESC 
          LIMIT 1
        )`,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(users, eq(conversations.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;

    const formatted = slice.map((row) => ({
      ...row.conversation,
      lastMessageAt: row.conversation.lastMessageAt || null,
      lastMessageText: row.conversation.lastMessageText || null,
      assignedToName: row.assignedToName || null,
      contact: row.contact || null,
      lastMessageDirection: row.lastMessageDirection || null,
      lastMessageStatus: row.lastMessageStatus || null,
    }));

    res.setHeader("X-Has-More", hasMore ? "true" : "false");
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Unexpected error" });
  }
}


export async function fetchConversationList(channelId: string) {
  const rows = await dbRead
    .select({
      conversation: conversations,
      contact: contacts,
      assignedToName: sql`${users.firstName} || ' ' || ${users.lastName}`.as(
        "assignedBy"
      ),
      lastMessageDirection: sql<string | null>`(
        SELECT direction FROM messages 
        WHERE messages.conversation_id = ${conversations.id} 
        ORDER BY messages.created_at DESC 
        LIMIT 1
      )`,
      lastMessageStatus: sql<string | null>`(
        SELECT status FROM messages 
        WHERE messages.conversation_id = ${conversations.id} 
        ORDER BY messages.created_at DESC 
        LIMIT 1
      )`,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(users, eq(conversations.assignedTo, users.id))
    .where(eq(conversations.channelId, channelId))
    .orderBy(desc(conversations.lastMessageAt));

  return rows.map((row) => ({
    ...row.conversation,
    lastMessageAt: row.conversation.lastMessageAt || null,
    lastMessageText: row.conversation.lastMessageText || null,
    assignedToName: row.assignedToName || null,
    contact: row.contact || null,
    lastMessageDirection: row.lastMessageDirection || null,
    lastMessageStatus: row.lastMessageStatus || null,
  }));
}


export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversation = await storage.getConversation(id);
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  res.json(conversation);
});

export const createConversation = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const validatedConversation = insertConversationSchema.parse(req.body);
  
  // Get active channel if channelId not provided
  let channelId = validatedConversation.channelId;
  if (!channelId) {
    const activeChannel = await storage.getActiveChannel();
    if (activeChannel) {
      channelId = activeChannel.id;
    }
  }
  
  const conversation = await storage.createConversation({
    ...validatedConversation,
    channelId
  });

  try {
    if (!validatedConversation.channelId) {
      throw new Error("channelId is missing");
    }
    if (!validatedConversation.contactId) {
      throw new Error("contactId is missing");
    }
    await triggerService.handleNewConversation(
      conversation.id, 
      validatedConversation.channelId, 
      validatedConversation.contactId
    );
    console.log(`Triggered automations for new conversation: ${conversation.id}`);
  } catch (error) {
    console.error(`Failed to trigger automations:`, error);
    // Don't fail the conversation creation if automation fails
  }
  
  res.json(conversation);
});

export const updateConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // console.log("Update conversation body:", req.body);

  const conversation = await storage.updateConversation(id, {assignedTo: req.body.assignedTo, status: req.body.status});

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  // Validate and transform body to match insert schema
  const validatedConversation = insertConversationAssignmentSchema.parse({
    conversationId: id,
    userId: req.body.assignedTo,
    assignedBy: req.user?.id,
    assignedAt: new Date(req.body.assignedAt),
    status: req.body.status,
  });

  // console.log("Validated conversation assignment:", validatedConversation);
if(req.body.status ==="assigned"){
  const insertConversation = await db
    .insert(conversationAssignments)
    .values(validatedConversation)
    .returning();
}

  res.json(
     {   ...conversation,assignedToName:req.body.assignedToName}
   );
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = await storage.deleteConversation(id);
  if (!success) {
    throw new AppError(404, 'Conversation not found');
  }
  res.status(204).send();
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversation = await storage.updateConversation(id, {
    unreadCount: 0
  });
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  // Trigger WhatsApp read receipt asynchronously
  if (conversation.channelId && conversation.contactPhone) {
    (async () => {
      try {
        const [latestInbound] = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, id),
              eq(messages.direction, "inbound"),
              sql`${messages.whatsappMessageId} IS NOT NULL`
            )
          )
          .orderBy(desc(messages.timestamp))
          .limit(1);

        if (latestInbound && latestInbound.whatsappMessageId) {
          const channel = await storage.getChannel(conversation.channelId);
          if (channel) {
            if (channel.connectionMethod === "qr_code") {
              const { BaileysManager } = await import("../services/baileys-manager");
              await BaileysManager.markMessageAsRead(channel.id, conversation.contactPhone, latestInbound.whatsappMessageId);
            } else {
              const { WhatsAppApiService } = await import("../services/whatsapp-api");
              const whatsappApi = new WhatsAppApiService(channel);
              await whatsappApi.markMessageAsRead(latestInbound.whatsappMessageId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to send WhatsApp read receipt:", err);
      }
    })();
  }

  res.json(conversation);
});

export const quickStartConversation = asyncHandler(async (req: Request, res: Response) => {
  const { phone, name, channelId } = req.body;

  if (!phone) {
    throw new AppError(400, "Phone number is required");
  }
  if (!channelId) {
    throw new AppError(400, "Channel ID is required");
  }

  // 1. Normalise phone number
  const cleanPhone = phone.replace(/\D/g, "");

  // 2. Find or create contact
  let contact = await storage.getContactByPhoneAndChannel(cleanPhone, channelId);
  if (!contact) {
    contact = await storage.createContact({
      name: name || cleanPhone,
      phone: cleanPhone,
      channelId,
      status: "active",
      source: "manual",
    });
  }

  // 3. Find or create conversation
  let conversation = await storage.getConversationByPhoneAndChannel(cleanPhone, channelId);
  if (!conversation) {
    conversation = await storage.createConversation({
      contactId: contact.id,
      contactPhone: cleanPhone,
      contactName: contact.name || cleanPhone,
      channelId,
      unreadCount: 0,
      status: "open",
    });
  }

  const conversationWithContact = {
    ...conversation,
    contact,
  };

  res.json(conversationWithContact);
});