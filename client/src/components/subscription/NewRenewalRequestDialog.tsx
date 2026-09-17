/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * New Subscription Renewal Request Dialog (Manager Step 1)
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  User,
  CreditCard,
  Calendar,
  Loader2,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface NewRenewalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUserId?: string;
}

export const NewRenewalRequestDialog: React.FC<NewRenewalRequestDialogProps> = ({
  open,
  onOpenChange,
  preselectedUserId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUserId || "");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [requestNotes, setRequestNotes] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");

  // Fetch plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery<any>({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/plans");
        if (res.ok) return await res.json();
      } catch {}
      const res = await fetch("/api/plans");
      return await res.json();
    },
    enabled: open,
  });

  const plansList: any[] = Array.isArray(plansData)
    ? plansData
    : plansData?.data || [];

  // Fetch tenant users
  const { data: usersData, isLoading: isUsersLoading } = useQuery<any>({
    queryKey: ["/api/admin/users", "renewal-selector"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users?limit=100");
      if (!res.ok) return { data: [] };
      return await res.json();
    },
    enabled: open,
  });

  const rawUsers: any[] = Array.isArray(usersData)
    ? usersData
    : usersData?.data || usersData?.users || [];

  // Filter out superadmins and managers, keep customer/tenant accounts
  const tenantUsers = rawUsers.filter(
    (u: any) => u.role !== "superadmin" && u.role !== "manager" && u.role !== "accountant"
  );

  const filteredUsers = tenantUsers.filter((u: any) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  // Auto-fill price when plan or billing cycle changes
  useEffect(() => {
    if (selectedPlanId && plansList.length > 0) {
      const plan = plansList.find((p: any) => p.id === selectedPlanId);
      if (plan) {
        const price =
          billingCycle === "annual"
            ? plan.annualPrice ?? (Number(plan.monthlyPrice || 0) * 10).toString()
            : plan.monthlyPrice ?? "0";
        setAmount(price);
        if (plan.currency) {
          setCurrency(plan.currency.toUpperCase());
        }
      }
    }
  }, [selectedPlanId, billingCycle, plansList]);

  // Set default plan if available
  useEffect(() => {
    if (open && plansList.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plansList[0].id);
    }
  }, [open, plansList, selectedPlanId]);

  // Mutation to submit renewal request
  const submitMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      planId: string;
      billingCycle: string;
      amount: string;
      currency: string;
      requestNotes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/subscription-renewal-requests", payload);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit renewal request");
      }
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: "Renewal Request Submitted! 📋",
        description:
          data.message ||
          "The request has been routed to the Accountant for payment verification and approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-renewal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Could not submit renewal request.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPlanId("");
    setBillingCycle("monthly");
    setAmount("");
    setRequestNotes("");
    setUserSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast({
        title: "Customer Required",
        description: "Please select the tenant customer user to renew.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedPlanId) {
      toast({
        title: "Plan Required",
        description: "Please select a target subscription plan.",
        variant: "destructive",
      });
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please provide a valid renewal price amount.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      userId: selectedUserId,
      planId: selectedPlanId,
      billingCycle,
      amount,
      currency,
      requestNotes: requestNotes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-2xl p-6">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Request Customer Plan Renewal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Step 1: Submit a plan renewal request for accountant payment review & verification.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Select Tenant Customer *</span>
              {isUsersLoading && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading tenants...
                </span>
              )}
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="rounded-xl text-sm bg-slate-50/70 border-slate-200">
                <SelectValue placeholder="Choose a customer account..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <div className="p-2 sticky top-0 bg-white z-10 border-b">
                  <Input
                    placeholder="Search name, username, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching customer accounts found
                  </div>
                ) : (
                  filteredUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold text-xs text-slate-900">
                          {u.username} {u.firstName ? `(${u.firstName} ${u.lastName || ""})` : ""}
                        </span>
                        <span className="text-[11px] text-slate-400">{u.email || "No email"}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Plan Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Target Plan *</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="rounded-xl text-sm bg-slate-50/70 border-slate-200">
                <SelectValue placeholder="Select target plan..." />
              </SelectTrigger>
              <SelectContent>
                {plansList.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="font-medium text-xs text-slate-800">{p.name}</span>
                      <span className="text-[11px] text-slate-400">
                        ${p.monthlyPrice}/mo · ${p.annualPrice || Number(p.monthlyPrice) * 10}/yr
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Cycle</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    billingCycle === "monthly"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    billingCycle === "annual"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Annual (1 Yr)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Renewal Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="rounded-xl text-sm bg-slate-50/70 border-slate-200 pr-14 font-mono font-semibold"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {currency}
                </div>
              </div>
            </div>
          </div>

          {/* Request Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Manager Request Notes / Remarks (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Customer paid via bank transfer to Company HDFC account. Reference provided via WhatsApp. Ready for accountant approval."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              rows={3}
              className="rounded-xl text-xs bg-slate-50/70 border-slate-200"
            />
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">2-Step Offline Verification Workflow</p>
              <p className="text-[11px] text-amber-700/90 mt-0.5">
                Submitting this request does not charge online payment gateways. Once submitted, the{" "}
                <strong>Accountant</strong> will verify offline payment details and approve activation.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-4 flex items-center gap-1.5"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Submit for Accountant Approval</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
