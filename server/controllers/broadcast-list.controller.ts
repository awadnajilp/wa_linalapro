import { broadcastLists, contacts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "server/db";

export const createBroadcastList = async (req: Request, res: Response) => {
  try {
    const user = (req as any).session?.user;
    const { name, description, channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    const [broadcastList] = await db
      .insert(broadcastLists)
      .values({ name, description, createdBy: user?.id, channelId })
      .returning();

    res.json({ success: true, broadcastList });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const getBroadcastLists = async (req: Request, res: Response) => {
  try {
    const user = (req as any).session?.user;
    const { channelId } = req.query;

    if (!channelId) {
      if (user?.role === "superadmin") {
        const allData = await db.select().from(broadcastLists);
        return res.json({ success: true, broadcastLists: allData });
      }
      return res.status(400).json({ success: false, error: "channelId is required" });
    }

    const channelLists = await db
      .select()
      .from(broadcastLists)
      .where(eq(broadcastLists.channelId, String(channelId)));

    const listsWithCounts = await Promise.all(
      channelLists.map(async (list) => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(
            and(
              eq(contacts.channelId, String(channelId)),
              sql`${contacts.broadcastLists}::jsonb @> ${JSON.stringify([list.name])}::jsonb`
            )
          );
        return {
          ...list,
          contact_count: Number(result[0]?.count || 0),
        };
      })
    );

    return res.json({ success: true, broadcastLists: listsWithCounts });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getBroadcastListById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [broadcastList] = await db
      .select()
      .from(broadcastLists)
      .where(eq(broadcastLists.id, id));

    if (!broadcastList) return res.status(404).json({ error: "Broadcast list not found" });

    res.json({ success: true, broadcastList });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const updateBroadcastList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const [updated] = await db
      .update(broadcastLists)
      .set({ name, description })
      .where(eq(broadcastLists.id, id))
      .returning();

    res.json({ success: true, updated });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const deleteBroadcastList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(broadcastLists)
      .where(eq(broadcastLists.id, id))
      .returning();

    if (deleted) {
      const allContacts = await db
        .select()
        .from(contacts)
        .where(sql`${contacts.broadcastLists}::jsonb @> ${JSON.stringify([deleted.name])}::jsonb`);

      for (const contact of allContacts) {
        const updatedLists = (contact.broadcastLists || []).filter((g: string) => g !== deleted.name);
        await db
          .update(contacts)
          .set({ broadcastLists: updatedLists })
          .where(eq(contacts.id, contact.id));
      }
    }

    res.json({ success: true, deleted });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const deleteBroadcastListContacts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [listRecord] = await db
      .select()
      .from(broadcastLists)
      .where(eq(broadcastLists.id, id))
      .limit(1);

    if (!listRecord) {
      return res.status(404).json({ error: "Broadcast list not found" });
    }

    const allContacts = await db
      .select()
      .from(contacts)
      .where(sql`${contacts.broadcastLists}::jsonb @> ${JSON.stringify([listRecord.name])}::jsonb`);

    let deletedCount = 0;
    for (const contact of allContacts) {
      await db.delete(contacts).where(eq(contacts.id, contact.id));
      deletedCount++;
    }

    res.json({ success: true, message: `Successfully deleted ${deletedCount} contacts in broadcast list "${listRecord.name}".`, deletedCount });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const addContactsToBroadcastList = async (req: Request, res: Response) => {
  try {
    const { contactIds, listName, channelId } = req.body;

    if (!contactIds?.length || !listName || !channelId) {
      return res.status(400).json({ error: "contactIds, listName, and channelId are required" });
    }

    const [list] = await db
      .select()
      .from(broadcastLists)
      .where(and(eq(broadcastLists.name, listName), eq(broadcastLists.channelId, channelId)));

    if (!list) {
      return res.status(404).json({ error: "Broadcast list not found in this channel" });
    }

    let updatedCount = 0;
    for (const contactId of contactIds) {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.channelId, channelId)));

      if (contact) {
        const currentLists = contact.broadcastLists || [];
        if (!currentLists.includes(listName)) {
          await db
            .update(contacts)
            .set({ broadcastLists: [...currentLists, listName] })
            .where(eq(contacts.id, contactId));
          updatedCount++;
        }
      }
    }

    res.json({ success: true, updatedCount });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const removeContactsFromBroadcastList = async (req: Request, res: Response) => {
  try {
    const { contactIds, listName, channelId } = req.body;

    if (!contactIds?.length || !listName || !channelId) {
      return res.status(400).json({ error: "contactIds, listName, and channelId are required" });
    }

    let updatedCount = 0;
    for (const contactId of contactIds) {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.channelId, channelId)));

      if (contact) {
        const currentLists = contact.broadcastLists || [];
        if (currentLists.includes(listName)) {
          await db
            .update(contacts)
            .set({ broadcastLists: currentLists.filter((g: string) => g !== listName) })
            .where(eq(contacts.id, contactId));
          updatedCount++;
        }
      }
    }

    res.json({ success: true, updatedCount });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : "Something went wrong";
    res.status(500).json({ error: errorMsg });
  }
};

export const getBroadcastListContactCount = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ success: false, error: "channelId is required" });
    }

    const channelLists = await db
      .select()
      .from(broadcastLists)
      .where(eq(broadcastLists.channelId, String(channelId)));

    const counts: Record<string, number> = {};
    for (const list of channelLists) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(
          and(
            eq(contacts.channelId, String(channelId)),
            sql`${contacts.broadcastLists}::jsonb @> ${JSON.stringify([list.name])}::jsonb`
          )
        );
      counts[list.name] = Number(result[0]?.count || 0);
    }

    res.json({ success: true, counts });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};
