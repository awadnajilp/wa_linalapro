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

import { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from "../db";
import { eq, ne, and, inArray } from "drizzle-orm";
import { aiSettings, trainingSources, sites } from "@shared/schema";
import { verifyChannelOwnership } from "../middlewares/tenant.middleware";
import { processTrainingSource } from "../services/training.service";

// ✅ Fetch all AI settings
export const getAISettings = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = (req as any).isSuperAdmin;
    const tenantChannelIds = (req as any).tenantChannelIds;

    let settings;
    if (isSuperAdmin) {
      settings = await db.select().from(aiSettings);
    } else if (tenantChannelIds && tenantChannelIds.length > 0) {
      settings = await db
        .select()
        .from(aiSettings)
        .where(inArray(aiSettings.channelId, tenantChannelIds));
    } else {
      settings = [];
    }
    
    res.json(settings);
  } catch (error) {
    console.error("❌ Error fetching AI settings:", error);
    res.status(500).json({ error: "Failed to fetch AI settings" });
  }
};

export const getAISettingByChannelId = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;

    if (!verifyChannelOwnership(req, channelId)) {
      return res.status(403).json({ error: "Insufficient permissions for this channel" });
    }

    console.log("Fetching AI setting for channelId:", channelId);

    const settings = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.channelId, channelId))
      .limit(1);

    return res.status(200).json(settings[0] ?? null);
  } catch (error) {
    console.error("❌ Error fetching AI setting by channelId:", error);
    return res.status(500).json({
      error: "Failed to fetch AI settings for channel",
    });
  }
};


// ✅ Create new AI settings
export const createAISettings = async (req: Request, res: Response) => {
  try {
    const {
      provider,
      channelId,
      apiKey,
      model,
      endpoint,
      temperature,
      maxTokens,
      isActive,
      words
    } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID is required" });
    }

    if (!verifyChannelOwnership(req, channelId)) {
      return res.status(403).json({ error: "Insufficient permissions for this channel" });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    // 🔥 Prevent multiple settings for same channel
    if (channelId) {
      const existing = await db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.channelId, channelId))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({
          error: "AI settings already exist for this channel",
          data: existing[0],
        });
      }
    }

    // Normalize words input
    let wordsArray: string[] = [];
    if (typeof words === "string") {
      try {
        wordsArray = JSON.parse(words);
      } catch {
        wordsArray = words
          .split(",")
          .map((w: string) => w.trim())
          .filter(Boolean);
      }
    } else if (Array.isArray(words)) {
      wordsArray = words.map((w) => w.trim()).filter(Boolean);
    }

    // If activating this setting, deactivate others
    if (isActive && channelId) {
      await db
        .update(aiSettings)
        .set({ isActive: false })
        .where(eq(aiSettings.channelId, channelId));
    }

    const [inserted] = await db
      .insert(aiSettings)
      .values({
        provider: provider || "openai",
        channelId: channelId || null,
        apiKey,
        model: model || "gpt-4o-mini",
        endpoint: endpoint || "https://api.openai.com/v1",
        temperature: temperature?.toString() || "0.7",
        maxTokens: maxTokens?.toString() || "2048",
        isActive: !!isActive,
        words: wordsArray,
      })
      .returning();

    // Trigger background reprocessing of training sources for this channel
    if (channelId) {
      (async () => {
        try {
          const sources = await db
            .select({ id: trainingSources.id })
            .from(trainingSources)
            .where(eq(trainingSources.channelId, channelId));
          
          const channelSites = await db
            .select({ id: sites.id })
            .from(sites)
            .where(eq(sites.channelId, channelId));
          
          const siteIds = channelSites.map(s => s.id);
          
          let allSources = [...sources];
          if (siteIds.length > 0) {
            const siteSources = await db
              .select({ id: trainingSources.id })
              .from(trainingSources)
              .where(inArray(trainingSources.siteId, siteIds));
            allSources = [...allSources, ...siteSources];
          }

          const uniqueSourceIds = [...new Set(allSources.map(s => s.id))];
          
          for (const sId of uniqueSourceIds) {
            processTrainingSource(sId).catch((err) =>
              console.error(`Error reprocessing source ${sId} after AI settings update:`, err)
            );
          }
        } catch (err) {
          console.error("Error triggered during background training source reprocessing:", err);
        }
      })();
    }

    res.status(201).json(inserted);
  } catch (error) {
    console.error("❌ Error creating AI setting:", error);
    res.status(500).json({ error: "Failed to create AI setting" });
  }
};


// ✅ Update existing AI settings
export const updateAISettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { apiKey, provider, model, endpoint, temperature, maxTokens, isActive, words } = req.body;

    const existing = await db.query.aiSettings.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Setting not found" });
    }

    if (existing.channelId && !verifyChannelOwnership(req, existing.channelId)) {
      return res.status(403).json({ error: "Insufficient permissions for this channel" });
    }

    // Normalize words input
    let wordsArray: string[] | undefined;
    if (typeof words === "string") {
      try {
        wordsArray = JSON.parse(words);
      } catch {
        wordsArray = words.split(",").map((w: string) => w.trim()).filter(Boolean);
      }
    } else if (Array.isArray(words)) {
      wordsArray = words.map((w) => w.trim()).filter(Boolean);
    }

    // If activating this setting, deactivate other settings for the same channel only
    if (isActive && existing.channelId) {
      await db.update(aiSettings)
        .set({ isActive: false })
        .where(and(eq(aiSettings.channelId, existing.channelId), ne(aiSettings.id, id)));
    }

    const [updated] = await db
      .update(aiSettings)
      .set({
        provider: provider ?? existing.provider,
        apiKey: apiKey ?? existing.apiKey,
        channelId: existing.channelId,
        model: model ?? existing.model,
        endpoint: endpoint ?? existing.endpoint,
        temperature: temperature?.toString() ?? existing.temperature,
        maxTokens: maxTokens?.toString() ?? existing.maxTokens,
        isActive: isActive ?? existing.isActive,
        words: wordsArray ?? existing.words,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, id))
      .returning();

    // Trigger background reprocessing of training sources for this channel
    const channelId = existing.channelId;
    if (channelId) {
      (async () => {
        try {
          const sources = await db
            .select({ id: trainingSources.id })
            .from(trainingSources)
            .where(eq(trainingSources.channelId, channelId));
          
          const channelSites = await db
            .select({ id: sites.id })
            .from(sites)
            .where(eq(sites.channelId, channelId));
          
          const siteIds = channelSites.map(s => s.id);
          
          let allSources = [...sources];
          if (siteIds.length > 0) {
            const siteSources = await db
              .select({ id: trainingSources.id })
              .from(trainingSources)
              .where(inArray(trainingSources.siteId, siteIds));
            allSources = [...allSources, ...siteSources];
          }

          const uniqueSourceIds = [...new Set(allSources.map(s => s.id))];
          
          for (const sId of uniqueSourceIds) {
            processTrainingSource(sId).catch((err) =>
              console.error(`Error reprocessing source ${sId} after AI settings update:`, err)
            );
          }
        } catch (err) {
          console.error("Error triggered during background training source reprocessing:", err);
        }
      })();
    }

    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating AI setting:", error);
    res.status(500).json({ error: "Failed to update AI setting" });
  }
};

// ✅ Delete AI settings
export const deleteAISettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.query.aiSettings.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Setting not found" });
    }

    if (existing.channelId && !verifyChannelOwnership(req, existing.channelId)) {
      return res.status(403).json({ error: "Insufficient permissions for this channel" });
    }

    await db.delete(aiSettings).where(eq(aiSettings.id, id));
    res.json({ message: "AI setting deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting AI setting:", error);
    res.status(500).json({ error: "Failed to delete AI setting" });
  }
};
