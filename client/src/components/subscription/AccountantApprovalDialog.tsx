/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Accountant Approval & Offline Payment Recording Modal (Step 2)
 * ============================================================
 */

import React, { useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle2,
  Receipt,
  Building2,
  DollarSign,
  User,
  Calendar,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  FileCheck,
} from "lucide-react";

interface AccountantApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
}

const PAYMENT_METHODS = [
  {
    value: "bank_transfer",
    label: "Bank Transfer / Wire / NEFT / IMPS",
    icon: Building2,
    description: "Direct bank account deposit or wire transfer",
  },
  {
    value: "cash",
    label: "Cash Deposit / In-Hand",
    icon: Banknote,
    description: "Direct cash collection or physical deposit",
  },
  {
    value: "upi",
    label: "UPI / QR Code Transfer",
    icon: QrCode,
    description: "Instant UPI handle or scanned QR transfer",
  },
  {
    value: "cheque",
    label: "Cheque / Demand Draft",
    icon: FileCheck,
    description: "Bank cheque clearance or bank draft",
  },
  {
    value: "pos_terminal",
    label: "Card Terminal / POS Swipe",
    icon: CreditCard,
    description: "Physical POS machine or swipe terminal",
  },
  {
    value: "other_offline",
    label: "Other Offline Method",
    icon: Receipt,
    description: "Manual ledger credit or external settlement",
  },
];

export const AccountantApprovalDialog: React.FC<AccountantApprovalDialogProps> = ({
  open,
  onOpenChange,
  request,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentDescription, setPaymentDescription] = useState<string>("");

  const approveMutation = useMutation({
    mutationFn: async (payload: { paymentMethod: string; paymentDescription: string }) => {
      if (!request?.id) throw new Error("No renewal request selected");
      const res = await apiRequest(
        "POST",
        `/api/subscription-renewal-requests/${request.id}/approve`,
        payload
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to approve renewal request");
      }
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: "Renewal Request Approved! 🎉",
        description:
          data.message ||
          "Customer subscription has been activated/extended and offline payment logged.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-renewal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      onOpenChange(false);
      setPaymentDescription("");
    },
    onError: (err: any) => {
      toast({
        title: "Approval Failed",
        description: err.message || "Could not approve renewal request.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please specify the offline payment method verified.",
        variant: "destructive",
      });
      return;
    }
    if (!paymentDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide bank reference, receipt number, or transaction notes.",
        variant: "destructive",
      });
      return;
    }

    approveMutation.mutate({
      paymentMethod,
      paymentDescription: paymentDescription.trim(),
    });
  };

  if (!request) return null;

  const targetUser = request.user || {};
  const targetPlan = request.plan || {};
  const requester = request.requester || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl p-6">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Accountant Approval & Verification
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Step 2: Record offline payment details to activate the customer subscription.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tenant Customer
                </span>
                <p className="font-bold text-sm text-slate-900 mt-0.5">
                  {targetUser.username || targetUser.firstName || "Customer"}{" "}
                  {targetUser.email && (
                    <span className="font-normal text-xs text-slate-500">({targetUser.email})</span>
                  )}
                </p>
                {targetUser.phoneNumber && (
                  <p className="text-[11px] font-mono text-slate-400">{targetUser.phoneNumber}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Renewal Amount
                </span>
                <p className="font-bold text-base text-emerald-600 font-mono mt-0.5">
                  {request.currency} {request.amount}
                </p>
                <span className="capitalize text-[11px] font-medium text-slate-500">
                  {request.billingCycle} Cycle
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-2.5 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Target Plan:</span>{" "}
                <strong className="text-slate-800">{targetPlan.name || "Custom Plan"}</strong>
              </div>
              <div>
                <span className="text-slate-400">Requested By:</span>{" "}
                <strong className="text-slate-800">
                  @{requester.username || "manager"}
                </strong>
              </div>
            </div>

            {request.requestNotes && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">
                  Manager Notes:
                </span>
                <p className="text-slate-700 italic">"{request.requestNotes}"</p>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Verified Payment Method *
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="rounded-xl text-sm bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2.5 py-0.5">
                        <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-medium text-xs text-slate-900">{method.label}</p>
                          <p className="text-[10px] text-slate-400">{method.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Description & Reference */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Payment Reference / Description *
            </Label>
            <Textarea
              placeholder="e.g. Bank Ref #HDFC-99281729 received in Current A/C on 17-Sep-2026. Verified in bank portal statement."
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              rows={3}
              required
              className="rounded-xl text-xs bg-white border-slate-200 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              This reference will be permanently recorded in the financial transaction logs and subscription audit trail.
            </p>
          </div>

          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Upon approval, the customer's subscription will immediately be extended/activated, all
              paused WhatsApp channels and automations will resume, and this record will be sealed.
            </p>
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
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 flex items-center gap-1.5"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Approving & Activating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Activate Subscription</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
