import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { db } from "../db";
import { aiProfiles, insertAiProfileSchema } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";

export const registerAiProfileRoutes = (app: any) => {
  const router = Router();

  // Get active profile for a specific channel (with fallback auto-creation)
  router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).user.id;
      const channelId = req.query.channelId as string;

      if (!channelId) {
        return res.status(400).json({ error: "channelId query parameter is required" });
      }

      // Check if there is an enabled (active) profile first
      let [profile] = await db
        .select()
        .from(aiProfiles)
        .where(and(eq(aiProfiles.channelId, channelId), eq(aiProfiles.enabled, true)))
        .limit(1);

      // If no active profile, fetch the first profile
      if (!profile) {
        [profile] = await db
          .select()
          .from(aiProfiles)
          .where(eq(aiProfiles.channelId, channelId))
          .limit(1);
      }

      if (!profile) {
        // Auto-create default profile for this channel
        [profile] = await db
          .insert(aiProfiles)
          .values({
            userId,
            channelId,
            name: "Default Assistant Profile",
            enabled: true, // First profile is enabled by default
            llmProvider: "openai",
            model: "gpt-4o",
            temperature: 0.7,
            voiceEnabled: false,
            kbEnabled: false,
            triggerFlowEnabled: false,
            analyzeInboxHistory: false,
            ignorePersonalConversations: true,
            personalKeywords: ["family", "personal", "private", "brother", "sister", "mom", "dad", "wife", "husband"],
          })
          .returning();
      }

      res.json(profile);
    } catch (err: any) {
      console.error("[AI Profile API] Failed to fetch profile:", err);
      res.status(500).json({ error: err.message || "Failed to fetch AI Profile" });
    }
  });

  // Get list of all profiles for a specific channel
  router.get("/list", requireAuth, async (req: Request, res: Response) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId query parameter is required" });
      }

      const list = await db
        .select()
        .from(aiProfiles)
        .where(eq(aiProfiles.channelId, channelId));

      res.json(list);
    } catch (err: any) {
      console.error("[AI Profile API] Failed to fetch profile list:", err);
      res.status(500).json({ error: err.message || "Failed to fetch profile list" });
    }
  });

  // Create a new profile
  router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).user.id;
      const validated = insertAiProfileSchema.parse(req.body);
      const channelId = validated.channelId;

      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      // Check if this is the first profile for this channel
      const existing = await db
        .select()
        .from(aiProfiles)
        .where(eq(aiProfiles.channelId, channelId))
        .limit(1);

      const shouldEnable = existing.length === 0;

      const [newProfile] = await db
        .insert(aiProfiles)
        .values({
          ...validated,
          userId,
          enabled: shouldEnable ? true : false,
        })
        .returning();

      res.status(201).json(newProfile);
    } catch (err: any) {
      console.error("[AI Profile API] Failed to create profile:", err);
      res.status(500).json({ error: err.message || "Failed to create AI Profile" });
    }
  });

  // Update specific profile by ID
  router.put("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validated = insertAiProfileSchema.parse(req.body);

      const [updated] = await db
        .update(aiProfiles)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(aiProfiles.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(updated);
    } catch (err: any) {
      console.error("[AI Profile API] Failed to update profile:", err);
      res.status(500).json({ error: err.message || "Failed to update AI Profile" });
    }
  });

  // Activate specific profile (and disable all others for the same channel)
  router.post("/:id/activate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [profile] = await db
        .select()
        .from(aiProfiles)
        .where(eq(aiProfiles.id, id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const channelId = profile.channelId;
      if (channelId) {
        // Disable all other profiles for this channel
        await db
          .update(aiProfiles)
          .set({ enabled: false })
          .where(and(eq(aiProfiles.channelId, channelId), ne(aiProfiles.id, id)));
      }

      // Enable target profile
      const [activated] = await db
        .update(aiProfiles)
        .set({ enabled: true, updatedAt: new Date() })
        .where(eq(aiProfiles.id, id))
        .returning();

      res.json(activated);
    } catch (err: any) {
      console.error("[AI Profile API] Failed to activate profile:", err);
      res.status(500).json({ error: err.message || "Failed to activate AI Profile" });
    }
  });

  // Delete specific profile
  router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Find the profile first
      const [profile] = await db
        .select()
        .from(aiProfiles)
        .where(eq(aiProfiles.id, id))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Delete it
      await db.delete(aiProfiles).where(eq(aiProfiles.id, id));

      // If the deleted profile was the active one, enable another profile for the channel if available
      if (profile.enabled && profile.channelId) {
        const [another] = await db
          .select()
          .from(aiProfiles)
          .where(eq(aiProfiles.channelId, profile.channelId))
          .limit(1);

        if (another) {
          await db
            .update(aiProfiles)
            .set({ enabled: true })
            .where(eq(aiProfiles.id, another.id));
        }
      }

      res.json({ success: true, message: "AI Profile deleted successfully" });
    } catch (err: any) {
      console.error("[AI Profile API] Failed to delete profile:", err);
      res.status(500).json({ error: err.message || "Failed to delete AI Profile" });
    }
  });

  app.use("/api/ai-profile", router);
};
