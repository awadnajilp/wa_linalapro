import { Request, Response } from "express";
import { db } from "../db";
import { firebaseConfig } from "@shared/schema";
import { resetFcm, initFcm } from "../services/fcm-service";
import { eq } from "drizzle-orm";

// Get firebase configuration (only return public keys + project details, hide private key except a placeholder if configured)
export const getFirebaseSettings = async (req: Request, res: Response) => {
  try {
    const configs = await db.select().from(firebaseConfig).limit(1);
    if (configs.length === 0) {
      return res.json(null);
    }
    const config = configs[0];
    // Return config but redact privateKey details to keep it secure
    return res.json({
      ...config,
      privateKey: config.privateKey ? "********" : "",
    });
  } catch (error) {
    console.error("Failed to fetch firebase settings:", error);
    res.status(500).json({ error: "Failed to fetch firebase settings" });
  }
};

// Update or create firebase configuration
export const updateFirebaseSetting = async (req: Request, res: Response) => {
  try {
    const {
      id,
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
      privateKey,
      clientEmail,
      vapidKey,
    } = req.body;

    const dataToSave: Record<string, any> = {
      apiKey: apiKey || null,
      authDomain: authDomain || null,
      projectId: projectId || null,
      storageBucket: storageBucket || null,
      messagingSenderId: messagingSenderId || null,
      appId: appId || null,
      measurementId: measurementId || null,
      clientEmail: clientEmail || null,
      vapidKey: vapidKey || null,
      updatedAt: new Date(),
    };

    // If privateKey was entered and not redacted value, save it
    if (privateKey && privateKey !== "********") {
      dataToSave.privateKey = privateKey;
    }

    const existing = await db.select().from(firebaseConfig).limit(1);

    if (existing.length > 0) {
      await db.update(firebaseConfig).set(dataToSave).where(eq(firebaseConfig.id, existing[0].id));
    } else {
      await db.insert(firebaseConfig).values(dataToSave);
    }

    // Force reset and re-initialize FCM Service with new settings
    await resetFcm();
    const initialized = await initFcm();

    res.json({ success: true, message: "Firebase settings updated successfully", fcmReady: initialized });
  } catch (error) {
    console.error("Failed to update firebase settings:", error);
    res.status(500).json({ error: "Failed to update firebase settings" });
  }
};
