/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Website: https://diploy.in
 * ============================================================
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

async function backfill() {
  console.log("Starting campaign and message queue stats backfill...");
  try {
    // 1. Sync message_queue with messages status
    console.log("Updating message_queue status from messages table...");
    await db.execute(sql`
      UPDATE message_queue mq
      SET 
        status = CASE 
                   WHEN m.status = 'read' THEN 'read'
                   WHEN m.status = 'delivered' THEN 'delivered'
                   WHEN m.status = 'failed' THEN 'failed'
                   ELSE mq.status
                 END,
        delivered_at = COALESCE(mq.delivered_at, m.delivered_at),
        read_at = COALESCE(mq.read_at, m.read_at),
        error_code = COALESCE(mq.error_code, m.error_code),
        error_message = COALESCE(mq.error_message, m.error_message)
      FROM messages m
      WHERE mq.whatsapp_message_id = m.whatsapp_message_id
        AND mq.whatsapp_message_id IS NOT NULL
        AND mq.status = 'sent';
    `);
    console.log("Message queue sync completed.");

    // 2. Recalculate campaign statistics
    console.log("Recalculating campaign counters...");
    await db.execute(sql`
      UPDATE campaigns c
      SET
        sent_count = (
          SELECT COUNT(*)::int FROM message_queue mq 
          WHERE mq.campaign_id = c.id AND mq.status IN ('sent', 'delivered', 'read')
        ),
        delivered_count = (
          SELECT COUNT(*)::int FROM message_queue mq 
          WHERE mq.campaign_id = c.id AND mq.status IN ('delivered', 'read')
        ),
        read_count = (
          SELECT COUNT(*)::int FROM message_queue mq 
          WHERE mq.campaign_id = c.id AND mq.status = 'read'
        ),
        failed_count = (
          SELECT COUNT(*)::int FROM message_queue mq 
          WHERE mq.campaign_id = c.id AND mq.status = 'failed'
        );
    `);
    console.log("Campaign counters update completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
}

backfill();
