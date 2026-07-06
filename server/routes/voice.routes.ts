import { Express, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { db } from "../db";
import { voiceProfiles, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { VoiceManager } from "../services/voice";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export function registerVoiceRoutes(app: Express) {
  // Get all voice profiles
  app.get("/api/voice-profiles", requireAuth, async (req: Request, res: Response) => {
    try {
      const profiles = await db.select().from(voiceProfiles);
      res.json(profiles);
    } catch (err: any) {
      console.error("[Voice API] Failed to fetch voice profiles:", err);
      res.status(500).json({ error: "Failed to fetch voice profiles" });
    }
  });

  // Create a new voice profile manually (e.g. standard speaker voice)
  app.post("/api/voice-profiles", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, provider, voiceId, languageCode } = req.body;
      if (!name || !provider || !voiceId) {
        return res.status(400).json({ error: "Name, provider, and voiceId are required" });
      }

      const [newProfile] = await db
        .insert(voiceProfiles)
        .values({
          name,
          provider,
          voiceId,
          languageCode: languageCode || "en-IN",
          status: "active",
        })
        .returning();

      res.json(newProfile);
    } catch (err: any) {
      console.error("[Voice API] Failed to create voice profile:", err);
      res.status(500).json({ error: "Failed to create voice profile" });
    }
  });

  // Delete a voice profile
  app.delete("/api/voice-profiles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await db
        .delete(voiceProfiles)
        .where(eq(voiceProfiles.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Voice profile not found" });
      }

      res.json({ message: "Voice profile deleted successfully" });
    } catch (err: any) {
      console.error("[Voice API] Failed to delete voice profile:", err);
      res.status(500).json({ error: "Failed to delete voice profile" });
    }
  });

  // Update user's voice API keys
  app.put("/api/users-voice-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sarvamApiKey, groqApiKey, elevenlabsApiKey } = req.body;
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updateData: any = {};
      if (sarvamApiKey !== undefined) updateData.sarvamApiKey = sarvamApiKey;
      if (groqApiKey !== undefined) updateData.groqApiKey = groqApiKey;
      if (elevenlabsApiKey !== undefined) updateData.elevenlabsApiKey = elevenlabsApiKey;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      res.json({
        message: "Voice settings updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          sarvamApiKey: updatedUser.sarvamApiKey ? "Present (masked)" : "None",
          groqApiKey: updatedUser.groqApiKey ? "Present (masked)" : "None",
          elevenlabsApiKey: updatedUser.elevenlabsApiKey ? "Present (masked)" : "None",
        },
      });
    } catch (err: any) {
      console.error("[Voice API] Failed to update voice settings:", err);
      res.status(500).json({ error: "Failed to update voice settings" });
    }
  });

  // Clone a new voice using Sarvam.ai or ElevenLabs
  app.post(
    "/api/voice-profiles/clone",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const { name, provider = "sarvam" } = req.body;
        const file = req.file;
        const userId = (req.user as any)?.id;

        if (!name || !file) {
          return res.status(400).json({ error: "Name and audio file are required" });
        }

        // Fetch user key
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, userId || ""),
        });
        
        let apiKey = provider === "elevenlabs" ? userRecord?.elevenlabsApiKey : userRecord?.sarvamApiKey;
        if (!apiKey) {
          // Fallback to default user
          const [defaultUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, "awadnajilp@gmail.com"))
            .limit(1);
          apiKey = provider === "elevenlabs" ? defaultUser?.elevenlabsApiKey : defaultUser?.sarvamApiKey;
        }

        if (!apiKey) {
          return res.status(400).json({
            error: `${provider === "elevenlabs" ? "ElevenLabs" : "Sarvam.ai"} API key is missing. Please save your API key in settings first.`,
          });
        }

        console.log(`[Voice Clone API] Initiating cloning for voice "${name}" on ${provider === "elevenlabs" ? "ElevenLabs" : "Sarvam.ai"}...`);
        const voiceProvider = VoiceManager.getProvider(provider);
        const voiceId = await voiceProvider.cloneVoice(name, file.buffer, { apiKey });

        console.log(`[Voice Clone API] Successfully cloned voice: ID=${voiceId}. Saving profile...`);
        const [newProfile] = await db
          .insert(voiceProfiles)
          .values({
            name,
            provider,
            voiceId,
            languageCode: provider === "elevenlabs" ? "en-US" : "en-IN", // Default
            status: "active",
          })
          .returning();

        res.status(201).json(newProfile);
      } catch (err: any) {
        console.error("[Voice Clone API] Voice cloning failed:", err);
        res.status(500).json({ error: err.message || "Failed to clone voice" });
      }
    }
  );
}
