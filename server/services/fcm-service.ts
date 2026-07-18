import * as adminModule from "firebase-admin";
import * as messagingModule from "firebase-admin/messaging";

const admin = (adminModule as any).default || adminModule;
const { getMessaging } = (messagingModule as any).default || messagingModule;
import { db } from "../db";
import { firebaseConfig } from "@shared/schema";

let initialized = false;

export async function resetFcm(): Promise<void> {
  initialized = false;
  const apps = admin.getApps();
  if (apps.length > 0) {
    try {
      await Promise.all(apps.map(app => app?.delete()));
    } catch (err) {
      console.error("[FCM Service] Error deleting Firebase app:", err);
    }
  }
}

export async function initFcm(): Promise<boolean> {
  if (initialized) return true;
  try {
    const configs = await db.select().from(firebaseConfig).limit(1);
    if (configs.length === 0) {
      console.log("[FCM Service] No Firebase configuration found in database. Push notifications disabled.");
      return false;
    }
    
    const config = configs[0];
    if (!config.projectId || !config.privateKey || !config.clientEmail) {
      console.log("[FCM Service] Firebase configuration exists but is missing required credentials (projectId, privateKey, clientEmail).");
      return false;
    }

    admin.initializeApp({
      credential: admin.cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey.replace(/\\n/g, '\n'),
      }),
    });

    initialized = true;
    console.log("✅ [FCM Service] Firebase Admin SDK initialized successfully!");
    return true;
  } catch (error) {
    console.error("❌ [FCM Service] Error initializing Firebase Admin SDK:", error);
    return false;
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<any> {
  const isReady = await initFcm();
  if (!isReady) {
    console.log("[FCM Service] Push notification skipped: FCM is not initialized.");
    return;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data,
      token: fcmToken,
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          }
        }
      }
    };

    const response = await getMessaging().send(message);
    console.log("🚀 [FCM Service] Sent push notification successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ [FCM Service] Failed to send FCM push notification:", error);
  }
}
