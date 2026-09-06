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
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const DeepDiveShowcases: React.FC = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <section className="py-24 lg:py-32 bg-slate-900 text-white relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Conversion Deep Dives
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            How High-Growth Brands Turn WhatsApp into Their #1 Revenue Channel
          </h2>
        </div>

        {/* Deep Dive 1: WhatsApp E-Commerce & Instant Checkout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-28">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" /> Pillar 01: Instant Commerce
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              From First "Hi" to Paid Order in Under 60 Seconds
            </h3>
            <p className="text-slate-300 text-base leading-relaxed">
              Eliminate clunky external checkout links. Customers browse single or multi-item catalogs right inside WhatsApp, select sizes and variants, and pay instantly via UPI QR, Razorpay, Stripe, or Cash on Delivery.
            </p>

            <div className="space-y-3 pt-2">
              {[
                "Instant catalog cards with stock indicators and pricing",
                "Automated customer address collection with phone autofill",
                "Direct payment gateway integration without opening external browsers",
                "Automatic order confirmation, PDF receipt, and WhatsApp dispatch tracking",
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-slate-200">{point}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
              >
                <span>Launch WhatsApp Store</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual Simulation Card */}
          <div className="lg:col-span-6 bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Customer: Ananya S.</span>
                <span className="text-emerald-400 font-mono">Cart Value: ₹2,499</span>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400 font-bold">
                    🛍️
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Silk Embroidered Kurti Set</div>
                    <div className="text-xs text-slate-400">Size: M · Color: Emerald Teal</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <span className="text-emerald-200">✓ UPI Instant Pay Confirmed</span>
                  <span className="font-mono text-emerald-400 font-bold">₹2,499.00</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>⚡ WhatsApp PDF Tax Invoice Sent</span>
                <span className="text-slate-200 font-mono">INV-8492.pdf</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Dive 2: Multilingual Voice Note AI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Visual Simulation Card */}
          <div className="lg:col-span-6 order-2 lg:order-1 bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Bot className="w-4 h-4" /> AI Assistant Dialect Switcher
                </span>
                <span className="text-slate-400 font-mono">Multi-Voice Engine</span>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs text-slate-400">Supported Regional & Global Languages:</div>
                <div className="flex flex-wrap gap-2">
                  {["Malayalam (മലയാളം)", "Manglish", "Hindi / Hinglish", "Arabic (العربية)", "English"].map((lang, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700">
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center gap-3">
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0"
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-emerald-300">Live Malayalam Voice Note Sample</div>
                    <div className="text-[10px] text-slate-400">Natural tone synthesis with zero robotic latency</div>
                  </div>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-teal-500/20 text-teal-400 text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" /> Pillar 02: Conversational Voice AI
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Human-Like Voice Notes That Talk to Customers in Their Native Dialect
            </h3>
            <p className="text-slate-300 text-base leading-relaxed">
              Don't force customers to read lengthy paragraphs. Our AI listens to voice messages, understands mixed languages (like Manglish or Hinglish), and replies with warm, natural voice notes that build immense customer trust.
            </p>

            <div className="space-y-3 pt-2">
              {[
                "Real-time audio synthesis powered by Sarvam AI & Groq",
                "Deep contextual memory that remembers customer order history",
                "Automatic product card attachments when items are discussed",
                "Zero hallucination guarantee with strict store knowledge grounding",
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-slate-200">{point}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all"
              >
                <span>Request Custom AI Demo</span>
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
