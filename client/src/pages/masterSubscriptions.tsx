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

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const currencySymbolMap: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  ZAR: "R",
};

function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return currencySymbolMap[currency.toUpperCase()] || currency + " ";
}

// ------------------- TYPES -------------------
interface MasterSubscription {
  id: string;
  userId: string;
  planId: string;
  planData: {
    icon: string;
    name: string;
    features: { name: string; included: boolean }[];
    annualPrice: string;
    monthlyPrice: string;
    description: string;
  };
  status: string;
  billingCycle: "monthly" | "annual";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  currency?: string | null;
  gatewayProvider?: string | null;
  gatewaySubscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  icon: string;
  monthlyPrice: string;
  annualPrice: string;
  features: { name: string; included: boolean }[];
  permissions: {
    channel: string;
    contacts: string;
    automation: string;
  };
}

interface SubscriptionStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  cancelled: number;
}

interface SubscriptionResponse {
  success: boolean;
  data: Array<{
    subscription: MasterSubscription;
    user: User;
    plan: Plan;
  }>;
  stats?: SubscriptionStats;
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

// ------------------- COMPONENT -------------------
export default function AllSubscriptionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "expiring_soon" | "expired" | "cancelled">("all");
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useQuery<SubscriptionResponse>({
    queryKey: ["subscriptions", currentPage, limit, search, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      });
      if (search.trim()) params.append("search", search.trim());
      if (activeTab && activeTab !== "all") params.append("tab", activeTab);

      const res = await apiRequest("GET", `/api/subscriptions?${params.toString()}`);
      return await res.json();
    },
    keepPreviousData: true,
  });

  // Manual reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      setSendingReminderId(subscriptionId);
      const res = await apiRequest("POST", `/api/subscriptions/${subscriptionId}/send-renewal-reminder`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send renewal reminder");
      }
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Sent",
        description: data.message || "Renewal reminder email has been successfully dispatched.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to Send Reminder",
        description: err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSendingReminderId(null);
    },
  });

  // Trigger auto renewal check mutation
  const autoRenewalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/trigger-auto-renewal");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to run auto-renewal check");
      }
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: "Auto-Renewal Check Complete",
        description: data.message,
      });
      queryClient.invalidateQueries(["subscriptions"]);
    },
    onError: (err: Error) => {
      toast({
        title: "Auto-Renewal Check Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const subscriptions = data?.data ?? [];
  const page = data?.pagination?.page ?? currentPage;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;
  const stats = data?.stats || { total: 0, active: 0, expiringSoon: 0, expired: 0, cancelled: 0 };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleTabChange = (tab: "all" | "active" | "expiring_soon" | "expired" | "cancelled") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const getDaysLeft = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date();
    const msDiff = end.getTime() - now.getTime();
    return Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  };

  const renderStatusBadge = (status: string, endDateStr: string) => {
    const daysLeft = getDaysLeft(endDateStr);

    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    }

    if (status === "expired" || daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
          <AlertTriangle className="w-3 h-3" /> Expired {daysLeft < 0 ? `(${Math.abs(daysLeft)}d ago)` : ""}
        </span>
      );
    }

    if (daysLeft <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Expiring in {daysLeft} {daysLeft === 1 ? "day" : "days"}
        </span>
      );
    }

    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3" /> Active ({daysLeft}d left)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {status}
      </span>
    );
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      <Header
        title={t("subscriptions.title") || "Subscriptions Management"}
        subtitle={t("subscriptions.subtitle") || "Oversee customer plans, track renewal cadences, and manage reminder notifications"}
      />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {t("subscriptions.allSubscriptions") || "All Subscriptions"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Real-time monitoring of tenant subscriptions, upcoming renewals, and reminder dispatches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoRenewalMutation.mutate()}
              disabled={autoRenewalMutation.isPending}
              className="gap-2 bg-white text-gray-700 hover:bg-gray-100 shadow-sm border-gray-300"
            >
              {autoRenewalMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              ) : (
                <RefreshCw className="w-4 h-4 text-green-600" />
              )}
              Run Auto-Renewal Check
            </Button>
          </div>
        </div>

        {/* Status Tabs with Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
          <button
            onClick={() => handleTabChange("all")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === "all"
                ? "bg-white border-green-600 shadow-md ring-2 ring-green-600/20 text-gray-900"
                : "bg-white/80 border-gray-200 hover:bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>All Subscriptions</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === "all" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("active")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === "active"
                ? "bg-white border-green-600 shadow-md ring-2 ring-green-600/20 text-gray-900"
                : "bg-white/80 border-gray-200 hover:bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Active</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              {stats.active}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("expiring_soon")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === "expiring_soon"
                ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20 text-gray-900"
                : "bg-white/80 border-gray-200 hover:bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Expiring Soon</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {stats.expiringSoon}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("expired")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === "expired"
                ? "bg-white border-rose-500 shadow-md ring-2 ring-rose-500/20 text-gray-900"
                : "bg-white/80 border-gray-200 hover:bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Expired</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              {stats.expired}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("cancelled")}
            className={`col-span-2 sm:col-span-1 flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
              activeTab === "cancelled"
                ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/20 text-gray-900"
                : "bg-white/80 border-gray-200 hover:bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span>Cancelled</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              {stats.cancelled}
            </span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by username, email, plan name, or gateway ID..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-sm text-gray-500">
            <span>
              Showing {subscriptions.length} of {total} records
            </span>
            {isFetching && (
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
            <p className="text-gray-600 text-sm">Loading subscriptions data...</p>
          </div>
        ) : isError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Failed to load subscriptions</p>
            <p className="text-red-500 text-sm mt-1">{(error as Error)?.message}</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No subscriptions found</h3>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your search query or switching to another tab.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="py-3.5 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User / Account
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Plan & Pricing
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status & Cadence
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Auto-Renew
                    </th>
                    <th className="py-3.5 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map(({ subscription, user, plan }) => {
                    const daysLeft = getDaysLeft(subscription.endDate);
                    const isExpiringOrExpired = daysLeft <= 7 || subscription.status === "expired";
                    const isSendingThis = sendingReminderId === subscription.id;

                    return (
                      <tr key={subscription.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-gray-900 text-sm">
                            {user?.username || "Unnamed User"}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {user?.email || "No email"}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <span>{plan?.name || (subscription.planData as any)?.name || "Plan"}</span>
                            <span className="capitalize text-xs text-gray-400 font-normal">
                              ({subscription.billingCycle})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 font-medium">
                            {getCurrencySymbol(subscription.currency)}
                            {subscription.billingCycle === "monthly"
                              ? plan?.monthlyPrice ?? "0"
                              : plan?.annualPrice ?? "0"}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {renderStatusBadge(subscription.status, subscription.endDate)}
                        </td>

                        <td className="py-4 px-4 text-xs text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Start:</span>
                            <span>{new Date(subscription.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">End:</span>
                            <span className="font-medium text-gray-700">
                              {new Date(subscription.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-sm">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${
                              subscription.autoRenew
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {subscription.autoRenew ? "Enabled" : "Disabled"}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <Button
                            size="sm"
                            variant={isExpiringOrExpired ? "default" : "outline"}
                            disabled={isSendingThis || !user?.email}
                            onClick={() => sendReminderMutation.mutate(subscription.id)}
                            className={`gap-1.5 text-xs h-8 ${
                              isExpiringOrExpired
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            title={!user?.email ? "User has no email configured" : "Send renewal reminder email"}
                          >
                            {isSendingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Send Reminder
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3.5">
              {subscriptions.map(({ subscription, user, plan }) => {
                const daysLeft = getDaysLeft(subscription.endDate);
                const isExpiringOrExpired = daysLeft <= 7 || subscription.status === "expired";
                const isSendingThis = sendingReminderId === subscription.id;

                return (
                  <div
                    key={subscription.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">
                          {user?.username || "Unnamed User"}
                        </h3>
                        <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
                      </div>
                      <div>{renderStatusBadge(subscription.status, subscription.endDate)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-100 py-2.5">
                      <div>
                        <span className="text-gray-400">Plan:</span>{" "}
                        <span className="font-medium text-gray-800">
                          {plan?.name || (subscription.planData as any)?.name} ({subscription.billingCycle})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Price:</span>{" "}
                        <span className="font-medium text-gray-800">
                          {getCurrencySymbol(subscription.currency)}
                          {subscription.billingCycle === "monthly"
                            ? plan?.monthlyPrice ?? "0"
                            : plan?.annualPrice ?? "0"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Expires:</span>{" "}
                        <span className="font-medium text-gray-800">
                          {new Date(subscription.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Auto Renew:</span>{" "}
                        <span className="font-medium text-gray-800">
                          {subscription.autoRenew ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant={isExpiringOrExpired ? "default" : "outline"}
                        disabled={isSendingThis || !user?.email}
                        onClick={() => sendReminderMutation.mutate(subscription.id)}
                        className={`w-full gap-1.5 text-xs ${
                          isExpiringOrExpired
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {isSendingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Send Renewal Reminder
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>
                Showing <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-semibold text-gray-900">{total}</span>
              </span>

              <select
                className="border border-gray-300 rounded-md px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
                      pageNum === page
                        ? "bg-green-600 text-white border-green-600 font-medium"
                        : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
