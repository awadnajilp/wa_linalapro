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

  const liveHighlights = [
    {
      icon: Sparkles,
      title: "Multilingual Voice AI Autopilot",
      desc: "Instant natural voice notes across 40+ global languages with 0.4s response SLA.",
    },
    {
      icon: Zap,
      title: "1-Click WhatsApp In-Chat Storefront",
      desc: "Interactive catalog browsing, instant payments, and automatic order routing.",
    },
    {
      icon: TrendingUp,
      title: "Omnichannel CRM & Sales Cadences",
      desc: "Multi-agent shared team inbox, visual flow builder, and automated pipeline triggers.",
    },
  ];

  return (
    <div className="min-h-screen flex font-sans selection:bg-emerald-500 selection:text-white bg-[#0a0e17]">
      {/* LEFT PANE: Creative Dark Editorial Showcase */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#090d16] text-slate-100 border-r border-slate-800/80">
        {/* Subtle Architectural Grid & Refined Ambient Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-gradient-to-tr from-indigo-600/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

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
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    LINALA <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold font-mono">PRO</span>
                  </span>
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">WhatsApp Commerce & Voice AI</span>
                </div>
              </div>
            )}
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 text-xs font-medium backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Meta Cloud API Verified
          </div>
        </div>

        {/* Center Canvas: Realistic Human-Crafted Interactive Showcase */}
        <div className="relative z-10 my-auto py-6 max-w-xl">
          <div className="mb-6">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-snug">
              Every customer conversation, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">
                engineered into revenue.
              </span>
            </h1>
            <p className="mt-3 text-slate-400 text-sm xl:text-base leading-relaxed">
              Power your business with autonomous voice AI agents, native in-chat checkout catalogs, and cadence follow-ups.
            </p>
          </div>

          {/* Realistic WhatsApp Live Interaction Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl space-y-3.5">
            {/* Simulation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    L
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1">
                    Linala AI Assistant <span className="text-emerald-400 text-[11px]">✓</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">0.4s Voice SLA • Arabic & English</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                Live Session
              </span>
            </div>

            {/* Simulated Chat Bubbles */}
            <div className="space-y-2.5 text-xs">
              {/* Voice Note Bubble */}
              <div className="flex items-start gap-2 max-w-[85%] bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm p-3 text-slate-200">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-emerald-300">🎙️ AI Voice Note (Najdi Dialect)</span>
                    <span>0:14</span>
                  </div>
                  <div className="flex items-center gap-1 py-1">
                    <div className="h-4 w-1 bg-emerald-400 rounded-full animate-pulse" />
                    <div className="h-6 w-1 bg-emerald-400 rounded-full animate-pulse delay-75" />
                    <div className="h-3 w-1 bg-emerald-400 rounded-full" />
                    <div className="h-5 w-1 bg-emerald-400 rounded-full animate-pulse delay-100" />
                    <div className="h-2 w-1 bg-slate-600 rounded-full" />
                    <div className="h-4 w-1 bg-slate-600 rounded-full" />
                    <div className="h-6 w-1 bg-slate-600 rounded-full" />
                    <div className="h-3 w-1 bg-slate-600 rounded-full" />
                    <div className="h-5 w-1 bg-slate-600 rounded-full" />
                  </div>
                  <div className="text-[11px] text-slate-300 italic">
                    "أهلاً بك! تم تأكيد طلبك رقم #4820، وسيصلك المندوب غداً إن شاء الله."
                  </div>
                </div>
              </div>

              {/* Order Confirmation Pill */}
              <div className="ml-auto max-w-[80%] bg-emerald-950/60 border border-emerald-500/40 rounded-2xl rounded-tr-sm p-3 text-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>💳 1-Click WhatsApp Checkout</span>
                  <span className="text-emerald-400">Paid • SAR 249.00</span>
                </div>
                <div className="text-[10px] text-emerald-200/80 flex items-center justify-between">
                  <span>Apple Pay / Mada</span>
                  <span className="font-mono">ID: #LN-9482</span>
                </div>
              </div>
            </div>

            {/* Live Telemetry Row */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="text-base font-bold text-white">40+</div>
                <div className="text-[10px] text-slate-400">Global Dialects</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="text-base font-bold text-emerald-400">0.4s</div>
                <div className="text-[10px] text-slate-400">Voice SLA</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="text-base font-bold text-indigo-400">3.8x</div>
                <div className="text-[10px] text-slate-400">Conversion Lift</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Meta Cloud API • Enterprise SOC2 Type II Certified</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">99.9% SLA</div>
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
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
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
              {step === "login" && "Access your WhatsApp workspace and AI voice agents"}
              {step === "forgot" && "Enter your account email to receive an instant reset code"}
              {step === "verify" && "Enter the 6-digit verification code sent to your email"}
              {step === "reset" && "Choose a strong password with at least 8 characters"}
            </p>
          </div>

          {/* Clean Light Card */}
          <Card className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden">
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
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
                              <Input
                                placeholder="Enter your username"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 focus-visible:bg-white transition-all"
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
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 pr-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 focus-visible:bg-white transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
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
                className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
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

