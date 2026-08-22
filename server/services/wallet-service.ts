/**
 * ============================================================
 * © 2026 Antigravity - Wallet Service
 * ============================================================
 */

import { db } from "../db";
import { wallets, walletTransactions, users, panelConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CostCalculationResult {
  basePriceUSD: number;
  taxAmountUSD: number;
  marginAmountUSD: number;
  totalPriceUSD: number;
  totalPriceWalletCurrency: number;
  walletCurrency: string;
  countryCode: string;
  category: string;
}

// Map of country code prefixes
const COUNTRY_CODES: Record<string, { name: string; taxRate: number }> = {
  "91": { name: "India", taxRate: 18 },
  "44": { name: "United Kingdom", taxRate: 20 },
  "971": { name: "United Arab Emirates", taxRate: 5 },
  "966": { name: "Saudi Arabia", taxRate: 15 },
  "20": { name: "Egypt", taxRate: 14 },
  "965": { name: "Kuwait", taxRate: 0 },
  "974": { name: "Qatar", taxRate: 0 },
  "973": { name: "Bahrain", taxRate: 10 },
  "968": { name: "Oman", taxRate: 5 },
};

// Base Meta prices in USD per message category
const META_BASE_PRICES: Record<string, Record<string, number>> = {
  "91": { marketing: 0.0105, utility: 0.0014, auth: 0.0014, service: 0.0035 }, // India
  "44": { marketing: 0.0592, utility: 0.0171, auth: 0.0358, service: 0.010 }, // UK
  "971": { marketing: 0.0816, utility: 0.0285, auth: 0.0492, service: 0.015 }, // UAE
  "966": { marketing: 0.0800, utility: 0.0300, auth: 0.0500, service: 0.015 }, // Saudi Arabia
  "20": { marketing: 0.0650, utility: 0.0250, auth: 0.0350, service: 0.010 }, // Egypt
  "965": { marketing: 0.0800, utility: 0.0300, auth: 0.0500, service: 0.015 }, // Kuwait
  "974": { marketing: 0.0800, utility: 0.0300, auth: 0.0500, service: 0.015 }, // Qatar
  "973": { marketing: 0.0800, utility: 0.0300, auth: 0.0500, service: 0.015 }, // Bahrain
  "968": { marketing: 0.0800, utility: 0.0300, auth: 0.0500, service: 0.015 }, // Oman
  "default": { marketing: 0.0500, utility: 0.0200, auth: 0.0300, service: 0.0100 },
};

/**
 * Identify country prefix from phone number
 */
export function getCountryPrefix(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Try 3-digit prefixes
  const threeDigit = cleanPhone.substring(0, 3);
  if (COUNTRY_CODES[threeDigit]) {
    return threeDigit;
  }
  
  // Try 2-digit prefixes
  const twoDigit = cleanPhone.substring(0, 2);
  if (COUNTRY_CODES[twoDigit]) {
    return twoDigit;
  }
  
  return "default";
}

/**
 * Calculate message cost
 */
export async function calculateMessageCost(
  phone: string,
  category: string, // marketing, utility, auth, service (non-template)
  connectionMethod: string, // qr_code or embedded
  walletCurrency: string = "USD"
): Promise<CostCalculationResult> {
  const pConfigs = await db.select().from(panelConfig).limit(1);
  const pConfig = pConfigs[0];
  const walletSettings = (pConfig?.walletSettings as any) || {};
  const margins = {
    marketing: parseFloat(walletSettings.marketingMargin || "0"),
    utility: parseFloat(walletSettings.utilityMargin || "0"),
    auth: parseFloat(walletSettings.authMargin || "0"),
    service: parseFloat(walletSettings.serviceMargin || "0"),
    qr: parseFloat(walletSettings.qrMargin || "0"),
  };

  const qrPrice = parseFloat(walletSettings.qrPrice || "0.0001");
  const exchangeRates = walletSettings.exchangeRates || {
    USD: 1.0,
    INR: 95.70,
    AED: 3.67,
    SAR: 3.75,
    GBP: 0.78,
    EUR: 0.92,
    KWD: 0.31,
    BHD: 0.38,
    OMR: 0.38,
    QAR: 3.64,
    EGP: 48.0
  };

  // Convert categories to lowercase
  const cat = (category || "service").toLowerCase();
  const isQr = connectionMethod === "qr_code";

  let countryCode = getCountryPrefix(phone);
  let basePriceUSD = 0;
  let taxRate = 0;
  let marginPercent = 0;

  if (isQr) {
    basePriceUSD = qrPrice;
    marginPercent = margins.qr;
    // Set countryCode to local country if possible or leave empty
    const cleanPhone = phone.replace(/\D/g, "");
    countryCode = getCountryPrefix(cleanPhone);
    taxRate = COUNTRY_CODES[countryCode]?.taxRate || 0;
  } else {
    // Meta cloud API channel
    const rateCard = META_BASE_PRICES[countryCode] || META_BASE_PRICES.default;
    basePriceUSD = rateCard[cat] !== undefined ? rateCard[cat] : rateCard.service;
    taxRate = COUNTRY_CODES[countryCode]?.taxRate || 0;
    
    if (cat === "marketing") {
      marginPercent = margins.marketing;
    } else if (cat === "utility") {
      marginPercent = margins.utility;
    } else if (cat === "auth" || cat === "authentication") {
      marginPercent = margins.auth;
    } else {
      marginPercent = margins.service;
    }
  }

  // Cost calculations
  const taxAmountUSD = basePriceUSD * (taxRate / 100);
  const marginAmountUSD = (basePriceUSD + taxAmountUSD) * (marginPercent / 100);
  const totalPriceUSD = basePriceUSD + taxAmountUSD + marginAmountUSD;

  // Currency conversion
  const exchangeRate = exchangeRates[walletCurrency] !== undefined ? exchangeRates[walletCurrency] : 1.0;
  const totalPriceWalletCurrency = totalPriceUSD * exchangeRate;

  return {
    basePriceUSD,
    taxAmountUSD,
    marginAmountUSD,
    totalPriceUSD,
    totalPriceWalletCurrency,
    walletCurrency,
    countryCode,
    category: isQr ? "qr_channel" : cat,
  };
}

/**
 * Check if a user has wallet restriction enabled, and if so, check/debit their balance
 */
export async function processWalletCharge(
  userId: string,
  phone: string,
  category: string,
  connectionMethod: string,
  description?: string
): Promise<{ charged: boolean; cost: number; currency: string; newBalance?: number }> {
  // Find user to check if wallet limit is enabled
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userList[0];

  if (!user || !user.walletEnabled) {
    return { charged: false, cost: 0, currency: "USD" };
  }

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

  // Calculate Cost
  const costResult = await calculateMessageCost(phone, category, connectionMethod, wallet.currency);
  const cost = costResult.totalPriceWalletCurrency;
  const balance = parseFloat(wallet.balance);

  if (balance < cost) {
    throw new Error(`Insufficient wallet balance (${balance.toFixed(4)} ${wallet.currency} required: ${cost.toFixed(4)})`);
  }

  // Debit wallet
  const newBalance = parseFloat((balance - cost).toFixed(4));
  
  await db
    .update(wallets)
    .set({
      balance: newBalance.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));

  // Log transaction
  await db.insert(walletTransactions).values({
    userId,
    amount: cost.toFixed(4),
    currency: wallet.currency,
    type: "debit",
    paymentMethod: "manual_admin", // treated as internal auto debit
    status: "completed",
    description: description || `Debit for outbound message to ${phone} (${costResult.category})`,
    verifiedAt: new Date(),
  });

  return {
    charged: true,
    cost,
    currency: wallet.currency,
    newBalance,
  };
}
