CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('user', 'team', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "addons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) DEFAULT '0',
	"billing_cycle" varchar DEFAULT 'monthly',
	"ai_key_type" text DEFAULT 'tenant',
	"default_credits" integer DEFAULT 0,
	"admin_provider" text DEFAULT 'openai',
	"admin_api_key" text,
	"admin_api_endpoint" text,
	"admin_llm_model" text DEFAULT 'gpt-4o-mini',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "addons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"channel_id" varchar,
	"name" text DEFAULT 'My AI Assistant',
	"enabled" boolean DEFAULT false,
	"llm_provider" varchar(50) DEFAULT 'openai',
	"model" varchar(100) DEFAULT 'gpt-4o',
	"system_prompt" text DEFAULT 'You are a fully aware personal assistant. Speak in a natural, friendly tone.',
	"temperature" real DEFAULT 0.7,
	"voice_enabled" boolean DEFAULT false,
	"voice_profile_id" varchar,
	"voice_language" varchar(50) DEFAULT 'en-US',
	"kb_enabled" boolean DEFAULT false,
	"kb_site_id" varchar,
	"trigger_flow_enabled" boolean DEFAULT false,
	"target_flow_id" varchar,
	"trigger_flow_prompt" text DEFAULT 'Triggers a helper chatbot/automation flow if the user wants to perform an action or process (like catalog, demo, support, pricing, or custom flows).',
	"openai_api_key" text,
	"groq_api_key" text,
	"elevenlabs_api_key" text,
	"sarvam_api_key" text,
	"analyze_inbox_history" boolean DEFAULT false,
	"ignore_personal_conversations" boolean DEFAULT true,
	"personal_keywords" jsonb DEFAULT '["family","personal","private","brother","sister","mom","dad","wife","husband"]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"provider" text DEFAULT 'openai' NOT NULL,
	"api_key" text NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"endpoint" text DEFAULT 'https://api.openai.com/v1',
	"temperature" text DEFAULT '0.7',
	"max_tokens" text DEFAULT '2048',
	"is_active" boolean DEFAULT false,
	"words" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"date" timestamp NOT NULL,
	"messages_sent" integer DEFAULT 0,
	"messages_delivered" integer DEFAULT 0,
	"messages_read" integer DEFAULT 0,
	"messages_replied" integer DEFAULT 0,
	"new_contacts" integer DEFAULT 0,
	"active_campaigns" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"request_type" varchar(50) NOT NULL,
	"endpoint" text NOT NULL,
	"method" varchar(10) NOT NULL,
	"request_body" jsonb,
	"response_status" integer,
	"response_body" jsonb,
	"duration" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_edges" (
	"id" varchar PRIMARY KEY NOT NULL,
	"automation_id" varchar NOT NULL,
	"source_node_id" varchar NOT NULL,
	"target_node_id" varchar NOT NULL,
	"source_handle" varchar,
	"animated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "automation_edges_unique_handle_idx" UNIQUE("automation_id","source_node_id","target_node_id","source_handle")
);
--> statement-breakpoint
CREATE TABLE "automation_execution_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"node_type" text NOT NULL,
	"status" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb,
	"output" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"contact_id" varchar,
	"conversation_id" varchar,
	"trigger_data" jsonb DEFAULT '{}'::jsonb,
	"trigger_message_id" varchar(200),
	"status" text NOT NULL,
	"current_node_id" varchar,
	"execution_path" jsonb DEFAULT '[]'::jsonb,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"result" text,
	"error" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "automation_nodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"position" jsonb DEFAULT '{}'::jsonb,
	"measured" jsonb DEFAULT '{}'::jsonb,
	"data" jsonb DEFAULT '{}'::jsonb,
	"connections" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "automation_nodes_unique_idx" UNIQUE("automation_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'inactive',
	"execution_count" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "broadcast_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channelId" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"contact_id" varchar,
	"phone" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'pending',
	"whatsapp_message_id" varchar,
	"template_params" jsonb DEFAULT '{}'::jsonb,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"error_code" varchar,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"is_stopped" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaign_phone_unique" UNIQUE("campaign_id","phone")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"created_by" varchar,
	"name" text NOT NULL,
	"description" text,
	"campaign_type" text NOT NULL,
	"type" text NOT NULL,
	"api_type" text NOT NULL,
	"template_id" varchar,
	"template_name" text,
	"template_language" text,
	"variable_mapping" jsonb DEFAULT '{}'::jsonb,
	"contact_groups" jsonb DEFAULT '[]'::jsonb,
	"csv_data" jsonb DEFAULT '[]'::jsonb,
	"api_key" varchar,
	"api_endpoint" text,
	"status" text DEFAULT 'draft',
	"scheduled_at" timestamp,
	"recipient_count" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"read_count" integer DEFAULT 0,
	"replied_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"non_deliverable_count" integer DEFAULT 0,
	"completed_at" timestamp,
	"population_started_at" timestamp,
	"custom_message" text,
	"media_url" text,
	"media_mime_type" text,
	"media_name" text,
	"delay_between_messages" integer DEFAULT 10,
	"chunk_size" integer DEFAULT 50,
	"delay_between_chunks" integer DEFAULT 60,
	"warmer_enabled" boolean DEFAULT false,
	"selected_warmer_messages" jsonb DEFAULT '[]'::jsonb,
	"is_recurring" boolean DEFAULT false,
	"recurring_interval" integer,
	"recurring_iterations" integer DEFAULT 3,
	"current_iteration" integer DEFAULT 1,
	"parent_campaign_id" varchar,
	"is_cadence" boolean DEFAULT false,
	"cadence_steps" jsonb DEFAULT '[]'::jsonb,
	"follow_up_only_after_reply_24h" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_signup_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'incomplete' NOT NULL,
	"step" varchar(50) DEFAULT 'token_exchange' NOT NULL,
	"error_message" text,
	"error_details" jsonb,
	"phone_number" text,
	"waba_id" text,
	"channel_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"access_token" text NOT NULL,
	"whatsapp_business_account_id" text,
	"phone_number" text,
	"app_id" text,
	"is_active" boolean DEFAULT true,
	"is_coexistence" boolean DEFAULT false,
	"health_status" text DEFAULT 'unknown',
	"last_health_check" timestamp,
	"health_details" jsonb DEFAULT '{}'::jsonb,
	"connection_method" varchar(20) DEFAULT 'embedded',
	"inbox_ai_settings" jsonb DEFAULT '{}'::jsonb,
	"disable_incoming_inbox" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "chatbots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uuid" text NOT NULL,
	"title" text NOT NULL,
	"bubble_message" text,
	"welcome_message" text,
	"instructions" text,
	"connect_message" text,
	"language" text DEFAULT 'en',
	"interaction_type" text DEFAULT 'ai-only',
	"avatar_id" integer,
	"avatar_emoji" text,
	"avatar_color" text,
	"primary_color" text DEFAULT '#3B82F6',
	"logo_url" text,
	"embed_width" integer DEFAULT 420,
	"embed_height" integer DEFAULT 745,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chatbots_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "client_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"name" varchar(100) NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"secret_hash" varchar(256) NOT NULL,
	"permissions" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0,
	"monthly_request_count" integer DEFAULT 0,
	"monthly_reset_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	CONSTRAINT "client_api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "client_api_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar,
	"url" text NOT NULL,
	"secret" varchar(256),
	"events" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"failure_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_campaign_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"name" text NOT NULL,
	"custom_message" text,
	"media_url" text,
	"media_mime_type" text,
	"media_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"channel_id" varchar NOT NULL,
	"name" text NOT NULL,
	"template_id" varchar,
	"template_name" text,
	"template_language" text,
	"variable_mapping" jsonb DEFAULT '{}'::jsonb,
	"custom_message" text,
	"media_url" text,
	"media_mime_type" text,
	"media_name" text,
	"frequency" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"next_send_at" timestamp NOT NULL,
	"last_sent_at" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"groups" jsonb DEFAULT '[]'::jsonb,
	"broadcast_lists" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active',
	"source" varchar(100),
	"variables" jsonb DEFAULT '{}'::jsonb,
	"last_contact" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar DEFAULT '',
	"is_group" boolean DEFAULT false,
	CONSTRAINT "contacts_channel_phone_unique" UNIQUE("channel_id","phone")
);
--> statement-breakpoint
CREATE TABLE "conversation_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_by" varchar,
	"assigned_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'normal',
	"notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"contact_id" varchar,
	"assigned_to" varchar,
	"contact_phone" varchar,
	"contact_name" varchar,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'normal',
	"type" text DEFAULT 'whatsapp',
	"chatbot_id" varchar,
	"session_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"unread_count" integer DEFAULT 0,
	"last_message_at" timestamp,
	"last_incoming_message_at" timestamp,
	"last_message_text" text,
	"ai_enabled" boolean DEFAULT false,
	"ai_settings" jsonb DEFAULT '{}'::jsonb,
	"last_unreplied_alert_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_agent_targets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"channel_id" varchar,
	"target_deals_won" integer DEFAULT 10,
	"target_value_won" numeric(10, 2) DEFAULT '1000.00',
	"period" varchar(20) DEFAULT 'monthly',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence_id" varchar,
	"step_number" integer NOT NULL,
	"delay_hours" integer DEFAULT 24 NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"template_name" varchar,
	"template_language" varchar DEFAULT 'en_US',
	"message_text" text,
	"media_url" text,
	"media_type" varchar(20),
	"media_name" text
);
--> statement-breakpoint
CREATE TABLE "crm_cadences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"trigger_stage_id" varchar,
	"stop_condition" varchar DEFAULT 'reply_or_close',
	"send_channel_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_deal_followups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" varchar,
	"step_id" varchar,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending',
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar,
	"channel_id" varchar,
	"stage_id" varchar,
	"title" text NOT NULL,
	"value" numeric(10, 2) DEFAULT '0.00',
	"currency" varchar(10) DEFAULT 'USD',
	"assigned_to" varchar,
	"status" varchar(20) DEFAULT 'open',
	"lost_reason" text,
	"expected_close_date" timestamp,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_follow_up_date" timestamp,
	"is_automated_follow_up_enabled" boolean DEFAULT false,
	"follow_up_message" text,
	"follow_up_template_name" text,
	"follow_up_template_language" text DEFAULT 'en_US',
	"follow_up_template_variables" jsonb,
	"follow_up_status" text DEFAULT 'pending',
	"is_follow_up_reminder_sent" boolean DEFAULT false,
	"preferred_contact_method" varchar(20) DEFAULT 'both',
	"contacted_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"name" text DEFAULT 'Sales Pipeline' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"is_lead_qualification_enabled" boolean DEFAULT false,
	"qualification_flow_id" varchar,
	"is_daily_report_enabled" boolean DEFAULT false,
	"is_weekly_report_enabled" boolean DEFAULT false,
	"report_email_recipient" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_stages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" varchar,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"color" varchar(20) DEFAULT '#cbd5e1'
);
--> statement-breakpoint
CREATE TABLE "ecommerce_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"store_trigger_keyword" text DEFAULT 'store',
	"is_store_flow_active" boolean DEFAULT true,
	"welcome_message" text DEFAULT 'Welcome to our store!',
	"welcome_header_url" text,
	"welcome_header_type" text DEFAULT 'image',
	"qr_code_url" text,
	"checkout_fields" jsonb DEFAULT '["name","phone","address","pin"]'::jsonb,
	"instamojo_api_key" text,
	"instamojo_auth_token" text,
	"instamojo_sandbox" boolean DEFAULT true,
	"razorpay_key_id" text,
	"razorpay_key_secret" text,
	"upi_id" text,
	"upi_merchant_name" text,
	"currency" text DEFAULT 'INR',
	"ai_enabled" boolean DEFAULT false,
	"ai_timeout_minutes" integer DEFAULT 30,
	"ai_ask_button_enabled" boolean DEFAULT true,
	"ai_system_prompt" text,
	"welcome_messages" jsonb DEFAULT '[]'::jsonb,
	"store_name" text,
	"store_address" text,
	"store_website" text,
	"store_logo" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ecommerce_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"conversation_id" varchar,
	"customer_phone" text NOT NULL,
	"customer_name" text,
	"customer_data" jsonb DEFAULT '{}'::jsonb,
	"product_id" varchar,
	"product_name" text,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR',
	"payment_method" text NOT NULL,
	"payment_status" text DEFAULT 'pending',
	"payment_gateway" text,
	"payment_gateway_order_id" text,
	"receipt_url" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ecommerce_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "ecommerce_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"price" numeric(12, 2) DEFAULT '0',
	"description" text,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"checkout_link" text,
	"trigger_keyword" text,
	"is_trigger_enabled" boolean DEFAULT false,
	"currency" text DEFAULT 'INR',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ecommerce_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"product_id" varchar,
	"quantity" integer DEFAULT 1,
	"current_step" text NOT NULL,
	"customer_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ecommerce_sessions_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "expense_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"trigger_keyword" text DEFAULT 'expense',
	"retrieval_keyword" text DEFAULT 'getexpense',
	"income_keyword" text DEFAULT 'income',
	"reporting_number" text,
	"report_interval" text DEFAULT 'daily',
	"report_email" text,
	"email_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"ai_prompt" text DEFAULT 'You are a helper AI for an Expense Tracker app. Analyze the text representing an expense description or raw chat, and extract the amount, category, account, and description.',
	"next_report_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"status" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text NOT NULL,
	"payment_account_id" varchar,
	"description" text,
	"date" text,
	"media_url" text,
	"type" text DEFAULT 'expense',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"amount" numeric(12, 2) NOT NULL,
	"category" text NOT NULL,
	"payment_account_id" varchar,
	"type" text DEFAULT 'expense',
	"description" text,
	"date" timestamp DEFAULT now(),
	"media_url" text,
	"logged_by_name" text,
	"logged_by_phone" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "firebase_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key" text,
	"auth_domain" text,
	"project_id" text,
	"storage_bucket" text,
	"messaging_sender_id" text,
	"app_id" text,
	"measurement_id" text,
	"private_key" text,
	"client_email" text,
	"vapid_key" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channelId" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0,
	"published" boolean DEFAULT true,
	"views" integer DEFAULT 0,
	"helpful" integer DEFAULT 0,
	"not_helpful" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"parent_id" varchar,
	"name" varchar(255) NOT NULL,
	"icon" varchar(50),
	"description" text,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"channel_id" varchar,
	"recipient_phone" text NOT NULL,
	"template_name" varchar(100),
	"template_language" varchar(20) DEFAULT 'en_US',
	"template_params" jsonb DEFAULT '[]'::jsonb,
	"message_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'queued',
	"attempts" integer DEFAULT 0,
	"step_number" integer,
	"whatsapp_message_id" varchar(100),
	"conversation_id" varchar(100),
	"sent_via" varchar(20),
	"cost" varchar(20),
	"error_code" varchar(50),
	"error_message" text,
	"scheduled_for" timestamp,
	"processed_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deal_id" varchar
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar,
	"whatsapp_message_id" varchar,
	"from_user" boolean DEFAULT false,
	"direction" varchar DEFAULT 'outbound',
	"content" text NOT NULL,
	"type" text DEFAULT 'text',
	"from_type" varchar DEFAULT 'user',
	"message_type" varchar,
	"media_id" varchar,
	"media_url" text,
	"media_mime_type" varchar(100),
	"media_sha256" varchar(128),
	"status" text DEFAULT 'sent',
	"timestamp" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"error_code" varchar(50),
	"error_message" text,
	"error_details" jsonb,
	"campaign_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar NOT NULL,
	"label" varchar NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"is_email_enabled" boolean DEFAULT true,
	"is_in_app_enabled" boolean DEFAULT true,
	"variables" text[] DEFAULT ARRAY[]::text[],
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar DEFAULT 'general' NOT NULL,
	"created_by" varchar DEFAULT 'system' NOT NULL,
	"channel_id" varchar,
	"target_type" varchar NOT NULL,
	"target_ids" text[] DEFAULT ARRAY[]::text[],
	"status" varchar DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "panel_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"tagline" varchar,
	"description" text,
	"logo" varchar,
	"logo2" varchar,
	"favicon" varchar,
	"default_language" varchar(5) DEFAULT 'en',
	"supported_languages" jsonb DEFAULT '["en"]',
	"company_name" varchar,
	"company_website" varchar,
	"support_email" varchar,
	"currency" varchar(10) DEFAULT 'INR',
	"country" varchar(2) DEFAULT 'IN',
	"embedded_signup_enabled" boolean DEFAULT true,
	"wallet_settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'cash' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"provider_key" varchar NOT NULL,
	"description" text,
	"logo" varchar,
	"is_active" boolean DEFAULT true,
	"config" jsonb,
	"supported_currencies" jsonb,
	"supported_methods" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_providers_provider_key_unique" UNIQUE("provider_key")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar,
	"popular" boolean DEFAULT false,
	"badge" varchar,
	"color" varchar,
	"button_color" varchar,
	"monthly_price" numeric(10, 2) DEFAULT '0',
	"annual_price" numeric(10, 2) DEFAULT '0',
	"permissions" jsonb,
	"features" jsonb,
	"stripe_product_id" varchar,
	"stripe_price_id_monthly" varchar,
	"stripe_price_id_annual" varchar,
	"razorpay_plan_id_monthly" varchar,
	"razorpay_plan_id_annual" varchar,
	"paypal_product_id" varchar,
	"paypal_plan_id_monthly" varchar,
	"paypal_plan_id_annual" varchar,
	"paystack_plan_code_monthly" varchar,
	"paystack_plan_code_annual" varchar,
	"mercadopago_plan_id_monthly" varchar,
	"mercadopago_plan_id_annual" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_languages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"native_name" varchar(100) NOT NULL,
	"icon" varchar(10),
	"direction" varchar(3) DEFAULT 'ltr' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"translations" jsonb DEFAULT '{}',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reminder_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"trigger_keyword" text DEFAULT 'remind',
	"todo_keyword" text DEFAULT 'todo',
	"default_lead_time_minutes" integer DEFAULT 15,
	"ai_prompt" text DEFAULT 'You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user''s message. Interpret natural dates like ''tomorrow at 5pm'' or ''next week 12th at 1pm'' correctly.',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminder_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"status" text NOT NULL,
	"title" text,
	"due_time" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"contact_phone" text NOT NULL,
	"contact_name" text,
	"title" text NOT NULL,
	"due_time" timestamp NOT NULL,
	"lead_time_minutes" integer DEFAULT 15,
	"status" text DEFAULT 'pending',
	"media_url" text,
	"voice_transcript" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sent_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" varchar,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"contact_id" varchar,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"widget_code" text NOT NULL,
	"widget_enabled" boolean DEFAULT true NOT NULL,
	"widget_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_training_config" jsonb DEFAULT '{"trainFromKB": false, "trainFromDocuments": true}'::jsonb NOT NULL,
	"auto_assignment_config" jsonb DEFAULT '{"enabled": false, "strategy": "round_robin"}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_widget_code_unique" UNIQUE("widget_code")
);
--> statement-breakpoint
CREATE TABLE "smtp_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean DEFAULT false,
	"user" text NOT NULL,
	"password" text,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"logo" text DEFAULT 'null',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "storage_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'digitalocean',
	"space_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"region" text NOT NULL,
	"access_key" text NOT NULL,
	"secret_key" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"plan_data" jsonb NOT NULL,
	"status" varchar NOT NULL,
	"billing_cycle" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"auto_renew" boolean DEFAULT true,
	"gateway_subscription_id" varchar,
	"gateway_provider" varchar,
	"gateway_status" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"creator_id" varchar NOT NULL,
	"creator_type" "user_type" NOT NULL,
	"creator_name" text NOT NULL,
	"creator_email" text NOT NULL,
	"assigned_to_id" varchar,
	"assigned_to_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" varchar(20) NOT NULL,
	"channel_id" varchar,
	"created_by" varchar DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"created_by" varchar,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"language" text DEFAULT 'en_US',
	"header" text,
	"body" text NOT NULL,
	"footer" text,
	"buttons" jsonb DEFAULT '[]'::jsonb,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft',
	"rejection_reason" text,
	"media_type" text DEFAULT 'text',
	"media_url" text,
	"media_handle" text,
	"carousel_cards" jsonb DEFAULT '[]'::jsonb,
	"whatsapp_template_id" text,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"header_type" text,
	"body_variables" integer,
	CONSTRAINT "template_channel_wa_id_unique" UNIQUE("whatsapp_template_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_addons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"addon_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"purchase_type" text DEFAULT 'flow',
	"credits" integer DEFAULT 0,
	"max_credits" integer DEFAULT 0,
	"gateway_subscription_id" varchar,
	"gateway_provider" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_type" "user_type" NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"site_id" varchar NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar,
	"type" text NOT NULL,
	"title" text,
	"content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_qa_pairs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"channel_id" varchar,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text DEFAULT 'general',
	"embedding" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" varchar NOT NULL,
	"channel_id" varchar,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"chunk_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"subscription_id" varchar,
	"payment_provider_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"billing_cycle" varchar NOT NULL,
	"provider_transaction_id" varchar,
	"provider_order_id" varchar,
	"provider_payment_id" varchar,
	"status" varchar NOT NULL,
	"payment_method" varchar,
	"metadata" jsonb,
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" varchar,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"in_app_enabled" boolean DEFAULT true,
	"email_enabled" boolean DEFAULT false,
	"sound_enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone_number" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"avatar" text,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" text[] NOT NULL,
	"channel_id" varchar,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar DEFAULT '',
	"fcm_token" varchar(512),
	"is_email_verified" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"razorpay_customer_id" varchar,
	"paypal_customer_id" varchar,
	"paystack_customer_code" varchar,
	"mercadopago_customer_id" varchar,
	"sarvam_api_key" text,
	"groq_api_key" text,
	"eleven_labs_api_key" text,
	"show_only_assigned" boolean DEFAULT true,
	"is_admin_member" boolean DEFAULT false,
	"crm_status" text DEFAULT 'online',
	"round_robin_capacity" integer DEFAULT 0,
	"notification_channel_id" varchar,
	"wallet_enabled" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT 'sarvam' NOT NULL,
	"voice_id" text NOT NULL,
	"language_code" text DEFAULT 'en-IN',
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"type" varchar(20) NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"receipt_url" text,
	"reference_id" varchar,
	"description" text,
	"verified_by" varchar,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warmer_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"is_active" boolean DEFAULT false,
	"min_delay" integer DEFAULT 10,
	"max_delay" integer DEFAULT 60,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warmer_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warmer_config_id" varchar,
	"message_text" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar,
	"webhook_url" text NOT NULL,
	"verify_token" varchar(100) NOT NULL,
	"app_secret" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_ping_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_business_accounts_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" text NOT NULL,
	"app_secret" text NOT NULL,
	"config_id" text NOT NULL,
	"created_by" varchar DEFAULT '',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"phone_number_id" varchar(50) NOT NULL,
	"waba_id" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"business_account_id" varchar(50),
	"rate_limit_tier" varchar(20) DEFAULT 'standard',
	"quality_rating" varchar(20) DEFAULT 'green',
	"status" varchar(20) DEFAULT 'inactive',
	"error_message" text,
	"last_health_check" timestamp,
	"message_limit" integer,
	"messages_used" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_channels_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_support_ticket_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"trigger_keyword" text DEFAULT 'ticket',
	"retrieval_keyword" text DEFAULT 'getticket',
	"reporting_number" text,
	"report_interval" text DEFAULT 'daily',
	"report_email" text,
	"email_enabled" boolean DEFAULT false,
	"forward_email" text,
	"forward_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"ai_prompt" text DEFAULT 'You are a helper AI for a Support Ticket app. Analyze the text representing a support ticket issue, description, or raw chat, and extract the subject, category, priority, and description.',
	"next_report_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_support_ticket_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"status" text NOT NULL,
	"subject" text,
	"category" text,
	"priority" text,
	"description" text,
	"media_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"channel_id" varchar,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"description" text,
	"media_url" text,
	"logged_by_name" text,
	"logged_by_phone" text,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_profiles" ADD CONSTRAINT "ai_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_profiles" ADD CONSTRAINT "ai_profiles_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_edges" ADD CONSTRAINT "automation_edges_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_execution_id_automation_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."automation_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_nodes" ADD CONSTRAINT "automation_nodes_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_lists" ADD CONSTRAINT "broadcast_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_api_key_id_client_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."client_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_usage_logs" ADD CONSTRAINT "client_api_usage_logs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_webhooks" ADD CONSTRAINT "client_webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_webhooks" ADD CONSTRAINT "client_webhooks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_campaign_templates" ADD CONSTRAINT "contact_campaign_templates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_campaigns" ADD CONSTRAINT "contact_campaigns_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_campaigns" ADD CONSTRAINT "contact_campaigns_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_campaigns" ADD CONSTRAINT "contact_campaigns_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_agent_targets" ADD CONSTRAINT "crm_agent_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_agent_targets" ADD CONSTRAINT "crm_agent_targets_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_cadence_steps" ADD CONSTRAINT "crm_cadence_steps_cadence_id_crm_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."crm_cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_cadences" ADD CONSTRAINT "crm_cadences_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_cadences" ADD CONSTRAINT "crm_cadences_trigger_stage_id_crm_stages_id_fk" FOREIGN KEY ("trigger_stage_id") REFERENCES "public"."crm_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_cadences" ADD CONSTRAINT "crm_cadences_send_channel_id_channels_id_fk" FOREIGN KEY ("send_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_followups" ADD CONSTRAINT "crm_deal_followups_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_followups" ADD CONSTRAINT "crm_deal_followups_step_id_crm_cadence_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."crm_cadence_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_stage_id_crm_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_settings" ADD CONSTRAINT "crm_settings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_settings" ADD CONSTRAINT "crm_settings_qualification_flow_id_automations_id_fk" FOREIGN KEY ("qualification_flow_id") REFERENCES "public"."automations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_stages" ADD CONSTRAINT "crm_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_configs" ADD CONSTRAINT "ecommerce_configs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_configs" ADD CONSTRAINT "ecommerce_configs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_product_id_ecommerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_products" ADD CONSTRAINT "ecommerce_products_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_sessions" ADD CONSTRAINT "ecommerce_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_sessions" ADD CONSTRAINT "ecommerce_sessions_product_id_ecommerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_configs" ADD CONSTRAINT "expense_configs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_configs" ADD CONSTRAINT "expense_configs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_sessions" ADD CONSTRAINT "expense_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_sessions" ADD CONSTRAINT "expense_sessions_payment_account_id_payment_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."payment_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payment_account_id_payment_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."payment_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_queue" ADD CONSTRAINT "message_queue_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_configs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_configs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_sessions" ADD CONSTRAINT "reminder_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_addons" ADD CONSTRAINT "tenant_addons_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_addons" ADD CONSTRAINT "tenant_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_data" ADD CONSTRAINT "training_data_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_provider_id_payment_providers_id_fk" FOREIGN KEY ("payment_provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warmer_configs" ADD CONSTRAINT "warmer_configs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warmer_messages" ADD CONSTRAINT "warmer_messages_warmer_config_id_warmer_configs_id_fk" FOREIGN KEY ("warmer_config_id") REFERENCES "public"."warmer_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_support_ticket_configs" ADD CONSTRAINT "whatsapp_support_ticket_configs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_support_ticket_configs" ADD CONSTRAINT "whatsapp_support_ticket_configs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_support_ticket_sessions" ADD CONSTRAINT "whatsapp_support_ticket_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_support_tickets" ADD CONSTRAINT "whatsapp_support_tickets_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_support_tickets" ADD CONSTRAINT "whatsapp_support_tickets_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_edges_automation_idx" ON "automation_edges" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_execution_logs_execution_idx" ON "automation_execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "automation_executions_automation_idx" ON "automation_executions" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_executions_status_idx" ON "automation_executions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_executions_message_unique_idx" ON "automation_executions" USING btree ("automation_id","conversation_id","trigger_message_id");--> statement-breakpoint
CREATE INDEX "automation_nodes_automation_idx" ON "automation_nodes" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automations_channel_idx" ON "automations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "automations_status_idx" ON "automations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_campaign_idx" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipients_status_idx" ON "campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_phone_idx" ON "campaign_recipients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "campaigns_channel_idx" ON "campaigns" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_created_idx" ON "campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_campaigns_contact_idx" ON "contact_campaigns" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_campaigns_next_send_idx" ON "contact_campaigns" USING btree ("next_send_at");--> statement-breakpoint
CREATE INDEX "contact_campaigns_status_idx" ON "contact_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_channel_idx" ON "contacts" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_channel_idx" ON "conversations" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_phone_idx" ON "conversations" USING btree ("contact_phone");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_msg_idx" ON "conversations" USING btree ("channel_id","last_message_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "knowledge_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "knowledge_articles" USING btree ("published");--> statement-breakpoint
CREATE INDEX "categories_site_idx" ON "knowledge_categories" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "knowledge_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "queue_campaign_idx" ON "message_queue" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "queue_status_idx" ON "message_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "queue_scheduled_idx" ON "message_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "queue_status_scheduled_idx" ON "message_queue" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "queue_whatsapp_message_idx" ON "message_queue" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "queue_deal_idx" ON "message_queue" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_whatsapp_idx" ON "messages" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "messages_direction_idx" ON "messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_conv_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "templates_channel_idx" ON "templates" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "wt_user_idx" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wt_status_idx" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");