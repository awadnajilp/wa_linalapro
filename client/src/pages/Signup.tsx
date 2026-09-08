/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AppSettings } from "@/types/types";

const Signup: React.FC = () => {
  const [location] = useLocation();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const emailFromUrl = searchParams.get("email");

    if (emailFromUrl) {
      const decodedEmail = decodeURIComponent(emailFromUrl);
      setFormData((prev) => ({
        ...prev,
        email: decodedEmail,
      }));
    }
  }, [location]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.agreeToTerms)
      newErrors.agreeToTerms = "You must agree to the Terms & Privacy Policy";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await apiRequest("POST", "/api/users/create", {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: "admin",
        avatar: "",
      });

      const data = await res.json();

      if (data.success) {
        setLocation(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        return;
      }

      setErrors({ general: data.message });
    } catch (error: any) {
      let message = "Signup failed. Please try again.";

      if (error?.message) {
        try {
          const jsonPart = error.message.replace(/^\d+:\s*/, "");
          const parsed = JSON.parse(jsonPart);
          message = parsed.message || error.message;
        } catch {
          message = error.message || "Signup failed.";
        }
      }

      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const featureChecklist = [
    "Multilingual AI Voice Autopilot in 40+ global languages",
    "1-Click WhatsApp in-chat storefront & instant checkout",
    "Visual flow builder with automated follow-up cadences",
    "Omnichannel shared team inbox & multi-agent CRM",
    "SME expense & receipt OCR balance sheet logging",
    "Official Meta WhatsApp Cloud API verified messaging",
  ];

  return (
    <div className="min-h-screen flex font-sans selection:bg-purple-600 selection:text-white">
      {/* LEFT PANE: 2026 Brand Showcase & Value Props (Dark) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-slate-800/80 bg-slate-950 text-slate-100">
        {/* Background Ambient Glows */}
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
            14-Day Free Trial • No Credit Card Required
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Turn WhatsApp into Your Most Profitable Channel.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Deploy autonomous AI agents, automate follow-up cadences, and close deals in-chat with 1-click storefronts.
          </p>

          {/* Checklist */}
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

          {/* Metric Bar */}
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

        {/* Bottom Security */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Official Meta Cloud API • Enterprise Security</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">SOC2 Type II</div>
        </div>
      </div>

      {/* RIGHT PANE: Clean Crisp Light Form (Two-Tone) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative bg-slate-50/80">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
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
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900 tracking-tight">LINALA</span>
                </div>
              )}
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Create Your Free Account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Get started with full platform access in under 2 minutes.
            </p>
          </div>

          {/* Form Card */}
          <Card className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {errors.general && (
                <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First & Last Name Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">First Name</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full pl-10 pr-3 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-[11px] text-rose-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Last Name</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full pl-10 pr-3 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-[11px] text-rose-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      className="w-full pl-10 pr-3 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
                      required
                    />
                  </div>
                  {errors.username && (
                    <p className="text-[11px] text-rose-500">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@company.com"
                      className="w-full pl-10 pr-3 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-rose-500">{errors.email}</p>
                  )}
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 8 chars"
                        className="w-full pl-10 pr-9 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
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
                    {errors.password && (
                      <p className="text-[11px] text-rose-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-9 h-10 bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all"
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
                    {errors.confirmPassword && (
                      <p className="text-[11px] text-rose-500">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="text-purple-600 hover:text-purple-700 font-semibold">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy-policy" className="text-purple-600 hover:text-purple-700 font-semibold">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.agreeToTerms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Start 14-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center text-xs text-slate-500">
                Already have a workspace?{" "}
                <Link
                  href="/login"
                  className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;

