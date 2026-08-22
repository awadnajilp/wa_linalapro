/**
 * ============================================================
 * © 2026 Antigravity - Wallet System Controller
 * ============================================================
 */

import { Request, Response } from "express";
import { db } from "../db";
import { wallets, walletTransactions, users, panelConfig } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getRazorpay } from "../services/payment-gateway.service";
import crypto from "crypto";

// Get user's wallet
export const getMyWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find the user first to see if they exist and check their role/creator
    const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const activeUser = userData[0];
    
    // Find wallet
    let walletList = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    let wallet = walletList[0];

    // If wallet doesn't exist, create it
    if (!wallet) {
      const panelConfigs = await db.select().from(panelConfig).limit(1);
      const defaultCurrency = panelConfigs[0]?.currency || "USD";
      
      const newWallet = await db.insert(wallets).values({
        userId,
        balance: "0.0000",
        currency: defaultCurrency,
      }).returning();
      wallet = newWallet[0];
    }

    return res.status(200).json({
      success: true,
      wallet: {
        ...wallet,
        balance: parseFloat(wallet.balance),
        walletEnabled: activeUser.walletEnabled,
      }
    });
  } catch (error: any) {
    console.error("Error fetching wallet:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's wallet transactions
export const getMyTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const txs = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));

    return res.status(200).json({
      success: true,
      transactions: txs.map(t => ({
        ...t,
        amount: parseFloat(t.amount)
      }))
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Initiate manual payment (UPI, Cash, Account transfer)
export const initiateManualRecharge = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, paymentMethod, currency, description } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid recharge amount" });
    }

    const pConfigs = await db.select().from(panelConfig).limit(1);
    const pConfig = pConfigs[0];
    const walletSettings = pConfig?.walletSettings || {};

    const resolvedCurrency = currency || pConfig?.currency || "USD";

    // Insert pending wallet transaction
    const newTx = await db.insert(walletTransactions).values({
      userId,
      amount: parseFloat(amount).toFixed(4),
      currency: resolvedCurrency,
      type: "credit",
      paymentMethod,
      status: "pending",
      description: description || `Wallet recharge via ${paymentMethod}`,
    }).returning();

    const transaction = newTx[0];

    let responseData: any = {
      success: true,
      transactionId: transaction.id,
      amount: parseFloat(transaction.amount),
      currency: transaction.currency,
      paymentMethod,
      status: "pending",
    };

    if (paymentMethod === "upi") {
      const upiId = walletSettings.upiId || "";
      // UPI intent link: upi://pay?pa=address@bank&pn=MerchantName&am=10.00&cu=INR&tr=TxnID
      const encodedMerchantName = encodeURIComponent(pConfig?.name || "LINALA Wallet");
      const upiLink = `upi://pay?pa=${upiId}&pn=${encodedMerchantName}&am=${parseFloat(amount).toFixed(2)}&cu=${resolvedCurrency}&tr=${transaction.id}`;
      
      responseData.upiId = upiId;
      responseData.upiLink = upiLink;
      responseData.instructions = `Click to pay or scan QR code using any UPI app to transfer to ${upiId}`;
    } else if (paymentMethod === "account_transfer") {
      responseData.bankDetails = walletSettings.bankDetails || "";
      responseData.instructions = "Please transfer the amount to the bank account details below and upload the receipt image/PDF.";
      responseData.requiresReceipt = true;
    } else if (paymentMethod === "cash") {
      responseData.instructions = "Please pay cash directly to the administrator. The wallet balance will be updated after admin verification.";
    }

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Error initiating manual recharge:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit receipt for account transfer transaction
export const submitTransferReceipt = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { transactionId } = req.params;
    const file = req.file as any;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "No receipt file uploaded" });
    }

    const receiptUrl = file.cloudUrl || `/uploads/${file.filename}`;

    const txList = await db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.id, transactionId), eq(walletTransactions.userId, userId)))
      .limit(1);

    if (txList.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const transaction = txList[0];
    if (transaction.paymentMethod !== "account_transfer") {
      return res.status(400).json({ success: false, message: "Receipt upload only supported for bank account transfers" });
    }

    await db
      .update(walletTransactions)
      .set({
        receiptUrl,
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, transactionId));

    return res.status(200).json({
      success: true,
      message: "Receipt uploaded successfully. Waiting for admin approval.",
      receiptUrl,
    });
  } catch (error: any) {
    console.error("Error submitting transfer receipt:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Initiate payment gateway recharge (Razorpay, PayPal, Tap, Instamojo)
export const initiateGatewayRecharge = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, paymentMethod, currency } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid recharge amount" });
    }

    const pConfigs = await db.select().from(panelConfig).limit(1);
    const pConfig = pConfigs[0];
    const resolvedCurrency = currency || pConfig?.currency || "USD";

    // Insert pending transaction
    const newTx = await db.insert(walletTransactions).values({
      userId,
      amount: parseFloat(amount).toFixed(4),
      currency: resolvedCurrency,
      type: "credit",
      paymentMethod,
      status: "pending",
      description: `Wallet recharge via ${paymentMethod} gateway`,
    }).returning();

    const transaction = newTx[0];

    let checkoutData: any = {
      success: true,
      transactionId: transaction.id,
      amount: parseFloat(transaction.amount),
      currency: resolvedCurrency,
      paymentMethod,
    };

    if (paymentMethod === "razorpay") {
      const rzp = await getRazorpay();
      if (!rzp) {
        return res.status(500).json({ success: false, message: "Razorpay integration is not configured or inactive" });
      }

      // Create a Razorpay Order
      const rzpOrder = await rzp.orders.create({
        amount: Math.round(parseFloat(amount) * 100), // in paise
        currency: resolvedCurrency === "INR" ? "INR" : resolvedCurrency,
        receipt: transaction.id,
      });

      // Update transaction metadata with provider order id
      await db
        .update(walletTransactions)
        .set({
          referenceId: rzpOrder.id,
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      checkoutData.razorpayOrderId = rzpOrder.id;
      checkoutData.razorpayKeyId = (rzp as any).key_id;
    } else {
      // For PayPal, Tap, Instamojo, we'll simulate / mock the payment URL or order checkout
      // In a real flow, you create a billing transaction or charge link using their REST APIs.
      const mockPayUrl = `/payment-simulator?tx=${transaction.id}&method=${paymentMethod}&amount=${amount}&currency=${resolvedCurrency}`;
      checkoutData.checkoutUrl = mockPayUrl;
      
      await db
        .update(walletTransactions)
        .set({
          referenceId: `mock_${transaction.id}`,
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));
    }

    return res.status(200).json(checkoutData);
  } catch (error: any) {
    console.error("Error initiating gateway recharge:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify payment gateway status and complete transaction
export const verifyGatewayRecharge = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { transactionId, razorpay_payment_id, razorpay_order_id, razorpay_signature, success } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const txList = await db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.id, transactionId), eq(walletTransactions.userId, userId)))
      .limit(1);

    if (txList.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const transaction = txList[0];
    if (transaction.status !== "pending") {
      return res.status(400).json({ success: false, message: "Transaction is already processed" });
    }

    let isVerified = false;

    if (transaction.paymentMethod === "razorpay") {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing Razorpay payment verification fields" });
      }

      const rzp = await getRazorpay();
      const secret = rzp ? (rzp as any).key_secret : process.env.RAZORPAY_KEY_SECRET;

      const generated_signature = crypto
        .createHmac("sha256", secret || "")
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature === razorpay_signature) {
        isVerified = true;
      }
    } else {
      // Mock / Simulates other gateway successes
      if (success === true || success === "true") {
        isVerified = true;
      }
    }

    if (!isVerified) {
      await db
        .update(walletTransactions)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transactionId));

      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Complete transaction
    await db
      .update(walletTransactions)
      .set({
        status: "completed",
        referenceId: razorpay_payment_id || transaction.referenceId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, transactionId));

    // Update Wallet Balance
    let walletList = await db.select().from(wallets).where(eq(wallets.userId, transaction.userId)).limit(1);
    let wallet = walletList[0];

    if (!wallet) {
      const newWallet = await db.insert(wallets).values({
        userId: transaction.userId,
        balance: "0.0000",
        currency: transaction.currency,
      }).returning();
      wallet = newWallet[0];
    }

    const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toFixed(4);

    await db
      .update(wallets)
      .set({
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    return res.status(200).json({
      success: true,
      message: "Payment successfully verified and wallet balance updated.",
      newBalance: parseFloat(newBalance),
    });
  } catch (error: any) {
    console.error("Error verifying recharge:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ==================== ADMIN ENDPOINTS ====================

// List all wallets in the system
export const getAdminWallets = async (req: Request, res: Response) => {
  try {
    const allUsersWithWallets = await db
      .select({
        wallet: {
          id: wallets.id,
          userId: wallets.userId,
          balance: wallets.balance,
          currency: wallets.currency,
          createdAt: wallets.createdAt,
          updatedAt: wallets.updatedAt,
        },
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          walletEnabled: users.walletEnabled,
        }
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(sql`${users.role} != 'superadmin'`)
      .orderBy(desc(users.createdAt));

    return res.status(200).json({
      success: true,
      wallets: allUsersWithWallets.map(w => ({
        id: w.wallet?.id || null,
        userId: w.user.id,
        balance: w.wallet?.balance ? parseFloat(w.wallet.balance) : 0.0,
        currency: w.wallet?.currency || "USD",
        createdAt: w.wallet?.createdAt || new Date(),
        updatedAt: w.wallet?.updatedAt || new Date(),
        user: w.user,
      }))
    });
  } catch (error: any) {
    console.error("Error listing admin wallets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle Wallet-Based credit system for a specific tenant (user)
export const toggleWalletLimit = async (req: Request, res: Response) => {
  try {
    const { userId, enabled } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing user ID" });
    }

    await db
      .update(users)
      .set({
        walletEnabled: enabled === true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.status(200).json({
      success: true,
      message: `Wallet credit system ${enabled ? "enabled" : "disabled"} for user successfully.`,
      walletEnabled: enabled,
    });
  } catch (error: any) {
    console.error("Error toggling wallet limit:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin manually credits or debits a wallet directly
export const adminRechargeWallet = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { userId, amount, type, description } = req.body; // type: 'credit', 'debit'

    if (!userId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid parameters" });
    }

    const amt = parseFloat(amount);
    
    // Find or create wallet
    let walletList = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    let wallet = walletList[0];

    if (!wallet) {
      const pConfigs = await db.select().from(panelConfig).limit(1);
      const newWallet = await db.insert(wallets).values({
        userId,
        balance: "0.0000",
        currency: pConfigs[0]?.currency || "USD",
      }).returning();
      wallet = newWallet[0];
    }

    const currentBalance = parseFloat(wallet.balance);
    let newBalance = currentBalance;

    if (type === "credit") {
      newBalance += amt;
    } else if (type === "debit") {
      newBalance -= amt;
      if (newBalance < 0) {
        newBalance = 0; // prevent negative balance from admin action
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid transaction type" });
    }

    // Insert completed wallet transaction
    await db.insert(walletTransactions).values({
      userId,
      amount: amt.toFixed(4),
      currency: wallet.currency,
      type,
      paymentMethod: "manual_admin",
      status: "completed",
      referenceId: `admin_${adminId}_${Date.now()}`,
      description: description || `Admin manual ${type} adjustment`,
      verifiedBy: adminId,
      verifiedAt: new Date(),
    });

    // Update wallet balance
    await db
      .update(wallets)
      .set({
        balance: newBalance.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    return res.status(200).json({
      success: true,
      message: "Wallet balance adjusted successfully.",
      newBalance,
    });
  } catch (error: any) {
    console.error("Error admin manual recharge:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// List all transactions for manual payment verification
export const getAdminWalletTransactions = async (req: Request, res: Response) => {
  try {
    const txs = await db
      .select({
        transaction: walletTransactions,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(walletTransactions)
      .leftJoin(users, eq(walletTransactions.userId, users.id))
      .orderBy(desc(walletTransactions.createdAt));

    return res.status(200).json({
      success: true,
      transactions: txs.map(t => ({
        ...t.transaction,
        amount: parseFloat(t.transaction.amount),
        user: t.user,
      }))
    });
  } catch (error: any) {
    console.error("Error fetching admin transactions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify manual payment (approve/reject Cash/Account transfer)
export const verifyManualTransaction = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { transactionId } = req.params;
    const { status, description } = req.body; // status: 'completed' (approve) or 'failed' (reject)

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (status !== "completed" && status !== "failed") {
      return res.status(400).json({ success: false, message: "Status must be completed or failed" });
    }

    const txList = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, transactionId))
      .limit(1);

    if (txList.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const transaction = txList[0];
    if (transaction.status !== "pending") {
      return res.status(400).json({ success: false, message: "Transaction has already been processed" });
    }

    // Update status
    await db
      .update(walletTransactions)
      .set({
        status,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        description: description || transaction.description,
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, transactionId));

    if (status === "completed") {
      // Find or create wallet
      let walletList = await db.select().from(wallets).where(eq(wallets.userId, transaction.userId)).limit(1);
      let wallet = walletList[0];

      if (!wallet) {
        const pConfigs = await db.select().from(panelConfig).limit(1);
        const newWallet = await db.insert(wallets).values({
          userId: transaction.userId,
          balance: "0.0000",
          currency: transaction.currency,
        }).returning();
        wallet = newWallet[0];
      }

      const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toFixed(4);

      await db
        .update(wallets)
        .set({
          balance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));
    }

    return res.status(200).json({
      success: true,
      message: `Manual transaction ${status === "completed" ? "approved" : "rejected"} successfully.`
    });
  } catch (error: any) {
    console.error("Error verifying manual transaction:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get wallet global settings
export const getWalletSettings = async (req: Request, res: Response) => {
  try {
    const pConfigs = await db.select().from(panelConfig).limit(1);
    const pConfig = pConfigs[0];
    return res.status(200).json({
      success: true,
      walletSettings: pConfig?.walletSettings || {},
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update wallet global settings
export const updateWalletSettings = async (req: Request, res: Response) => {
  try {
    const pConfigs = await db.select().from(panelConfig).limit(1);
    if (pConfigs.length === 0) {
      return res.status(404).json({ success: false, message: "Panel config not found" });
    }

    const pConfig = pConfigs[0];
    const newSettings = req.body;

    const updated = await db
      .update(panelConfig)
      .set({
        walletSettings: {
          ...(pConfig.walletSettings || {}),
          ...newSettings,
        },
        updatedAt: new Date(),
      })
      .where(eq(panelConfig.id, pConfig.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Wallet settings updated successfully.",
      walletSettings: updated[0].walletSettings,
    });
  } catch (error: any) {
    console.error("Error updating wallet settings:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
