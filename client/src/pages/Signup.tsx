/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Simplified Multi-Step WhatsApp & Email Verification Signup
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { loginWithFacebook } from "@/lib/facebook-sdk";
import { loginWithGooglePopup } from "@/lib/google-sdk";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  User,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Loader2,
  Smartphone,
  Key,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSettings } from "@/types/types";

type SignupStep = "phone" | "phone_otp" | "account_details" | "email_otp";

const COMMON_COUNTRY_CODES = [
  { code: "+91", country: "IN", label: "India (+91)" },
  { code: "+971", country: "AE", label: "UAE (+971)" },
  { code: "+966", country: "SA", label: "Saudi Arabia (+966)" },
  { code: "+965", country: "KW", label: "Kuwait (+965)" },
  { code: "+974", country: "QA", label: "Qatar (+974)" },
  { code: "+968", country: "OM", label: "Oman (+968)" },
  { code: "+973", country: "BH", label: "Bahrain (+973)" },
  { code: "+1", country: "US", label: "USA / Canada (+1)" },
  { code: "+44", country: "GB", label: "UK (+44)" },
  { code: "+65", country: "SG", label: "Singapore (+65)" },
  { code: "+60", country: "MY", label: "Malaysia (+60)" },
  { code: "+62", country: "ID", label: "Indonesia (+62)" },
  { code: "+49", country: "DE", label: "Germany (+49)" },
  { code: "+33", country: "FR", label: "France (+33)" },
  { code: "+61", country: "AU", label: "Australia (+61)" },
  { code: "+20", country: "EG", label: "Egypt (+20)" },
  { code: "+234", country: "NG", label: "Nigeria (+234)" },
  { code: "+254", country: "KE", label: "Kenya (+254)" },
  { code: "+55", country: "BR", label: "Brazil (+55)" },
  { code: "+52", country: "MX", label: "Mexico (+52)" },
];

const Signup: React.FC = () => {
  const [, setLocation] = useLocation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<SignupStep>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  // Account details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(true);

  // Email OTP
  const [emailOtp, setEmailOtp] = useState("");

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: facebookConfig } = useQuery<{ enabled: boolean; appId: string; configId?: string }>({
    queryKey: ["/api/auth/facebook/config"],
    queryFn: () => fetch("/api/auth/facebook/config").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: googleConfig } = useQuery<{ enabled: boolean; clientId: string }>({
    queryKey: ["/api/auth/google/config"],
    queryFn: () => fetch("/api/auth/google/config").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Countdown timer for OTP resends
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // STEP 1: Submit Phone Number & Send WhatsApp OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanNumber = localPhone.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 6) {
      setErrorMsg("Please enter a valid WhatsApp phone number.");
      return;
    }

    const completePhone = countryCode.replace("+", "") + cleanNumber;
    setFullPhone(completePhone);
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/auth/signup/send-whatsapp-otp", {
        phone: completePhone,
      });
      const data = await res.json();

      if (data.success) {
        setCurrentStep("phone_otp");
        setResendCooldown(45);
        setInfoMsg(data.message || "Verification code sent to your WhatsApp number.");
      } else {
        setErrorMsg(data.error || "Failed to send WhatsApp verification code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send WhatsApp OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify WhatsApp OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!phoneOtp || phoneOtp.length < 4) {
      setErrorMsg("Please enter the verification code received on WhatsApp.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/auth/signup/verify-whatsapp-otp", {
        phone: fullPhone,
        otpCode: phoneOtp,
      });
      const data = await res.json();

      if (data.success) {
        setCurrentStep("account_details");
        setErrorMsg("");
        setInfoMsg("WhatsApp verified! Please complete your account profile.");
      } else {
        setErrorMsg(data.error || "Invalid verification code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify WhatsApp code.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Create Account (Username = Email)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid work email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!agreeToTerms) {
      setErrorMsg("You must accept the Terms of Service & Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/auth/signup/create-account", {
        fullName,
        email: email.toLowerCase().trim(),
        password,
        phone: fullPhone,
      });
      const data = await res.json();

      if (data.success) {
        if (data.user) {
          queryClient.setQueryData(["/api/auth/me"], data.user);
        }
        setCurrentStep("email_otp");
        setResendCooldown(60);
        setInfoMsg("Account created! A verification code has been sent to your email.");
      } else {
        setErrorMsg(data.error || "Failed to create account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 4: Verify Email OTP
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!emailOtp || emailOtp.length < 4) {
      setErrorMsg("Please enter the verification code sent to your email.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/auth/verify-email-otp", {
        email: email.toLowerCase().trim(),
        otpCode: emailOtp,
      });
      const data = await res.json();

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        window.location.href = "/dashboard";
      } else {
        setErrorMsg(data.error || "Invalid or expired email OTP.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify email OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend WhatsApp OTP
  const handleResendPhoneOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/signup/send-whatsapp-otp", {
        phone: fullPhone,
      });
      const data = await res.json();
      setResendCooldown(45);
      setInfoMsg(data.message || "Verification code resent to your WhatsApp.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/resend-email-otp", {
        email: email.toLowerCase().trim(),
      });
      const data = await res.json();
      setResendCooldown(60);
      setInfoMsg(data.message || "Verification code resent to your email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend email code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Skip Email Verification to Dashboard
  const handleSkipToDashboard = () => {
    window.location.href = "/dashboard";
  };

  // Facebook SSO
  const handleFacebookSignup = async () => {
    if (!facebookConfig?.appId) {
      setErrorMsg("Facebook authentication is not configured on this server.");
      return;
    }
    setErrorMsg("");
    setIsFacebookLoading(true);

    try {
      const { accessToken } = await loginWithFacebook(facebookConfig.appId, facebookConfig.configId);
      const response = await fetch("/api/auth/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Facebook signup failed");

      if (json?.user) queryClient.setQueryData(["/api/auth/me"], json.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to continue with Facebook");
    } finally {
      setIsFacebookLoading(false);
    }
  };

  // Google SSO
  const handleGoogleSignup = async () => {
    if (!googleConfig?.clientId) {
      setErrorMsg("Google authentication is not configured on this server.");
      return;
    }
    setErrorMsg("");
    setIsGoogleLoading(true);

    try {
      const { credential, accessToken } = await loginWithGooglePopup(googleConfig.clientId);
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, accessToken }),
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Google signup failed");

      if (json?.user) queryClient.setQueryData(["/api/auth/me"], json.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to continue with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const featureChecklist = [
    "Multilingual AI Voice Autopilot in 40+ global languages",
    "1-Click WhatsApp in-chat storefront & instant checkout",
    "Visual flow builder with automated follow-up cadences",
    "Omnichannel shared team inbox & multi-agent CRM",
    "Official Meta WhatsApp Cloud API & Baileys QR support",
  ];

  return (
    <div className="min-h-screen flex font-sans selection:bg-purple-600 selection:text-white">
      {/* LEFT PANE: Value Props (Dark) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-slate-800/80 bg-slate-950 text-slate-100">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Brand Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            {brandSettings?.logo ? (
              <img
                src={brandSettings?.logo}
                alt="Logo"
                className="h-10 object-contain brightness-0 invert transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/30">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    LINALA <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-semibold font-mono">2026</span>
                  </span>
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">WhatsApp AI Growth Engine</span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            14-Day Free Trial • Instant WhatsApp Setup
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Turn WhatsApp into Your Most Profitable Channel.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Deploy autonomous AI agents, automate follow-up cadences, and close deals directly on WhatsApp.
          </p>

          <div className="space-y-3.5 mb-8">
            {featureChecklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-200">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80">
            <div>
              <div className="text-lg font-bold text-white">500+</div>
              <div className="text-[11px] text-slate-400 font-medium">Global Brands</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">98.4%</div>
              <div className="text-[11px] text-slate-400 font-medium">Open Rates</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">3.8x</div>
              <div className="text-[11px] text-slate-400 font-medium">Sales Velocity</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Official Meta Cloud API • Enterprise Security</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">SOC2 Type II</div>
        </div>
      </div>

      {/* RIGHT PANE: Multi-Step Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative bg-slate-50/80">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {brandSettings?.logo ? (
                <img src={brandSettings?.logo} alt="Logo" className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900 tracking-tight">LINALA</span>
                </div>
              )}
            </Link>
          </div>

          {/* Stepper Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between relative mb-2">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full -z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-purple-600 transition-all duration-300 -z-0"
                style={{
                  width:
                    currentStep === "phone"
                      ? "10%"
                      : currentStep === "phone_otp"
                      ? "40%"
                      : currentStep === "account_details"
                      ? "70%"
                      : "100%",
                }}
              />

              {[
                { id: "phone", label: "WhatsApp", icon: Smartphone },
                { id: "phone_otp", label: "Verify WA", icon: Key },
                { id: "account_details", label: "Profile", icon: User },
                { id: "email_otp", label: "Email", icon: Mail },
              ].map((step, idx) => {
                const isCurrent = currentStep === step.id;
                const isPassed =
                  (step.id === "phone" && currentStep !== "phone") ||
                  (step.id === "phone_otp" && (currentStep === "account_details" || currentStep === "email_otp")) ||
                  (step.id === "account_details" && currentStep === "email_otp");

                return (
                  <div key={step.id} className="flex flex-col items-center bg-slate-50 px-1 z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? "bg-emerald-600 text-white shadow-sm"
                          : isCurrent
                          ? "bg-purple-600 text-white ring-4 ring-purple-100 shadow-md shadow-purple-500/20"
                          : "bg-white border border-slate-300 text-slate-400"
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? "text-purple-700 font-bold" : "text-slate-500"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <Card className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {/* Alert Feedback */}
              {errorMsg && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {infoMsg && (
                <div className="mb-4 bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* STEP 1: Enter WhatsApp Phone */}
              {currentStep === "phone" && (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div className="text-center sm:text-left mb-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Enter Your WhatsApp Number</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      We'll send a quick 6-digit verification code to your WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">WhatsApp Phone Number</Label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-11 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      >
                        {COMMON_COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.country})
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="tel"
                          value={localPhone}
                          onChange={(e) => setLocalPhone(e.target.value)}
                          placeholder="9876543210"
                          className="pl-10 h-11 bg-slate-50/70 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !localPhone.trim()}
                    className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 text-sm gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {isLoading ? "Sending OTP..." : "Continue with WhatsApp"}
                  </Button>

                  {/* Social SSO Alternates */}
                  {(googleConfig?.enabled || facebookConfig?.enabled) && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[11px] text-center text-slate-400 uppercase tracking-wider font-semibold mb-3">
                        Or 1-Click Fast Sign Up
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {googleConfig?.enabled && (
                          <button
                            type="button"
                            onClick={handleGoogleSignup}
                            disabled={isGoogleLoading}
                            className="flex items-center justify-center gap-2 h-10 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all"
                          >
                            {isGoogleLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                            )}
                            Google
                          </button>
                        )}
                        {facebookConfig?.enabled && (
                          <button
                            type="button"
                            onClick={handleFacebookSignup}
                            disabled={isFacebookLoading}
                            className="flex items-center justify-center gap-2 h-10 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-semibold transition-all"
                          >
                            {isFacebookLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                            )}
                            Facebook
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* STEP 2: Verify WhatsApp OTP */}
              {currentStep === "phone_otp" && (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div className="text-center sm:text-left mb-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Verify WhatsApp Number</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-bold text-slate-800">+{fullPhone}</span>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">6-Digit Code</Label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                      <Input
                        type="text"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="pl-10 h-11 tracking-widest text-lg font-mono text-center font-bold bg-slate-50/70 border border-slate-200 rounded-xl"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("phone")}
                      className="text-slate-500 hover:text-purple-600 flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Edit Number
                    </button>

                    <button
                      type="button"
                      onClick={handleResendPhoneOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className={`font-semibold ${
                        resendCooldown > 0 ? "text-slate-400 cursor-not-allowed" : "text-purple-600 hover:underline"
                      }`}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || phoneOtp.length < 4}
                    className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 text-sm gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isLoading ? "Verifying..." : "Confirm & Continue"}
                  </Button>
                </form>
              )}

              {/* STEP 3: Enter Full Name, Email, Password */}
              {currentStep === "account_details" && (
                <form onSubmit={handleCreateAccount} className="space-y-3.5">
                  <div className="text-center sm:text-left mb-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Your Account Profile</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Your email address will serve as your primary username.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-10 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 text-sm rounded-xl"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700">Work Email (Username)</Label>
                      <span className="text-[10px] text-purple-600 font-semibold font-mono">Used for Login</span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="pl-10 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 text-sm rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 chars"
                          className="pl-10 pr-9 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 text-sm rounded-xl"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="pl-10 pr-9 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 text-sm rounded-xl"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <label htmlFor="terms" className="text-xs text-slate-500 cursor-pointer">
                      I agree to the{" "}
                      <Link href="/terms" className="text-purple-600 font-semibold hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-purple-600 font-semibold hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 text-sm gap-2 mt-1"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {isLoading ? "Creating Account..." : "Create Account & Continue"}
                  </Button>
                </form>
              )}

              {/* STEP 4: Verify Email OTP (with Skip / Verify Later button) */}
              {currentStep === "email_otp" && (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  <div className="text-center sm:text-left mb-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Verify Your Email Address</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      We've sent a 6-digit confirmation code to{" "}
                      <span className="font-bold text-slate-800">{email}</span>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Verification Code</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                      <Input
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="pl-10 h-11 tracking-widest text-lg font-mono text-center font-bold bg-slate-50/70 border border-slate-200 rounded-xl"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex justify-end text-xs">
                    <button
                      type="button"
                      onClick={handleResendEmailOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className={`font-semibold ${
                        resendCooldown > 0 ? "text-slate-400 cursor-not-allowed" : "text-purple-600 hover:underline"
                      }`}
                    >
                      {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend Email Code"}
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isLoading || emailOtp.length < 4}
                      className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 text-sm gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isLoading ? "Verifying..." : "Verify Email & Launch Dashboard"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipToDashboard}
                      className="w-full h-10 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs"
                    >
                      Verify Later (Skip to Dashboard) →
                    </Button>
                  </div>
                </form>
              )}

              {/* Login Link Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-purple-600 hover:text-purple-700 hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
