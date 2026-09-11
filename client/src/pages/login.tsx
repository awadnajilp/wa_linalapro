/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Volume2,
  ShoppingBag,
  Share2,
  Wallet,
  Clock,
  Users,
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username.trim(),
          password: data.password,
        }),
        credentials: "include",
      });

      let json: any;
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok) {
        throw new Error(json?.error || json?.message || "Invalid username or password");
      }

      return json;
    },
    onSuccess: (data: any) => {
      try {
        sessionStorage.setItem("fromLogin", "true");
      } catch (e) {
        console.error("Failed to set sessionStorage:", e);
      }

      if (data?.user) {
        queryClient.setQueryData(["/api/auth/me"], data.user);
      }

      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      let errorMessage = error?.message || "Login failed. Please try again.";

      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        errorMessage = "Connection error. Please check your network and try again.";
      } else if (errorMessage.includes("401")) {
        errorMessage = "Invalid username or password";
      } else if (errorMessage.includes("403")) {
        errorMessage = "Account is inactive. Please contact administrator.";
      }

      setError(errorMessage);
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setError(null);
    loginMutation.mutate(data);
  };

  const moduleCards = [
    {
      id: "voice",
      icon: Volume2,
      title: "Multilingual Voice AI",
      tag: "0.4s SLA",
      color: "from-purple-500 to-indigo-600",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-purple-500/20 text-purple-300",
      detail: "Arabic (Najdi / Gulf) & 40+ Dialects",
      extra: (
        <div className="flex items-center gap-1">
          <div className="h-3 w-1 bg-purple-400 rounded-full animate-pulse" />
          <div className="h-4 w-1 bg-purple-400 rounded-full animate-pulse delay-75" />
          <div className="h-2 w-1 bg-purple-400 rounded-full" />
          <div className="h-5 w-1 bg-purple-400 rounded-full animate-pulse delay-100" />
          <div className="h-3 w-1 bg-purple-400 rounded-full" />
        </div>
      ),
    },
    {
      id: "ecommerce",
      icon: ShoppingBag,
      title: "WhatsApp Store & Checkout",
      tag: "Apple Pay / Mada",
      color: "from-pink-500 to-purple-600",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-pink-500/20 text-pink-300",
      detail: "Paid • Order #LN-9482 (SAR 249)",
      extra: <span className="text-[10px] text-emerald-400 font-bold">Paid ✓</span>,
    },
    {
      id: "zapier",
      icon: Share2,
      title: "Zapier & API Connectors",
      tag: "1,000+ Apps",
      color: "from-purple-600 to-cyan-500",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-cyan-500/20 text-cyan-300",
      detail: "Salla • Shopify • Zid • Sheets",
      extra: <span className="text-[10px] text-purple-300 font-mono">Live 2-Way</span>,
    },
    {
      id: "expense",
      icon: Wallet,
      title: "Expense & Finance Ledger",
      tag: "Receipt OCR",
      color: "from-emerald-500 to-purple-600",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-emerald-500/20 text-emerald-300",
      detail: "Office Logistics • SAR 420.00",
      extra: <span className="text-[10px] text-emerald-400 font-medium">Logged ✓</span>,
    },
    {
      id: "reminders",
      icon: Clock,
      title: "Automated Cadences",
      tag: "99.2% Open Rate",
      color: "from-amber-500 to-purple-600",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-amber-500/20 text-amber-300",
      detail: "Step 2: Appointment Alert 4:00 PM",
      extra: <span className="text-[10px] text-amber-300">Auto-Sent</span>,
    },
    {
      id: "crm",
      icon: Users,
      title: "Team CRM & Lead Scoring",
      tag: "Score: 96 / 100",
      color: "from-purple-600 to-indigo-500",
      accentBorder: "border-purple-800/40 hover:border-purple-500/60",
      iconBg: "bg-indigo-500/20 text-indigo-300",
      detail: "🏷️ VIP Buyer • Routed to Closer",
      extra: <span className="text-[10px] text-purple-300 font-bold">Hot Deal 🔥</span>,
    },
  ];

  return (
    <div className="min-h-screen flex font-sans selection:bg-purple-600 selection:text-white bg-[#0A0910]">
      {/* LEFT PANE: Clean, Solid Obsidian-Purple Showcase */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#0C0A14] text-slate-100 border-r border-slate-800/80">
        {/* Subtle Brand Structural Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e172e_1px,transparent_1px),linear-gradient(to_bottom,#1e172e_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

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
                <div className="w-10 h-10 rounded-2xl bg-[#9333EA] flex items-center justify-center shadow-md shadow-purple-900/30 border border-purple-400/30">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    LINALA <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800/60 text-purple-300 font-semibold font-mono">PRO</span>
                  </span>
                  <span className="text-[10px] text-purple-300/70 tracking-wider uppercase font-medium">WhatsApp AI & Commerce Suite</span>
                </div>
              </div>
            )}
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161224] border border-purple-900/60 text-purple-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Meta Cloud API Partner
          </div>
        </div>

        {/* Center Canvas: Spacious, Crisp Hero & Smooth Floating Feature Stream */}
        <div className="relative z-10 my-auto py-2 max-w-xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Unified WhatsApp Engine
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              One connected workspace for your{" "}
              <span className="text-purple-400">
                WhatsApp revenue.
              </span>
            </h1>
            <p className="mt-2.5 text-slate-300 text-sm leading-relaxed max-w-lg">
              Voice AI autopilot, in-chat commerce, financial ledger, and cadence follow-ups.
            </p>
          </div>

          {/* Smooth Vertical Floating Stream of Feature Cards */}
          <div className="relative overflow-hidden h-[290px] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] group">
            <div className="space-y-2.5 animate-marquee-vertical hover:[animation-play-state:paused]">
              {/* First Set of 6 Cards */}
              {moduleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#120b24]/90 border ${card.accentBorder} shadow-lg shadow-purple-950/40 backdrop-blur-md transition-all duration-200 hover:scale-[1.01] hover:bg-[#190f33]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0 shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {card.title}
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-normal">
                            {card.tag}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">{card.detail}</div>
                      </div>
                    </div>
                    <div className="shrink-0 pl-2">{card.extra}</div>
                  </div>
                );
              })}

              {/* Seamless Duplicate Set for Smooth Infinite Gliding */}
              {moduleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={`dup-${card.id}`}
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#120b24]/90 border ${card.accentBorder} shadow-lg shadow-purple-950/40 backdrop-blur-md transition-all duration-200 hover:scale-[1.01] hover:bg-[#190f33]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0 shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {card.title}
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-normal">
                            {card.tag}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">{card.detail}</div>
                      </div>
                    </div>
                    <div className="shrink-0 pl-2">{card.extra}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance */}
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
                      className="w-full h-11 rounded-xl bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold text-sm shadow-md shadow-purple-900/20 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
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

