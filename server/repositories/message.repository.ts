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

import { db } from "../db";
import { eq, and, lt, or, desc, asc, SQL } from "drizzle-orm";
import { 
  messages, 
  conversations,
  contacts,
  type Message, 
  type InsertMessage 
} from "@shared/schema";

export class MessageRepository {
  async getByConversation(
    conversationId: string,
    limit = 100,
    beforeTs?: string,
    beforeId?: string
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const conditions: SQL[] = [eq(messages.conversationId, conversationId)];
    if (beforeTs) {
      const ts = new Date(beforeTs);
      if (beforeId) {
        conditions.push(
          or(
            lt(messages.createdAt, ts),
            and(eq(messages.createdAt, ts), lt(messages.id, beforeId))!
          )!
        );
      } else {
        conditions.push(lt(messages.createdAt, ts));
      }
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return { messages: slice.reverse(), hasMore };
  }

  async create(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage as any)
      .returning();

    // Auto-increment CRM deal contacted count for successful outbound automated messages
    if (
      message.direction === "outbound" && 
      message.fromType !== "agent" && 
      (message.status === "sent" || message.status === "delivered" || message.status === "read")
    ) {
      try {
        const [conversation] = await db
          .select({ channelId: conversations.channelId, contactPhone: conversations.contactPhone })
          .from(conversations)
          .where(eq(conversations.id, message.conversationId))
          .limit(1);

        if (conversation) {
          const [contact] = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(eq(contacts.phone, conversation.contactPhone), eq(contacts.channelId, conversation.channelId)))
            .limit(1);

          if (contact) {
            const { incrementCrmDealContactCount } = await import("../services/crm.service");
            await incrementCrmDealContactCount(contact.id, conversation.channelId);
          }
        }
      } catch (crmErr) {
        console.error("Failed to auto-increment contacted count in MessageRepository.create:", crmErr);
      }
    }

    return message;
  }

  async update(id: string, message: Partial<Message>): Promise<Message | undefined> {
    const [updated] = await db
      .update(messages)
      .set(message)
      .where(eq(messages.id, id))
      .returning();
    return updated || undefined;
  }

  async getByWhatsAppId(whatsappMessageId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.whatsappMessageId, whatsappMessageId));
    return message || undefined;
  }
  
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }


  async getById(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message || undefined;
  }
}