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

import type { Express } from "express";
import { handleDigitalOceanUpload, upload } from "../middlewares/upload.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { db } from "../db";
import { mediaLibrary } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export function registerMediaRoutes(app: Express) {
  // General media upload - now stores files in the media library
  app.post("/api/media/upload", requireAuth, upload.single("file"), handleDigitalOceanUpload, async (req, res) => {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = req.user!;
    const mainUserId = user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id;

    // Check WhatsApp media upload limits
    const maxSizes: Record<string, number> = {
      image: 5 * 1024 * 1024,      // 5MB
      video: 16 * 1024 * 1024,     // 16MB
      audio: 16 * 1024 * 1024,     // 16MB
      document: 100 * 1024 * 1024, // 100MB
    };
    let mediaType = "document";
    if (file.mimetype.startsWith("image/")) {
      mediaType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      mediaType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      mediaType = "audio";
    }
    const maxSize = maxSizes[mediaType];
    if (file.size > maxSize) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ message: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB for ${mediaType}` });
    }

    const relativePath = file.path.replace(/\\/g, "/").replace(/^uploads\//, "");
    const fileUrl = file.cloudUrl || `/uploads/${relativePath}`;

    try {
      // Save to media library
      const [mediaAsset] = await db
        .insert(mediaLibrary)
        .values({
          userId: mainUserId,
          url: fileUrl,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        })
        .returning();

      res.json({
        id: mediaAsset.id,
        url: fileUrl,
        name: file.originalname,
        mimeType: file.mimetype,
      });
    } catch (err: any) {
      console.error("Failed to save media to library:", err);
      // Still return the fileUrl so the upload is not entirely blocked
      res.json({
        url: fileUrl,
        name: file.originalname,
        mimeType: file.mimetype,
      });
    }
  });

  // Get all media library items for the active main account
  app.get("/api/media-library", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const mainUserId = user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id;

      const assets = await db
        .select()
        .from(mediaLibrary)
        .where(eq(mediaLibrary.userId, mainUserId))
        .orderBy(desc(mediaLibrary.createdAt));

      res.json(assets);
    } catch (err: any) {
      console.error("Failed to fetch media library:", err);
      res.status(500).json({ error: "Failed to fetch media gallery." });
    }
  });

  // Proxy view media library item
  app.get("/api/media-library/file/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const mainUserId = user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id;

      // Find asset
      const [asset] = await db
        .select()
        .from(mediaLibrary)
        .where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.userId, mainUserId)))
        .limit(1);

      if (!asset) {
        return res.status(404).json({ error: "Media asset not found or unauthorized." });
      }

      // Check if S3 / cloud URL
      if (asset.url.startsWith("http")) {
        const { createDOClient } = await import("../config/digitalOceanConfig");
        const doClient = await createDOClient();
        if (doClient) {
          const { s3, bucket, endpoint } = doClient;
          const isOurBucket = asset.url.includes(bucket!) || (endpoint && asset.url.includes(new URL(endpoint).host));
          if (isOurBucket) {
            const { GetObjectCommand } = await import("@aws-sdk/client-s3");
            const urlObj = new URL(asset.url);
            const fileKey = decodeURIComponent(urlObj.pathname.substring(1));
            
            const s3Res = await s3.send(new GetObjectCommand({
              Bucket: bucket!,
              Key: fileKey
            }));
            
            res.set({
              'Content-Type': asset.mimeType || 'application/octet-stream',
              'Cache-Control': 'public, max-age=86400',
            });
            
            const responseBody = s3Res.Body as any;
            return responseBody.pipe(res);
          }
        }

        // Fallback to redirecting to S3 url if not our bucket
        return res.redirect(asset.url);
      }

      // Local file serve
      const filePath = path.join(process.cwd(), asset.url);
      if (fs.existsSync(filePath)) {
        res.set({
          'Content-Type': asset.mimeType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
        });
        return res.sendFile(filePath);
      }

      return res.status(404).json({ error: "File not found on disk." });
    } catch (err: any) {
      console.error("Failed to view media asset:", err);
      res.status(500).json({ error: "Failed to view media asset." });
    }
  });

  // Delete media library item
  app.delete("/api/media-library/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const mainUserId = user.role === "team" && (user as any).createdBy ? (user as any).createdBy : user.id;

      // Find asset
      const [asset] = await db
        .select()
        .from(mediaLibrary)
        .where(and(eq(mediaLibrary.id, id), eq(mediaLibrary.userId, mainUserId)))
        .limit(1);

      if (!asset) {
        return res.status(404).json({ error: "Media asset not found or unauthorized." });
      }

      // Delete from database
      await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));

      // Attempt to delete physical file from local disk if it's local
      if (asset.url.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), asset.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.json({ success: true, message: "Asset deleted successfully." });
    } catch (err: any) {
      console.error("Failed to delete media asset:", err);
      res.status(500).json({ error: "Failed to delete media asset." });
    }
  });

  // Get media upload URL
  app.post("/api/media/upload-url", async (req, res) => {
    try {
      const { fileName, fileType } = req.body;
      
      // Generate a unique file name
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
      
      // Mock upload URL for now
      const uploadUrl = `https://storage.example.com/upload/${uniqueFileName}`;
      const fileUrl = `https://storage.example.com/files/${uniqueFileName}`;
      
      res.json({
        uploadUrl,
        fileUrl
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });
}