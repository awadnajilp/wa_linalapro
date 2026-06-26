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
import { channels, conversations, contacts, messages, warmerConfigs, warmerMessages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WebhookHandler } from "./webhook-handler";
import { randomUUID } from "crypto";
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
        keepAliveIntervalMs: 30000
      });

      this.activeSockets.set(channelId, sock);
      this.qrStates.set(channelId, { status: "pending" });

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
          const connectedPhone = sockUser.id ? sockUser.id.split(":")[0].split("@")[0] : (phoneNumber || "");

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

      // Handle incoming messages!
      sock.ev.on("messages.upsert", async (m) => {
        const message = m.messages[0];
        if (!message) return;

        // Skip status updates and check remoteJid
        const jid = message.key.remoteJid;
        if (!jid || jid === "status@broadcast") return;

        const isGroup = jid.endsWith("@g.us");
        if (isGroup) return; // We only support individual chats for now

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
          content = msg.buttonsResponseMessage.selectedButtonId || msg.buttonsResponseMessage.displayText || "";
          type = "button";
        } else if (msg.templateButtonReplyMessage) {
          content = msg.templateButtonReplyMessage.selectedId || msg.templateButtonReplyMessage.displayText || "";
          type = "button";
        }

        // Check if message is from myself (outgoing)
        if (message.key.fromMe) {
          // Sync outgoing message sent from physical phone
          let recipientPhone = jid.split("@")[0];
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
        let senderPhone = jid.split("@")[0];
        if (jid.endsWith("@lid") && (message.key as any).remoteJidAlt) {
          senderPhone = (message.key as any).remoteJidAlt.split("@")[0];
          console.log(`[BaileysManager] Resolved LID JID mapping: ${jid} -> ${(message.key as any).remoteJidAlt}`);
        }
        console.log(`[BaileysManager] Received incoming message ${messageId} from ${senderPhone} on channel ${channelId}`);

        // Download incoming media if any
        if (msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage) {
          try {
            console.log(`[BaileysManager] Downloading incoming media for message ${messageId}...`);
            const buffer = await downloadMediaMessage(message, "buffer", {}, {});
            
            const mediaMsg = msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage;
            const mimeType = mediaMsg.mimetype || "application/octet-stream";
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
            
            const downloadedUrl = `/uploads/incoming/${filename}`;
            console.log(`[BaileysManager] Media saved to local file: ${filePath}`);
            
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

    let from = key.remoteJid?.split("@")[0] || "";
    if (key.remoteJid?.endsWith("@lid") && (baileysMsg.key as any).remoteJidAlt) {
      from = (baileysMsg.key as any).remoteJidAlt.split("@")[0];
    }
    const id = key.id || "";
    const timestamp = baileysMsg.messageTimestamp 
      ? String(baileysMsg.messageTimestamp) 
      : String(Math.floor(Date.now() / 1000));

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

    const cleaned = to.replace(/\D/g, "");
    const jid = (cleaned.startsWith("1") && cleaned.length === 15)
      ? `${cleaned}@lid`
      : `${cleaned}@s.whatsapp.net`;
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
    media: { buffer?: Buffer; url?: string; mimeType?: string; filename?: string },
    caption?: string,
    replyToWaId?: string
  ): Promise<any> {
    const sock = this.activeSockets.get(channelId);
    if (!sock) {
      throw new Error(`WhatsApp QR session is disconnected or not initialized for channel ${channelId}`);
    }

    const cleaned = to.replace(/\D/g, "");
    const jid = (cleaned.startsWith("1") && cleaned.length === 15)
      ? `${cleaned}@lid`
      : `${cleaned}@s.whatsapp.net`;
    const options: any = {};
    if (replyToWaId) {
      options.quoted = { key: { id: replyToWaId, remoteJid: jid } };
    }

    const mime = media.mimeType || "";
    let messageContent: any = {};

    const mediaSource = media.buffer || { url: media.url };

    if (mime.startsWith("image")) {
      messageContent = { image: mediaSource, caption };
    } else if (mime.startsWith("video")) {
      messageContent = { video: mediaSource, caption };
    } else if (mime.startsWith("audio")) {
      messageContent = { audio: mediaSource, mimetype: mime };
    } else {
      messageContent = { 
        document: mediaSource, 
        mimetype: mime, 
        fileName: media.filename || "file",
        caption 
      };
    }

    const result = await sock.sendMessage(jid, messageContent, options);
    console.log(`[BaileysManager] Sent media message via Baileys to ${to}`);

    return {
      messages: [{ id: result.key.id }],
      _via: "baileys"
    };
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
      console.log(`[BaileysManager] Auto-initializing all active QR channels...`);
      const activeQrChannels = await db
        .select()
        .from(channels)
        .where(and(eq(channels.connectionMethod, "qr_code"), eq(channels.isActive, true)));

      console.log(`[BaileysManager] Found ${activeQrChannels.length} active QR channels.`);
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
}
