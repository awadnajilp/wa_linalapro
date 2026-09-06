import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Bot,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const DeepDiveShowcases: React.FC = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <section className="py-20 lg:py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Revenue Impact
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Turn WhatsApp into Your Top Sales Channel
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-400">
            Automate orders and support with Linala WhatsApp CRM.
          </p>
        </div>

        {/* Deep Dive 1: WhatsApp E-Commerce & Instant Checkout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-20">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" /> Instant Commerce
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              From First "Hi" to Paid Order in 60 Seconds
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Customers browse catalogs inside WhatsApp, select options, and pay instantly via UPI QR, Razorpay, Stripe, or Cash on Delivery.
            </p>

            <div className="space-y-2 pt-1">
              {[
                "Interactive catalog cards with live stock & pricing",
                "1-click checkout with automatic shipping address collection",
                "Instant payment confirmation & automated tracking alerts",
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200">{point}</span>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20"
              >
                <span>Launch WhatsApp Store</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual Simulation Card */}
          <div className="lg:col-span-6 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl relative">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Customer: Ananya S.</span>
                <span className="text-purple-400 font-mono font-semibold">Cart: $49.00</span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950 flex items-center justify-center text-purple-400 font-bold text-sm">
                    🛍️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Silk Linen Outfit</div>
                    <div className="text-[11px] text-slate-400">Size: M • Navy Blue</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-between text-xs">
                  <span className="text-purple-200 font-medium">Payment Link (UPI / Card)</span>
                  <span className="text-emerald-400 font-bold font-mono">Paid ✓</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Order Dispatched
                </span>
                <span className="font-mono text-[11px]">Tracking #LN-9902</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Dive 2: Multilingual Voice Note AI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Audio Query (Malayalam)</span>
                <span className="text-indigo-400 font-mono text-[11px]">Sub-500ms AI</span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> AI Synthesized Voice Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform active:scale-95"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 h-7 px-2 bg-slate-950 rounded-lg">
                  {[25, 60, 30, 85, 95, 45, 75, 90, 40, 80, 100, 65, 35, 70, 50, 85, 30, 15].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        isPlayingAudio ? "bg-purple-400" : "bg-slate-700"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Dialect Support:</span>
                <span className="text-purple-300 font-semibold">Malayalam, Arabic, Hindi, English</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" /> Voice Intelligence
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Human-Like Multilingual Voice AI
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Understand incoming audio in regional dialects and reply with natural voice notes that build instant customer trust.
            </p>

            <div className="space-y-2 pt-1">
              {[
                "Instant speech-to-text with 99.4% regional dialect accuracy",
                "Natural voice synthesis with zero robotic latency",
                "Automatic CRM logging and order attribution",
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200">{point}</span>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20"
              >
                <span>Experience Voice AI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default DeepDiveShowcases;
