import React, { useState } from "react";
import {
  X,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  TrendingUp,
  Sparkles,
  Phone,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

interface SignupPopupProps {
  onClose: () => void;
}

export const SignupPopup: React.FC<SignupPopupProps> = ({ onClose }) => {
  const [inputMode, setInputMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "Linala";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone && !email) return;

    setIsSubmitting(true);
    try {
      const payload = {
        phone: inputMode === "phone" ? phone : undefined,
        email: inputMode === "email" ? email : undefined,
        source: "website_popup",
      };

      await fetch("/api/public/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (err) {
      console.error("Lead submission error:", err);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-purple-100">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-9 h-9 text-purple-600" />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome to {appName}!
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {inputMode === "phone"
              ? "📱 We just sent an instant welcome message to your WhatsApp with your free trial access and demo."
              : "✉️ Check your inbox for instructions to activate your free account."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 text-slate-500 hover:text-slate-900"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Side: Brand Value */}
          <div className="md:col-span-5 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 p-7 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">Linala</span>
              </div>

              <h2 className="text-xl font-bold leading-snug mb-3">
                Turn WhatsApp into Your #1 Sales Engine
              </h2>

              <p className="text-xs text-purple-200 leading-relaxed mb-6">
                Join 500+ businesses closing more orders with AI voice notes and instant checkout.
              </p>

              <div className="space-y-3 text-xs text-purple-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                  <span>5-minute zero-code launch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                  <span>Multilingual Voice AI included</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                  <span>3.8x higher conversion velocity</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-purple-600/50 text-[11px] text-purple-300">
              ✓ No credit card required
            </div>
          </div>

          {/* Right Side: Lead Input Form */}
          <div className="md:col-span-7 p-7 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                Start Your 14-Day Free Trial
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Experience instant WhatsApp store catalogs and AI responses.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {inputMode === "phone" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-purple-600" /> WhatsApp Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-slate-900"
                      required
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Include country code (e.g. +91, +971, +44, +92)
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-purple-600" /> Work Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-slate-900"
                      required
                      autoFocus
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>{inputMode === "phone" ? "Get Started on WhatsApp" : "Create Free Account"}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switch Toggle */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setInputMode(inputMode === "phone" ? "email" : "phone")}
                  className="text-xs text-purple-600 hover:text-purple-800 font-semibold hover:underline"
                >
                  {inputMode === "phone" ? "Or sign up with Work Email instead →" : "Or sign up with WhatsApp Number instead →"}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Instant setup in 5 min</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPopup;
