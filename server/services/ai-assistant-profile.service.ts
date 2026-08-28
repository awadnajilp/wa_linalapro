import { db } from "../db";
import { aiProfiles, messages, conversations, contacts, channels, users, voiceProfiles, aiSettings } from "@shared/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import OpenAI from "openai";
import { triggerService } from "./automation-execution-service";
import { WhatsAppApiService } from "./whatsapp-api";
import { VoiceManager } from "./voice";
import path from "path";
import fs from "fs";

export class AiAssistantProfileService {
  /**
   * Upload synthesized speech buffer to cloud storage or local fallback.
   */
  private static async uploadAudioBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const localDir = path.join(process.cwd(), "public/uploads/audio");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localPath = path.join(localDir, filename);
    fs.writeFileSync(localPath, buffer);

    let fileUrl = `/uploads/audio/${filename}`;

    try {
      const { createDOClient } = await import("../config/digitalOceanConfig");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const doClient = await createDOClient();
      if (doClient) {
        const { s3, bucket, endpoint } = doClient;
        const fileKey = `uploads/audio/${filename}`;

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
        fileUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;
        
        // Clean local fallback
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    } catch (err) {
      console.error("[AI Assistant Profile] Cloud voice upload failed, using local URL:", err);
      const port = process.env.PORT || 5000;
      fileUrl = `http://localhost:${port}/uploads/audio/${filename}`;
    }

    return fileUrl;
  }

  /**
   * Process incoming message using the user's active AI Assistant Profile.
   * Returns true if handled (replied or automated), false otherwise.
   */
  public static async processIncomingMessage(
    channelId: string,
    contactId: string,
    conversationId: string,
    messageContent: string
  ): Promise<boolean> {
    try {
      const channelRecord = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });
      if (!channelRecord || !channelRecord.aiEnabled) return false;

      const creatorId = channelRecord.createdBy;
      if (!creatorId) return false;

      // 1. Fetch active AI Profile for this channel (scoped per channel)
      const profile = await db.query.aiProfiles.findFirst({
        where: and(eq(aiProfiles.channelId, channelId), eq(aiProfiles.enabled, true)),
      });
      if (!profile) return false;

      console.log(`🤖 [AI Assistant Profile] Running for channel ${channelId}...`);

      // 2. Personal Conversation Check (Ignore replies and storage if detected)
      if (profile.ignorePersonalConversations) {
        const keywords = profile.personalKeywords || [];
        const lowerMsg = messageContent.toLowerCase();
        const hasKeyword = keywords.some(kw => lowerMsg.includes(kw.toLowerCase()));
        if (hasKeyword) {
          console.log(`🤫 [AI Assistant Profile] Ignored personal conversation (message matched personal keywords).`);
          return false;
        }
      }

      // 3. Historical Context Analysis: Analyze the user's past inbox activity/history
      const recentMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(sql`${messages.timestamp} desc`)
        .limit(20);

      // Construct history messages for LLM context
      const chatHistory = [...recentMessages].reverse().map(msg => ({
        role: msg.direction === "inbound" ? ("user" as const) : ("assistant" as const),
        content: msg.content || "",
      }));

      // Add the new message if not already present
      const cleanLastMsg = (messageContent || "").trim();
      const lastMsgInHistory = chatHistory[chatHistory.length - 1];
      if (cleanLastMsg && (!lastMsgInHistory || lastMsgInHistory.role !== "user" || lastMsgInHistory.content.trim() !== cleanLastMsg)) {
        chatHistory.push({
          role: "user",
          content: cleanLastMsg,
        });
      }

      // 4. Retrieve Knowledge Base Context if enabled
      let kbContext = "";
      if (profile.kbEnabled && profile.kbSiteId) {
        try {
          const { searchTrainingData } = await import("./training.service");
          const trainingResults = await searchTrainingData(profile.kbSiteId, channelId, cleanLastMsg);
          if (trainingResults.chunks.length > 0) {
            kbContext += "\n\n--- KNOWLEDGE BASE DATA ---\n";
            kbContext += trainingResults.chunks.join("\n\n");
          }
          if (trainingResults.qaPairs.length > 0) {
            kbContext += "\n\n--- FAQ DATA ---\n";
            for (const qa of trainingResults.qaPairs) {
              kbContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
            }
          }
        } catch (kbErr) {
          console.error("❌ [AI Assistant Profile] KB Search failed:", kbErr);
        }
      }

      // 5. System Prompt Construction
      let systemPrompt = profile.systemPrompt || "You are a fully aware personal assistant.";
      systemPrompt += `\n\n[INSTRUCTIONS]
- You are representing the account owner. Answer naturally, keeping context of historical activity.
- Be extremely conversational, clear, and act as a human assistant.
`;

      if (kbContext) {
        systemPrompt += kbContext;
      }

      // 6. Custom Functions Setup (Trigger Flow option)
      const tools: any[] = [];
      if (profile.triggerFlowEnabled && profile.targetFlowId) {
        tools.push({
          type: "function",
          function: {
            name: "trigger_automation_flow",
            description: profile.triggerFlowPrompt || "Triggers a helper chatbot/automation flow if the user wants to perform an action or process (like catalog, demo, support, pricing, or custom flows).",
            parameters: {
              type: "object",
              properties: {
                reason: { type: "string", description: "The reason why we are triggering the flow." }
              },
              required: ["reason"]
            }
          }
        });
      }

      // 7. Call LLM (using unified keys from active settings / ownerUser)
      let finalApiKey = "";
      const isGroq = profile.llmProvider === "groq";
      const isElevenLabs = profile.llmProvider === "elevenlabs";
      const isSarvam = profile.llmProvider === "sarvam";
      
      const ownerUser = await db.query.users.findFirst({
        where: eq(users.id, creatorId),
      });

      if (isElevenLabs) {
        finalApiKey = ownerUser?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "";
      } else if (isGroq) {
        finalApiKey = ownerUser?.groqApiKey || process.env.GROQ_API_KEY || "";
      } else if (isSarvam) {
        finalApiKey = ownerUser?.sarvamApiKey || process.env.SARVAM_API_KEY || "";
      } else {
        // Fetch OpenAI API Key from active aiSettings table
        let aiSetting = await db
          .select()
          .from(aiSettings)
          .where(and(eq(aiSettings.channelId, channelId), eq(aiSettings.isActive, true)))
          .limit(1);

        if (aiSetting.length === 0) {
          aiSetting = await db
            .select()
            .from(aiSettings)
            .where(eq(aiSettings.channelId, channelId))
            .limit(1);
        }

        if (aiSetting.length === 0) {
          aiSetting = await db
            .select()
            .from(aiSettings)
            .where(eq(aiSettings.isActive, true))
            .limit(1);
        }

        if (aiSetting.length === 0) {
          aiSetting = await db
            .select()
            .from(aiSettings)
            .limit(1);
        }

        const activeAI = aiSetting?.[0];
        if (activeAI && activeAI.apiKey) {
          finalApiKey = activeAI.apiKey;
        }
      }

      if (!finalApiKey) {
        // Absolute fallback to environment variables
        finalApiKey = isElevenLabs 
          ? (process.env.ELEVENLABS_API_KEY || "") 
          : isGroq 
          ? (process.env.GROQ_API_KEY || "") 
          : isSarvam 
          ? (process.env.SARVAM_API_KEY || "") 
          : (process.env.OPENAI_API_KEY || "");
      }

      if (!finalApiKey) {
        console.error("❌ [AI Assistant Profile] Missing LLM API key.");
        return false;
      }

      let responseText = "";
      let functionCalled = false;

      if (isElevenLabs && profile.voiceProfileId) {
        const voiceProfile = await db.query.voiceProfiles.findFirst({
          where: eq(voiceProfiles.id, profile.voiceProfileId),
        });
        if (voiceProfile && voiceProfile.provider === "elevenlabs") {
          const { getElevenLabsAgentResponse } = triggerService.getExecutionService() as any;
          responseText = await getElevenLabsAgentResponse(voiceProfile.voiceId, finalApiKey, cleanLastMsg);
        }
      } else {
        const aiClient = new OpenAI({
          apiKey: finalApiKey,
          baseURL: isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1",
        });

        const messagesToSend = [
          { role: "system" as const, content: systemPrompt },
          ...chatHistory,
        ];

        const finalModel = profile.model || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o");

        const completion = await aiClient.chat.completions.create({
          model: finalModel,
          messages: messagesToSend,
          temperature: profile.temperature || 0.7,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? "auto" : undefined,
        });

        const choice = completion.choices[0]?.message;
        if (!choice) return false;

        // Check for function calls
        if (choice.tool_calls && choice.tool_calls.length > 0) {
          const toolCall = choice.tool_calls[0];
          if (toolCall.function.name === "trigger_automation_flow" && profile.targetFlowId) {
            console.log(`🤖 [AI Assistant Profile] LLM requested to trigger flow ID ${profile.targetFlowId}.`);
            functionCalled = true;

            const executionService = triggerService.getExecutionService();
            await executionService.startExecution(
              profile.targetFlowId,
              conversationId,
              contactId,
              channelId
            );
            return true;
          }
        }

        responseText = choice.content || "";
      }

      if (functionCalled) return true;
      if (!responseText.trim()) return false;

      // 8. Voice Synthesis if voice mode is enabled
      let voiceMediaUrl: string | null = null;
      let voiceMimeType = "audio/ogg; codecs=opus";

      if (profile.voiceEnabled && profile.voiceProfileId) {
        try {
          const voiceProfile = await db.query.voiceProfiles.findFirst({
            where: eq(voiceProfiles.id, profile.voiceProfileId),
          });

          if (voiceProfile) {
            console.log(`🎙️ [AI Assistant Profile] Synthesizing speech via ${voiceProfile.provider}...`);
            const pInstance = VoiceManager.getProvider(voiceProfile.provider);
            
            let synthesizeKey = "";
            if (voiceProfile.provider === "elevenlabs") {
              synthesizeKey = ownerUser?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "";
            } else if (voiceProfile.provider === "sarvam") {
              synthesizeKey = ownerUser?.sarvamApiKey || process.env.SARVAM_API_KEY || "";
            }

            const audioBuffer = await pInstance.synthesize(
              responseText,
              voiceProfile.voiceId,
              profile.voiceLanguage || "en-US",
              { apiKey: synthesizeKey }
            );

            if (audioBuffer) {
              const filename = `ai_profile_voice_${Date.now()}.ogg`;
              voiceMediaUrl = await this.uploadAudioBuffer(audioBuffer, filename, "audio/ogg");
            }
          }
        } catch (vErr) {
          console.error("❌ [AI Assistant Profile] Voice synthesis failed:", vErr);
        }
      }

      // 9. Send the response back via WhatsApp
      const waApi = new WhatsAppApiService(channelRecord);
      const recipient = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId),
      });

      if (recipient) {
        if (voiceMediaUrl) {
          console.log(`🤖 [AI Assistant Profile] Sending voice note reply: ${voiceMediaUrl}`);
          await waApi.sendVoiceNote(recipient.phone, voiceMediaUrl);
          
          const [dbMsg] = await db
            .insert(messages)
            .values({
              conversationId,
              direction: "outbound",
              content: `🎙️ Voice Note: ${responseText}`,
              messageType: "audio",
              mediaUrl: voiceMediaUrl,
              mediaMimeType: voiceMimeType,
              status: "delivered",
              timestamp: new Date(),
            })
            .returning();
          
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              lastMessageText: `🎙️ Voice Note: ${responseText}`,
            })
            .where(eq(conversations.id, conversationId));

          const broadcast = (global as any).broadcastToConversation;
          if (broadcast) broadcast(conversationId, dbMsg);
        } else {
          console.log(`🤖 [AI Assistant Profile] Sending text reply: "${responseText}"`);
          await waApi.sendTextMessage(recipient.phone, responseText);

          const [dbMsg] = await db
            .insert(messages)
            .values({
              conversationId,
              direction: "outbound",
              content: responseText,
              messageType: "text",
              status: "delivered",
              timestamp: new Date(),
            })
            .returning();
          
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              lastMessageText: responseText,
            })
            .where(eq(conversations.id, conversationId));

          const broadcast = (global as any).broadcastToConversation;
          if (broadcast) broadcast(conversationId, dbMsg);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ [AI Assistant Profile] Failed to execute:", error);
      return false;
    }
  }
}
