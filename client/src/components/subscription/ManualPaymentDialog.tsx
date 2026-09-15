/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Manual Payment & Receipt Upload Modal
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  CreditCard,
  Building2,
  QrCode,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Receipt,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPlan?: any;
}

export const ManualPaymentDialog: React.FC<ManualPaymentDialogProps> = ({
  open,
  onOpenChange,
  preselectedPlan,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Fetch available plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery<any>({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/plans");
        if (res.ok) return await res.json();
      } catch {}
      const fallbackRes = await fetch("/api/plans");
      return await fallbackRes.json();
    },
  });

  const plansList = Array.isArray(plansData)
    ? plansData
    : plansData?.data || [];

  // Fetch brand & bank settings
  const { data: brandSettings } = useQuery<any>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
  });

  useEffect(() => {
    if (preselectedPlan?.id) {
      setSelectedPlanId(preselectedPlan.id);
    } else if (preselectedPlan?.name && plansList.length > 0) {
      const match = plansList.find(
        (p: any) => p.name?.toLowerCase() === preselectedPlan.name?.toLowerCase()
      );
      if (match) setSelectedPlanId(match.id);
      else if (!selectedPlanId && plansList[0]) setSelectedPlanId(plansList[0].id);
    } else if (plansList.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plansList[0].id);
    }
  }, [preselectedPlan, plansList, selectedPlanId]);

  const selectedPlan =
    plansList.find((p: any) => p.id === selectedPlanId) ||
    preselectedPlan ||
    plansList[0];

  const getMonthlyPrice = (p: any) =>
    Number(p?.monthlyPrice ?? p?.price ?? 0);

  const getAnnualPrice = (p: any) =>
    Number(p?.annualPrice ?? (getMonthlyPrice(p) * 10) ?? 0);

  const calculatedAmount = selectedPlan
    ? billingCycle === "annual"
      ? getAnnualPrice(selectedPlan).toFixed(2)
      : getMonthlyPrice(selectedPlan).toFixed(2)
    : "0.00";

  const currencySymbol = brandSettings?.currency || selectedPlan?.currency || "$";

  // Handle Receipt File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Receipt file size must be less than 10MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setReceiptFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to upload receipt image.");
      }

      const data = await res.json();
      const uploadedUrl = data.url || data.filePath || data.data?.url;
      if (!uploadedUrl) throw new Error("Server did not return a valid file URL.");

      setReceiptUrl(uploadedUrl);
      toast({
        title: "Receipt Uploaded",
        description: "Payment receipt attached successfully.",
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file.");
      setReceiptUrl("");
      setReceiptFileName("");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit manual payment request mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan?.id) throw new Error("Please select a plan.");
      if (!receiptUrl) throw new Error("Please upload a payment receipt screenshot.");
      if (!transactionRef.trim()) throw new Error("Please enter your transaction or reference ID.");

      const res = await apiRequest("POST", "/api/subscriptions/manual-payment-request", {
        planId: selectedPlan.id,
        billingCycle,
        amount: calculatedAmount,
        currency: currencySymbol,
        receiptUrl,
        transactionReference: transactionRef.trim(),
        notes: notes.trim(),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit payment request");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Receipt Submitted! ⏳",
        description:
          "Your manual renewal request is under review by the admin. Your account will be activated once verified.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/subscriptions/user/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/manual-payment-requests"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Submission Error",
        description: err.message || "Could not submit manual payment.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border bg-background text-foreground">
        {/* Header with gradient badge */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white rounded-t-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-white">
                Manual Plan Renewal & Offline Payment
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-sm mt-0.5">
                Transfer via Bank/UPI and upload your receipt for instant manual activation.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Plan & Billing Cycle Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">1. Select Target Plan & Cycle</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border bg-card text-foreground text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {plansList.length === 0 ? (
                    <option value="">{isPlansLoading ? "Loading plans..." : "No plans available"}</option>
                  ) : (
                    plansList.map((p: any) => {
                      const priceStr =
                        billingCycle === "annual"
                          ? `${currencySymbol} ${getAnnualPrice(p)}/yr`
                          : `${currencySymbol} ${getMonthlyPrice(p)}/mo`;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({priceStr})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`h-10 text-xs font-semibold rounded-lg border transition-all ${
                      billingCycle === "monthly"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Monthly (1 Mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`h-10 text-xs font-semibold rounded-lg border transition-all ${
                      billingCycle === "annual"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Annual (Save 17%)
                  </button>
                </div>
              </div>
            </div>

            {/* Total Payable Summary Card */}
            <div className="p-4 bg-muted/60 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Payable Amount</div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {currencySymbol} {calculatedAmount}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedPlan?.name || "Selected Plan"}</span>
                <div>{billingCycle === "annual" ? "12 Months Access" : "30 Days Access"}</div>
              </div>
            </div>
          </div>

          {/* 2. Official Bank / Payment Details */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              2. Transfer Payment to Official Account
            </Label>
            <div className="p-4 bg-card border rounded-xl space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between border-b pb-1.5">
                <span className="font-medium text-foreground">Bank Name / Method:</span>
                <span>{brandSettings?.bankName || "Official Bank Transfer / Wire"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="font-medium text-foreground">Account Holder:</span>
                <span className="font-semibold text-foreground">{brandSettings?.name || "LINALA / Diploy Technologies"}</span>
              </div>
              {brandSettings?.accountNumber && (
                <div className="flex justify-between border-b pb-1.5">
                  <span className="font-medium text-foreground">Account Number / IBAN:</span>
                  <span className="font-mono font-bold text-foreground">{brandSettings.accountNumber}</span>
                </div>
              )}
              {brandSettings?.ifscCode && (
                <div className="flex justify-between border-b pb-1.5">
                  <span className="font-medium text-foreground">IFSC / SWIFT Code:</span>
                  <span className="font-mono font-bold text-foreground">{brandSettings.ifscCode}</span>
                </div>
              )}
              {brandSettings?.upiId && (
                <div className="flex justify-between border-b pb-1.5">
                  <span className="font-medium text-foreground">UPI / Instant Pay ID:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{brandSettings.upiId}</span>
                </div>
              )}
              <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                * Note: Please make sure to transfer the exact amount ({currencySymbol} {calculatedAmount}) and retain the reference ID.
              </p>
            </div>
          </div>

          {/* 3. Transaction Reference & Upload Receipt */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              3. Upload Proof of Payment
            </Label>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Transaction ID / Bank Reference Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. TXN987654321, UTR-123456789, or Ref #"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="h-10 text-sm font-mono"
                required
              />
            </div>

            {/* Receipt Upload Dropzone */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Upload Receipt Screenshot / PDF <span className="text-red-500">*</span>
              </Label>

              {receiptUrl ? (
                <div className="p-4 border-2 border-emerald-500/40 bg-emerald-500/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {receiptUrl.match(/\.(jpeg|jpg|png|webp)/i) ? (
                      <img
                        src={receiptUrl}
                        alt="Receipt preview"
                        className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                      />
                    ) : (
                      <div className="p-3 bg-emerald-500/20 rounded-lg">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                        {receiptFileName || "receipt_image.png"}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded successfully
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReceiptUrl("");
                      setReceiptFileName("");
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-500/10 h-8 w-8 p-0 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl border-muted-foreground/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <span className="text-xs text-muted-foreground font-medium">Uploading receipt...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="p-3 bg-muted rounded-full">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">Click to upload payment receipt</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Supports PNG, JPG, JPEG, PDF up to 10MB</p>
                      </div>
                    </div>
                  )}
                </label>
              )}

              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
                </p>
              )}
            </div>

            {/* Additional Remarks */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Notes / Remarks (Optional)
              </Label>
              <Textarea
                placeholder="Any additional details or message for the admin..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm resize-none h-16"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verified manual activation</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || isUploading || !receiptUrl || !transactionRef.trim()}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold px-6 shadow-md shadow-emerald-700/20"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Renewal Request"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentDialog;
