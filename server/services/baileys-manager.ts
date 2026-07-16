import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  delay,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { channels, conversations, contacts, messages, warmerConfigs, warmerMessages, messageQueue, campaigns, campaignRecipients, groups } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { WebhookHandler } from "./webhook-handler";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { WhatsAppApiService } from "./whatsapp-api";

export class BaileysManager {
  private static activeSockets = new Map<string, any>();
  private static qrStates = new Map<string, { qrCodeUrl?: string; status: "pending" | "authenticated" | "expired" | "disconnected" }>();

  static getActiveSocket(channelId: string) {
    return this.activeSockets.get(channelId);
  }

  static getSessionStatus(channelId: string) {
    return this.qrStates.get(channelId) || { status: "disconnected" };
  }

  static setSessionStatus(channelId: string, status: "pending" | "authenticated" | "expired" | "disconnected", qrCodeUrl?: string) {
    this.qrStates.set(channelId, { status, qrCodeUrl });
  }

  static async createSession(channelId: string, name: string, phoneNumber?: string, onQr?: (qrCodeUrl: string) => void): Promise<any> {
    try {
      console.log(`[BaileysManager] Creating session for channel ${channelId} (${name})`);
      
      // Ensure sessions directory exists
      const sessionsDir = path.join(process.cwd(), "server/sessions");
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }

      // Initialize auth state
      const sessionPath = path.join(sessionsDir, channelId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const logger = pino({ level: "error" });

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        logger,
        printQRInTerminal: false,
        browser: ["LINALA QR Connect", "Chrome", "1.0.0"],
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: true
      });

      this.activeSockets.set(channelId, sock);
      this.qrStates.set(channelId, { status: "pending" });

      // Maintain contacts cache on the socket object
      (sock as any).contacts = {};

      sock.ev.on("contacts.upsert", (contactsList) => {
        for (const contact of contactsList) {
          const id = contact.id;
          if (id) {
            (sock as any).contacts[id] = {
              ...(sock as any).contacts[id],
              ...contact,
            };
          }
        }
      });

      sock.ev.on("contacts.update", (updates) => {
        for (const update of updates) {
          const id = update.id;
          if (id) {
            (sock as any).contacts[id] = {
              ...(sock as any).contacts[id],
              ...update,
            };
          }
        }
      });

      sock.ev.on("messaging-history.set", ({ contacts: contactsList }) => {
        if (contactsList) {
          for (const contact of contactsList) {
            const id = contact.id;
            if (id) {
              (sock as any).contacts[id] = {
                ...(sock as any).contacts[id],
                ...contact,
              };
            }
          }
        }
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrCodeUrl = await QRCode.toDataURL(qr);
            this.qrStates.set(channelId, { qrCodeUrl, status: "pending" });
            if (onQr) {
              onQr(qrCodeUrl);
            }
          } catch (qrErr) {
            console.error(`[BaileysManager] Error generating QR code:`, qrErr);
          }
        }

        if (connection === "open") {
          console.log(`[BaileysManager] Session ${channelId} connected successfully!`);
          this.qrStates.set(channelId, { status: "authenticated" });

          const sockUser = sock.user || {};
          const connectedPhone = (sockUser as any).id ? (sockUser as any).id.split(":")[0].split("@")[0] : (phoneNumber || "");

          // Retrieve channel info to check creator
          const [channelInfo] = await db
            .select()
            .from(channels)
            .where(eq(channels.id, channelId))
            .limit(1);

          // Update channel status in database
          await db
            .update(channels)
            .set({
              isActive: true,
              phoneNumber: connectedPhone,
              healthStatus: "healthy",
              updatedAt: new Date()
            })
            .where(eq(channels.id, channelId));

          // Sync groups automatically
          try {
            console.log(`[BaileysManager] Syncing participating groups for channel ${channelId}...`);
            const groupsMap = await sock.groupFetchAllParticipating();
            let syncCount = 0;

            const [channelObj] = await db
              .select({ createdBy: channels.createdBy })
              .from(channels)
              .where(eq(channels.id, channelId))
              .limit(1);
            const ownerId = channelObj?.createdBy || "";

            for (const jid of Object.keys(groupsMap)) {
              const groupMetadata = groupsMap[jid];
              const name = groupMetadata.subject || "WhatsApp Group";
              
              // 1. Create local CRM group if not existing
              const [existingGroup] = await db
                .select()
                .from(groups)
                .where(and(eq(groups.channelId, channelId), eq(groups.name, name)))
                .limit(1);

              if (!existingGroup) {
                await db.insert(groups).values({
                  channelId,
                  name,
                  description: `Imported from WhatsApp Group JID: ${jid}`,
                  createdBy: ownerId
                });
              }

              // 2. Sync group contact in contacts table
              const [existingContact] = await db
                .select()
                .from(contacts)
                .where(and(eq(contacts.channelId, channelId), eq(contacts.phone, jid)))
                .limit(1);

              if (!existingContact) {
                await db.insert(contacts).values({
                  channelId,
                  name,
                  phone: jid,
                  isGroup: true,
                  status: "active",
                  source: "chatbot",
                  groups: ["Groups WA"],
                  createdBy: ownerId
                });
                syncCount++;
              } else {
                await db
                  .update(contacts)
                  .set({
                    name,
                    isGroup: true,
                    groups: Array.from(new Set([...(existingContact.groups || []), "Groups WA"]))
                  })
                  .where(eq(contacts.id, existingContact.id));
              }
            }
            console.log(`[BaileysManager] Group sync completed. Synced ${syncCount} new groups for channel ${channelId}`);
          } catch (groupErr) {
            console.error(`[BaileysManager] Error syncing participating groups on connection open:`, groupErr);
          }

          // Auto-seed warmer config & messages if not existing
          try {
            const [existingWarmer] = await db
              .select()
              .from(warmerConfigs)
              .where(eq(warmerConfigs.channelId, channelId))
              .limit(1);

            if (!existingWarmer) {
              const channelOwner = channelInfo?.createdBy || "";
              const [newWarmer] = await db
                .insert(warmerConfigs)
                .values({
                  channelId,
                  isActive: false,
                  minDelay: 10,
                  maxDelay: 60,
                  createdBy: channelOwner
                })
                .returning();

              if (newWarmer) {
                const premadeMessages = [
                  "Hello! How are you doing today?",
                  "Just checking in to see if you have any questions.",
                  "Hey! Are you available for a quick chat?",
                  "Hi there! Hope you are having a wonderful week.",
                  "Good morning! Let me know if you need anything.",
                  "Hello, hope you're having a productive day!",
                  "Hi, just wanted to say hello and see how things are going.",
                  "Hey, are you free to connect later today?",
                  "Greetings! Wishing you a great day ahead.",
                  "Hello! Let's touch base whenever you have a moment.",
                  "Hi! Hope everything is going well on your end.",
                  "Good afternoon! Let me know if you have some free time.",
                  "Hey, just following up on our last conversation.",
                  "Hi there! Just wanted to share a quick update.",
                  "Hello! Hope you have a great weekend ahead!"
                ];
                for (const text of premadeMessages) {
                  await db.insert(warmerMessages).values({
                    warmerConfigId: newWarmer.id,
                    messageText: text
                  });
                }
                console.log(`[BaileysManager] Seeding of warmer messages completed for channel ${channelId}.`);
              }
            }
          } catch (seedErr) {
            console.error(`[BaileysManager] Warmer seeding error:`, seedErr);
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[BaileysManager] Session ${channelId} closed. Status code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (shouldReconnect) {
            // Attempt to reconnect after delay
            setTimeout(() => {
              this.createSession(channelId, name, phoneNumber, onQr).catch(err => {
                console.error(`[BaileysManager] Reconnection failed for ${channelId}:`, err);
              });
            }, 10000);
          } else {
            // Logged out
            console.log(`[BaileysManager] Session ${channelId} logged out. Cleaning up credentials.`);
            this.qrStates.set(channelId, { status: "disconnected" });
            this.activeSockets.delete(channelId);
            
            // Set channel inactive
            await db
              .update(channels)
              .set({
                isActive: false,
                healthStatus: "error",
                updatedAt: new Date()
              })
              .where(eq(channels.id, channelId));

            // Remove auth directory
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (rmErr) {
              console.error(`[BaileysManager] Error removing session directory:`, rmErr);
            }
          }
        }
      });

      // Listen for message receipts/delivery/read updates!
      sock.ev.on("message-receipt.update", async (updates: any) => {
        for (const update of updates) {
          if (update.key && update.key.id) {
            const msgId = update.key.id;
            const type = update.receipt?.type;
            let status: "delivered" | "read" | null = null;
            if (type === "read" || type === "read-self") {
              status = "read";
            } else if (type === "delivered") {
              status = "delivered";
            }
            if (status) {
              await this.updateQrMessageStatus(msgId, status);
            }
          }
        }
      });

      // Also listen to messages.update for status updates
      sock.ev.on("messages.update", async (updates: any) => {
        for (const update of updates) {
          if (update.key && update.key.id && update.status) {
            const msgId = update.key.id;
            let status: "delivered" | "read" | null = null;
            if (update.status === 3) {
              status = "delivered";
            } else if (update.status === 4 || update.status === 5) {
              status = "read";
            }
            if (status) {
              await this.updateQrMessageStatus(msgId, status);
            }
          }
        }
      });

      // Handle incoming messages!
      sock.ev.on("messages.upsert", async (m) => {
        const message = m.messages[0];
        if (!message) return;

        // Skip status updates and check remoteJid
        const jid = message.key.remoteJid;
        if (!jid || jid === "status@broadcast") return;

        const isGroup = jid.endsWith("@g.us");

        const timestamp = message.messageTimestamp 
          ? new Date(Number(message.messageTimestamp) * 1000)
          : new Date();

        const messageId = message.key.id || "";

        // Extract raw message content
        const msg = message.message;
        if (!msg) return;

        // Extract body text if text message
        let content = "";
        let type = "text";
        if (msg.conversation) {
          content = msg.conversation;
        } else if (msg.extendedTextMessage) {
          content = msg.extendedTextMessage.text || "";
        } else if (msg.imageMessage) {
          content = msg.imageMessage.caption || "[Image]";
          type = "image";
        } else if (msg.videoMessage) {
          content = msg.videoMessage.caption || "[Video]";
          type = "video";
        } else if (msg.audioMessage) {
          content = "[Audio]";
          type = "audio";
        } else if (msg.documentMessage) {
          content = msg.documentMessage.fileName || "[Document]";
          type = "document";
        } else if (msg.locationMessage) {
          content = "[Location]";
          type = "location";
        } else if (msg.buttonsResponseMessage) {
          content = (msg.buttonsResponseMessage as any).selectedButtonId || (msg.buttonsResponseMessage as any).displayText || "";
          type = "button";
        } else if (msg.templateButtonReplyMessage) {
          content = (msg.templateButtonReplyMessage as any).selectedId || (msg.templateButtonReplyMessage as any).displayText || "";
          type = "button";
        }

        // Check if message is from myself (outgoing)
        if (message.key.fromMe) {
          // Sync outgoing message sent from physical phone
          let recipientPhone = jid.endsWith("@g.us") ? jid : jid.split("@")[0];
          if (jid.endsWith("@lid") && (message.key as any).remoteJidAlt) {
            recipientPhone = (message.key as any).remoteJidAlt.split("@")[0];
          }
          
          // Check if message already exists in DB
          const [existingMsg] = await db
            .select()
            .from(messages)
            .where(eq(messages.whatsappMessageId, messageId))
            .limit(1);

          if (!existingMsg) {
            console.log(`[BaileysManager] Syncing outgoing message ${messageId} sent from phone to ${recipientPhone}`);
            await this.syncOutgoingMessageFromPhone(channelId, recipientPhone, messageId, content, type, timestamp);
          }
          return;
        }

        // It is an incoming message!
        let senderPhone = jid.endsWith("@g.us") ? jid : jid.split("@")[0];
        if (jid.endsWith("@lid") && (message.key as any).remoteJidAlt) {
          senderPhone = (message.key as any).remoteJidAlt.split("@")[0];
          console.log(`[BaileysManager] Resolved LID JID mapping: ${jid} -> ${(message.key as any).remoteJidAlt}`);
        }
        console.log(`[BaileysManager] Received incoming message ${messageId} from ${senderPhone} on channel ${channelId}`);

        // Download incoming media if any
        if (msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage) {
          try {
            console.log(`[BaileysManager] Downloading incoming media for message ${messageId}...`);
            const buffer = await downloadMediaMessage(message, "buffer", {}, {} as any);
            
            const mediaMsg = msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage;
            const mimeType = mediaMsg!.mimetype || "application/octet-stream";
            const originalName = (mediaMsg as any).fileName || "file";
            
            let ext = "bin";
            if (originalName && originalName !== "file") {
              const parsedExt = path.extname(originalName);
              if (parsedExt) ext = parsedExt.replace(/^\./, "");
            } else {
              if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
              else if (mimeType.includes("png")) ext = "png";
              else if (mimeType.includes("gif")) ext = "gif";
              else if (mimeType.includes("mp4")) ext = "mp4";
              else if (mimeType.includes("ogg")) ext = "ogg";
              else if (mimeType.includes("mpeg")) ext = "mp3";
              else if (mimeType.includes("pdf")) ext = "pdf";
            }
            
            const filename = `qr_${randomUUID()}.${ext}`;
            const incomingDir = path.join(process.cwd(), "uploads/incoming");
            if (!fs.existsSync(incomingDir)) {
              fs.mkdirSync(incomingDir, { recursive: true });
            }
            
            const filePath = path.join(incomingDir, filename);
            fs.writeFileSync(filePath, buffer);
            
            let downloadedUrl = `/uploads/incoming/${filename}`;
            console.log(`[BaileysManager] Media saved to local file: ${filePath}`);

            // Try uploading to cloud storage if active
            try {
              const { createDOClient } = await import("../config/digitalOceanConfig");
              const { PutObjectCommand } = await import("@aws-sdk/client-s3");
              const doClient = await createDOClient();
              if (doClient) {
                const { s3, bucket, endpoint } = doClient;
                const fileKey = `uploads/incoming/${filename}`;
                console.log(`[BaileysManager] Uploading incoming media to cloud storage: ${fileKey}`);

                try {
                  await s3.send(
                    new PutObjectCommand({
                      Bucket: bucket!,
                      Key: fileKey,
                      Body: buffer,
                      ACL: "public-read",
                      ContentType: mimeType,
                    })
                  );
                } catch (s3Error: any) {
                  if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
                    console.warn("[BaileysManager] S3 bucket does not support ACLs. Retrying without public-read ACL...");
                    await s3.send(
                      new PutObjectCommand({
                        Bucket: bucket!,
                        Key: fileKey,
                        Body: buffer,
                        ContentType: mimeType,
                      })
                    );
                  } else {
                    throw s3Error;
                  }
                }

                const endpointUrl = new URL(endpoint || "");
                downloadedUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;
                console.log(`[BaileysManager] Cloud upload successful: ${downloadedUrl}`);
                
                // Delete local file after cloud upload
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`[BaileysManager] Local file deleted after cloud upload`);
                }
              }
            } catch (cloudErr) {
              console.error("[BaileysManager] Cloud upload failed:", cloudErr);
            }
            
            // Cache it in WhatsAppApiService
            const mediaId = `baileys_media_${messageId}`;
            WhatsAppApiService.mediaCache.set(mediaId, { url: downloadedUrl, mimeType });
          } catch (dlErr) {
            console.error(`[BaileysManager] Failed to download incoming media:`, dlErr);
          }
        }

        // Map to WebhookMessage format
        const webhookMsg = this.mapBaileysToWebhookMessage(message);
        if (!webhookMsg) return;

        // Call the WebhookHandler to parse, store, trigger chatbot and execute automation flows!
        try {
          const channelData = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
          if (channelData.length > 0) {
            const phoneNumberId = channelData[0].phoneNumberId;
            const profileName = message.pushName || senderPhone;
            await WebhookHandler.handleIncomingMessage(phoneNumberId, webhookMsg, profileName);
          }
        } catch (webhookErr) {
          console.error(`[BaileysManager] Error handling incoming message with WebhookHandler:`, webhookErr);
        }
      });

      return sock;
    } catch (err) {
      console.error(`[BaileysManager] Error creating session for channel ${channelId}:`, err);
      throw err;
    }
  }

  private static mapBaileysToWebhookMessage(baileysMsg: any): any {
    const key = baileysMsg.key;
    if (!key) return null;

    let from = key.remoteJid?.endsWith("@g.us")
      ? key.remoteJid
      : (key.remoteJid?.split("@")[0] || "");
    if (key.remoteJid?.endsWith("@lid") && (baileysMsg.key as any).remoteJidAlt) {
      from = (baileysMsg.key as any).remoteJidAlt.split("@")[0];
    }
    const id = key.id || "";
    const timestamp = baileysMsg.messageTimestamp 
      ? String(baileysMsg.messageTimestamp) 
      : String(Math.floor(Date.now() / 1000));

    // Handle system group/stub messages
    if (baileysMsg.messageStubType) {
      const stubType = baileysMsg.messageStubType;
      const params = baileysMsg.messageStubParameters || [];
      let systemText = `System Event: ${stubType}`;
      
      if (stubType === 20 || stubType === 'GROUP_CREATE') {
        systemText = "Group was created";
      } else if (stubType === 21 || stubType === 'GROUP_CHANGE_SUBJECT') {
        systemText = `Group subject changed to: "${params[0] || ''}"`;
      } else if (stubType === 28 || stubType === 'GROUP_PARTICIPANT_ADD') {
        systemText = `Added participant(s): ${params.map((p: string) => p.split('@')[0]).join(', ')}`;
      } else if (stubType === 29 || stubType === 'GROUP_PARTICIPANT_REMOVE') {
        systemText = `Removed participant(s): ${params.map((p: string) => p.split('@')[0]).join(', ')}`;
      } else if (stubType === 30 || stubType === 'GROUP_PARTICIPANT_PROMOTE') {
        systemText = `Promoted participant(s) to admin: ${params.map((p: string) => p.split('@')[0]).join(', ')}`;
      } else if (stubType === 31 || stubType === 'GROUP_PARTICIPANT_DEMOTE') {
        systemText = `Demoted participant(s) from admin: ${params.map((p: string) => p.split('@')[0]).join(', ')}`;
      } else if (stubType === 32 || stubType === 'GROUP_CHANGE_ANNOUNCE') {
        systemText = params[0] === 'on' ? "Group settings changed: Only admins can send messages" : "Group settings changed: All participants can send messages";
      }

      return {
        from,
        id,
        timestamp,
        type: "text",
        text: { body: `📢 ${systemText}` }
      };
    }

    const msg = baileysMsg.message;
    if (!msg) return null;

    let type = "unsupported";
    let text: { body: string } | undefined;
    let image: any;
    let video: any;
    let audio: any;
    let document: any;
    let location: any;

    if (msg.conversation) {
      type = "text";
      text = { body: msg.conversation };
    } else if (msg.extendedTextMessage) {
      type = "text";
      text = { body: msg.extendedTextMessage.text || "" };
    } else if (msg.imageMessage) {
      type = "image";
      image = {
        id: `baileys_media_${id}`,
        mime_type: msg.imageMessage.mimetype || "image/jpeg",
        caption: msg.imageMessage.caption || "",
      };
    } else if (msg.videoMessage) {
      type = "video";
      video = {
        id: `baileys_media_${id}`,
        mime_type: msg.videoMessage.mimetype || "video/mp4",
        caption: msg.videoMessage.caption || "",
      };
    } else if (msg.audioMessage) {
      type = "audio";
      audio = {
        id: `baileys_media_${id}`,
        mime_type: msg.audioMessage.mimetype || "audio/ogg",
        voice: msg.audioMessage.ptt || false,
      };
    } else if (msg.documentMessage) {
      type = "document";
      document = {
        id: `baileys_media_${id}`,
        mime_type: msg.documentMessage.mimetype || "application/pdf",
        filename: msg.documentMessage.fileName || "document",
        caption: msg.documentMessage.caption || "",
      };
    } else if (msg.locationMessage) {
      type = "location";
      location = {
        latitude: msg.locationMessage.degreesLatitude,
        longitude: msg.locationMessage.degreesLongitude,
        name: msg.locationMessage.name || "",
        address: msg.locationMessage.address || "",
      };
    } else if (msg.buttonsResponseMessage) {
      return {
        from,
        id,
        timestamp,
        type: "button",
        button: {
          text: msg.buttonsResponseMessage.selectedButtonId || msg.buttonsResponseMessage.displayText || "",
          payload: msg.buttonsResponseMessage.selectedButtonId || "",
        }
      };
    } else if (msg.templateButtonReplyMessage) {
      return {
        from,
        id,
        timestamp,
        type: "button",
        button: {
          text: msg.templateButtonReplyMessage.selectedId || msg.templateButtonReplyMessage.displayText || "",
          payload: msg.templateButtonReplyMessage.selectedId || "",
        }
      };
    }

    return {
      from,
      id,
      timestamp,
      type,
      text,
      image,
      video,
      audio,
      document,
      location,
    };
  }

  private static async syncOutgoingMessageFromPhone(
    channelId: string,
    recipientPhone: string,
    messageId: string,
    content: string,
    type: string,
    timestamp: Date
  ) {
    try {
      const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
      if (!channel) return;

      // Find or create contact
      let [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.channelId, channelId), eq(contacts.phone, recipientPhone)))
        .limit(1);

      if (!contact) {
        [contact] = await db
          .insert(contacts)
          .values({
            name: recipientPhone,
            phone: recipientPhone,
            channelId,
            source: "whatsapp",
            lastContact: timestamp,
            createdBy: channel.createdBy || ""
          })
          .returning();
      }

      // Find or create conversation
      let [conversation] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.channelId, channelId), eq(conversations.contactId, contact.id)))
        .limit(1);

      if (!conversation) {
        [conversation] = await db
          .insert(conversations)
          .values({
            contactId: contact.id,
            contactPhone: recipientPhone,
            contactName: contact.name,
            channelId,
            lastMessageAt: timestamp,
            lastMessageText: content.substring(0, 200),
            unreadCount: 0,
            status: "open",
            type: "whatsapp"
          })
          .returning();
      } else {
        await db
          .update(conversations)
          .set({
            lastMessageAt: timestamp,
            lastMessageText: content.substring(0, 200)
          })
          .where(eq(conversations.id, conversation.id));
      }

      // Insert message as outbound
      await db.insert(messages).values({
        conversationId: conversation.id,
        whatsappMessageId: messageId,
        fromUser: true,
        direction: "outbound",
        content,
        type,
        messageType: type,
        status: "sent",
        timestamp
      });

      // Emit realtime events to update frontend
      const io = (global as any).io;
      if (io) {
        const payload = {
          type: "new-message",
          conversationId: conversation.id,
          content,
          createdAt: timestamp.toISOString(),
          messageType: type,
          from: "agent",
        };
        io.to(`conversation:${conversation.id}`).emit("new-message", payload);
        io.to(`channel:${channelId}`).emit("new-message", payload);
        io.to(`channel:${channelId}`).emit("conversation_updated", {
          conversationId: conversation.id,
          lastMessageText: content.substring(0, 200),
          lastMessageAt: timestamp.toISOString(),
        });
      }
    } catch (err) {
      console.error(`[BaileysManager] Error syncing phone outgoing message:`, err);
    }
  }

  static async sendMessage(channelId: string, to: string, text: string, replyToWaId?: string): Promise<any> {
    const sock = this.activeSockets.get(channelId);
    if (!sock) {
      throw new Error(`WhatsApp QR session is disconnected or not initialized for channel ${channelId}`);
    }

    const jid = to.endsWith("@g.us")
      ? to
      : (to.replace(/\D/g, "").startsWith("1") && to.replace(/\D/g, "").length === 15)
        ? `${to.replace(/\D/g, "")}@lid`
        : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    const options: any = {};
    if (replyToWaId) {
      options.quoted = { key: { id: replyToWaId, remoteJid: jid } };
    }

    // Emulate human composing behaviour
    try {
      await sock.sendPresenceUpdate("composing", jid);
      await delay(1000);
      await sock.sendPresenceUpdate("paused", jid);
    } catch (presenceErr) {
      console.warn(`[BaileysManager] Failed to send presence update (non-fatal):`, presenceErr);
    }

    const result = await sock.sendMessage(jid, { text }, options);
    console.log(`[BaileysManager] Sent text message via Baileys to ${to}: ${text.substring(0, 50)}`);
    
    return {
      messages: [{ id: result.key.id }],
      _via: "baileys"
    };
  }

  static async sendMediaMessage(
    channelId: string,
    to: string,
    media: { buffer?: Buffer; url?: string; mimeType?: string; filename?: string; ptt?: boolean },
    caption?: string,
    replyToWaId?: string
  ): Promise<any> {
    const sock = this.activeSockets.get(channelId);
    if (!sock) {
      throw new Error(`WhatsApp QR session is disconnected or not initialized for channel ${channelId}`);
    }

    const jid = to.endsWith("@g.us")
      ? to
      : (to.replace(/\D/g, "").startsWith("1") && to.replace(/\D/g, "").length === 15)
        ? `${to.replace(/\D/g, "")}@lid`
        : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    const options: any = {};
    if (replyToWaId) {
      options.quoted = { key: { id: replyToWaId, remoteJid: jid } };
    }

    const finalUrlCheck = media.url;
    const isYoutube = finalUrlCheck && (finalUrlCheck.includes('youtube.com') || finalUrlCheck.includes('youtu.be') || finalUrlCheck.includes('youtube-nocookie.com'));

    if (isYoutube) {
      const textMessage = caption ? `${caption}\n\n${finalUrlCheck}` : finalUrlCheck;
      console.log(`[YouTube Link] Intercepted YouTube link in Baileys sendMediaMessage. Sending as text message: ${finalUrlCheck}`);
      return this.sendMessage(channelId, to, textMessage, replyToWaId);
    }

    const mime = media.mimeType || "";
    let messageContent: any = {};

    let finalUrl = media.url;
    let fileBuffer = media.buffer;

    if (finalUrl && finalUrl.startsWith("http")) {
      try {
        const { createDOClient } = await import("../config/digitalOceanConfig");
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        
        const doClient = await createDOClient();
        if (doClient) {
          const { s3, bucket, endpoint } = doClient;
          const isOurBucket = finalUrl.includes(bucket) || (endpoint && finalUrl.includes(new URL(endpoint).host));
          
          if (isOurBucket) {
            let key = "";
            if (finalUrl.includes(`/${bucket}/`)) {
              key = finalUrl.substring(finalUrl.indexOf(`/${bucket}/`) + bucket.length + 2);
            } else {
              const parsedUrl = new URL(finalUrl);
              key = parsedUrl.pathname.replace(/^\/+/, "");
            }
            key = decodeURIComponent(key);
            
            console.log(`[BaileysManager] S3 match found! Downloading private S3 object. Bucket: ${bucket}, Key: ${key}`);
            const response = await s3.send(
              new GetObjectCommand({
                Bucket: bucket,
                Key: key,
              })
            );
            if (response.Body) {
              const byteArray = await response.Body.transformToByteArray();
              fileBuffer = Buffer.from(byteArray);
              finalUrl = undefined;
              console.log(`[BaileysManager] Successfully fetched buffer directly from S3 client for ${key}`);
            }
          }
        }
      } catch (err) {
        console.error("[BaileysManager] Failed to fetch object directly from S3:", err);
      }
    }

    if (finalUrl && finalUrl.startsWith("/uploads/")) {
      const cleanPath = finalUrl.replace(/^\/+/, "");
      let absolutePath = path.join(process.cwd(), cleanPath);
      
      if (!fs.existsSync(absolutePath)) {
        const filename = path.basename(cleanPath);
        const uploadsDir = path.join(process.cwd(), "uploads");
        
        const findFileRecursive = (dir: string, targetName: string): string | null => {
          if (!fs.existsSync(dir)) return null;
          try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const fullPath = path.join(dir, item);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                const found = findFileRecursive(fullPath, targetName);
                if (found) return found;
              } else if (item === targetName) {
                return fullPath;
              }
            }
          } catch (e) {
            console.error(`[BaileysManager] Error reading dir ${dir}:`, e);
          }
          return null;
        };

        const healedPath = findFileRecursive(uploadsDir, filename);
        if (healedPath) {
          absolutePath = healedPath;
          console.log(`[BaileysManager] Healed path from ${cleanPath} to ${healedPath}`);
        }
      }
      
      finalUrl = absolutePath;
      console.log(`[BaileysManager] Resolved local media path: ${finalUrl}`);
    }
    
    let mediaSource = fileBuffer || { url: finalUrl };
    let tempVoiceFile: string | null = null;
    if (fileBuffer && (media as any).ptt && mime.startsWith("audio")) {
      tempVoiceFile = path.join(process.cwd(), "uploads", `voicenote_${Date.now()}_${randomUUID().substring(0, 8)}.ogg`);
      fs.writeFileSync(tempVoiceFile, fileBuffer);
      mediaSource = { url: tempVoiceFile };
      console.log(`[BaileysManager] Created temp voice note file for Baileys upload: ${tempVoiceFile}`);
    }

    if (mime.startsWith("image")) {
      messageContent = { image: mediaSource, caption };
    } else if (mime.startsWith("video")) {
      messageContent = { video: mediaSource, caption };
    } else if (mime.startsWith("audio")) {
      messageContent = { 
        audio: mediaSource, 
        mimetype: (media as any).ptt ? "audio/ogg; codecs=opus" : mime, 
        ptt: (media as any).ptt || false 
      };
    } else {
      messageContent = { 
        document: mediaSource, 
        mimetype: mime, 
        fileName: media.filename || "file",
        caption 
      };
    }

    try {
      const result = await sock.sendMessage(jid, messageContent, options);
      console.log(`[BaileysManager] Sent media message via Baileys to ${to}`);

      return {
        messages: [{ id: result.key.id }],
        _via: "baileys"
      };
    } finally {
      if (tempVoiceFile && fs.existsSync(tempVoiceFile)) {
        try {
          fs.unlinkSync(tempVoiceFile);
          console.log(`[BaileysManager] Cleaned up temp voice note file: ${tempVoiceFile}`);
        } catch (e) {
          console.error(`[BaileysManager] Failed to clean up temp voice note file:`, e);
        }
      }
    }
  }

  static async markMessageAsRead(channelId: string, to: string, whatsappMessageId: string): Promise<void> {
    const sock = this.activeSockets.get(channelId);
    if (!sock) {
      console.warn(`[BaileysManager] No active socket for channel ${channelId} to mark read`);
      return;
    }

    try {
      const jid = to.endsWith("@g.us")
        ? to
        : (to.replace(/\D/g, "").startsWith("1") && to.replace(/\D/g, "").length === 15)
          ? `${to.replace(/\D/g, "")}@lid`
          : `${to.replace(/\D/g, "")}@s.whatsapp.net`;

      console.log(`[BaileysManager] Sending read receipt for message ${whatsappMessageId} in ${jid}`);
      
      await sock.readMessages([
        {
          remoteJid: jid,
          id: whatsappMessageId,
          fromMe: false,
        }
      ]);
    } catch (err) {
      console.error(`[BaileysManager] Failed to mark message as read:`, err);
    }
  }

  static async deleteSession(channelId: string): Promise<void> {
    console.log(`[BaileysManager] Deleting session for channel ${channelId}`);
    const sock = this.activeSockets.get(channelId);
    if (sock) {
      try {
        await sock.logout();
      } catch (err) {
        console.warn(`[BaileysManager] Logout warning for ${channelId}:`, err);
      }
      this.activeSockets.delete(channelId);
    }
    this.qrStates.delete(channelId);

    const sessionPath = path.join(process.cwd(), "server/sessions", channelId);
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn(`[BaileysManager] Failed to delete session directory:`, rmErr);
    }
  }

  static async initAllActiveSessions(): Promise<void> {
    try {
      console.log(`[BaileysManager] Auto-initializing all QR channels...`);
      const activeQrChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.connectionMethod, "qr_code"));

      console.log(`[BaileysManager] Found ${activeQrChannels.length} QR channels.`);
      for (const channel of activeQrChannels) {
        try {
          await this.createSession(channel.id, channel.name, channel.phoneNumber || undefined);
        } catch (chErr) {
          console.error(`[BaileysManager] Failed to auto-initialize QR channel ${channel.id}:`, chErr);
        }
      }
    } catch (err) {
      console.error(`[BaileysManager] Failed to query active QR channels on startup:`, err);
    }
  }

  static async updateQrMessageStatus(whatsappMessageId: string, status: "delivered" | "read") {
    try {
      console.log(`[BaileysManager] Updating QR message status: ${whatsappMessageId} -> ${status}`);
      const [queueEntry] = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.whatsappMessageId, whatsappMessageId))
        .limit(1);

      if (!queueEntry) {
        console.log(`[BaileysManager] Queue entry not found for WhatsApp ID: ${whatsappMessageId}`);
        return;
      }

      const alreadyDelivered = !!queueEntry.deliveredAt;
      const alreadyRead = !!queueEntry.readAt;

      const updateFields: Record<string, any> = {};
      let shouldIncrementDelivered = false;
      let shouldIncrementRead = false;
      const now = new Date();

      if (status === "delivered" && !alreadyDelivered && !alreadyRead) {
        updateFields.status = "delivered";
        updateFields.deliveredAt = now;
        shouldIncrementDelivered = true;
      } else if (status === "read" && !alreadyRead) {
        updateFields.status = "read";
        updateFields.readAt = now;
        shouldIncrementRead = true;
        if (!alreadyDelivered) {
          updateFields.deliveredAt = now;
          shouldIncrementDelivered = true;
        }
      }

      const campaignId = queueEntry.campaignId;

      if (Object.keys(updateFields).length > 0) {
        await db
          .update(messageQueue)
          .set(updateFields)
          .where(eq(messageQueue.id, queueEntry.id));

        if (campaignId) {
          await db
            .update(campaignRecipients)
            .set(updateFields)
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignId),
                eq(campaignRecipients.phone, queueEntry.recipientPhone)
              )
            );

          const counterUpdate: Record<string, any> = {};
          if (shouldIncrementDelivered) {
            counterUpdate.deliveredCount = sql`COALESCE(${campaigns.deliveredCount}, 0) + 1`;
          }
          if (shouldIncrementRead) {
            counterUpdate.readCount = sql`COALESCE(${campaigns.readCount}, 0) + 1`;
          }
          if (Object.keys(counterUpdate).length > 0) {
            await db.update(campaigns).set(counterUpdate).where(eq(campaigns.id, campaignId));
          }
        }

        // Update messages table if it exists
        const message = await storage.getMessageByWhatsAppId(whatsappMessageId);
        if (message) {
          await storage.updateMessageStatus(message.id, status);
        }
      }
    } catch (err) {
      console.error(`[BaileysManager] Failed to update message status for ${whatsappMessageId}:`, err);
    }
  }
}
