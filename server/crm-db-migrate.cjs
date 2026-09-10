const { Client } = require('pg');

async function run() {
  const connectionString = "postgresql://walinalapro:walinalapro123@localhost:5432/walinalapro";
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database for CRM migration.");

  try {
    // 1. Add crm_status to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'online';
    `);
    console.log("✓ Added crm_status column to users");

    // 2. Add deal_id to message_queue and create index
    await client.query(`
      ALTER TABLE message_queue 
      ADD COLUMN IF NOT EXISTS deal_id VARCHAR;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS queue_deal_idx ON message_queue (deal_id);
    `);
    console.log("✓ Added deal_id and index to message_queue");

    // 3. Create crm_pipelines
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_pipelines (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Sales Pipeline',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✓ Created crm_pipelines table");

    // 4. Create crm_stages
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_stages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        pipeline_id VARCHAR REFERENCES crm_pipelines(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        color VARCHAR(20) DEFAULT '#cbd5e1'
      );
    `);
    console.log("✓ Created crm_stages table");

    // 5. Create crm_deals
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id VARCHAR REFERENCES contacts(id) ON DELETE CASCADE,
        channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
        stage_id VARCHAR REFERENCES crm_stages(id) ON DELETE RESTRICT,
        title TEXT NOT NULL,
        value NUMERIC(10, 2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        assigned_to VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'open',
        lost_reason TEXT,
        expected_close_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✓ Created crm_deals table");

    // 6. Create crm_cadences
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_cadences (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        trigger_stage_id VARCHAR REFERENCES crm_stages(id) ON DELETE SET NULL,
        stop_condition VARCHAR DEFAULT 'reply_or_close',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✓ Created crm_cadences table");

    // 7. Create crm_cadence_steps
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_cadence_steps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        cadence_id VARCHAR REFERENCES crm_cadences(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        delay_hours INTEGER NOT NULL DEFAULT 24,
        message_type VARCHAR DEFAULT 'text',
        template_name VARCHAR,
        template_language VARCHAR DEFAULT 'en_US',
        message_text TEXT
      );
    `);
    console.log("✓ Created crm_cadence_steps table");

    // 8. Create crm_deal_followups
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_deal_followups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id VARCHAR REFERENCES crm_deals(id) ON DELETE CASCADE,
        step_id VARCHAR REFERENCES crm_cadence_steps(id) ON DELETE CASCADE,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR DEFAULT 'pending',
        sent_at TIMESTAMP
      );
    `);
    console.log("✓ Created crm_deal_followups table");

    // 9. Create crm_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
        is_lead_qualification_enabled BOOLEAN DEFAULT false,
        qualification_flow_id VARCHAR REFERENCES automations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✓ Created crm_settings table");

    console.log("Migration finished successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
