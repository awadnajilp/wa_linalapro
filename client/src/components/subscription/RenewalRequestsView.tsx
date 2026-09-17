/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Subscription Renewal Requests Management View (2-Step Workflow)
 * ============================================================
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageNumbers } from "@/components/ui/page-numbers";
import { AccountantApprovalDialog } from "./AccountantApprovalDialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  Loader2,
  Receipt,
  User,
  Shield,
  Building2,
  Banknote,
  QrCode,
  CreditCard,
  FileCheck,
  AlertCircle,
  Check,
  X,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  bank_transfer: { label: "Bank Transfer", icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  cash: { label: "Cash", icon: Banknote, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  upi: { label: "UPI / QR", icon: QrCode, color: "text-purple-600 bg-purple-50 border-purple-200" },
  cheque: { label: "Cheque", icon: FileCheck, color: "text-amber-600 bg-amber-50 border-amber-200" },
  pos_terminal: { label: "POS / Card", icon: CreditCard, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  other_offline: { label: "Offline Other", icon: Receipt, color: "text-slate-600 bg-slate-50 border-slate-200" },
};

export const RenewalRequestsView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === "superadmin";
  const isAccountant = user?.role === "accountant";
  const isManager = user?.role === "manager";
  const canApprove = isSuperadmin || isAccountant;
  const canCancel = isSuperadmin || isManager;

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Approval modal state
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  // Reject modal state
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<any | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch renewal requests
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/subscription-renewal-requests", page, limit, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await apiRequest("GET", `/api/subscription-renewal-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch renewal requests");
      return res.json();
    },
  });

  const requests: any[] = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const stats = data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/subscription-renewal-requests/${id}/reject`, {
        rejectionReason: reason,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to reject request");
      return json;
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The renewal request has been rejected.",
      });
      setIsRejectOpen(false);
      setSelectedRequestForReject(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-renewal-requests"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/subscription-renewal-requests/${id}/cancel`, {});
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to cancel request");
      return json;
    },
    onSuccess: () => {
      toast({
        title: "Request Cancelled",
        description: "The renewal request has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-renewal-requests"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenApprove = (req: any) => {
    setSelectedRequestForApproval(req);
    setIsApprovalOpen(true);
  };

  const handleOpenReject = (req: any) => {
    setSelectedRequestForReject(req);
    setRejectionReason("");
    setIsRejectOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs for Request Status */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { key: "all", label: "All Requests", count: stats.total, color: "text-slate-900", bg: "bg-slate-100" },
          { key: "pending", label: "Pending Approval", count: stats.pending, color: "text-amber-700", bg: "bg-amber-100 animate-pulse" },
          { key: "approved", label: "Approved", count: stats.approved, color: "text-emerald-700", bg: "bg-emerald-100" },
          { key: "rejected", label: "Rejected", count: stats.rejected, color: "text-rose-700", bg: "bg-rose-100" },
          { key: "cancelled", label: "Cancelled", count: stats.cancelled, color: "text-slate-600", bg: "bg-slate-100" },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                isActive
                  ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20 text-slate-900"
                  : "bg-white/80 border-slate-200 hover:bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? "bg-indigo-100 text-indigo-700" : tab.bg + " " + tab.color
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search user, plan, ref, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-500">
            <span>
              Showing {requests.length} of {pagination.total} requests
            </span>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Tenant Customer</th>
                <th className="py-3.5 px-4">Requested Plan & Price</th>
                <th className="py-3.5 px-4">Manager Request</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Accountant & Payment Info</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading renewal requests...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">No renewal requests found</p>
                      <p className="text-xs text-slate-400">
                        {statusFilter === "pending"
                          ? "All renewal requests have been reviewed!"
                          : "Managers can submit renewal requests using the button above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const targetUser = req.user || {};
                  const targetPlan = req.plan || {};
                  const requester = req.requester || {};
                  const approver = req.approver || {};
                  const isPending = req.status === "pending";

                  const paymentInfo = req.paymentMethod ? PAYMENT_METHOD_LABELS[req.paymentMethod] : null;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                            {(targetUser.username?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {targetUser.username || targetUser.firstName || "Customer"}
                            </div>
                            <div className="text-xs text-slate-400">{targetUser.email || "No email"}</div>
                            {targetUser.phoneNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {targetUser.phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan & Price */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {targetPlan.name || "Custom Plan"}
                        </div>
                        <div className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                          {req.currency} {req.amount}
                        </div>
                        <span className="capitalize text-[11px] font-medium text-slate-400">
                          {req.billingCycle} Cycle
                        </span>
                      </td>

                      {/* Manager Request */}
                      <td className="py-4 px-4 text-xs space-y-1">
                        <div className="flex items-center gap-1 text-slate-700">
                          <span className="text-slate-400">By:</span>
                          <strong className="text-slate-800 font-medium">@{requester.username || "manager"}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "-"}
                        </div>
                        {req.requestNotes && (
                          <div className="text-[11px] text-slate-600 italic max-w-xs truncate" title={req.requestNotes}>
                            "{req.requestNotes}"
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {req.status === "approved" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : req.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        ) : req.status === "cancelled" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Ban className="w-3.5 h-3.5" /> Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                          </span>
                        )}
                      </td>

                      {/* Accountant & Payment Info */}
                      <td className="py-4 px-4 text-xs space-y-1">
                        {req.status === "approved" ? (
                          <>
                            <div className="flex items-center gap-1 text-slate-700">
                              <span className="text-slate-400">Approved by:</span>
                              <strong>@{approver.username || "accountant"}</strong>
                            </div>
                            {paymentInfo && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${paymentInfo.color}`}
                              >
                                {React.createElement(paymentInfo.icon, { className: "w-3 h-3" })}
                                {paymentInfo.label}
                              </span>
                            )}
                            {req.paymentDescription && (
                              <div
                                className="text-[11px] text-slate-600 font-mono max-w-xs truncate"
                                title={req.paymentDescription}
                              >
                                Ref: {req.paymentDescription}
                              </div>
                            )}
                          </>
                        ) : req.status === "rejected" ? (
                          <div className="text-rose-600 text-xs">
                            <span className="font-semibold">Reason:</span>{" "}
                            {req.rejectionReason || "No reason specified"}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Awaiting accountant action</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {canApprove && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprove(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 rounded-lg shadow-xs flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                            )}

                            {canApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(req)}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-8 px-2.5 rounded-lg"
                              >
                                Reject
                              </Button>
                            )}

                            {canCancel && !canApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to cancel this renewal request?")) {
                                    cancelMutation.mutate(req.id);
                                  }
                                }}
                                className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-8 px-2.5 rounded-lg"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{" "}
              {pagination.total} requests
            </p>
            <PageNumbers
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Accountant Approval Dialog */}
      <AccountantApprovalDialog
        open={isApprovalOpen}
        onOpenChange={setIsApprovalOpen}
        request={selectedRequestForApproval}
      />

      {/* Reject Confirmation Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl p-6">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="text-rose-600 flex items-center gap-2 text-base font-bold">
              <XCircle className="w-5 h-5" />
              Reject Renewal Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please specify the reason for rejecting this renewal request.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedRequestForReject) return;
              rejectMutation.mutate({
                id: selectedRequestForReject.id,
                reason: rejectionReason.trim() || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Rejection Reason</label>
              <Textarea
                placeholder="e.g. Payment not credited in bank statement / Incorrect plan selected"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="rounded-xl text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejectOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={rejectMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
