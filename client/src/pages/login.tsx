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
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* LEFT PANE: 2026 Interactive Hero & Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-900">
        {/* Background Ambient Glow Circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Top Header / Logo */}
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

        {/* Center Copy & Interactive Mockup */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Enterprise Platform
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Autonomous WhatsApp Commerce & AI Agents.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Manage conversations, close deals in-chat, and automate multilingual voice follow-ups on the official WhatsApp Cloud API.
          </p>

          {/* Feature List */}
          <div className="space-y-4 mb-8">
            {liveHighlights.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:bg-slate-900/90"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
            <div>
              <div className="text-lg font-bold text-white">40+</div>
              <div className="text-[11px] text-slate-400 font-medium">Global Dialects</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">0.4s</div>
              <div className="text-[11px] text-slate-400 font-medium">Voice AI Latency</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">3.8x</div>
              <div className="text-[11px] text-slate-400 font-medium">Conversion Lift</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Official Meta Cloud API • SOC2 Type II Certified</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">99.9% Uptime SLA</div>
        </div>
      </div>

      {/* RIGHT PANE: Modern Auth Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative bg-slate-900/50">
        {/* Subtle mobile ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-10 object-contain brightness-0 invert"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">LINALA</span>
                </div>
              )}
            </Link>
          </div>

          {/* Form Header */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {step === "login" && "Sign In to Linala"}
              {step === "forgot" && "Reset Your Password"}
              {step === "verify" && "Verify Security Code"}
              {step === "reset" && "Create New Password"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {step === "login" && "Enter your workspace credentials to access your dashboard"}
              {step === "forgot" && "Enter your account email to receive an instant reset code"}
              {step === "verify" && "Enter the 6-digit verification code sent to your email"}
              {step === "reset" && "Choose a strong password with at least 8 characters"}
            </p>
          </div>

          {/* Modern Card Frame */}
          <Card className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-3xl backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {error && (
                <Alert className="mb-5 bg-rose-950/60 border border-rose-800/80 text-rose-200 rounded-2xl p-3.5">
                  <AlertDescription className="text-xs font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
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
                          <FormLabel className="text-xs font-semibold text-slate-300">
                            Username or Email
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-400" />
                              <Input
                                placeholder="Enter your username"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 h-11 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-purple-500 focus-visible:border-purple-500 transition-all"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs text-rose-400" />
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
                            <FormLabel className="text-xs font-semibold text-slate-300">
                              Password
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setStep("forgot");
                              }}
                              className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-400" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...field}
                                disabled={loginMutation.isPending}
                                className="pl-10 pr-10 h-11 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-400 rounded-xl text-sm focus-visible:ring-purple-500 focus-visible:border-purple-500 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs text-rose-400" />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
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
            <div className="mt-6 text-center text-xs text-slate-400">
              Don't have a Linala workspace yet?{" "}
              <Link
                href="/signup"
                className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
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

