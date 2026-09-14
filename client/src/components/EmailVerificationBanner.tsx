/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Email Verification Pending Notification Banner & Modal
 * ============================================================
 */

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Mail,
  CheckCircle2,
  Loader2,
  X,
  Key,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Only render if user is logged in, unverified, and not a superadmin
  if (!user || user.isEmailVerified !== false || user.role === "superadmin") {
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg("Please enter the 6-digit code sent to your email.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    try {
      const res = await apiRequest("POST", "/api/auth/verify-email-otp", {
        email: user.email,
        otpCode: otpCode.trim(),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Email Verified",
          description: "Your email address has been verified successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setIsOpen(false);
      } else {
        setErrorMsg(data.error || "Invalid or expired verification code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setErrorMsg("");

    try {
      const res = await apiRequest("POST", "/api/auth/resend-email-otp", {
        email: user.email,
      });
      const data = await res.json();

      toast({
        title: "Code Sent",
        description: data.message || "A new verification code has been sent to your email.",
      });
    } catch (err: any) {
      toast({
        title: "Resend Failed",
        description: err.message || "Failed to resend code. Please wait a moment.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      {/* Amber Notification Banner */}
      <div className="bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm border-b border-amber-600/30">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1 rounded-md bg-amber-600/60 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-100" />
          </div>
          <span>
            <strong className="font-bold">Email Verification Pending:</strong> Your email (
            <span className="underline font-semibold">{user.email}</span>) is not yet verified.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            variant="outline"
            className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white border-amber-400 hover:border-amber-300"
          >
            {isResending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
            Resend Email
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setErrorMsg("");
              setIsOpen(true);
            }}
            className="h-7 text-xs px-3 bg-white hover:bg-amber-50 text-amber-900 font-bold border-0 shadow-sm"
          >
            Verify Now
          </Button>
        </div>
      </div>

      {/* In-Place Verification Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Verify Your Email Address
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter the 6-digit confirmation code sent to{" "}
              <span className="font-semibold text-slate-700">{user.email}</span>.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">6-Digit Verification Code</Label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="pl-10 h-11 text-center font-mono text-lg tracking-widest font-bold bg-slate-50 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-purple-600 font-semibold hover:underline"
              >
                {isResending ? "Sending..." : "Resend Verification Code"}
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isVerifying || otpCode.length < 4}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs gap-1.5"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isVerifying ? "Verifying..." : "Confirm & Verify"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
