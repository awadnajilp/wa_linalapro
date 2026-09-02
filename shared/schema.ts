/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { sql } from "drizzle-orm";
import { DIPLOY_BRAND } from "@diploy/core";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  unique,
  uniqueIndex,
  numeric,
  pgEnum,
  serial,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
  role: text("role").notNull().default("admin"), // admin, manager, agent
  avatar: text("avatar"),
  status: text("status").notNull().default("active"), // active, inactive
  permissions: text("permissions").array().notNull(),
  channelId: varchar("channel_id"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").default(""),
  fcmToken: varchar("fcm_token", { length: 512 }),
  isEmailVerified: boolean("is_email_verified").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  razorpayCustomerId: varchar("razorpay_customer_id"),
  paypalCustomerId: varchar("paypal_customer_id"),
  paystackCustomerCode: varchar("paystack_customer_code"),
  mercadopagoCustomerId: varchar("mercadopago_customer_id"),
  sarvamApiKey: text("sarvam_api_key"),
  groqApiKey: text("groq_api_key"),
  elevenlabsApiKey: text("eleven_labs_api_key"),
  showOnlyAssigned: boolean("show_only_assigned").default(true),
  isAdminMember: boolean("is_admin_member").default(false),
  crmStatus: text("crm_status").default("online"),
  roundRobinCapacity: integer("round_robin_capacity").default(0),
  notificationChannelId: varchar("notification_channel_id"),
  walletEnabled: boolean("wallet_enabled").default(false),
});

// Conversation assignments to users
export const conversationAssignments = pgTable("conversation_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: text("status").notNull().default("active"), // active, resolved, transferred
  priority: text("priority").default("normal"), // low, normal, high, urgent
  notes: text("notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User activity logs
export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // login, logout, message_sent, conversation_assigned, etc.
  entityType: text("entity_type"), // conversation, message, contact, etc.
  entityId: varchar("entity_id"),
  details: jsonb("details").default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: varchar("channel_id").references(() => channels.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    groups: jsonb("groups").$type<string[]>().default([]),
    broadcastLists: jsonb("broadcast_lists").$type<string[]>().default([]),
    tags: jsonb("tags").default([]),
    status: text("status").default("active"), // active, blocked, unsubscribed
    source: varchar("source", { length: 100 }), // manual, import, api, chatbot
    variables: jsonb("variables").$type<Record<string, string>>().default({}),
    lastContact: timestamp("last_contact"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdBy: varchar("created_by").default(""),
    isGroup: boolean("is_group").default(false),
  },
  (table) => ({
    contactChannelIdx: index("contacts_channel_idx").on(table.channelId),
    contactPhoneIdx: index("contacts_phone_idx").on(table.phone),
    contactStatusIdx: index("contacts_status_idx").on(table.status),
    contactChannelPhoneUnique: unique("contacts_channel_phone_unique").on(
      table.channelId,
      table.phone
    ),
  })
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: varchar("channel_id").references(() => channels.id, {
      onDelete: "cascade",
    }),
    createdBy: varchar("created_by"),
    name: text("name").notNull(),
    description: text("description"),
    campaignType: text("campaign_type").notNull(), // contacts, csv, api
    type: text("type").notNull(), // marketing, transactional
    apiType: text("api_type").notNull(), // cloud_api, mm_lite
    templateId: varchar("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    templateName: text("template_name"),
    templateLanguage: text("template_language"),
    variableMapping: jsonb("variable_mapping")
      .$type<Record<string, string>>()
      .default({}), // Maps template variables to contact/csv fields
    contactGroups: jsonb("contact_groups").$type<string[]>().default([]), // For contacts campaign
    csvData: jsonb("csv_data").default([]), // For CSV campaign
    apiKey: varchar("api_key"), // For API campaign
    apiEndpoint: text("api_endpoint"), // For API campaign
    status: text("status").default("draft"), // draft, scheduled, active, paused, completed
    scheduledAt: timestamp("scheduled_at"),
    recipientCount: integer("recipient_count").default(0),
    sentCount: integer("sent_count").default(0),
    deliveredCount: integer("delivered_count").default(0),
    readCount: integer("read_count").default(0),
    repliedCount: integer("replied_count").default(0),
    failedCount: integer("failed_count").default(0),
    nonDeliverableCount: integer("non_deliverable_count").default(0),
    completedAt: timestamp("completed_at"),
    populationStartedAt: timestamp("population_started_at"),
    customMessage: text("custom_message"),
    mediaUrl: text("media_url"),
    mediaMimeType: text("media_mime_type"),
    mediaName: text("media_name"),
    delayBetweenMessages: integer("delay_between_messages").default(10),
    chunkSize: integer("chunk_size").default(50),
    delayBetweenChunks: integer("delay_between_chunks").default(60),
    warmerEnabled: boolean("warmer_enabled").default(false),
    selectedWarmerMessages: jsonb("selected_warmer_messages").$type<string[]>().default([]),
    isRecurring: boolean("is_recurring").default(false),
    recurringInterval: integer("recurring_interval"),
    recurringIterations: integer("recurring_iterations").default(3),
    currentIteration: integer("current_iteration").default(1),
    parentCampaignId: varchar("parent_campaign_id"),
    isCadence: boolean("is_cadence").default(false),
    cadenceSteps: jsonb("cadence_steps").$type<any[]>().default([]),
    followUpOnlyAfterReply24h: boolean("follow_up_only_after_reply_24h").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    campaignChannelIdx: index("campaigns_channel_idx").on(table.channelId),
    campaignStatusIdx: index("campaigns_status_idx").on(table.status),
    campaignCreatedIdx: index("campaigns_created_idx").on(table.createdAt),
  })
);

// Campaign Recipients table for tracking individual recipient status
export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: varchar("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    phone: text("phone").notNull(),
    name: text("name"),
    status: text("status").default("pending"), // pending, sent, delivered, read, failed
    whatsappMessageId: varchar("whatsapp_message_id"),
    templateParams: jsonb("template_params").default({}),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    errorCode: varchar("error_code"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    repliedAt: timestamp("replied_at"),
    replyText: text("reply_text"),
    isStopped: boolean("is_stopped").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    recipientCampaignIdx: index("recipients_campaign_idx").on(table.campaignId),
    recipientStatusIdx: index("recipients_status_idx").on(table.status),
    recipientPhoneIdx: index("recipients_phone_idx").on(table.phone),
    campaignPhoneUnique: unique("campaign_phone_unique").on(
      table.campaignId,
      table.phone
    ),
  })
);

// WhatsApp Business Channels for multi-account support
export const channels = pgTable("channels", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumberId: text("phone_number_id").notNull(),
  accessToken: text("access_token").notNull(),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  phoneNumber: text("phone_number"),
  appId: text("app_id"),
  isActive: boolean("is_active").default(true),
  isCoexistence: boolean("is_coexistence").default(false),
  // Health status fields
  healthStatus: text("health_status").default("unknown"), // healthy, warning, error, unknown
  lastHealthCheck: timestamp("last_health_check"),
  healthDetails: jsonb("health_details").default({}), // Detailed health information
  connectionMethod: varchar("connection_method", { length: 20 }).default("embedded"),
  inboxAiSettings: jsonb("inbox_ai_settings").default({}),
  disableIncomingInbox: boolean("disable_incoming_inbox").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").default(""),
});

export const templates = pgTable("templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id),
  createdBy: varchar("created_by"),
  name: text("name").notNull(),
  category: text("category").notNull(), // marketing, transactional, authentication, utility
  language: text("language").default("en_US"),
  header: text("header"),
  body: text("body").notNull(),
  footer: text("footer"),
  buttons: jsonb("buttons").default([]),
  variables: jsonb("variables").default([]),
  status: text("status").default("draft"), // draft, pending, approved, rejected
  rejectionReason: text("rejection_reason"), // Reason for template rejection from WhatsApp
  mediaType: text("media_type").default("text"), // text, image, video, document, carousel
  mediaUrl: text("media_url"), // URL of uploaded media
  mediaHandle: text("media_handle"), // WhatsApp media handle after upload
  carouselCards: jsonb("carousel_cards").default([]), // For carousel templates
  whatsappTemplateId: text("whatsapp_template_id"), // ID from WhatsApp after creation
  usage_count: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  headerType: text("header_type"),
  bodyVariables: integer("body_variables"),
}, (table) => ({
  templateChannelWaIdUnique: unique("template_channel_wa_id_unique").on(table.whatsappTemplateId, table.channelId),
  templateChannelIdx: index("templates_channel_idx").on(table.channelId),
}));

export const whatsappBusinessAccountsConfig =
  pgTable("whatsapp_business_accounts_config", {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Meta App Credentials
    appId: text("app_id").notNull(),
    appSecret: text("app_secret").notNull(),
    configId: text("config_id").notNull(),

    // Ownership
    createdBy: varchar("created_by")
      .default(""),

    // Status
    isActive: boolean("is_active")
      .default(true),

    // Timestamps
    createdAt: timestamp("created_at")
      .defaultNow(),

    updatedAt: timestamp("updated_at")
      .defaultNow(),
  });



export const session = pgTable("session", {
  sid: varchar("sid").notNull().primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: varchar("channel_id").references(() => channels.id, {
      onDelete: "cascade",
    }),
    contactId: varchar("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    assignedTo: varchar("assigned_to"),
    contactPhone: varchar("contact_phone"), // Store phone number for webhook lookups
    contactName: varchar("contact_name"), // Store contact name
    status: text("status").default("open"), // open, closed, assigned, pending
    priority: text("priority").default("normal"), // low, normal, high, urgent
    type: text("type").default("whatsapp"), // whatsapp, chatbot, sms, email
    chatbotId: varchar("chatbot_id"),
    sessionId: text("session_id"),
    tags: jsonb("tags").default([]),
    unreadCount: integer("unread_count").default(0), // Track unread messages
    lastMessageAt: timestamp("last_message_at"),
    lastIncomingMessageAt: timestamp("last_incoming_message_at"),
    lastMessageText: text("last_message_text"), // Cache last message for display
    aiEnabled: boolean("ai_enabled").default(false),
    aiSettings: jsonb("ai_settings").default({}),
    lastUnrepliedAlertSentAt: timestamp("last_unreplied_alert_sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    conversationChannelIdx: index("conversations_channel_idx").on(
      table.channelId
    ),
    conversationContactIdx: index("conversations_contact_idx").on(
      table.contactId
    ),
    conversationPhoneIdx: index("conversations_phone_idx").on(
      table.contactPhone
    ),
    conversationStatusIdx: index("conversations_status_idx").on(table.status),
    conversationLastMsgIdx: index("conversations_last_msg_idx").on(table.channelId, table.lastMessageAt),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").references(
      () => conversations.id,
      {
        onDelete: "cascade",
      }
    ),
    whatsappMessageId: varchar("whatsapp_message_id"), // Store WhatsApp message ID
    fromUser: boolean("from_user").default(false),
    direction: varchar("direction").default("outbound"), // inbound, outbound
    content: text("content").notNull(),
    type: text("type").default("text"), // text, image, document, template
    fromType: varchar("from_type").default("user"), // user, bot, system
    messageType: varchar("message_type"), // For WhatsApp message types
    mediaId: varchar("media_id"), // WhatsApp media ID
    mediaUrl: text("media_url"), // Download URL (fetched from Graph API)
    mediaMimeType: varchar("media_mime_type", { length: 100 }),
    mediaSha256: varchar("media_sha256", { length: 128 }),
    status: text("status").default("sent"), // sent, delivered, read, failed, received
    timestamp: timestamp("timestamp"), // WhatsApp timestamp
    metadata: jsonb("metadata").default({}), // Store additional WhatsApp data
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    errorCode: varchar("error_code", { length: 50 }),
    errorMessage: text("error_message"),
    errorDetails: jsonb("error_details"), // Store detailed error information from WhatsApp
    campaignId: varchar("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }), // Link to campaign if sent from campaign
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    messageConversationIdx: index("messages_conversation_idx").on(
      table.conversationId
    ),
    messageWhatsappIdx: index("messages_whatsapp_idx").on(
      table.whatsappMessageId
    ),
    messageDirectionIdx: index("messages_direction_idx").on(table.direction),
    messageStatusIdx: index("messages_status_idx").on(table.status),
    messageTimestampIdx: index("messages_timestamp_idx").on(table.timestamp),
    messageCreatedIdx: index("messages_created_idx").on(table.createdAt),
    messageConvCreatedIdx: index("messages_conv_created_idx").on(table.conversationId, table.createdAt),
  })
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),

  title: text("title").notNull(),
  message: text("message").notNull(),

  type: varchar("type").notNull().default("general"),

  createdBy: varchar("created_by").notNull().default("system"),

  channelId: varchar("channel_id").references(() => channels.id, {
    onDelete: "set null",
  }),

  targetType: varchar("target_type").notNull(),

  targetIds: text("target_ids")
    .array()
    .default(sql`ARRAY[]::text[]`),

  status: varchar("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sentNotifications = pgTable("sent_notifications", {
  id: serial("id").primaryKey(),

  notificationId: integer("notification_id")
    .references(() => notifications.id, { onDelete: "cascade" })
    .notNull(),

  userId: varchar("user_id"),

  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),

  sentAt: timestamp("sent_at").defaultNow(),
});

export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type").notNull().unique(),
  label: varchar("label").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  isEmailEnabled: boolean("is_email_enabled").default(true),
  isInAppEnabled: boolean("is_in_app_enabled").default(true),
  variables: text("variables").array().default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  eventType: varchar("event_type").notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(false),
  soundEnabled: boolean("sound_enabled").default(true),
});

export const chatbots = pgTable("chatbots", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  uuid: text("uuid").notNull().unique(),
  title: text("title").notNull(),
  bubbleMessage: text("bubble_message"),
  welcomeMessage: text("welcome_message"),
  instructions: text("instructions"),
  connectMessage: text("connect_message"),
  language: text("language").default("en"),
  interactionType: text("interaction_type").default("ai-only"),
  avatarId: integer("avatar_id"),
  avatarEmoji: text("avatar_emoji"),
  avatarColor: text("avatar_color"),
  primaryColor: text("primary_color").default("#3B82F6"),
  logoUrl: text("logo_url"),
  embedWidth: integer("embed_width").default(420),
  embedHeight: integer("embed_height").default(745),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingData = pgTable("training_data", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id),
  type: text("type").notNull(), // 'text', 'pdf', 'website', 'qa'
  title: text("title"),
  content: text("content"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge Base Categories
export const knowledgeCategories = pgTable(
  "knowledge_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: varchar("site_id").notNull(),
    parentId: varchar("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    icon: varchar("icon", { length: 50 }),
    description: text("description"),
    order: integer("order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    categorySiteIdx: index("categories_site_idx").on(table.siteId),
    categoryParentIdx: index("categories_parent_idx").on(table.parentId),
  })
);

// Knowledge Base Articles
export const knowledgeArticles = pgTable(
  "knowledge_articles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    categoryId: varchar("category_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    order: integer("order").default(0),
    published: boolean("published").default(true),
    views: integer("views").default(0),
    helpful: integer("helpful").default(0),
    notHelpful: integer("not_helpful").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    articleCategoryIdx: index("articles_category_idx").on(table.categoryId),
    articlePublishedIdx: index("articles_published_idx").on(table.published),
  })
);

//plans
export const plans = pgTable("plans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // optional: store icon name like 'Zap', 'Crown'
  popular: boolean("popular").default(false),
  badge: varchar("badge"),
  color: varchar("color"),
  buttonColor: varchar("button_color"),

  // Pricing
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).default(
    "0"
  ),
  annualPrice: numeric("annual_price", { precision: 10, scale: 2 }).default(
    "0"
  ),

  // Permissions (JSON for flexibility)
  permissions: jsonb("permissions").$type<{
    channel: string;
    contacts: string;
    automation: string;
    campaign?: string;
    apiRequestsPerMonth?: string;
    apiRateLimitPerMinute?: string;
    qrCodeChannelEnabled?: string;
    utilityCategoryHelperEnabled?: string;
  }>(),

  // Features (Array of objects)
  features: jsonb("features").$type<{ name: string; included: boolean }[]>(),

  stripeProductId: varchar("stripe_product_id"),
  stripePriceIdMonthly: varchar("stripe_price_id_monthly"),
  stripePriceIdAnnual: varchar("stripe_price_id_annual"),
  razorpayPlanIdMonthly: varchar("razorpay_plan_id_monthly"),
  razorpayPlanIdAnnual: varchar("razorpay_plan_id_annual"),
  paypalProductId: varchar("paypal_product_id"),
  paypalPlanIdMonthly: varchar("paypal_plan_id_monthly"),
  paypalPlanIdAnnual: varchar("paypal_plan_id_annual"),
  paystackPlanCodeMonthly: varchar("paystack_plan_code_monthly"),
  paystackPlanCodeAnnual: varchar("paystack_plan_code_annual"),
  mercadopagoPlanIdMonthly: varchar("mercadopago_plan_id_monthly"),
  mercadopagoPlanIdAnnual: varchar("mercadopago_plan_id_annual"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Providers table
export const paymentProviders = pgTable("payment_providers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "Razorpay", "Stripe", "PayPal"
  providerKey: varchar("provider_key").notNull().unique(), // e.g., "razorpay", "stripe"
  description: text("description"),
  logo: varchar("logo"), // URL or icon name
  isActive: boolean("is_active").default(true),
  // Provider Configuration (API Keys, etc.)
  config: jsonb("config").$type<{
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    publicKey?: string;
    merchantId?: string;
    [key: string]: any;
  }>(),
  // Supported features
  supportedCurrencies: jsonb("supported_currencies").$type<string[]>(),
  supportedMethods: jsonb("supported_methods").$type<string[]>(), // ["card", "upi", "wallet"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  planId: varchar("plan_id")
    .notNull()
    .references(() => plans.id),
    planData: jsonb("plan_data").notNull(), 
  status: varchar("status").notNull(), // "active", "expired", "cancelled", "pending"
  billingCycle: varchar("billing_cycle").notNull(), // "monthly" or "annual"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  autoRenew: boolean("auto_renew").default(true),
  gatewaySubscriptionId: varchar("gateway_subscription_id"),
  gatewayProvider: varchar("gateway_provider"), // "stripe" or "razorpay"
  gatewayStatus: varchar("gateway_status"), // raw status from gateway
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  planId: varchar("plan_id")
    .notNull()
    .references(() => plans.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  paymentProviderId: varchar("payment_provider_id")
    .notNull()
    .references(() => paymentProviders.id),

  // Transaction details
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  billingCycle: varchar("billing_cycle").notNull(), // "monthly" or "annual"

  // Payment provider details
  providerTransactionId: varchar("provider_transaction_id"), // Transaction ID from payment provider
  providerOrderId: varchar("provider_order_id"), // Order ID from payment provider
  providerPaymentId: varchar("provider_payment_id"), // Payment ID from payment provider

  // Transaction status
  status: varchar("status").notNull(), // "pending", "completed", "failed", "refunded", "cancelled"
  paymentMethod: varchar("payment_method"), // "card", "upi", "wallet", "netbanking"

  // Additional details
  metadata: jsonb("metadata").$type<{
    cardLast4?: string;
    cardBrand?: string;
    upiId?: string;
    failureReason?: string;
    refundReason?: string;
    [key: string]: any;
  }>(),

  // Timestamps
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const userTypeEnum = pgEnum("user_type", [
  "user",
  "team",
  "admin",
  "superadmin",
]);

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),

  // Creator info (can be user or listener)
  creatorId: varchar("creator_id").notNull(), // ID from users or listeners table
  creatorType: userTypeEnum("creator_type").notNull(), // 'user' or 'team'
  creatorName: text("creator_name").notNull(), // Cached for display
  creatorEmail: text("creator_email").notNull(), // Cached for display

  // Assignment (admin only)
  assignedToId: varchar("assigned_to_id"), // ID from admin_users table
  assignedToName: text("assigned_to_name"), // Cached for display

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
});

// Ticket Messages table
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),

  // Sender info (can be user, listener, or admin)
  senderId: varchar("sender_id").notNull(),
  senderType: userTypeEnum("sender_type").notNull(), // 'user', 'listener', or 'admin'
  senderName: text("sender_name").notNull(), // Cached for display

  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Admin notes only

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const supportTicketsRelations = relations(
  supportTickets,
  ({ many }) => ({
    messages: many(ticketMessages),
  })
);

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
}));

// Automation workflows table
export const automations = pgTable(
  "automations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: varchar("channel_id").references(() => channels.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    trigger: text("trigger").notNull(), // message_received, keyword, schedule, api_webhook
    triggerConfig: jsonb("trigger_config").default({}),
    status: text("status").default("inactive"), // active, inactive, paused
    executionCount: integer("execution_count").default(0),
    lastExecutedAt: timestamp("last_executed_at"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    automationChannelIdx: index("automations_channel_idx").on(table.channelId),
    automationStatusIdx: index("automations_status_idx").on(table.status),
  })
);

// ─── Automation Nodes ─────────────────────────
export const automationNodes = pgTable(
  "automation_nodes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    automationId: varchar("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    nodeId: varchar("node_id").notNull(),
    type: text("type").notNull(), // trigger, action, condition, delay
    subtype: text("subtype"), // send_template, send_message, wait, etc.
    position: jsonb("position").default({}), // {x, y}
    measured: jsonb("measured").default({}), // {x, y}
    data: jsonb("data").default({}), // node config
    connections: jsonb("connections").default([]), // array of next nodeIds
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    nodeAutomationIdx: index("automation_nodes_automation_idx").on(
      table.automationId
    ),
    nodeUniqueIdx: unique("automation_nodes_unique_idx").on(
      table.automationId,
      table.nodeId
    ),
  })
);

// ─── Automation Edges ─────────────────────────
export const automationEdges = pgTable(
  "automation_edges",
  {
    id: varchar("id").primaryKey(), // This can use the edge ID from your JSON if needed

    automationId: varchar("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),

    sourceNodeId: varchar("source_node_id").notNull(),

    targetNodeId: varchar("target_node_id").notNull(),

    sourceHandle: varchar("source_handle"),

    animated: boolean("animated").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    automationEdgeIdx: index("automation_edges_automation_idx").on(
      table.automationId
    ),
    edgeUniqueIdx: unique("automation_edges_unique_handle_idx").on(
      table.automationId,
      table.sourceNodeId,
      table.targetNodeId,
      table.sourceHandle
    ),
  })
);

// ─── Automation Executions ────────────────────
export const automationExecutions = pgTable(
  "automation_executions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    automationId: varchar("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    contactId: varchar("contact_id").references(() => contacts.id),
    conversationId: varchar("conversation_id").references(
      () => conversations.id,
      { onDelete: "cascade" }
    ),
    triggerData: jsonb("trigger_data").default({}),
    triggerMessageId: varchar("trigger_message_id", { length: 200 }),
    status: text("status").notNull(), // running, completed, failed
    currentNodeId: varchar("current_node_id"),
    executionPath: jsonb("execution_path").default([]),
    variables: jsonb("variables").default({}),
    result: text("result"),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    executionAutomationIdx: index("automation_executions_automation_idx").on(
      table.automationId
    ),
    executionStatusIdx: index("automation_executions_status_idx").on(
      table.status
    ),
    executionMessageUniqueIdx: uniqueIndex("automation_executions_message_unique_idx").on(
      table.automationId,
      table.conversationId,
      table.triggerMessageId
    ),
  })
);

// ─── Automation Execution Logs ────────────────
export const automationExecutionLogs = pgTable(
  "automation_execution_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    executionId: varchar("execution_id")
      .notNull()
      .references(() => automationExecutions.id, { onDelete: "cascade" }),
    nodeId: varchar("node_id").notNull(),
    nodeType: text("node_type").notNull(),
    status: text("status").notNull(), // started, completed, failed
    input: jsonb("input").default({}),
    output: jsonb("output").default({}),
    error: text("error"),
    executedAt: timestamp("executed_at").defaultNow(),
  },
  (table) => ({
    logExecutionIdx: index("automation_execution_logs_execution_idx").on(
      table.executionId
    ),
  })
);

export const analytics = pgTable("analytics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id"),
  date: timestamp("date").notNull(),
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesRead: integer("messages_read").default(0),
  messagesReplied: integer("messages_replied").default(0),
  newContacts: integer("new_contacts").default(0),
  activeCampaigns: integer("active_campaigns").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp Channels table
export const whatsappChannels = pgTable("whatsapp_channels", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  phoneNumberId: varchar("phone_number_id", { length: 50 }).notNull(),
  wabaId: varchar("waba_id", { length: 50 }).notNull(),
  accessToken: text("access_token").notNull(), // Should be encrypted in production
  businessAccountId: varchar("business_account_id", { length: 50 }),
  rateLimitTier: varchar("rate_limit_tier", { length: 20 }).default("standard"),
  qualityRating: varchar("quality_rating", { length: 20 }).default("green"), // green, yellow, red
  status: varchar("status", { length: 20 }).default("inactive"), // active, inactive, error
  errorMessage: text("error_message"),
  lastHealthCheck: timestamp("last_health_check"),
  messageLimit: integer("message_limit"),
  messagesUsed: integer("messages_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const channelSignupLogs = pgTable("channel_signup_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("incomplete"),
  step: varchar("step", { length: 50 }).notNull().default("token_exchange"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  phoneNumber: text("phone_number"),
  wabaId: text("waba_id"),
  channelId: varchar("channel_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhook Configuration table
export const webhookConfigs = pgTable("webhook_configs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id"), // No foreign key - global webhook for all channels
  webhookUrl: text("webhook_url").notNull(),
  verifyToken: varchar("verify_token", { length: 100 }).notNull(),
  appSecret: text("app_secret"), // For signature verification
  events: jsonb("events").default([]).notNull(), // ['messages', 'message_status', 'message_template_status_update']
  isActive: boolean("is_active").default(true),
  lastPingAt: timestamp("last_ping_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message Queue table for campaign management
export const messageQueue = pgTable("message_queue", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  channelId: varchar("channel_id").references(() => channels.id),
  recipientPhone: text("recipient_phone").notNull(),
  templateName: varchar("template_name", { length: 100 }),
  templateLanguage: varchar("template_language", { length: 20 }).default("en_US"),
  templateParams: jsonb("template_params").default([]),
  messageType: varchar("message_type", { length: 20 }).notNull(), // marketing, utility, authentication
  status: varchar("status", { length: 20 }).default("queued"), // queued, processing, sent, delivered, failed
  attempts: integer("attempts").default(0),
  stepNumber: integer("step_number"),
  whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
  conversationId: varchar("conversation_id", { length: 100 }),
  sentVia: varchar("sent_via", { length: 20 }), // cloud_api, marketing_messages
  cost: varchar("cost", { length: 20 }), // Store as string to avoid decimal precision issues
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  scheduledFor: timestamp("scheduled_for"),
  processedAt: timestamp("processed_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  dealId: varchar("deal_id"),
}, (table) => ({
  queueCampaignIdx: index("queue_campaign_idx").on(table.campaignId),
  queueStatusIdx: index("queue_status_idx").on(table.status),
  queueScheduledIdx: index("queue_scheduled_idx").on(table.scheduledFor),
  queueStatusScheduledIdx: index("queue_status_scheduled_idx").on(table.status, table.scheduledFor),
  queueWhatsappMessageIdx: index("queue_whatsapp_message_idx").on(table.whatsappMessageId),
  queueDealIdx: index("queue_deal_idx").on(table.dealId),
}));

// API Request Logs for debugging
export const apiLogs = pgTable("api_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id),
  requestType: varchar("request_type", { length: 50 }).notNull(), // send_message, get_template, webhook_receive
  endpoint: text("endpoint").notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  responseBody: jsonb("response_body"),
  duration: integer("duration"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Panel configuration table for branding and settings

export const panelConfig = pgTable("panel_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  logo: varchar("logo"),
  logo2: varchar("logo2"),
  favicon: varchar("favicon"),
  defaultLanguage: varchar("default_language", { length: 5 }).default("en"),
  supportedLanguages: jsonb("supported_languages").default(sql`'["en"]'`),
  companyName: varchar("company_name"),
  companyWebsite: varchar("company_website"),
  supportEmail: varchar("support_email"),
  currency: varchar("currency", { length: 10 }).default("INR"),
  country: varchar("country", { length: 2 }).default("IN"),
  embeddedSignupEnabled: boolean("embedded_signup_enabled").default(true),
  showMobileSignup: boolean("show_mobile_signup").default(true),
  walletSettings: jsonb("wallet_settings").$type<any>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: uuid("channelId"), 
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
});

export const broadcastLists = pgTable("broadcast_lists", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: uuid("channelId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
});

export const firebaseConfig = pgTable("firebase_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  apiKey: text("api_key"),
  authDomain: text("auth_domain"),
  projectId: text("project_id"),
  storageBucket: text("storage_bucket"),
  messagingSenderId: text("messaging_sender_id"),
  appId: text("app_id"),
  measurementId: text("measurement_id"),
  privateKey: text("private_key"),
  clientEmail: text("client_email"),
  vapidKey: text("vapid_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storageSettings = pgTable("storage_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  provider: text("provider").default("digitalocean"), // can extend later
  spaceName: text("space_name").notNull(),
  endpoint: text("endpoint").notNull(),
  region: text("region").notNull(),
  accessKey: text("access_key").notNull(),
  secretKey: text("secret_key").notNull(),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiSettings = pgTable("ai_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id),
  provider: text("provider").notNull().default("openai"),
  apiKey: text("api_key").notNull(),
  model: text("model").notNull().default("gpt-4o-mini"),
  endpoint: text("endpoint").default("https://api.openai.com/v1"),
  temperature: text("temperature").default("0.7"), // string for consistency
  maxTokens: text("max_tokens").default("2048"),
  isActive: boolean("is_active").default(false),

  // NEW COLUMN
  words: text("words")
    .array()
    .default(sql`ARRAY[]::text[]`), // trigger words or phrases

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sites
export const sites = pgTable("sites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id"),
  contactId: varchar("contact_id"),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  widgetCode: text("widget_code").notNull().unique(),
  widgetEnabled: boolean("widget_enabled").notNull().default(true),
  widgetConfig: jsonb("widget_config")
    .notNull()
    .default(sql`'{}'::jsonb`), // colors, position, greeting, etc.
  aiTrainingConfig: jsonb("ai_training_config")
    .notNull()
    .default(sql`'{"trainFromKB": false, "trainFromDocuments": true}'::jsonb`), // AI training settings
  autoAssignmentConfig: jsonb("auto_assignment_config")
    .notNull()
    .default(sql`'{"enabled": false, "strategy": "round_robin"}'::jsonb`), // Auto-assignment settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMTP Configuration table
export const smtpConfig = pgTable("smtp_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  host: text("host").notNull(),
  port: integer("port").notNull(),
  secure: boolean("secure").default(false),
  user: text("user").notNull(),
  password: text("password"),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  logo: text("logo").default("null"), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`), // UUID primary key

  userId: varchar("user_id")
    .notNull(), 

  otpCode: varchar("otp_code", { length: 6 }).notNull(), // 6-digit OTP
  expiresAt: timestamp("expires_at").notNull(), 
  isUsed: boolean("is_used").default(false), 

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permissions type definition
export const PERMISSIONS = {
  // Dashboard permissions
  DASHBOARD_VIEW: "dashboard:view",
  DASHBOARD_EXPORT: "dashboard:export",

  // Contacts permissions
  CONTACTS_VIEW: "contacts:view",
  CONTACTS_CREATE: "contacts:create",
  CONTACTS_EDIT: "contacts:edit",
  CONTACTS_DELETE: "contacts:delete",
  CONTACTS_IMPORT: "contacts:import",
  CONTACTS_EXPORT: "contacts:export",

  // Campaigns permissions
  CAMPAIGNS_VIEW: "campaigns:view",
  CAMPAIGNS_CREATE: "campaigns:create",
  CAMPAIGNS_EDIT: "campaigns:edit",
  CAMPAIGNS_DELETE: "campaigns:delete",
  CAMPAIGNS_SEND: "campaigns:send",
  CAMPAIGNS_SCHEDULE: "campaigns:schedule",

  // Templates permissions
  TEMPLATES_VIEW: "templates:view",
  TEMPLATES_CREATE: "templates:create",
  TEMPLATES_EDIT: "templates:edit",
  TEMPLATES_DELETE: "templates:delete",
  TEMPLATES_SYNC: "templates:sync",

  // Inbox permissions
  INBOX_VIEW: "inbox:view",
  INBOX_SEND_MESSAGE: "inbox:send",
  INBOX_ASSIGN: "inbox:assign",
  INBOX_CLOSE: "inbox:close",
  INBOX_DELETE: "inbox:delete",

  // Analytics permissions
  ANALYTICS_VIEW: "analytics:view",
  ANALYTICS_EXPORT: "analytics:export",

  // Settings permissions
  SETTINGS_VIEW: "settings:view",
  SETTINGS_CHANNELS: "settings:channels",
  SETTINGS_WEBHOOK: "settings:webhook",
  SETTINGS_TEAM: "settings:team",
  SETTINGS_API: "settings:api",

  // Team management permissions
  TEAM_VIEW: "team:view",
  TEAM_CREATE: "team:create",
  TEAM_EDIT: "team:edit",
  TEAM_DELETE: "team:delete",
  TEAM_PERMISSIONS: "team:permissions",

  // Logs permissions
  LOGS_VIEW: "logs:view",

  // Automation permissions
  AUTOMATIONS_VIEW: "automations:view",
  AUTOMATIONS_CREATE: "automations:create",
  AUTOMATIONS_EDIT: "automations:edit",
  AUTOMATIONS_DELETE: "automations:delete",

  // Groups permissions
  GROUPS_VIEW: "groups:view",
  GROUPS_CREATE: "groups:create",
  GROUPS_EDIT: "groups:edit",
  GROUPS_DELETE: "groups:delete",

  // CRM permissions
  CRM_VIEW: "crm:view",
  CRM_CREATE: "crm:create",
  CRM_EDIT: "crm:edit",
  CRM_DELETE: "crm:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionMap = Record<Permission, boolean>;

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS), // Admin has all permissions
  manager: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_EXPORT,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_EDIT,
    PERMISSIONS.CONTACTS_IMPORT,
    PERMISSIONS.CONTACTS_EXPORT,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_EDIT,
    PERMISSIONS.CAMPAIGNS_SEND,
    PERMISSIONS.CAMPAIGNS_SCHEDULE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_EDIT,
    PERMISSIONS.TEMPLATES_SYNC,
    PERMISSIONS.INBOX_VIEW,
    PERMISSIONS.INBOX_SEND_MESSAGE,
    PERMISSIONS.INBOX_ASSIGN,
    PERMISSIONS.INBOX_CLOSE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.GROUPS_VIEW,
    PERMISSIONS.GROUPS_CREATE,
    PERMISSIONS.GROUPS_EDIT,
    PERMISSIONS.GROUPS_DELETE,
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_CREATE,
    PERMISSIONS.CRM_EDIT,
    PERMISSIONS.CRM_DELETE,
  ],
  agent: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.INBOX_VIEW,
    PERMISSIONS.INBOX_SEND_MESSAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.GROUPS_VIEW,
    PERMISSIONS.CRM_VIEW,
  ],
};

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAutomationNodeSchema = createInsertSchema(
  automationNodes
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutomationExecutionSchema = createInsertSchema(
  automationExecutions
).omit({ id: true, startedAt: true });
export const insertAutomationExecutionLogSchema = createInsertSchema(
  automationExecutionLogs
).omit({ id: true, executedAt: true });
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});
export const insertWhatsappChannelSchema = createInsertSchema(
  whatsappChannels
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookConfigSchema = createInsertSchema(
  webhookConfigs
).omit({ id: true, createdAt: true });
export const insertMessageQueueSchema = createInsertSchema(messageQueue).omit({
  id: true,
  createdAt: true,
});
export const insertApiLogSchema = createInsertSchema(apiLogs).omit({
  id: true,
  createdAt: true,
});
export const insertCampaignRecipientSchema = createInsertSchema(
  campaignRecipients
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationAssignmentSchema = createInsertSchema(
  conversationAssignments
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserActivityLogSchema = createInsertSchema(
  userActivityLogs
).omit({ id: true, createdAt: true });

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  widgetCode: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type AutomationNode = typeof automationNodes.$inferSelect;
export type InsertAutomationNode = z.infer<typeof insertAutomationNodeSchema>;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = z.infer<
  typeof insertAutomationExecutionSchema
>;
export type AutomationExecutionLog =
  typeof automationExecutionLogs.$inferSelect;
export type InsertAutomationExecutionLog = z.infer<
  typeof insertAutomationExecutionLogSchema
>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type WhatsappChannel = typeof whatsappChannels.$inferSelect;
export type InsertWhatsappChannel = z.infer<typeof insertWhatsappChannelSchema>;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = z.infer<typeof insertWebhookConfigSchema>;
export type MessageQueue = typeof messageQueue.$inferSelect;
export type InsertMessageQueue = z.infer<typeof insertMessageQueueSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<
  typeof insertCampaignRecipientSchema
>;
export type ConversationAssignment =
  typeof conversationAssignments.$inferSelect;
export type InsertConversationAssignment = z.infer<
  typeof insertConversationAssignmentSchema
>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type PanelConfig = typeof panelConfig.$inferSelect;
export type NewPanelConfig = typeof panelConfig.$inferInsert;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

// Drizzle Relations for proper joins and queries
export const channelsRelations = relations(channels, ({ many }) => ({
  contacts: many(contacts),
  campaigns: many(campaigns),
  templates: many(templates),
  conversations: many(conversations),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  channel: one(channels, {
    fields: [contacts.channelId],
    references: [channels.id],
  }),
  conversations: many(conversations),
  campaignRecipients: many(campaignRecipients),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  channel: one(channels, {
    fields: [campaigns.channelId],
    references: [channels.id],
  }),
  template: one(templates, {
    fields: [campaigns.templateId],
    references: [templates.id],
  }),
  recipients: many(campaignRecipients),
}));

export const campaignRecipientsRelations = relations(
  campaignRecipients,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignRecipients.campaignId],
      references: [campaigns.id],
    }),
    contact: one(contacts, {
      fields: [campaignRecipients.contactId],
      references: [contacts.id],
    }),
  })
);

export const templatesRelations = relations(templates, ({ one, many }) => ({
  channel: one(channels, {
    fields: [templates.channelId],
    references: [channels.id],
  }),
  campaigns: many(campaigns),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    channel: one(channels, {
      fields: [conversations.channelId],
      references: [channels.id],
    }),
    contact: one(contacts, {
      fields: [conversations.contactId],
      references: [contacts.id],
    }),

    messages: many(messages),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedConversations: many(conversationAssignments, {
    relationName: "conversation_assigned_user", // matches user side
  }),
  assignedByConversations: many(conversationAssignments, {
    relationName: "conversation_assigned_by_user", // matches assignedBy side
  }),
  activityLogs: many(userActivityLogs),
}));

export const conversationAssignmentsRelations = relations(
  conversationAssignments,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationAssignments.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationAssignments.userId],
      references: [users.id],
      relationName: "conversation_assigned_user",
    }),
    assignedByUser: one(users, {
      fields: [conversationAssignments.assignedBy],
      references: [users.id],
      relationName: "conversation_assigned_by_user",
    }),
  })
);

export const userActivityLogsRelations = relations(
  userActivityLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [userActivityLogs.userId],
      references: [users.id],
    }),
  })
);

export const automationsRelations = relations(automations, ({ one, many }) => ({
  channel: one(channels, {
    fields: [automations.channelId],
    references: [channels.id],
  }),
  createdByUser: one(users, {
    fields: [automations.createdBy],
    references: [users.id],
  }),
  nodes: many(automationNodes),
  edges: many(automationEdges),
  executions: many(automationExecutions),
}));

export const trainingSources = pgTable("training_sources", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull(),
  channelId: varchar("channel_id"),
  type: text("type").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  content: text("content"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  chunkCount: integer("chunk_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingChunks = pgTable("training_chunks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull(),
  siteId: varchar("site_id").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingQaPairs = pgTable("training_qa_pairs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull(),
  channelId: varchar("channel_id"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("general"),
  embedding: jsonb("embedding"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainingSourceSchema = createInsertSchema(trainingSources);
export const insertTrainingQaPairSchema = createInsertSchema(trainingQaPairs);

export const automationNodesRelations = relations(
  automationNodes,
  ({ one }) => ({
    automation: one(automations, {
      fields: [automationNodes.automationId],
      references: [automations.id],
    }),
  })
);

export const automationEdgesRelations = relations(
  automationEdges,
  ({ one }) => ({
    automation: one(automations, {
      fields: [automationEdges.automationId],
      references: [automations.id],
    }),
  })
);

export const automationExecutionsRelations = relations(
  automationExecutions,
  ({ one, many }) => ({
    automation: one(automations, {
      fields: [automationExecutions.automationId],
      references: [automations.id],
    }),
    contact: one(contacts, {
      fields: [automationExecutions.contactId],
      references: [contacts.id],
    }),
    conversation: one(conversations, {
      fields: [automationExecutions.conversationId],
      references: [conversations.id],
    }),
    logs: many(automationExecutionLogs),
  })
);

export const automationExecutionLogsRelations = relations(
  automationExecutionLogs,
  ({ one }) => ({
    execution: one(automationExecutions, {
      fields: [automationExecutionLogs.executionId],
      references: [automationExecutions.id],
    }),
  })
);

export const clientApiKeys = pgTable("client_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  channelId: varchar("channel_id").references(() => channels.id),
  name: varchar("name", { length: 100 }).notNull(),
  apiKey: varchar("api_key", { length: 64 }).notNull().unique(),
  secretHash: varchar("secret_hash", { length: 256 }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().default(sql`'[]'`),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  requestCount: integer("request_count").default(0),
  monthlyRequestCount: integer("monthly_request_count").default(0),
  monthlyResetAt: timestamp("monthly_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export const clientApiUsageLogs = pgTable("client_api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => clientApiKeys.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  channelId: varchar("channel_id").references(() => channels.id),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientWebhooks = pgTable("client_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  channelId: varchar("channel_id").references(() => channels.id),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 256 }),
  events: jsonb("events").$type<string[]>().default(sql`'[]'`),
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformLanguages = pgTable("platform_languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  nativeName: varchar("native_name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  direction: varchar("direction", { length: 3 }).notNull().default("ltr"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  translations: jsonb("translations").default(sql`'{}'`),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── WhatsApp Warmer Configurations ───────────────────
export const warmerConfigs = pgTable("warmer_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(false),
  minDelay: integer("min_delay").default(10), // in seconds
  maxDelay: integer("max_delay").default(60), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

// ─── WhatsApp Warmer Messages ───────────────────────
export const warmerMessages = pgTable("warmer_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  warmerConfigId: varchar("warmer_config_id").references(() => warmerConfigs.id, { onDelete: "cascade" }),
  messageText: text("message_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWarmerConfigSchema = createInsertSchema(warmerConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarmerMessageSchema = createInsertSchema(warmerMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WarmerConfig = typeof warmerConfigs.$inferSelect;
export type InsertWarmerConfig = typeof warmerConfigs.$inferInsert;
export type WarmerMessage = typeof warmerMessages.$inferSelect;
export type InsertWarmerMessage = typeof warmerMessages.$inferInsert;

// ─── Voice Profiles ───────────────────────────
export const voiceProfiles = pgTable("voice_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("sarvam"), // 'sarvam' | 'elevenlabs' | 'cartesian'
  voiceId: text("voice_id").notNull(),
  languageCode: text("language_code").default("en-IN"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVoiceProfileSchema = createInsertSchema(voiceProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = typeof voiceProfiles.$inferInsert;

// ─── Tags/Labels ───────────────────────────────
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTagSchema = z.object({
  name: z.string(),
  color: z.string(),
  channelId: z.string(),
  createdBy: z.string().optional(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// ─── Media Library ───────────────────────────────
export const mediaLibrary = pgTable("media_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaLibrarySchema = z.object({
  userId: z.string(),
  url: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().optional().nullable(),
});

export type MediaLibrary = typeof mediaLibrary.$inferSelect;
export type InsertMediaLibrary = typeof mediaLibrary.$inferInsert;

// ─── AI Assistant Profile ───────────────────────────────
export const aiProfiles = pgTable("ai_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  name: text("name").default("My AI Assistant"),
  enabled: boolean("enabled").default(false),
  llmProvider: varchar("llm_provider", { length: 50 }).default("openai"),
  model: varchar("model", { length: 100 }).default("gpt-4o"),
  systemPrompt: text("system_prompt").default("You are a fully aware personal assistant. Speak in a natural, friendly tone."),
  temperature: real("temperature").default(0.7),
  voiceEnabled: boolean("voice_enabled").default(false),
  voiceProfileId: varchar("voice_profile_id"),
  voiceLanguage: varchar("voice_language", { length: 50 }).default("en-US"),
  kbEnabled: boolean("kb_enabled").default(false),
  kbSiteId: varchar("kb_site_id"),
  triggerFlowEnabled: boolean("trigger_flow_enabled").default(false),
  targetFlowId: varchar("target_flow_id"),
  triggerFlowPrompt: text("trigger_flow_prompt").default("Triggers a helper chatbot/automation flow if the user wants to perform an action or process (like catalog, demo, support, pricing, or custom flows)."),
  openaiApiKey: text("openai_api_key"),
  groqApiKey: text("groq_api_key"),
  elevenlabsApiKey: text("elevenlabs_api_key"),
  sarvamApiKey: text("sarvam_api_key"),
  analyzeInboxHistory: boolean("analyze_inbox_history").default(false),
  ignorePersonalConversations: boolean("ignore_personal_conversations").default(true),
  personalKeywords: jsonb("personal_keywords").$type<string[]>().default(["family", "personal", "private", "brother", "sister", "mom", "dad", "wife", "husband"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiProfileSchema = z.object({
  userId: z.string().optional(),
  channelId: z.string().optional(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  llmProvider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
  voiceEnabled: z.boolean().optional(),
  voiceProfileId: z.string().optional().nullable(),
  voiceLanguage: z.string().optional(),
  kbEnabled: z.boolean().optional(),
  kbSiteId: z.string().optional().nullable(),
  triggerFlowEnabled: z.boolean().optional(),
  targetFlowId: z.string().optional().nullable(),
  triggerFlowPrompt: z.string().optional(),
  openaiApiKey: z.string().optional().nullable(),
  groqApiKey: z.string().optional().nullable(),
  elevenlabsApiKey: z.string().optional().nullable(),
  sarvamApiKey: z.string().optional().nullable(),
  analyzeInboxHistory: z.boolean().optional(),
  ignorePersonalConversations: z.boolean().optional(),
  personalKeywords: z.array(z.string()).optional(),
});

export type AiProfile = typeof aiProfiles.$inferSelect;
export type InsertAiProfile = typeof aiProfiles.$inferInsert;

// ─── CRM Schemas ─────────────────────────────────────────

export const crmPipelines = pgTable("crm_pipelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Sales Pipeline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmStages = pgTable("crm_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: varchar("pipeline_id").references(() => crmPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 20 }).default("#cbd5e1"),
});

export const crmDeals = pgTable("crm_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  stageId: varchar("stage_id").references(() => crmStages.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("open"), // open, won, lost
  lostReason: text("lost_reason"),
  expectedCloseDate: timestamp("expected_close_date"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  customFollowUpDate: timestamp("custom_follow_up_date"),
  isAutomatedFollowUpEnabled: boolean("is_automated_follow_up_enabled").default(false),
  followUpMessage: text("follow_up_message"),
  followUpTemplateName: text("follow_up_template_name"),
  followUpTemplateLanguage: text("follow_up_template_language").default("en_US"),
  followUpTemplateVariables: jsonb("follow_up_template_variables"),
  followUpStatus: text("follow_up_status").default("pending"),
  isFollowUpReminderSent: boolean("is_follow_up_reminder_sent").default(false),
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }).default("both"), // "call", "whatsapp", "both"
  contactedCount: integer("contacted_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmCadences = pgTable("crm_cadences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  triggerStageId: varchar("trigger_stage_id").references(() => crmStages.id),
  stopCondition: varchar("stop_condition").default("reply_or_close"),
  sendChannelId: varchar("send_channel_id").references(() => channels.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmCadenceSteps = pgTable("crm_cadence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cadenceId: varchar("cadence_id").references(() => crmCadences.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  delayHours: integer("delay_hours").notNull().default(24),
  messageType: varchar("message_type").default("text"),
  templateName: varchar("template_name"),
  templateLanguage: varchar("template_language").default("en_US"),
  messageText: text("message_text"),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 20 }), // "image", "video", "document"
  mediaName: text("media_name"),
});

export const crmDealFollowups = pgTable("crm_deal_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
  stepId: varchar("step_id").references(() => crmCadenceSteps.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status").default("pending"),
  sentAt: timestamp("sent_at"),
});

export const crmSettings = pgTable("crm_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  isLeadQualificationEnabled: boolean("is_lead_qualification_enabled").default(false),
  qualificationFlowId: varchar("qualification_flow_id").references(() => automations.id, { onDelete: "set null" }),
  isDailyReportEnabled: boolean("is_daily_report_enabled").default(false),
  isWeeklyReportEnabled: boolean("is_weekly_report_enabled").default(false),
  reportEmailRecipient: text("report_email_recipient"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmAgentTargets = pgTable("crm_agent_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  targetDealsWon: integer("target_deals_won").default(10),
  targetValueWon: numeric("target_value_won", { precision: 10, scale: 2 }).default("1000.00"),
  period: varchar("period", { length: 20 }).default("monthly"), // "weekly" or "monthly"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod validation schemas
export const insertCrmAgentTargetSchema = z.object({
  userId: z.string(),
  channelId: z.string(),
  targetDealsWon: z.number().optional(),
  targetValueWon: z.string().optional(),
  period: z.string().optional(),
});

export const insertCrmPipelineSchema = z.object({
  channelId: z.string(),
  name: z.string(),
});

export const insertCrmStageSchema = z.object({
  pipelineId: z.string(),
  name: z.string(),
  position: z.number().optional(),
  color: z.string().optional(),
});

export const insertCrmDealSchema = z.object({
  contactId: z.string(),
  channelId: z.string(),
  stageId: z.string(),
  title: z.string(),
  value: z.string().optional(),
  currency: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  status: z.string().optional(),
  lostReason: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFollowUpDate: z.string().optional().nullable(),
  isAutomatedFollowUpEnabled: z.boolean().optional(),
  followUpMessage: z.string().optional().nullable(),
  followUpTemplateName: z.string().optional().nullable(),
  followUpTemplateLanguage: z.string().optional().nullable(),
  followUpTemplateVariables: z.any().optional().nullable(),
  followUpStatus: z.string().optional(),
  isFollowUpReminderSent: z.boolean().optional(),
  preferredContactMethod: z.string().optional(),
  contactedCount: z.number().optional(),
});

export const insertCrmCadenceSchema = z.object({
  channelId: z.string(),
  name: z.string(),
  isActive: z.boolean().optional(),
  triggerStageId: z.string(),
  stopCondition: z.string().optional(),
});

export const insertCrmCadenceStepSchema = z.object({
  cadenceId: z.string(),
  stepNumber: z.number(),
  delayHours: z.number().optional(),
  messageType: z.string().optional(),
  templateName: z.string().optional().nullable(),
  templateLanguage: z.string().optional(),
  messageText: z.string().optional().nullable(),
});

export const insertCrmSettingsSchema = z.object({
  channelId: z.string(),
  isLeadQualificationEnabled: z.boolean().optional(),
  qualificationFlowId: z.string().optional().nullable(),
  isDailyReportEnabled: z.boolean().optional(),
  isWeeklyReportEnabled: z.boolean().optional(),
  reportEmailRecipient: z.string().optional().nullable(),
});

// ─── Contact Campaigns ───────────────────────
export const contactCampaigns = pgTable(
  "contact_campaigns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contactId: varchar("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    channelId: varchar("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    templateId: varchar("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    templateName: text("template_name"),
    templateLanguage: text("template_language"),
    variableMapping: jsonb("variable_mapping")
      .$type<Record<string, string>>()
      .default({}),
    customMessage: text("custom_message"),
    mediaUrl: text("media_url"),
    mediaMimeType: text("media_mime_type"),
    mediaName: text("media_name"),
    frequency: text("frequency").notNull(), // "everyday", "monthly", "6months", "yearly"
    scheduledDate: timestamp("scheduled_date").notNull(),
    nextSendAt: timestamp("next_send_at").notNull(),
    lastSentAt: timestamp("last_sent_at"),
    status: text("status").default("active"), // "active", "paused", "completed"
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    contactCampaignContactIdx: index("contact_campaigns_contact_idx").on(table.contactId),
    contactCampaignNextSendIdx: index("contact_campaigns_next_send_idx").on(table.nextSendAt),
    contactCampaignStatusIdx: index("contact_campaigns_status_idx").on(table.status),
  })
);

export const insertContactCampaignSchema = z.object({
  contactId: z.string().optional(),
  channelId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  templateId: z.string().nullable().optional(),
  templateName: z.string().nullable().optional(),
  templateLanguage: z.string().nullable().optional(),
  variableMapping: z.any().optional(),
  customMessage: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  mediaMimeType: z.string().nullable().optional(),
  mediaName: z.string().nullable().optional(),
  frequency: z.string().min(1, "Frequency is required"),
  scheduledDate: z.preprocess((val) => typeof val === "string" ? new Date(val) : val, z.date()),
  status: z.string().optional(),
});

export const contactCampaignTemplates = pgTable(
  "contact_campaign_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: varchar("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    customMessage: text("custom_message"),
    mediaUrl: text("media_url"),
    mediaMimeType: text("media_mime_type"),
    mediaName: text("media_name"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const insertContactCampaignTemplateSchema = z.object({
  channelId: z.string(),
  name: z.string().min(1, "Template name is required"),
  customMessage: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  mediaMimeType: z.string().nullable().optional(),
  mediaName: z.string().nullable().optional(),
});

// Types
export type ContactCampaign = typeof contactCampaigns.$inferSelect;
export type InsertContactCampaign = typeof contactCampaigns.$inferInsert;
export type ContactCampaignTemplate = typeof contactCampaignTemplates.$inferSelect;
export type InsertContactCampaignTemplate = typeof contactCampaignTemplates.$inferInsert;
export type CrmPipeline = typeof crmPipelines.$inferSelect;
export type InsertCrmPipeline = typeof crmPipelines.$inferInsert;
export type CrmStage = typeof crmStages.$inferSelect;
export type InsertCrmStage = typeof crmStages.$inferInsert;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = typeof crmDeals.$inferInsert;
export type CrmCadence = typeof crmCadences.$inferSelect;
export type InsertCrmCadence = typeof crmCadences.$inferInsert;
export type CrmCadenceStep = typeof crmCadenceSteps.$inferSelect;
export type InsertCrmCadenceStep = typeof crmCadenceSteps.$inferInsert;
export type CrmDealFollowup = typeof crmDealFollowups.$inferSelect;
export type InsertCrmDealFollowup = typeof crmDealFollowups.$inferInsert;
export type CrmSetting = typeof crmSettings.$inferSelect;
export type InsertCrmSetting = typeof crmSettings.$inferInsert;

// ─── Wallet System ───────────────────────────
export const wallets = pgTable(
  "wallets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 12, scale: 4 }).default("0.0000").notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    walletUserIdx: index("wallets_user_idx").on(table.userId),
  })
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'credit', 'debit'
    paymentMethod: varchar("payment_method", { length: 30 }).notNull(), // 'razorpay', 'paypal', 'tap', 'instamojo', 'upi', 'cash', 'account_transfer', 'manual_admin'
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'completed', 'failed'
    receiptUrl: text("receipt_url"), // upload for manual account transfer
    referenceId: varchar("reference_id"), // Order ID, Payment ID, UPI Ref, etc.
    description: text("description"),
    verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    wtUserIdx: index("wt_user_idx").on(table.userId),
    wtStatusIdx: index("wt_status_idx").on(table.status),
  })
);

export const insertWalletSchema = z.object({
  userId: z.string(),
  balance: z.string().or(z.number()).optional(),
  currency: z.string().optional(),
});

export const insertWalletTransactionSchema = z.object({
  userId: z.string(),
  amount: z.string().or(z.number()),
  currency: z.string().optional(),
  type: z.string(),
  paymentMethod: z.string(),
  status: z.string().optional(),
  receiptUrl: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifiedAt: z.preprocess((val) => typeof val === "string" ? new Date(val) : val, z.date()).nullable().optional(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;
export type BroadcastList = typeof broadcastLists.$inferSelect;
export type InsertBroadcastList = typeof broadcastLists.$inferInsert;

// Addons & Marketplace Schema
export const addons = pgTable("addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  billingCycle: varchar("billing_cycle").default("monthly"), // "monthly", "annual", "one-time"
  aiKeyType: text("ai_key_type").default("tenant"), // "tenant" or "admin"
  defaultCredits: integer("default_credits").default(0), // Default allocated tokens/credits for chatbot/AI usage
  adminProvider: text("admin_provider").default("openai"), // "openai" or "groq"
  adminApiKey: text("admin_api_key"), // Encrypted or stored API Key for admin keys type
  adminApiEndpoint: text("admin_api_endpoint"), // Custom endpoint URL for LLM API
  adminLlmModel: text("admin_llm_model").default("gpt-4o-mini"), // Selected model like 'gpt-4o-mini', 'llama-3.3-70b-versatile'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantAddons = pgTable("tenant_addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addonId: varchar("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("active"), // "active", "expired", "cancelled"
  expiresAt: timestamp("expires_at"),
  purchaseType: text("purchase_type").default("flow"), // "flow" (traditional automation) or "ai" (LLM voice notes processing)
  credits: integer("credits").default(0), // Current active credits / tokens remaining for admin-provided key type
  maxCredits: integer("max_credits").default(0), // Max allowed credits for this billing cycle
  gatewaySubscriptionId: varchar("gateway_subscription_id"),
  gatewayProvider: varchar("gateway_provider"), // "stripe", "razorpay", "wallet", "manual"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expense Module Schema
export const paymentAccounts = pgTable("payment_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("cash"), // "cash", "bank", "credit_card"
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  paymentAccountId: varchar("payment_account_id").references(() => paymentAccounts.id, { onDelete: "set null" }),
  type: text("type").default("expense"), // "expense" or "deposit"
  description: text("description"),
  date: timestamp("date").defaultNow(),
  mediaUrl: text("media_url"), // receipt images
  loggedByName: text("logged_by_name"),
  loggedByPhone: text("logged_by_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseConfigs = pgTable("expense_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  triggerKeyword: text("trigger_keyword").default("expense"),
  retrievalKeyword: text("retrieval_keyword").default("getexpense"),
  incomeKeyword: text("income_keyword").default("income"),
  reportingNumber: text("reporting_number"),
  reportInterval: text("report_interval").default("daily"), // "daily", "weekly", "monthly"
  reportEmail: text("report_email"),
  emailEnabled: boolean("email_enabled").default(false),
  isActive: boolean("is_active").default(true),
  aiPrompt: text("ai_prompt").default("You are a helper AI for an Expense Tracker app. Analyze the text representing an expense description or raw chat, and extract the amount, category, account, and description."),
  nextReportAt: timestamp("next_report_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseSessions = pgTable("expense_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "waiting_for_account", "waiting_for_date"
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  paymentAccountId: varchar("payment_account_id").references(() => paymentAccounts.id, { onDelete: "set null" }),
  description: text("description"),
  date: text("date"), // YYYY-MM-DD
  mediaUrl: text("media_url"),
  type: text("type").default("expense"), // "expense" or "deposit"
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSupportTickets = pgTable("whatsapp_support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // "open", "pending", "resolved", "closed"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "urgent"
  category: text("category").notNull().default("general"), // "technical", "billing", "sales", "general"
  description: text("description"),
  mediaUrl: text("media_url"),
  loggedByName: text("logged_by_name"),
  loggedByPhone: text("logged_by_phone"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const whatsappSupportTicketConfigs = pgTable("whatsapp_support_ticket_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  triggerKeyword: text("trigger_keyword").default("ticket"),
  retrievalKeyword: text("retrieval_keyword").default("getticket"),
  reportingNumber: text("reporting_number"),
  reportInterval: text("report_interval").default("daily"), // "daily", "weekly", "monthly"
  reportEmail: text("report_email"),
  emailEnabled: boolean("email_enabled").default(false),
  forwardEmail: text("forward_email"),
  forwardEnabled: boolean("forward_enabled").default(false),
  isActive: boolean("is_active").default(true),
  aiPrompt: text("ai_prompt").default("You are a helper AI for a Support Ticket app. Analyze the text representing a support ticket issue, description, or raw chat, and extract the subject, category, priority, and description."),
  nextReportAt: timestamp("next_report_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSupportTicketSessions = pgTable("whatsapp_support_ticket_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "waiting_for_subject", "waiting_for_category", "waiting_for_details"
  subject: text("subject"),
  category: text("category"),
  priority: text("priority"),
  description: text("description"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertAddonSchema = createInsertSchema(addons);
export const insertTenantAddonSchema = createInsertSchema(tenantAddons);
export const insertPaymentAccountSchema = createInsertSchema(paymentAccounts);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertExpenseConfigSchema = createInsertSchema(expenseConfigs);
export const insertExpenseSessionSchema = createInsertSchema(expenseSessions);
export const insertWhatsappSupportTicketSchema = createInsertSchema(whatsappSupportTickets);
export const insertWhatsappSupportTicketConfigSchema = createInsertSchema(whatsappSupportTicketConfigs);
export const insertWhatsappSupportTicketSessionSchema = createInsertSchema(whatsappSupportTicketSessions);

// Ecommerce Module Schema
export const ecommerceProducts = pgTable("ecommerce_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).default("0"),
  description: text("description"),
  photos: jsonb("photos").default([]),
  checkoutLink: text("checkout_link"),
  triggerKeyword: text("trigger_keyword"),
  isTriggerEnabled: boolean("is_trigger_enabled").default(false),
  currency: text("currency").default("INR"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ecommerceConfigs = pgTable("ecommerce_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  storeTriggerKeyword: text("store_trigger_keyword").default("store"),
  isStoreFlowActive: boolean("is_store_flow_active").default(true),
  welcomeMessage: text("welcome_message").default("Welcome to our store!"),
  welcomeHeaderUrl: text("welcome_header_url"),
  welcomeHeaderType: text("welcome_header_type").default("image"), // "image", "video", "none"
  qrCodeUrl: text("qr_code_url"),
  checkoutFields: jsonb("checkout_fields").default(["name", "phone", "address", "pin"]),
  instamojoApiKey: text("instamojo_api_key"),
  instamojoAuthToken: text("instamojo_auth_token"),
  instamojoSandbox: boolean("instamojo_sandbox").default(true),
  razorpayKeyId: text("razorpay_key_id"),
  razorpayKeySecret: text("razorpay_key_secret"),
  upiId: text("upi_id"),
  upiMerchantName: text("upi_merchant_name"),
  currency: text("currency").default("INR"),
  aiEnabled: boolean("ai_enabled").default(false),
  aiVoiceEnabled: boolean("ai_voice_enabled").default(false),
  aiTimeoutMinutes: integer("ai_timeout_minutes").default(30),
  aiAskButtonEnabled: boolean("ai_ask_button_enabled").default(true),
  aiSystemPrompt: text("ai_system_prompt"),
  welcomeMessages: jsonb("welcome_messages").default([]),
  storeName: text("store_name"),
  storeAddress: text("store_address"),
  storeWebsite: text("store_website"),
  storeLogo: text("store_logo"),
  deliveryFeeType: text("delivery_fee_type").default("flat"),
  flatDeliveryFee: numeric("flat_delivery_fee", { precision: 12, scale: 2 }).default("0"),
  defaultDeliveryFee: numeric("default_delivery_fee", { precision: 12, scale: 2 }).default("0"),
  stateDeliveryFees: jsonb("state_delivery_fees").$type<Record<string, string>>().default({}),
  storeCountry: text("store_country").default("IN"),
  labelCod: text("label_cod").default("Cash on Delivery (COD)"),
  labelUpiDirect: text("label_upi_direct").default("UPI Direct Mobile Pay"),
  labelQrPay: text("label_qr_pay").default("UPI (Pay via QR Code)"),
  labelGateway: text("label_gateway").default("Online Payment"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ecommerceOrders = pgTable("ecommerce_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "set null" }),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  customerPhone: text("customer_phone").notNull(),
  customerName: text("customer_name"),
  customerData: jsonb("customer_data").default({}),
  productId: varchar("product_id").references(() => ecommerceProducts.id, { onDelete: "set null" }),
  productName: text("product_name"),
  price: numeric("price", { precision: 12, scale: 2 }).default("0").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("INR"),
  paymentMethod: text("payment_method").notNull(), // "cod", "qr_pay", "gateway"
  paymentStatus: text("payment_status").default("pending"), // "pending", "paid", "failed", "pending_verification"
  paymentGateway: text("payment_gateway"), // "instamojo", "razorpay"
  paymentGatewayOrderId: text("payment_gateway_order_id"),
  receiptUrl: text("receipt_url"),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).default("0").notNull(),
  status: text("status").default("pending"), // "pending", "processing", "shipped", "delivered", "cancelled"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ecommerceSessions = pgTable("ecommerce_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().unique().references(() => conversations.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => ecommerceProducts.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1),
  currentStep: text("current_step").notNull(), // "waiting_for_quantity", "waiting_for_field:<fieldName>", "waiting_for_payment_method", "waiting_for_qr_receipt"
  customerData: jsonb("customer_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas
export const insertEcommerceProductSchema = createInsertSchema(ecommerceProducts);
export const insertEcommerceConfigSchema = createInsertSchema(ecommerceConfigs);
export const insertEcommerceOrderSchema = createInsertSchema(ecommerceOrders);
export const insertEcommerceSessionSchema = createInsertSchema(ecommerceSessions);

// TypeScript types
export type Addon = typeof addons.$inferSelect;
export type InsertAddon = typeof addons.$inferInsert;
export type TenantAddon = typeof tenantAddons.$inferSelect;
export type InsertTenantAddon = typeof tenantAddons.$inferInsert;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type InsertPaymentAccount = typeof paymentAccounts.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type ExpenseConfig = typeof expenseConfigs.$inferSelect;
export type InsertExpenseConfig = typeof expenseConfigs.$inferInsert;
export type ExpenseSession = typeof expenseSessions.$inferSelect;
export type InsertExpenseSession = typeof expenseSessions.$inferInsert;
export type WhatsappSupportTicket = typeof whatsappSupportTickets.$inferSelect;
export type InsertWhatsappSupportTicket = typeof whatsappSupportTickets.$inferInsert;
export type WhatsappSupportTicketConfig = typeof whatsappSupportTicketConfigs.$inferSelect;
export type InsertWhatsappSupportTicketConfig = typeof whatsappSupportTicketConfigs.$inferInsert;
export type WhatsappSupportTicketSession = typeof whatsappSupportTicketSessions.$inferSelect;
export type InsertWhatsappSupportTicketSession = typeof whatsappSupportTicketSessions.$inferInsert;

export type EcommerceProduct = typeof ecommerceProducts.$inferSelect;
export type InsertEcommerceProduct = typeof ecommerceProducts.$inferInsert;
export type EcommerceConfig = typeof ecommerceConfigs.$inferSelect;
export type InsertEcommerceConfig = typeof ecommerceConfigs.$inferInsert;
export type EcommerceOrder = typeof ecommerceOrders.$inferSelect;
export type InsertEcommerceOrder = typeof ecommerceOrders.$inferInsert;
export type EcommerceSession = typeof ecommerceSessions.$inferSelect;
export type InsertEcommerceSession = typeof ecommerceSessions.$inferInsert;

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  contactPhone: text("contact_phone").notNull(),
  contactName: text("contact_name"),
  title: text("title").notNull(),
  dueTime: timestamp("due_time").notNull(),
  leadTimeMinutes: integer("lead_time_minutes").default(15),
  status: text("status").default("pending"), // "pending", "reminded_early", "reminded_main", "cancelled"
  mediaUrl: text("media_url"),
  voiceTranscript: text("voice_transcript"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reminderConfigs = pgTable("reminder_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  triggerKeyword: text("trigger_keyword").default("remind"),
  todoKeyword: text("todo_keyword").default("todo"),
  defaultLeadTimeMinutes: integer("default_lead_time_minutes").default(15),
  aiPrompt: text("ai_prompt").default("You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly."),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reminderSessions = pgTable("reminder_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "waiting_for_what", "waiting_for_when"
  title: text("title"),
  dueTime: timestamp("due_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders);
export const insertReminderConfigSchema = createInsertSchema(reminderConfigs);
export const insertReminderSessionSchema = createInsertSchema(reminderSessions);

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;
export type ReminderConfig = typeof reminderConfigs.$inferSelect;
export type InsertReminderConfig = typeof reminderConfigs.$inferInsert;
export type ReminderSession = typeof reminderSessions.$inferSelect;
export type InsertReminderSession = typeof reminderSessions.$inferInsert;



