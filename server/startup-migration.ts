/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Idempotent startup migration — runs on every server boot.
 * Uses raw SQL with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards
 * so it is always safe to re-run and never breaks a fresh install.
 *
 * Background: the project uses `db:push` for schema changes, which
 * means any client that did not run `db:push` after an update will
 * have a stale database.  This file self-heals those databases.
 */

import type { Pool, PoolClient } from "pg";

interface MigrationStep {
  description: string;
  sql: string;
}

function addColumnIfNotExists(
  table: string,
  column: string,
  definition: string
): MigrationStep {
  return {
    description: `Add ${table}.${column}`,
    sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition};`,
  };
}

const steps: MigrationStep[] = [
  // ────────────────────────────────────────────────────
  // campaigns
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "population_started_at",
    "TIMESTAMP"
  ),
  addColumnIfNotExists(
    "campaigns",
    "non_deliverable_count",
    "INTEGER DEFAULT 0"
  ),

  // ────────────────────────────────────────────────────
  // automation_edges
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_edges",
    "source_handle",
    "VARCHAR"
  ),
  {
    description: "Recreate automation_edges unique constraint to include source_handle",
    sql: `
      ALTER TABLE automation_edges DROP CONSTRAINT IF EXISTS automation_edges_unique_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS automation_edges_unique_handle_idx
        ON automation_edges (automation_id, source_node_id, target_node_id, COALESCE(source_handle, ''));
    `,
  },

  // ────────────────────────────────────────────────────
  // automation_executions
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "automation_executions",
    "trigger_message_id",
    "VARCHAR(200)"
  ),
  {
    description: "Create automation_executions_message_unique_idx",
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS automation_executions_message_unique_idx
        ON automation_executions (automation_id, conversation_id, trigger_message_id);
    `,
  },

  // ────────────────────────────────────────────────────
  // channels
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "channels",
    "is_coexistence",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists(
    "channels",
    "health_status",
    "TEXT DEFAULT 'unknown'"
  ),
  addColumnIfNotExists("channels", "last_health_check", "TIMESTAMP"),
  addColumnIfNotExists(
    "channels",
    "health_details",
    "JSONB DEFAULT '{}'"
  ),
  addColumnIfNotExists(
    "channels",
    "connection_method",
    "VARCHAR(20) DEFAULT 'embedded'"
  ),

  // ────────────────────────────────────────────────────
  // conversations
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "conversations",
    "last_incoming_message_at",
    "TIMESTAMP"
  ),
  addColumnIfNotExists("conversations", "last_message_text", "TEXT"),
  addColumnIfNotExists("conversations", "chatbot_id", "VARCHAR"),
  addColumnIfNotExists("conversations", "session_id", "TEXT"),
  addColumnIfNotExists(
    "conversations",
    "unread_count",
    "INTEGER DEFAULT 0"
  ),

  // ────────────────────────────────────────────────────
  // messages
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("messages", "error_details", "JSONB"),
  addColumnIfNotExists("messages", "media_sha256", "VARCHAR(128)"),
  addColumnIfNotExists("messages", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "read_at", "TIMESTAMP"),
  addColumnIfNotExists("messages", "error_code", "VARCHAR(50)"),
  addColumnIfNotExists("messages", "error_message", "TEXT"),
  addColumnIfNotExists("messages", "campaign_id", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // users
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("users", "fcm_token", "VARCHAR(512)"),
  addColumnIfNotExists(
    "users",
    "is_email_verified",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists("users", "stripe_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "razorpay_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paypal_customer_id", "VARCHAR"),
  addColumnIfNotExists("users", "paystack_customer_code", "VARCHAR"),
  addColumnIfNotExists("users", "mercadopago_customer_id", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // plans
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("plans", "stripe_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "stripe_price_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "razorpay_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_product_id", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_monthly", "VARCHAR"),
  addColumnIfNotExists("plans", "paypal_plan_id_annual", "VARCHAR"),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "paystack_plan_code_annual",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_monthly",
    "VARCHAR"
  ),
  addColumnIfNotExists(
    "plans",
    "mercadopago_plan_id_annual",
    "VARCHAR"
  ),

  // ────────────────────────────────────────────────────
  // subscriptions
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "subscriptions",
    "gateway_subscription_id",
    "VARCHAR"
  ),
  addColumnIfNotExists("subscriptions", "gateway_provider", "VARCHAR"),
  addColumnIfNotExists("subscriptions", "gateway_status", "VARCHAR"),

  // ────────────────────────────────────────────────────
  // message_queue
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "message_queue",
    "template_language",
    "VARCHAR(20) DEFAULT 'en_US'"
  ),
  addColumnIfNotExists("message_queue", "sent_via", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "cost", "VARCHAR(20)"),
  addColumnIfNotExists("message_queue", "delivered_at", "TIMESTAMP"),
  addColumnIfNotExists("message_queue", "read_at", "TIMESTAMP"),

  // ────────────────────────────────────────────────────
  // ai_settings
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "ai_settings",
    "words",
    "TEXT[] DEFAULT ARRAY[]::text[]"
  ),

  // ────────────────────────────────────────────────────
  // templates
  // ────────────────────────────────────────────────────
  addColumnIfNotExists("templates", "rejection_reason", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "media_type",
    "TEXT DEFAULT 'text'"
  ),
  addColumnIfNotExists("templates", "media_url", "TEXT"),
  addColumnIfNotExists("templates", "media_handle", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "carousel_cards",
    "JSONB DEFAULT '[]'"
  ),
  addColumnIfNotExists("templates", "whatsapp_template_id", "TEXT"),
  addColumnIfNotExists(
    "templates",
    "usage_count",
    "INTEGER DEFAULT 0"
  ),
  addColumnIfNotExists("templates", "header_type", "TEXT"),
  addColumnIfNotExists("templates", "body_variables", "INTEGER"),

  // ────────────────────────────────────────────────────
  // campaigns
  // ────────────────────────────────────────────────────
  addColumnIfNotExists(
    "campaigns",
    "replied_count",
    "INTEGER DEFAULT 0"
  ),

  // ────────────────────────────────────────────────────
  // New tables — CREATE TABLE IF NOT EXISTS guards
  // ────────────────────────────────────────────────────
  {
    description: "Create table channel_signup_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS channel_signup_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       VARCHAR NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'incomplete',
        step          VARCHAR(50) NOT NULL DEFAULT 'token_exchange',
        error_message TEXT,
        error_details JSONB,
        phone_number  TEXT,
        waba_id       TEXT,
        channel_id    VARCHAR,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_api_keys (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_keys (
        id                    VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               VARCHAR NOT NULL,
        channel_id            VARCHAR,
        name                  VARCHAR(100) NOT NULL,
        api_key               VARCHAR(64) NOT NULL UNIQUE,
        secret_hash           VARCHAR(256) NOT NULL,
        permissions           JSONB DEFAULT '[]',
        is_active             BOOLEAN DEFAULT true,
        last_used_at          TIMESTAMP,
        request_count         INTEGER DEFAULT 0,
        monthly_request_count INTEGER DEFAULT 0,
        monthly_reset_at      TIMESTAMP,
        created_at            TIMESTAMP DEFAULT NOW(),
        revoked_at            TIMESTAMP
      );
    `,
  },
  {
    description: "Create table client_api_usage_logs (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_api_usage_logs (
        id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id    VARCHAR NOT NULL,
        user_id       VARCHAR NOT NULL,
        channel_id    VARCHAR,
        endpoint      VARCHAR(255) NOT NULL,
        method        VARCHAR(10) NOT NULL,
        status_code   INTEGER,
        response_time INTEGER,
        ip_address    VARCHAR(45),
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table client_webhooks (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS client_webhooks (
        id                 VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            VARCHAR NOT NULL,
        channel_id         VARCHAR,
        url                TEXT NOT NULL,
        secret             VARCHAR(256),
        events             JSONB DEFAULT '[]',
        is_active          BOOLEAN DEFAULT true,
        last_triggered_at  TIMESTAMP,
        failure_count      INTEGER DEFAULT 0,
        created_at         TIMESTAMP DEFAULT NOW(),
        updated_at         TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table platform_languages (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS platform_languages (
        id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code         VARCHAR(10) NOT NULL UNIQUE,
        name         VARCHAR(100) NOT NULL,
        native_name  VARCHAR(100) NOT NULL,
        icon         VARCHAR(10),
        direction    VARCHAR(3) NOT NULL DEFAULT 'ltr',
        is_enabled   BOOLEAN NOT NULL DEFAULT true,
        is_default   BOOLEAN NOT NULL DEFAULT false,
        translations JSONB DEFAULT '{}',
        sort_order   INTEGER DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description:
      "Create table whatsapp_business_accounts_config (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS whatsapp_business_accounts_config (
        id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id     TEXT NOT NULL,
        app_secret TEXT NOT NULL,
        config_id  TEXT NOT NULL,
        created_by VARCHAR DEFAULT '',
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    description: "Create table contact_campaigns (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS contact_campaigns (
        id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id        VARCHAR NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        channel_id        VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        name              TEXT NOT NULL,
        template_id       VARCHAR REFERENCES templates(id) ON DELETE SET NULL,
        template_name     TEXT,
        template_language  TEXT,
        variable_mapping  JSONB DEFAULT '{}',
        custom_message    TEXT,
        media_url         TEXT,
        media_mime_type   TEXT,
        media_name        TEXT,
        frequency         TEXT NOT NULL,
        scheduled_date    TIMESTAMP NOT NULL,
        next_send_at      TIMESTAMP NOT NULL,
        last_sent_at      TIMESTAMP,
        status            TEXT DEFAULT 'active',
        created_at        TIMESTAMP DEFAULT NOW(),
        updated_at        TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS contact_campaigns_contact_idx ON contact_campaigns (contact_id);
      CREATE INDEX IF NOT EXISTS contact_campaigns_next_send_idx ON contact_campaigns (next_send_at);
      CREATE INDEX IF NOT EXISTS contact_campaigns_status_idx ON contact_campaigns (status);
    `,
  },
  {
    description: "Create table contact_campaign_templates (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS contact_campaign_templates (
        id                 VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id         VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        name               TEXT NOT NULL,
        custom_message     TEXT,
        media_url          TEXT,
        media_mime_type    TEXT,
        media_name         TEXT,
        created_at         TIMESTAMP DEFAULT NOW(),
        updated_at         TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS contact_campaign_templates_channel_idx ON contact_campaign_templates (channel_id);
    `,
  },
  addColumnIfNotExists(
    "users",
    "round_robin_capacity",
    "INTEGER DEFAULT 0"
  ),
  {
    description: "Backfill non_deliverable_count and failed_count on existing campaigns",
    sql: `
      UPDATE campaigns c
      SET non_deliverable_count = COALESCE((
        SELECT COUNT(*)::integer FROM campaign_recipients cr
        WHERE cr.campaign_id = c.id
          AND cr.status = 'failed'
          AND cr.error_code ~ '^[0-9]+$'
          AND (cr.error_code::integer BETWEEN 130000 AND 136000 OR cr.error_code::integer IN (100, 190, 200, 368))
      ), 0),
      failed_count = COALESCE((
        SELECT COUNT(*)::integer FROM campaign_recipients cr
        WHERE cr.campaign_id = c.id
          AND cr.status = 'failed'
          AND (
            cr.error_code IS NULL 
            OR NOT (
              cr.error_code ~ '^[0-9]+$'
              AND (cr.error_code::integer BETWEEN 130000 AND 136000 OR cr.error_code::integer IN (100, 190, 200, 368))
            )
          )
      ), 0);
    `,
  },
  addColumnIfNotExists(
    "users",
    "wallet_enabled",
    "BOOLEAN DEFAULT false"
  ),
  addColumnIfNotExists(
    "panel_config",
    "wallet_settings",
    "JSONB DEFAULT '{\"upiId\": \"\", \"bankDetails\": \"\", \"marketingMargin\": 0, \"utilityMargin\": 0, \"authMargin\": 0, \"serviceMargin\": 0, \"qrMargin\": 0, \"qrPrice\": 0.0001, \"exchangeRates\": {\"USD\": 1.0, \"INR\": 83.0, \"AED\": 3.67, \"SAR\": 3.75, \"GBP\": 0.78, \"EUR\": 0.92, \"KWD\": 0.31, \"BHD\": 0.38, \"OMR\": 0.38, \"QAR\": 3.64, \"EGP\": 48.0}}'::jsonb"
  ),
  {
    description: "Create table wallets (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS wallets (
        id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        balance     NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
        currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS wallets_user_idx ON wallets (user_id);
    `,
  },
  {
    description: "Create table wallet_transactions (if not exists)",
    sql: `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        VARCHAR NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        amount         NUMERIC(12, 4) NOT NULL,
        currency       VARCHAR(10) NOT NULL DEFAULT 'USD',
        type           VARCHAR(20) NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending',
        receipt_url    TEXT,
        reference_id   VARCHAR,
        description    TEXT,
        verified_by    VARCHAR REFERENCES users (id) ON DELETE SET NULL,
        verified_at    TIMESTAMP,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS wt_user_idx ON wallet_transactions (user_id);
      CREATE INDEX IF NOT EXISTS wt_status_idx ON wallet_transactions (status);
    `,
  },
];

/**
 * Query existing columns across all tables we intend to alter so we can
 * report what was actually added vs already present.
 */
async function getExistingColumns(
  client: PoolClient
): Promise<Set<string>> {
  const { rows } = await client.query<{ key: string }>(`
    SELECT table_name || '.' || column_name AS key
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  return new Set(rows.map((r: { key: string }) => r.key));
}

async function getExistingTables(
  client: PoolClient
): Promise<Set<string>> {
  const { rows } = await client.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set(rows.map((r: { table_name: string }) => r.table_name));
}

export async function runStartupMigration(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const beforeColumns = await getExistingColumns(client);
    const beforeTables = await getExistingTables(client);

    const errors: string[] = [];

    for (const step of steps) {
      try {
        await client.query(step.sql);
      } catch (err: any) {
        errors.push(
          `[startup-migration] FAILED — ${step.description}: ${err.message}`
        );
      }
    }

    // A. Ensure "new_message_digest" template has the updated label
    try {
      await client.query(`
        UPDATE notification_templates 
        SET label = 'Inbox Summary Notifications', 
            description = 'Sent as an email summary when customer messages are unreplied or multiple messages are received'
        WHERE event_type = 'new_message_digest' AND (label = 'New Messages Digest' OR label = 'New Message Digest');
      `);
    } catch (err: any) {
      console.error("[startup-migration] Error updating new_message_digest template:", err.message);
    }

    // B. Ensure "lead_assigned" template exists
    try {
      const leadTmplCheck = await client.query(`
        SELECT id FROM notification_templates WHERE event_type = 'lead_assigned';
      `);

      if (leadTmplCheck.rows.length === 0) {
        console.log("[startup-migration] Seeding missing 'lead_assigned' notification template...");
        await client.query(`
          INSERT INTO notification_templates (event_type, label, description, subject, html_body, is_email_enabled, is_in_app_enabled, variables, updated_at)
          VALUES (
            'lead_assigned',
            'Lead Assigned',
            'Sent when a new lead/deal is assigned to you in the CRM',
            '[CRM] New Lead Assigned: {{leadName}}',
            '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:8px">
  <div style="background:#10b981;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">👤 New Lead Assigned</h2>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
    <p style="color:#374151;font-size:14px;line-height:1.6">Hello <strong>{{userName}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">A new lead/deal has been assigned to you in the CRM:</p>
    <div style="background:#f3f4f6;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #10b981">
      <p style="margin:4px 0;font-size:14px;color:#1f2937"><strong>Lead Name:</strong> {{leadName}}</p>
      <p style="margin:4px 0;font-size:14px;color:#1f2937"><strong>Deal Title:</strong> {{dealTitle}}</p>
    </div>
    <p style="color:#6b7280;font-size:13px">Log in to your dashboard to view the lead and start follow-ups.</p>
  </div>
</div>',
            false,
            true,
            ARRAY['leadName', 'dealTitle', 'userName'],
            NOW()
          );
        `);
      }
    } catch (err: any) {
      console.error("[startup-migration] Error ensuring lead_assigned template:", err.message);
    }

    // C. Ensure "deal_followup" template exists
    try {
      const dealTmplCheck = await client.query(`
        SELECT id FROM notification_templates WHERE event_type = 'deal_followup';
      `);

      if (dealTmplCheck.rows.length === 0) {
        console.log("[startup-migration] Seeding missing 'deal_followup' notification template...");
        await client.query(`
          INSERT INTO notification_templates (event_type, label, description, subject, html_body, is_email_enabled, is_in_app_enabled, variables, updated_at)
          VALUES (
            'deal_followup',
            'Deal Follow-up',
            'Sent 1 hour before a scheduled deal follow-up',
            '[CRM] Upcoming Follow-up: {{dealTitle}}',
            '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:8px">
  <div style="background:#3b82f6;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">⏰ Upcoming Deal Follow-up</h2>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
    <p style="color:#374151;font-size:14px;line-height:1.6">Hello <strong>{{userName}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">You have an upcoming follow-up scheduled in 1 hour:</p>
    <div style="background:#f3f4f6;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #3b82f6">
      <p style="margin:4px 0;font-size:14px;color:#1f2937"><strong>Deal Title:</strong> {{dealTitle}}</p>
      <p style="margin:4px 0;font-size:14px;color:#1f2937"><strong>Scheduled For:</strong> {{followupTime}}</p>
    </div>
    <p style="color:#6b7280;font-size:13px">Please log in to check the deal notes and contact details.</p>
  </div>
</div>',
            true,
            true,
            ARRAY['dealTitle', 'followupTime', 'userName'],
            NOW()
          );
        `);
      }
    } catch (err: any) {
      console.error("[startup-migration] Error ensuring deal_followup template:", err.message);
    }

    if (errors.length > 0) {
      for (const e of errors) {
        console.error(e);
      }
      throw new Error(
        `Startup migration encountered ${errors.length} error(s). See logs above.`
      );
    }

    const afterColumns = await getExistingColumns(client);
    const afterTables = await getExistingTables(client);

    const addedColumns = [...afterColumns].filter(
      (c) => !beforeColumns.has(c)
    );
    const addedTables = [...afterTables].filter(
      (t) => !beforeTables.has(t)
    );

    if (addedColumns.length === 0 && addedTables.length === 0) {
      console.log("[startup-migration] All schema checks passed — database is up to date.");
    } else {
      if (addedTables.length > 0) {
        console.log(
          `[startup-migration] Created ${addedTables.length} new table(s): ${addedTables.join(", ")}`
        );
      }
      if (addedColumns.length > 0) {
        console.log(
          `[startup-migration] Added ${addedColumns.length} missing column(s): ${addedColumns.join(", ")}`
        );
      }
    }
  } finally {
    client.release();
  }
}
