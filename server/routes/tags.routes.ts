import { Router } from "express";
import type { Express } from "express";
import { db } from "../db";
import { tags, conversations, contacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerTagsRoutes(app: Express) {
  const router = Router();

  // Create Tag
  router.post("/", requireAuth, async (req, res) => {
    try {
      const { name, color, channelId } = req.body;
      const user = (req.session as any)?.user;

      if (!name || !color || !channelId) {
        return res.status(400).json({ error: "Missing required fields: name, color, channelId" });
      }

      // Check if tag already exists for this channel
      const existing = await db
        .select()
        .from(tags)
        .where(and(eq(tags.name, name), eq(tags.channelId, channelId)));

      if (existing.length > 0) {
        return res.status(400).json({ error: "Tag with this name already exists in this channel" });
      }

      const [newTag] = await db
        .insert(tags)
        .values({
          name,
          color,
          channelId,
          createdBy: user?.id || "",
        })
        .returning();

      res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  // Get Tags by channelId
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.query;
      if (!channelId || typeof channelId !== "string") {
        return res.status(400).json({ error: "channelId is required" });
      }

      const list = await db
        .select()
        .from(tags)
        .where(eq(tags.channelId, channelId));

      res.json(list);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Update Tag
  router.put("/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      if (!name || !color) {
        return res.status(400).json({ error: "name and color are required" });
      }

      const [updated] = await db
        .update(tags)
        .set({ name, color })
        .where(eq(tags.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Tag not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating tag:", error);
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  // Delete Tag
  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db
        .delete(tags)
        .where(eq(tags.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Tag not found" });
      }

      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // Assign/Update Tags for a Conversation & its Contact
  router.post("/conversations/:id/tags", requireAuth, async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { tags: tagNames } = req.body; // e.g. ["vip", "lead"]

      if (!Array.isArray(tagNames)) {
        return res.status(400).json({ error: "tags must be an array of strings" });
      }

      // Fetch conversation to get contactId
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Update tags on conversation
      await db
        .update(conversations)
        .set({ tags: tagNames })
        .where(eq(conversations.id, conversationId));

      // Update tags on contact
      if (conversation.contactId) {
        await db
          .update(contacts)
          .set({ tags: tagNames })
          .where(eq(contacts.id, conversation.contactId));
      }

      // Broadcast changes via socket
      const io = (global as any).io;
      if (io) {
        io.emit("conversation-updated", {
          id: conversationId,
          tags: tagNames,
        });
        io.emit("contact-updated", {
          id: conversation.contactId,
          tags: tagNames,
        });
      }

      res.json({ success: true, conversationId, tags: tagNames });
    } catch (error) {
      console.error("Error updating conversation tags:", error);
      res.status(500).json({ error: "Failed to update conversation tags" });
    }
  });

  app.use("/api/tags", router);
}
