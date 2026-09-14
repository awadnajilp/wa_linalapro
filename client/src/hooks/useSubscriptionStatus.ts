/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Subscription Status Hook
 * ============================================================
 */

import { useAuth } from "@/contexts/auth-context";

export function useSubscriptionStatus() {
  const { user, userPlans, isUserPlansLoading } = useAuth();

  if (!user) {
    return {
      isExpired: false,
      hasActiveSubscription: false,
      isExpiringSoon: false,
      daysLeft: 0,
      activeSubscription: null,
      activePlan: null,
      latestSubscription: null,
      isSuperadmin: false,
      isLoading: false,
    };
  }

  const isSuperadmin = user?.role === "superadmin";

  if (isSuperadmin) {
    return {
      isExpired: false,
      hasActiveSubscription: true,
      isExpiringSoon: false,
      daysLeft: 9999,
      activeSubscription: null,
      activePlan: { name: "Superadmin Enterprise Unlimited", price: "0" },
      latestSubscription: null,
      isSuperadmin: true,
      isLoading: false,
    };
  }

  const rawData = Array.isArray(userPlans)
    ? userPlans
    : (userPlans as any)?.data || [];

  const now = Date.now();

  const activeSubItem = rawData.find((d: any) => {
    const sub = d.subscription || d;
    if (!sub || sub.status !== "active") return false;
    const endDateMs = new Date(sub.endDate).getTime();
    return endDateMs > now;
  });

  const latestSubItem = rawData[0];
  const activeSub = activeSubItem?.subscription || activeSubItem || null;
  const activePlan = activeSubItem?.plan || latestSubItem?.plan || (activeSub?.planData) || null;
  const latestSub = latestSubItem?.subscription || latestSubItem || null;

  const hasActiveSubscription = Boolean(activeSub);
  const isExpired = !isUserPlansLoading && !hasActiveSubscription;

  const targetEndDate = activeSub?.endDate || latestSub?.endDate;
  const daysLeft = targetEndDate
    ? Math.ceil((new Date(targetEndDate).getTime() - now) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpiringSoon = hasActiveSubscription && daysLeft <= 7 && daysLeft >= 0;

  return {
    isExpired,
    hasActiveSubscription,
    isExpiringSoon,
    daysLeft: Math.max(0, daysLeft),
    activeSubscription: activeSub,
    activePlan,
    latestSubscription: latestSub,
    isSuperadmin: false,
    isLoading: isUserPlansLoading,
  };
}
