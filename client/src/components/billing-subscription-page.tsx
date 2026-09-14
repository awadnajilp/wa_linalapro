/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Redesigned Premium Subscription & Billing Dashboard
 * ============================================================
 */

import React, { useState } from "react";
import {
  Crown,
  Calendar,
  Check,
  X,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  ArrowRight,
  RefreshCw,
  Zap,
  Users,
  MessageSquare,
  Layers,
  Radio,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useLocation, Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ManualPaymentDialog from "@/components/subscription/ManualPaymentDialog";

export default function BillingSubscriptionPage({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { user, currency, currencySymbol } = useAuth();
  const [, setLocation] = useLocation();

  const [openManualPay, setOpenManualPay] = useState(false);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState<any>(null);

  const {
    isExpired,
    hasActiveSubscription,
    isExpiringSoon,
    daysLeft,
    activeSubscription,
    activePlan,
    latestSubscription,
    isSuperadmin,
    isLoading,
  } = useSubscriptionStatus();

  // Query manual payment requests history
  const { data: manualRequestsData, isLoading: isLoadingRequests } = useQuery<any>({
    queryKey: ["/api/subscriptions/manual-payment-requests"],
    queryFn: () =>
      fetch("/api/subscriptions/manual-payment-requests", { credentials: "include" }).then(
        (res) => res.json()
      ),
    enabled: !!user?.id,
  });

  const manualRequests = Array.isArray(manualRequestsData?.data)
    ? manualRequestsData.data
    : [];

  const pendingRequest = manualRequests.find((r: any) => r.status === "pending");

  // Query tenant active addons
  const { data: tenantAddons } = useQuery<any[]>({
    queryKey: ["/api/tenant/addons"],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-500" />
        <span>Loading subscription details...</span>
      </div>
    );
  }

  const currentPlan = activePlan || (latestSubscription?.planData) || {
    name: "Starter Trial Plan",
    price: 0,
    currency: "USD",
  };

  const currentSub = activeSubscription || latestSubscription;
  const permissions = currentPlan?.permissions || (currentSub?.planData?.permissions) || {};

  const endDateFormatted = currentSub?.endDate
    ? new Date(currentSub.endDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "No expiration set";

  const startDateFormatted = currentSub?.startDate
    ? new Date(currentSub.startDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const handleOpenRenew = (planObj?: any) => {
    setSelectedPlanForRenewal(planObj || currentPlan);
    setOpenManualPay(true);
  };

  return (
    <div className={`space-y-6 ${embedded ? "" : "p-6 max-w-7xl mx-auto"}`}>
      {/* 1. Header Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 p-6 md:p-8 shadow-sm">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        {isExpired && (
          <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl shadow-sm ${
                  isExpired
                    ? "bg-red-500/15 text-red-500 border border-red-500/30"
                    : isExpiringSoon
                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                }`}
              >
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {isSuperadmin
                      ? "Superadmin Enterprise"
                      : currentPlan.name || "Subscription Management"}
                  </h1>
                  <Badge
                    variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
                    className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider ${
                      !isExpired && !isExpiringSoon
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : isExpiringSoon
                        ? "bg-amber-500 text-white"
                        : ""
                    }`}
                  >
                    {isSuperadmin
                      ? "Active (Unlimited)"
                      : isExpired
                      ? "Expired / Paused"
                      : isExpiringSoon
                      ? `Expiring in ${daysLeft} Days`
                      : "Active Plan"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage your subscription tier, manual payment receipts, and WhatsApp usage quotas.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isSuperadmin && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Button
                onClick={() => handleOpenRenew(currentPlan)}
                className="flex-1 md:flex-none h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Renew / Offline Payment</span>
              </Button>

              <Link href="/plans">
                <Button
                  variant="outline"
                  className="flex-1 md:flex-none h-12 px-5 rounded-2xl border-border hover:bg-muted font-semibold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Upgrade Plan</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pending Verification Notice */}
        {pendingRequest && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold">Manual Payment Under Review:</strong> A payment receipt
              for{" "}
              <span className="font-semibold text-foreground">
                {pendingRequest.currency} {pendingRequest.amount}
              </span>{" "}
              (Ref: <code className="font-mono">{pendingRequest.transactionReference || "N/A"}</code>)
              was submitted on{" "}
              {new Date(pendingRequest.createdAt).toLocaleDateString()}. Your plan will be updated as
              soon as the admin verifies your transfer.
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Metrics & Quotas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Billing Period Card */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Subscription Validity</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {isSuperadmin ? "Lifetime Access" : `${daysLeft} Days Remaining`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isSuperadmin ? "Managed by System" : `Expires on ${endDateFormatted}`}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between">
            <span>Started: {startDateFormatted}</span>
            <span className="capitalize font-medium">{currentSub?.billingCycle || "Monthly"}</span>
          </div>
        </div>

        {/* WhatsApp Channels Limit */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Channels Limit</span>
            <Radio className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isSuperadmin ? "Unlimited" : permissions.channel || 1} Channel(s)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              QR Code & Cloud API connections
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>QR Channel Warmer Included</span>
          </div>
        </div>

        {/* CRM Contacts Limit */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">CRM Contacts</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isSuperadmin
                ? "Unlimited"
                : Number(permissions.contacts || 5000).toLocaleString()}{" "}
              Contacts
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Audience size and tag segmentations
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between">
            <span>Custom attributes enabled</span>
            <span>Excel export</span>
          </div>
        </div>

        {/* Automation Flows Limit */}
        <div className="p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Flow Automations</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isSuperadmin ? "Unlimited" : permissions.automation || 10} Active Flows
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Interactive chatbot & API triggers
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Multi-channel routing enabled</span>
          </div>
        </div>
      </div>

      {/* 3. Included Features & Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plan Features Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-3xl border bg-card text-card-foreground shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="text-lg font-bold text-foreground">Current Plan Features</h3>
              <p className="text-xs text-muted-foreground">Capabilities enabled for your tenant account</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {currentPlan.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { label: "WhatsApp Cloud API & Baileys QR Channels", enabled: true },
              { label: "Unlimited Inbound & 2-Way Conversations", enabled: true },
              { label: "AI Agent Voice Synthesis & ElevenLabs TTS", enabled: permissions.aiAgent !== "false" },
              { label: "Visual Flow Canvas & Bot Logic Builder", enabled: true },
              { label: "WhatsApp Group Campaigns & Synchronizations", enabled: true },
              { label: "Contact-Based Recurring Campaign Scheduler", enabled: true },
              { label: "Payment Gateways (Razorpay, Tap, Noon)", enabled: true },
              { label: "Custom Variables & Flow Data Repository", enabled: true },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border text-xs"
              >
                {feat.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                )}
                <span className={feat.enabled ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {feat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Upgrade / Renewal Card */}
        <div className="p-6 rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-card to-card text-card-foreground shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Manual Plan Renewal</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Renew or upgrade seamlessly by transferring funds directly to our bank or UPI account and submitting your payment receipt.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border space-y-2">
            <div className="text-xs text-muted-foreground">Standard Renewal Rate</div>
            <div className="text-3xl font-extrabold text-foreground">
              {currencySymbol} {currentPlan.price || 0}
              <span className="text-xs font-normal text-muted-foreground"> / month</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              * Annual billing saves 2 months
            </div>
          </div>

          <Button
            onClick={() => handleOpenRenew(currentPlan)}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Upload Payment Receipt</span>
          </Button>
        </div>
      </div>

      {/* 4. Manual Payment History Table */}
      {manualRequests.length > 0 && (
        <div className="p-6 rounded-3xl border bg-card text-card-foreground shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="text-lg font-bold text-foreground">Offline Payment Requests History</h3>
              <p className="text-xs text-muted-foreground">
                Your submitted manual renewal receipts and their verification statuses
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {manualRequests.length} Submission(s)
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground uppercase bg-muted/40 text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Date</th>
                  <th className="py-3 px-4">Plan / Cycle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {manualRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">{req.plan?.name || "Plan"}</span>
                      <span className="text-muted-foreground capitalize ml-1.5">({req.billingCycle})</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground font-mono">
                      {req.currency} {req.amount}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {req.transactionReference || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {req.receiptUrl ? (
                        <a
                          href={req.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                        >
                          View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {req.status === "approved" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase">
                          Approved & Active
                        </Badge>
                      ) : req.status === "rejected" ? (
                        <Badge variant="destructive" className="text-[10px] font-bold uppercase" title={req.rejectionReason}>
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase animate-pulse">
                          Pending Review
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Payment Dialog */}
      <ManualPaymentDialog
        open={openManualPay}
        onOpenChange={setOpenManualPay}
        preselectedPlan={selectedPlanForRenewal}
      />
    </div>
  );
}
