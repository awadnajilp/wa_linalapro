import cron from "node-cron";
import { db } from "../db";
import { 
  crmDeals, 
  crmDealFollowups, 
  crmCadenceSteps, 
  crmCadences, 
  contacts, 
  conversations, 
  messageQueue, 
  channels 
} from "@shared/schema";
import { eq, and, lte, asc } from "drizzle-orm";

export function startCrmFollowupCron() {
  console.log("⏰ [CRM Followups] Starting background cadence follow-up job...");

  // Runs every minute to evaluate scheduled steps
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // A. Process custom automated follow-ups first
      try {
        const pendingDeals = await db
          .select()
          .from(crmDeals)
          .where(
            and(
              eq(crmDeals.status, "open"),
              eq(crmDeals.followUpStatus, "pending"),
              eq(crmDeals.isAutomatedFollowUpEnabled, true),
              lte(crmDeals.customFollowUpDate, now)
            )
          );

        for (const deal of pendingDeals) {
          try {
            // Check if there is an active cadence for this deal's stage
            const [cadence] = await db
              .select()
              .from(crmCadences)
              .where(
                and(
                  eq(crmCadences.triggerStageId, deal.stageId),
                  eq(crmCadences.isActive, true)
                )
              )
              .limit(1);

            if (cadence) {
              console.log(`⏰ [CRM Followups] Skipping custom automated followup for Deal ${deal.id} because a cadence is already active for stage ${deal.stageId}`);
              continue;
            }

            // Fetch contact
            const [contact] = await db
              .select()
              .from(contacts)
              .where(eq(contacts.id, deal.contactId))
              .limit(1);

            if (!contact) {
              await db
                .update(crmDeals)
                .set({ followUpStatus: "failed" })
                .where(eq(crmDeals.id, deal.id));
              continue;
            }

            // Inject message into queue
            const isTemplate = !!deal.followUpTemplateName;
            await db.insert(messageQueue).values({
              channelId: deal.channelId,
              recipientPhone: contact.phone,
              messageType: "utility",
              status: "queued",
              dealId: deal.id,
              templateName: isTemplate ? deal.followUpTemplateName : null,
              templateLanguage: isTemplate ? deal.followUpTemplateLanguage : "en_US",
              templateParams: isTemplate ? (deal.followUpTemplateVariables || []) : { customMessage: deal.followUpMessage || "" },
              sentVia: "marketing_messages",
            });

            // Update deal followUpStatus to sent
            await db
              .update(crmDeals)
              .set({ followUpStatus: "sent" })
              .where(eq(crmDeals.id, deal.id));

            console.log(`🚀 [CRM Followups] Successfully queued custom automated followup message to ${contact.phone} for Deal ${deal.title}`);
          } catch (dealErr) {
            console.error(`❌ [CRM Followups] Error processing custom deal followup for Deal ${deal.id}:`, dealErr);
          }
        }
      } catch (err) {
        console.error("❌ [CRM Followups] Error in custom deal followup check:", err);
      }

      // B. Process standard scheduled cadence follow-ups next
      const pendingFollowups = await db
        .select()
        .from(crmDealFollowups)
        .where(
          and(
            eq(crmDealFollowups.status, "pending"),
            lte(crmDealFollowups.scheduledFor, now)
          )
        );

      if (pendingFollowups.length > 0) {
        console.log(`⏰ [CRM Followups] Processing ${pendingFollowups.length} pending follow-up steps...`);
      }

      for (const followup of pendingFollowups) {
        try {
          // 2. Fetch step details
          const [step] = await db
            .select()
            .from(crmCadenceSteps)
            .where(eq(crmCadenceSteps.id, followup.stepId))
            .limit(1);

          if (!step) {
            await db
              .update(crmDealFollowups)
              .set({ status: "failed" })
              .where(eq(crmDealFollowups.id, followup.id));
            continue;
          }

          // 3. Fetch deal details
          const [deal] = await db
            .select()
            .from(crmDeals)
            .where(eq(crmDeals.id, followup.dealId))
            .limit(1);

          if (!deal) {
            await db
              .update(crmDealFollowups)
              .set({ status: "failed" })
              .where(eq(crmDealFollowups.id, followup.id));
            continue;
          }

          // 4. Load contact
          const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, deal.contactId))
            .limit(1);

          if (!contact) {
            await db
              .update(crmDealFollowups)
              .set({ status: "failed" })
              .where(eq(crmDealFollowups.id, followup.id));
            continue;
          }

          // 5. Load active cadence triggers
          const [cadence] = await db
            .select()
            .from(crmCadences)
            .where(eq(crmCadences.id, step.cadenceId))
            .limit(1);

          const stopCondition = cadence?.stopCondition || "reply_or_close";

          // 6. Check stop conditions
          let shouldCancel = false;

          // Condition 1: Deal status is not open
          if (deal.status !== "open") {
            shouldCancel = true;
          }

          // Condition 2: Customer has replied since entering this stage
          if (!shouldCancel && stopCondition === "reply_or_close") {
            const [conversation] = await db
              .select()
              .from(conversations)
              .where(
                and(
                  eq(conversations.contactId, deal.contactId),
                  eq(conversations.channelId, deal.channelId)
                )
              )
              .limit(1);

            if (conversation?.lastIncomingMessageAt && deal.updatedAt) {
              const replyTime = new Date(conversation.lastIncomingMessageAt).getTime();
              const stageTime = new Date(deal.updatedAt).getTime();
              
              if (replyTime > stageTime) {
                shouldCancel = true;
                console.log(`⏰ [CRM Followups] Stop Condition met: Contact replied at ${conversation.lastIncomingMessageAt.toISOString()} (Stage entered: ${deal.updatedAt.toISOString()})`);
              }
            }
          }

          if (shouldCancel) {
            // Cancel this and all other pending steps for this deal
            await db
              .update(crmDealFollowups)
              .set({ status: "cancelled" })
              .where(
                and(
                  eq(crmDealFollowups.dealId, deal.id),
                  eq(crmDealFollowups.status, "pending")
                )
              );
            
            // Mark current as cancelled
            await db
              .update(crmDealFollowups)
              .set({ status: "cancelled" })
              .where(eq(crmDealFollowups.id, followup.id));

            console.log(`🧹 [CRM Followups] Cancelled remaining follow-ups for closed/replied Deal ${deal.id}`);
            continue;
          }

          // 7. Inject message into queue (respects the warmer and channel delays!)
          const isTemplate = step.messageType === "template";
          
          await db.insert(messageQueue).values({
            channelId: cadence?.sendChannelId || deal.channelId,
            recipientPhone: contact.phone,
            messageType: "utility",
            status: "queued",
            dealId: deal.id,
            templateName: isTemplate ? step.templateName : null,
            templateLanguage: isTemplate ? step.templateLanguage : "en_US",
            templateParams: isTemplate 
              ? (step.mediaUrl 
                ? [
                    {
                      type: "header",
                      parameters: [
                        {
                          type: step.mediaType || "image",
                          [step.mediaType || "image"]: {
                            link: step.mediaUrl,
                            ...(step.mediaName ? { filename: step.mediaName } : {})
                          }
                        }
                      ]
                    }
                  ] 
                : []) 
              : { 
                  customMessage: step.messageText || "", 
                  mediaUrl: step.mediaUrl || null, 
                  mediaType: step.mediaType || null, 
                  mediaName: step.mediaName || null 
                },
            sentVia: "marketing_messages",
          });

          // 8. Update follow-up status to sent
          await db
            .update(crmDealFollowups)
            .set({
              status: "sent",
              sentAt: new Date(),
            })
            .where(eq(crmDealFollowups.id, followup.id));

          console.log(`🚀 [CRM Followups] Successfully queued cadence Step ${step.stepNumber} to ${contact.phone} for Deal ${deal.title}`);
        } catch (stepError) {
          console.error(`❌ [CRM Followups] Error processing follow-up step ${followup.id}:`, stepError);
        }
      }
    } catch (cronError) {
      console.error("❌ [CRM Followups] Error in follow-up cron worker loop:", cronError);
    }
  });
}
