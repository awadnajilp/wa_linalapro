# Plan: CRM Team Performance & Monitoring Dashboard

This plan outlines the architecture, database changes, API design, and UI layouts to build a robust **Team Performance & Monitoring Dashboard** for account admins. It will enable monitoring agent metrics, setting performance targets, and automating daily/weekly email reports.

---

## 1. Database Schema Updates (`shared/schema.ts`)

We will introduce a new table for agent targets and expand the CRM settings schema to handle automated email reports and contact counts.

### New Table: `crmAgentTargets`
Stores targets (won deals and won value) per team member per channel.
```typescript
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
```

### Table Additions: `crmSettings`
We will add fields to control automated summary reports.
```typescript
// Inside crmSettings table definition:
isDailyReportEnabled: boolean("is_daily_report_enabled").default(false),
isWeeklyReportEnabled: boolean("is_weekly_report_enabled").default(false),
reportEmailRecipient: text("report_email_recipient"), // Optional override recipient email
```

### Table Additions: `crmDeals`
We will add fields to track preferred contact types and contacted frequency.
```typescript
// Inside crmDeals table definition:
preferredContactMethod: varchar("preferred_contact_method", { length: 20 }).default("both"), // "call" | "whatsapp" | "both"
contactedCount: integer("contacted_count").default(0),
```

---

## 2. API Endpoint Design (`server/routes/crm.routes.ts`)

We will add key endpoints to handle metrics, targets, settings, and contact updates.

### Authorization & Scope Check Logic
For all admin-specific endpoints (targets management, reporting settings, performance statistics), access is restricted to:
* Main tenant owners (`user.role === 'admin'`).
* Team members with administrative privileges (`user.role === 'team' && user.isAdminMember === true`).

### `GET /api/crm/performance?channelId=:id&period=daily|weekly|monthly`
Calculates and returns performance metrics for the channel's team members:
- **Total Leads Assigned:** Count of deals created and assigned to the user.
- **Won Leads Count & Total Value:** Deals with `status = 'won'`.
- **Conversion Rate:** `(won / total) * 100`.
- **Average Response Time:** Calculated by comparing deal creation time vs. the timestamp of the first outbound message to the contact.
- **Target Progress:** Comparison of won deals/value against active targets.

### `GET /api/crm/targets?channelId=:id`
Fetches all configured targets for the team members in the specified channel.

### `POST /api/crm/targets`
Creates or updates a target for a team member.
- **Payload:** `{ userId, channelId, targetDealsWon, targetValueWon, period }`

### `PUT /api/crm/settings`
Updates the qualification and email report configuration (daily/weekly toggles and recipient).

### `POST /api/crm/deals/:id/log-call`
Increments the `contactedCount` of the deal by 1. Also appends a note inside the deal's `notes` history logging the timestamp and agent who performed the call.

---

## 3. Contact Type Tracking & Auto-Increment Logic

To ensure the `contactedCount` is updated reliably across all touchpoints:

### Manual Updates (Calls)
- A **"Log Call"** button will be exposed in the Deal Details modal.
- Tapping this fires `POST /api/crm/deals/:id/log-call` which updates the database.

### Automated Updates (WhatsApp)
We will hook into the message dispatch workflows to increment the counter:
1. **Flow Builder Messages:** In `automation-execution-service.ts`, when a node triggers an outbound WhatsApp message (via `custom_reply`, `send_template`, or `ai_answer`), the server checks if there is an active deal linked to this contact. If so, it increments `contactedCount`.
2. **Follow-Up Cron:** In `crm-followups.cron.ts`, when a custom follow-up triggers and sends the message, it automatically increments `contactedCount`.
3. **Stage Cadence Cron:** When a cadence step sends a message to a deal contact, it automatically increments `contactedCount`.

---

## 4. Automated Email Reports (Backend Services & Crons)

We will configure automated cron jobs to dispatch performance metrics summaries directly to the account admin's email.

### Weekly/Daily Aggregator Service (`server/services/crm-reports.service.ts`)
- Queries all active `crmSettings` records that have daily or weekly reports enabled.
- For each active channel, compiles a breakdown of:
  - **Overall Channel Stats:** New leads, deals won, total value closed, conversion rates.
  - **Individual Agent Performance Table:**
    - Agent Name
    - Leads Assigned
    - Deals Closed (Won / Lost)
    - Total Won Value
    - Target Progress Bar (%)
- Generates a beautifully styled responsive HTML email template.
- Sends the email using `email.service.ts` to the main account admin's email and any active team members with `isAdminMember === true`.

### Cron Integration (`server/cron/crm-reports.cron.ts`)
- **Daily Cron:** Runs every day at 8:00 PM (Server Local Time) to send the daily report.
- **Weekly Cron:** Runs every Sunday at 8:00 PM (Server Local Time) to send the weekly summary.

---

## 5. Frontend UI Design (`client/src/pages/crm/CRM.tsx`)

A **Team Performance** tab will be integrated at the top of the CRM Pipelines page, accessible to users where `user.role === 'admin' || user.isAdminMember === true`.

```
+-------------------------------------------------------------------+
| CRM Pipelines                                                     |
| [ Board ] [ Team Performance ]                                     |
+-------------------------------------------------------------------+
| Filters: [ Period: Monthly v ]                                    |
|                                                                   |
| Summary Cards:                                                    |
| +----------------+ +----------------+ +----------------+          |
| | Total Leads    | | Closed Value   | | Win Rate       |          |
| | 120 (+12%)     | | $42,500.00     | | 34.2%          |          |
| +----------------+ +----------------+ +----------------+          |
|                                                                   |
| Leaderboard & Target Progress:                                    |
| Agent      Leads Assigned   Deals Won/Lost    Revenue    Target   |
| 1. Alice       45            18 / 2          $18,000    [===  ] 90%|
| 2. Bob         38            10 / 5          $10,500    [==   ] 60%|
|                                                                   |
| [ Configure Targets Button ] -> Opens Target Settings Dialog      |
| [ Configure Email Reports ]  -> Opens Email Reports Settings      |
+-------------------------------------------------------------------+
```

### Components to Build:
1. **TargetConfigDialog:** A modal allowing admins to assign specific target numbers of won deals and values for each team member.
2. **ReportSettingsDialog:** A settings toggle modal to enable/disable daily and weekly reports and specify recipient emails.
3. **Funnel/Status Chart:** Visual chart displaying deal status breakdown across agents.
4. **Deal Card Updates:**
   - Add a dropdown for **Preferred Contact Method** (`Call`, `WhatsApp`, `Both`).
   - Display a **Times Contacted** counter.
   - Include a **Log Call** button in the details panel that instantly increments the counter and updates the history log.
