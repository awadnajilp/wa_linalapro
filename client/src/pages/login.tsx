/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * ============================================================
 */

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ResetPassword from "@/components/ResetPassword";
import VerifyOtp from "@/components/VerifyOtp";
import ForgotPasswordEmail from "@/components/ForgotPasswordEmail";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  MessageSquare,
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppSettings } from "@/types/types";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<"login" | "forgot" | "verify" | "reset">(
    "login"
  );
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await apiRequest("POST", "/api/auth/login", data);

      let json: any;
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok) {
        throw new Error(json?.error || "Login failed. Please check your credentials.");
      }

      return json;
    },
    onSuccess: () => {
      try {
        sessionStorage.setItem("fromLogin", "true");
      } catch (e) {
        console.error("Failed to set sessionStorage:", e);
      }

      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      let errorMessage = error?.message || "Login failed. Please try again.";

      if (error.message.includes("401")) {
        errorMessage = "Invalid username or password";
      } else if (error.message.includes("403")) {
        errorMessage = "Account is inactive. Please contact administrator.";
      }

      setError(errorMessage);
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setError(null);
    loginMutation.mutate(data);
  };

  const featuresList = [
    {
      id: "voice",
      icon: Volume2,
      badge: "Voice Agent Autopilot",
      title: "Multilingual Voice AI & Dialects",
      desc: "Native voice notes across 40+ languages (Najdi, Hijazi, Gulf, Egyptian & English) with sub-second response SLA.",
      tag: "0.4s Voice SLA",
      color: "from-purple-500 to-indigo-600",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "🎙️ AI Audio: 'تم تأكيد طلبك وسيصلك غداً بإذن الله' • Dialect Match: 99.4%",
    },
    {
      id: "ecommerce",
      icon: ShoppingBag,
      badge: "E-Commerce Module",
      title: "WhatsApp Store & 1-Click Checkout",
      desc: "Interactive in-chat catalogs, item customization, instant Apple Pay / Mada checkout, and automated shipping labels.",
      tag: "Instant Payments",
      color: "from-purple-600 to-pink-600",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "💳 Paid Order #LN-9482 (SAR 249.00) via Apple Pay • Stock Synced",
    },
    {
      id: "zapier",
      icon: Share2,
      badge: "1,000+ Integrations",
      title: "Zapier, Webhooks & Custom REST API",
      desc: "Bi-directional instant sync with Shopify, Salla, Zid, WooCommerce, Google Sheets, HubSpot, and custom webhooks.",
      tag: "2-Way Live Sync",
      color: "from-purple-600 to-cyan-600",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "⚡ Live Webhook: Salla Order #58210 synced to WhatsApp pipeline in 80ms",
    },
    {
      id: "expense",
      icon: Wallet,
      badge: "Expense & Finance Module",
      title: "SME Expense Ledger & Receipt OCR",
      desc: "Snap receipts, track daily company expenses, manage categorized spending limits, and export instant VAT reports.",
      tag: "Automated Ledger",
      color: "from-purple-600 to-emerald-600",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "🧾 Receipt OCR Verified: 'Office Logistics SAR 420.00' • Account Logged",
    },
    {
      id: "reminders",
      icon: Clock,
      badge: "Reminder & Cadence Engine",
      title: "Automated Cadences & Follow-ups",
      desc: "Multi-step smart follow-up sequences for abandoned carts, scheduled appointments, and recurring customer check-ins.",
      tag: "99.2% Delivery",
      color: "from-purple-600 to-amber-500",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "🔔 Cadence Step 2 Triggered: 'Appointment Reminder for Tomorrow at 4:00 PM'",
    },
    {
      id: "crm",
      icon: Users,
      badge: "Team CRM & Lead Scoring",
      title: "Omnichannel CRM & AI Lead Scoring",
      desc: "Unified multi-agent shared inbox, automated buyer intent qualification (96/100), and auto-routing to top closers.",
      tag: "Score: 96 / 100",
      color: "from-purple-600 to-indigo-500",
      accentBg: "bg-purple-500/10 text-purple-300 border-purple-500/25",
      highlight: "🏷️ Tags: [VIP Buyer, Hot Lead] • Auto-routed to Senior Account Exec",
    },
  ];

  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);

  // Auto-scroll through features every 3.5s
  useState(() => {
    const timer = setInterval(() => {
      setActiveFeatureIdx((prev) => (prev + 1) % featuresList.length);
    }, 3800);
    return () => clearInterval(timer);
  });

  return (
    <div className="min-h-screen flex font-sans selection:bg-purple-600 selection:text-white bg-[#080511]">
      {/* LEFT PANE: Creative Brand #9333EA Obsidian-Purple Showcase */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#0a0614] text-slate-100 border-r border-purple-950/60">
        {/* Subtle Brand Architectural Grid & Deep Violet Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#581c8712_1px,transparent_1px),linear-gradient(to_bottom,#581c8712_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-purple-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-purple-800/15 via-pink-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            {brandSettings?.logo ? (
              <img
                src={brandSettings?.logo}
                alt="Logo"
                className="h-10 object-contain brightness-0 invert transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-600/30 border border-purple-400/40">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    LINALA <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-semibold font-mono">PRO</span>
                  </span>
                  <span className="text-[10px] text-purple-300/70 tracking-wider uppercase font-medium">WhatsApp Commerce & AI Suite</span>
                </div>
              </div>
            )}
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-200 text-xs font-medium backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Meta Cloud API Partner
          </div>
        </div>

        {/* Center Canvas: Dynamic Moving / Scrollable Platform Showcase */}
        <div className="relative z-10 my-auto py-4 max-w-xl">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              All-In-One WhatsApp Operating System
            </div>
            <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-tight">
              One platform powering your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-300">
                Voice AI, Stores, Finance & CRM.
              </span>
            </h1>
          </div>

          {/* Active Feature Spotlight Card */}
          {(() => {
            const feat = featuresList[activeFeatureIdx];
            const Icon = feat.icon;
            return (
              <div className="relative rounded-3xl bg-[#110b22]/90 border border-purple-900/50 p-5 shadow-2xl shadow-purple-950/50 backdrop-blur-xl transition-all duration-500 mb-5">
                <div className="flex items-center justify-between pb-3 border-b border-purple-900/40 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {feat.title}
                      </div>
                      <div className="text-[10px] text-purple-300/70 font-mono">{feat.badge}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold font-mono">
                    {feat.tag}
                  </span>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {feat.desc}
                </p>

                {/* Micro-preview badge */}
                <div className="mt-3.5 p-3 rounded-2xl bg-[#181030]/80 border border-purple-800/40 flex items-center gap-2 text-xs text-purple-200 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
                  <span className="truncate">{feat.highlight}</span>
                </div>
              </div>
            );
          })()}

          {/* Moving / Scrollable 6-Module Feature Bar & Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-purple-300/80 font-medium px-1">
              <span>Platform Modules & Capabilities</span>
              <span className="font-mono">{activeFeatureIdx + 1} / {featuresList.length} (Auto-rotating)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {featuresList.map((f, idx) => {
                const FIcon = f.icon;
                const isActive = idx === activeFeatureIdx;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFeatureIdx(idx)}
                    className={`text-left p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? "bg-purple-600/25 border-purple-500/80 text-white shadow-lg shadow-purple-900/40 scale-[1.02]"
                        : "bg-[#110b22]/50 border-purple-950/60 text-slate-400 hover:border-purple-800/60 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <FIcon className={`w-3.5 h-3.5 ${isActive ? "text-purple-300" : "text-slate-500"}`} />
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                    </div>
                    <div className="text-[11px] font-bold truncate">{f.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Trust & Security */}
        <div className="relative z-10 flex items-center justify-between text-xs text-purple-300/60 pt-5 border-t border-purple-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Official Meta Cloud API • SOC2 Certified Architecture</span>
          </div>
          <div className="font-mono text-[11px] text-purple-300">99.9% Uptime</div>
        </div>
      </div>

      {/* RIGHT PANE: Clean Crisp Light Form Container */}
      <div className="w-full lg:w-5/12 xl:w-2/5 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative bg-slate-50">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-10 object-contain"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900 tracking-tight">LINALA</span>
                </div>
              )}
            </Link>
          </div>

          {/* Form Header */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {step === "login" && "Sign In"}
              {step === "forgot" && "Reset Your Password"}
              {step === "verify" && "Verify Security Code"}
              {step === "reset" && "Create New Password"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {step === "login" && "Access your WhatsApp workspace and AI modules"}
              {step === "forgot" && "Enter your account email to receive an instant reset code"}
              {step === "verify" && "Enter the 6-digit verification code sent to your email"}
              {step === "reset" && "Choose a strong password with at least 8 characters"}
            </p>
          </div>

          {/* Clean Light Card */}
          <Card className="bg-white border border-slate-200/90 shadow-xl shadow-purple-950/5 rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {error && (
                <Alert className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5">
                  <AlertDescription className="text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {step === "login" && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Username Field */}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold text-slate-700">
                            Username or Email
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                              <Input
                                placeholder="Enter your username"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-600 focus-visible:bg-white transition-all"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-bold text-slate-700">
                              Password
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setStep("forgot");
                              }}
                              className="text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 pr-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-600 focus-visible:bg-white transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs text-rose-500" />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Forgot Password Flow */}
              {step === "forgot" && (
                <ForgotPasswordEmail
                  onEmailSent={(sentEmail) => {
                    setEmail(sentEmail);
                    setStep("verify");
                  }}
                  onBack={() => setStep("login")}
                />
              )}

              {step === "verify" && (
                <VerifyOtp
                  email={email}
                  onVerified={(otp) => {
                    setOtpCode(otp);
                    setStep("reset");
                  }}
                />
              )}

              {step === "reset" && (
                <ResetPassword
                  email={email}
                  otpCode={otpCode}
                  onReset={() => {
                    setStep("login");
                    toast({
                      title: "Password reset successful",
                      description: "You can now log in with your new password.",
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Bottom Signup Link */}
          {step === "login" && (
            <div className="mt-6 text-center text-xs text-slate-500">
              Don't have a Linala workspace yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Create Account (14-Day Free Trial)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

