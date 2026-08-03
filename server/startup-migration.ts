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
