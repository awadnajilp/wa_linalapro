/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Subscription Expired Alert Banner & Dashboard Lockout View
 * ============================================================
 */

import React, { useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Lock,
  ZapOff,
  Radio,
  Send,
  CreditCard,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Link } from "wouter";
import ManualPaymentDialog from "@/components/subscription/ManualPaymentDialog";

interface SubscriptionExpiredBannerProps {
  fullScreenOverlay?: boolean;
}

export const SubscriptionExpiredBanner: React.FC<SubscriptionExpiredBannerProps> = ({
  fullScreenOverlay = false,
}) => {
  const { isExpired, activePlan, latestSubscription, daysLeft, isSuperadmin, isLoading } =
    useSubscriptionStatus();
  const [openManualPay, setOpenManualPay] = useState(false);

  if (isSuperadmin || isLoading || !isExpired) {
    return null;
  }

  const expiredDateStr = latestSubscription?.endDate
    ? new Date(latestSubscription.endDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently";

  const planTitle = activePlan?.name || "Standard Plan";

  return (
    <>
      <div className="w-full mb-6 transition-all duration-300">
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/40 bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/80 p-6 shadow-2xl text-white">
          {/* Background subtle glow effect */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Icon & Critical Notice */}
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
                <ShieldAlert className="w-8 h-8 animate-pulse text-red-400" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-md">
                    <Lock className="w-3.5 h-3.5" /> Subscription Expired
                  </span>
                  <span className="text-xs text-red-200/90 font-medium">
                    Expired on {expiredDateStr} ({planTitle})
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
                  Your Account Is Paused — Immediate Renewal Required
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  To ensure quality of service and compliance, automated services for this tenant have been put on hold. 
                  Renew your plan now to immediately restore full access to all WhatsApp tools.
                </p>

                {/* Status Grid Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="flex items-center gap-2 bg-black/40 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <Radio className="w-4 h-4 text-red-400" />
                    <span>QR Session Disconnected</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Cloud API Paused</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <ZapOff className="w-4 h-4 text-red-400" />
                    <span>Flows Deactivated</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <Send className="w-4 h-4 text-red-400" />
                    <span>Campaigns Blocked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
              <Button
                onClick={() => setOpenManualPay(true)}
                className="w-full sm:w-auto px-6 py-6 text-base font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-xl shadow-emerald-900/40 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5"
              >
                <CreditCard className="w-5 h-5" />
                <span>Renew Subscription</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Link href="/plans">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white rounded-xl py-5"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                  View All Plans & Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Payment Dialog */}
      <ManualPaymentDialog
        open={openManualPay}
        onOpenChange={setOpenManualPay}
        preselectedPlan={activePlan}
      />
    </>
  );
};

export default SubscriptionExpiredBanner;
