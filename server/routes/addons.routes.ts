import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or, like, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { AddonManager } from "../services/addon-manager";
import ExcelJS from "exceljs";

export function registerAddonsRoutes(app: Express) {
  // ============================================================
  // SUPERADMIN ADDON MANAGEMENT ROUTES
  // ============================================================

  // Get list of all addons
  app.get("/api/admin/addons", requireAuth, requireRole("superadmin"), async (req: Request, res: Response) => {
    try {
      const list = await db.select().from(schema.addons);
      const maskedList = list.map(addon => ({
        ...addon,
        adminApiKey: addon.adminApiKey ? "••••••••••••" : null
      }));
      res.json(maskedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create or edit an addon
  app.post("/api/admin/addons", requireAuth, requireRole("superadmin"), async (req: Request, res: Response) => {
    try {
      const { id, name, slug, description, price, billingCycle, aiKeyType, defaultCredits, adminProvider, adminApiKey, adminApiEndpoint, adminLlmModel, isActive } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required." });
      }

      let keyToSave = adminApiKey;
      if (id && adminApiKey === "••••••••••••") {
        const [existing] = await db.select().from(schema.addons).where(eq(schema.addons.id, id)).limit(1);
        keyToSave = existing?.adminApiKey || null;
      }

      if (id) {
        const [updated] = await db
          .update(schema.addons)
          .set({
            name,
            slug,
            description,
            price: String(price || "0"),
            billingCycle: billingCycle || "monthly",
            aiKeyType: aiKeyType || "tenant",
            defaultCredits: Number(defaultCredits || 0),
            adminProvider: adminProvider || "openai",
            adminApiKey: keyToSave || null,
            adminApiEndpoint: adminApiEndpoint || null,
            adminLlmModel: adminLlmModel || "gpt-4o-mini",
            isActive: isActive !== undefined ? isActive : true,
            updatedAt: new Date()
          })
          .where(eq(schema.addons.id, id))
          .returning();
        return res.json(updated);
      } else {
        const [created] = await db
          .insert(schema.addons)
          .values({
            name,
            slug,
            description,
            price: String(price || "0"),
            billingCycle: billingCycle || "monthly",
            aiKeyType: aiKeyType || "tenant",
            defaultCredits: Number(defaultCredits || 0),
            adminProvider: adminProvider || "openai",
            adminApiKey: keyToSave || null,
            adminApiEndpoint: adminApiEndpoint || null,
            adminLlmModel: adminLlmModel || "gpt-4o-mini",
            isActive: isActive !== undefined ? isActive : true
          })
          .returning();
        return res.json(created);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle active status
  app.put("/api/admin/addons/:id/toggle", requireAuth, requireRole("superadmin"), async (req: Request, res: Response) => {
    try {
      const [addon] = await db.select().from(schema.addons).where(eq(schema.addons.id, req.params.id)).limit(1);
      if (!addon) return res.status(404).json({ error: "Addon not found" });

      const [updated] = await db
        .update(schema.addons)
        .set({ isActive: !addon.isActive, updatedAt: new Date() })
        .where(eq(schema.addons.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active addon subscriptions
  app.get("/api/admin/addons/subscriptions", requireAuth, requireRole("superadmin"), async (req: Request, res: Response) => {
    try {
      const list = await db
        .select({
          id: schema.tenantAddons.id,
          status: schema.tenantAddons.status,
          credits: schema.tenantAddons.credits,
          maxCredits: schema.tenantAddons.maxCredits,
          expiresAt: schema.tenantAddons.expiresAt,
          createdAt: schema.tenantAddons.createdAt,
          tenantName: schema.users.username,
          tenantEmail: schema.users.email,
          addonName: schema.addons.name,
          addonSlug: schema.addons.slug,
          addonPrice: schema.addons.price
        })
        .from(schema.tenantAddons)
        .innerJoin(schema.users, eq(schema.tenantAddons.tenantId, schema.users.id))
        .innerJoin(schema.addons, eq(schema.tenantAddons.addonId, schema.addons.id));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // TENANT MARKETPLACE ROUTES
  // ============================================================

  // Browse addons & subscription status for tenant
  app.get("/api/tenant/addons", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const allAddons = await db.select().from(schema.addons).where(eq(schema.addons.isActive, true));
      const subscriptions = await db
        .select()
        .from(schema.tenantAddons)
        .where(eq(schema.tenantAddons.tenantId, tenantId));

      const subMap = new Map(subscriptions.map(s => [s.addonId, s]));

      const result = allAddons.map(addon => {
        const sub = subMap.get(addon.id);
        return {
          ...addon,
          subscription: sub ? {
            id: sub.id,
            status: sub.status,
            credits: sub.credits,
            maxCredits: sub.maxCredits,
            expiresAt: sub.expiresAt
          } : null
        };
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Purchase/Subscribe to an addon
  app.post("/api/tenant/addons/:id/purchase", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const addonId = req.params.id;
      const { channelId, purchaseType } = req.body; // Channel ID to preload default template

      const [addon] = await db.select().from(schema.addons).where(eq(schema.addons.id, addonId)).limit(1);
      if (!addon) return res.status(404).json({ error: "Addon not found" });

      const finalType = purchaseType || "flow";
      const isAI = finalType === "ai";
      const initCredits = isAI ? (addon.defaultCredits || 0) : 0;

      // Handle billing structure - Check if Wallet is enabled and has balance
      const price = parseFloat(addon.price || "0");
      if (price > 0 && user.walletEnabled) {
        const [wallet] = await db
          .select()
          .from(schema.wallets)
          .where(eq(schema.wallets.userId, tenantId))
          .limit(1);
        
        const balance = wallet ? parseFloat(wallet.balance || "0") : 0;
        if (balance < price) {
          return res.status(400).json({ error: `Insufficient wallet balance. You need ${addon.price} but only have ${balance.toFixed(2)}.` });
        }

        // Deduct balance from wallet
        await db
          .update(schema.wallets)
          .set({
            balance: String(balance - price),
            updatedAt: new Date()
          })
          .where(eq(schema.wallets.userId, tenantId));

        // Create wallet transaction
        await db.insert(schema.walletTransactions).values({
          userId: tenantId,
          amount: String(-price),
          currency: wallet?.currency || "USD",
          type: "debit",
          paymentMethod: "wallet",
          status: "completed",
          description: `Subscription purchase for Addon: ${addon.name} (${finalType.toUpperCase()} mode)`,
          verifiedAt: new Date()
        });
      }

      // Upsert tenant_addons mapping
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const [existing] = await db
        .select()
        .from(schema.tenantAddons)
        .where(
          and(
            eq(schema.tenantAddons.tenantId, tenantId),
            eq(schema.tenantAddons.addonId, addonId)
          )
        )
        .limit(1);

      let subscription;
      if (existing) {
        const [updated] = await db
          .update(schema.tenantAddons)
          .set({
            status: "active",
            expiresAt,
            purchaseType: finalType,
            credits: initCredits,
            maxCredits: initCredits,
            gatewayProvider: price > 0 ? (user.walletEnabled ? "wallet" : "stripe") : "manual",
            updatedAt: new Date()
          })
          .where(eq(schema.tenantAddons.id, existing.id))
          .returning();
        subscription = updated;
      } else {
        const [created] = await db
          .insert(schema.tenantAddons)
          .values({
            tenantId,
            addonId,
            status: "active",
            expiresAt,
            purchaseType: finalType,
            credits: initCredits,
            maxCredits: initCredits,
            gatewayProvider: price > 0 ? (user.walletEnabled ? "wallet" : "stripe") : "manual"
          })
          .returning();
        subscription = created;
      }

      // Preload default flow configuration if it is the expense module and channelId was passed
      if (addon.slug === "expense-tracker" && channelId) {
        await AddonManager.preloadPredefinedFlow(tenantId, channelId, addon.slug);
      }

      res.json({ success: true, message: `Successfully purchased addon: ${addon.name} in ${finalType.toUpperCase()} mode`, data: subscription });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel subscription
  app.post("/api/tenant/addons/:id/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [updated] = await db
        .update(schema.tenantAddons)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(schema.tenantAddons.tenantId, tenantId),
            eq(schema.tenantAddons.addonId, req.params.id)
          )
        )
        .returning();

      res.json({ success: true, message: "Subscription cancelled successfully", data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // EXPENSE MODULE LEDGER & CONFIG ENDPOINTS
  // ============================================================

  // Get Expenses Ledger with Filters
  app.get("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { search, category, paymentAccountId, startDate, endDate, channelId } = req.query;

      const conditions = [eq(schema.expenses.tenantId, tenantId)];

      if (channelId && typeof channelId === "string") {
        conditions.push(eq(schema.expenses.channelId, channelId));
      }
      if (category && typeof category === "string") {
        conditions.push(eq(schema.expenses.category, category));
      }
      if (paymentAccountId && typeof paymentAccountId === "string") {
        conditions.push(eq(schema.expenses.paymentAccountId, paymentAccountId));
      }
      if (startDate && typeof startDate === "string") {
        conditions.push(gte(schema.expenses.date, new Date(startDate)));
      }
      if (endDate && typeof endDate === "string") {
        conditions.push(lte(schema.expenses.date, new Date(endDate)));
      }
      if (search && typeof search === "string") {
        conditions.push(like(schema.expenses.description, `%${search}%`));
      }

      const list = await db
        .select()
        .from(schema.expenses)
        .where(and(...conditions))
        .orderBy(sql`${schema.expenses.date} DESC`);

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create manual expense
  app.post("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { amount, category, paymentAccountId, description, date, mediaUrl, channelId, type } = req.body;

      if (!amount || !category) {
        return res.status(400).json({ error: "Amount and category are required." });
      }

      const txType = type || "expense";

      // If account specified, adjust the balance
      if (paymentAccountId) {
        const [account] = await db
          .select()
          .from(schema.paymentAccounts)
          .where(eq(schema.paymentAccounts.id, paymentAccountId))
          .limit(1);
        
        if (account) {
          const currentBalance = parseFloat(account.balance || "0");
          const change = parseFloat(amount);
          const newBalance = txType === "deposit" ? currentBalance + change : currentBalance - change;
          await db
            .update(schema.paymentAccounts)
            .set({
              balance: String(newBalance),
              updatedAt: new Date()
            })
            .where(eq(schema.paymentAccounts.id, paymentAccountId));
        }
      }

      const [created] = await db
        .insert(schema.expenses)
        .values({
          tenantId,
          channelId: channelId || null,
          amount: String(amount),
          category,
          paymentAccountId: paymentAccountId || null,
          type: txType,
          description: description || "",
          date: date ? new Date(date) : new Date(),
          mediaUrl: mediaUrl || null
        })
        .returning();

      res.json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Expense
  app.delete("/api/expenses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      
      const [expense] = await db
        .select()
        .from(schema.expenses)
        .where(and(eq(schema.expenses.id, req.params.id), eq(schema.expenses.tenantId, tenantId)))
        .limit(1);

      if (!expense) return res.status(404).json({ error: "Expense entry not found." });

      // Restore account balance
      if (expense.paymentAccountId) {
        const [account] = await db
          .select()
          .from(schema.paymentAccounts)
          .where(eq(schema.paymentAccounts.id, expense.paymentAccountId))
          .limit(1);
        
        if (account) {
          const currentBalance = parseFloat(account.balance || "0");
          const change = parseFloat(expense.amount);
          const restoredBalance = expense.type === "deposit" ? currentBalance - change : currentBalance + change;
          await db
            .update(schema.paymentAccounts)
            .set({
              balance: String(restoredBalance),
              updatedAt: new Date()
            })
            .where(eq(schema.paymentAccounts.id, expense.paymentAccountId));
        }
      }

      await db.delete(schema.expenses).where(eq(schema.expenses.id, req.params.id));
      res.json({ success: true, message: "Expense deleted successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export Expenses ledger as Excel
  app.get("/api/expenses/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { category, paymentAccountId, startDate, endDate, channelId } = req.query;

      const conditions = [eq(schema.expenses.tenantId, tenantId)];

      if (channelId && typeof channelId === "string") conditions.push(eq(schema.expenses.channelId, channelId));
      if (category && typeof category === "string") conditions.push(eq(schema.expenses.category, category));
      if (paymentAccountId && typeof paymentAccountId === "string") conditions.push(eq(schema.expenses.paymentAccountId, paymentAccountId));
      if (startDate && typeof startDate === "string") conditions.push(gte(schema.expenses.date, new Date(startDate)));
      if (endDate && typeof endDate === "string") conditions.push(lte(schema.expenses.date, new Date(endDate)));

      const list = await db
        .select()
        .from(schema.expenses)
        .where(and(...conditions))
        .orderBy(sql`${schema.expenses.date} DESC`);

      const accounts = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId));
      
      const accountsMap = new Map(accounts.map(a => [a.id, a.name]));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Expenses Ledger");

      worksheet.columns = [
        { header: "Date", key: "date", width: 22 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Category", key: "category", width: 20 },
        { header: "Payment Account", key: "account", width: 25 },
        { header: "Description", key: "description", width: 40 },
      ];

      worksheet.getRow(1).font = { bold: true };

      list.forEach(log => {
        worksheet.addRow({
          date: log.date ? new Date(log.date).toLocaleString() : "",
          amount: Number(log.amount || 0).toFixed(2),
          category: log.category,
          account: log.paymentAccountId ? (accountsMap.get(log.paymentAccountId) || "Unknown") : "Cash",
          description: log.description || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader("Content-Disposition", `attachment; filename=expenses_ledger_${new Date().toISOString().split("T")[0]}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Payment Accounts CRUD
  app.get("/api/expenses/payment-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const list = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/expenses/payment-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { name, type, balance } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required." });
      }

      const [created] = await db
        .insert(schema.paymentAccounts)
        .values({
          tenantId,
          name,
          type,
          balance: String(balance || "0")
        })
        .returning();

      res.json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/expenses/payment-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [existing] = await db
        .select()
        .from(schema.paymentAccounts)
        .where(
          and(
            eq(schema.paymentAccounts.id, req.params.id),
            eq(schema.paymentAccounts.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Payment account not found." });
      }

      await db
        .delete(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.id, req.params.id));

      res.json({ success: true, message: "Payment account deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get/Save trigger configurations
  app.get("/api/expenses/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId } = req.query;

      if (!channelId) return res.status(400).json({ error: "ChannelId is required" });

      const [config] = await db
        .select()
        .from(schema.expenseConfigs)
        .where(
          and(
            eq(schema.expenseConfigs.tenantId, tenantId),
            eq(schema.expenseConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      res.json(config || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/expenses/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, triggerKeyword, retrievalKeyword, incomeKeyword, reportingNumber, reportInterval, reportEmail, emailEnabled, isActive, aiPrompt, purchaseType } = req.body;

      if (!channelId) return res.status(400).json({ error: "ChannelId is required" });

      // Update subscription purchase type if specified
      if (purchaseType === "ai" || purchaseType === "flow") {
        const [addon] = await db
          .select()
          .from(schema.addons)
          .where(eq(schema.addons.slug, "expense-tracker"))
          .limit(1);

        if (addon) {
          await db
            .update(schema.tenantAddons)
            .set({ purchaseType })
            .where(
              and(
                eq(schema.tenantAddons.tenantId, tenantId),
                eq(schema.tenantAddons.addonId, addon.id)
              )
            );
        }
      }

      const [existing] = await db
        .select()
        .from(schema.expenseConfigs)
        .where(eq(schema.expenseConfigs.channelId, channelId))
        .limit(1);

      let config;
      if (existing) {
        const [updated] = await db
          .update(schema.expenseConfigs)
          .set({
            triggerKeyword: triggerKeyword || "expense",
            retrievalKeyword: retrievalKeyword || "getexpense",
            incomeKeyword: incomeKeyword || "income",
            reportingNumber: reportingNumber || null,
            reportInterval: reportInterval || "daily",
            reportEmail: reportEmail || null,
            emailEnabled: emailEnabled !== undefined ? emailEnabled : false,
            isActive: isActive !== undefined ? isActive : true,
            aiPrompt: aiPrompt !== undefined ? aiPrompt : undefined,
          })
          .where(eq(schema.expenseConfigs.id, existing.id))
          .returning();
        config = updated;
      } else {
        const [created] = await db
          .insert(schema.expenseConfigs)
          .values({
            tenantId,
            channelId,
            triggerKeyword: triggerKeyword || "expense",
            retrievalKeyword: retrievalKeyword || "getexpense",
            incomeKeyword: incomeKeyword || "income",
            reportingNumber: reportingNumber || null,
            reportInterval: reportInterval || "daily",
            reportEmail: reportEmail || null,
            emailEnabled: emailEnabled !== undefined ? emailEnabled : false,
            isActive: isActive !== undefined ? isActive : true,
            aiPrompt: aiPrompt || undefined,
          })
          .returning();
        config = created;
      }

      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Re-preload / load default expense flow
  app.post("/api/expenses/load-flow", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required." });
      }

      await AddonManager.preloadPredefinedFlow(tenantId, channelId, "expense-tracker");
      res.json({ success: true, message: "Predefined Expense automation flow preloaded successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
