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

import multer, { FileFilterCallback } from "multer";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { createDOClient } from "../config/digitalOceanConfig";
import { PutObjectCommand } from "@aws-sdk/client-s3";



const allowedTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg", "image/avif",
  "image/x-icon", "image/vnd.microsoft.icon",
  "video/mp4", "video/webm", "video/ogg", "video/x-msvideo", "video/quicktime",
  "video/3gpp",
  "audio/mp3", "audio/wav", "audio/ogg", "audio/mpeg", "audio/m4a",
  "audio/aac", "audio/mp4", "audio/x-m4a", "audio/opus",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

// Extend Express.Multer.File to include cloudUrl
declare global {
  namespace Express {
    interface Multer {
      File: {
        cloudUrl?: string;
      };
    }
  }
}

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Local storage setup with user-specific folders
const localStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as any).user?.id || (req.body?.userId) || "guest";
    const uploadPath = path.join("uploads", userId.toString());
    
    ensureDirectoryExists(uploadPath);
    console.log(`📁 Saving file to local directory: ${uploadPath}`);
    
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log(`📝 Generated filename: ${uniqueName}`);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  req: Request & { fileFilterError?: string },
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico",
    ".mp4", ".webm", ".ogg", ".avi", ".mov", ".3gp",
    ".mp3", ".wav", ".m4a", ".aac", ".opus",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"
  ];

  if (allowedTypes.includes(file.mimetype) || safeExtensions.includes(ext)) {
    console.log(`✅ File type accepted: ${file.mimetype} (ext: ${ext})`);
    cb(null, true);
  } else {
    console.log(`❌ File type rejected: ${file.mimetype} (ext: ${ext})`);
    req.fileFilterError = `Unsupported file type: ${file.mimetype}`;
    cb(null, false);
  }
};

// Multer instance
export const upload = multer({
  storage: localStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (documents can be up to 100MB per WhatsApp)
  fileFilter,
});

// Middleware to upload to DigitalOcean Spaces (if active)
export const handleDigitalOceanUpload = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("\n🔍 Checking DigitalOcean Spaces configuration...");
    
    // Check if DO is active
    const doClient = await createDOClient();

    // console.log('doClient:', doClient);
    
    console.log("📊 DO Client Status:", doClient ? "✅ Active" : "❌ Inactive");
    
    // Handle both single file and multiple files
    let files: Express.Multer.File[] = [];
    
    if (req.file) {
      // Single file upload (upload.single())
      files = [req.file];
      console.log("📦 Processing 1 file (single upload)");
    } else if (req.files) {
      // Multiple files upload (upload.array() or upload.fields())
      if (Array.isArray(req.files)) {
        files = req.files;
        console.log(`📦 Processing ${files.length} file(s) (array upload)`);
      } else {
        // upload.fields() returns an object
        files = Object.values(req.files).flat();
        console.log(`📦 Processing ${files.length} file(s) (fields upload)`);
      }
    }

    if (files.length === 0) {
      console.log("⚠️ No files to process");
      return next();
    }

    // If DO is not active, keep files local — cloudUrl intentionally left unset
    // so the controller's fallback builds the correct /uploads/userId/filename path
    if (!doClient) {
      console.log("💾 DigitalOcean not configured/active, files saved locally");
      files.forEach(file => {
        console.log(`   📍 Local path: ${file.path}`);
        console.log(`   🌐 Access URL: /uploads/${path.basename(path.dirname(file.path))}/${file.filename}`);
      });
      return next();
    }

    const { s3, bucket, endpoint, provider } = doClient;
    const isAws = provider?.toLowerCase() === "aws";
    console.log(`☁️ Uploading to cloud storage (${provider || "Spaces"}): ${bucket}`);

    // Upload to DigitalOcean Spaces / AWS S3
    for (const file of files) {
      try {
        console.log(`\n📤 Uploading: ${file.originalname}`);
        console.log(`   Local path: ${file.path}`);
        
        // Check if file exists
        if (!fs.existsSync(file.path)) {
          console.error(`   ❌ File not found: ${file.path}`);
          continue;
        }
        
        const { conversationId } = req.params;
        console.log(`   File verified: ${file.path} , conversationId: ${conversationId}`);
        const userId = (req as any).user?.id || (req.body?.userId) || conversationId || "guest";
        const fileKey = `uploads/${userId}/${Date.now()}-${path.basename(file.originalname)}`;

        console.log(`   Cloud key: ${fileKey}`);
        console.log(`   File size: ${file.size} bytes`);

        // Upload to Cloud storage
        try {
          const putParams: any = {
            Bucket: bucket!,
            Key: fileKey,
            Body: fs.createReadStream(file.path),
            ContentLength: file.size,
            ContentType: file.mimetype,
          };

          if (!isAws) {
            putParams.ACL = "public-read";
          }

          await s3.send(new PutObjectCommand(putParams));
        } catch (s3Error: any) {
          if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
            console.warn("⚠️ S3 bucket does not support ACLs. Retrying without public-read ACL...");
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket!,
                Key: fileKey,
                Body: fs.createReadStream(file.path),
                ContentLength: file.size,
                ContentType: file.mimetype,
              })
            );
          } else {
            throw s3Error;
          }
        }

        // Construct cloud URL
        const endpointUrl = new URL(endpoint || "");
        // console.log('endpointUrl:', endpointUrl);
        (file as any).cloudUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;

        console.log(`   ✅ Upload successful!`);
        console.log(`   🌐 Cloud URL: ${(file as any).cloudUrl}`);

        // Delete local file after successful upload
        fs.unlinkSync(file.path);
        console.log(`   🗑️ Local file deleted`);
        
      } catch (uploadError) {
        console.error(`   ❌ Upload failed for ${file.originalname}:`, uploadError);
        console.log(`   💾 Keeping local file: ${file.path}`);
        // Keep the local file if upload fails
      }
    }

    next();
  } catch (error) {
    console.error("❌ DigitalOcean Upload Middleware Error:", error);
    console.log("💾 Falling back to local storage");
    // Fallback to local storage on error
    next();
  }
};

// Initialize uploads directory on app start
export const initializeUploadsDirectory = (): void => {
  ensureDirectoryExists("uploads");
  console.log("✅ Uploads directory initialized");
};