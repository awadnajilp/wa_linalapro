import React from "react";
import { Link } from "wouter";
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Zap, Headphones } from "lucide-react";

export const CTA: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-purple-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Start Converting Today
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
          Ready to Turn WhatsApp into Your Most Profitable Sales Channel?
        </h2>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Join thousands of high-performing brands using multilingual AI voice notes, instant store checkout, and automated marketing flows.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base shadow-xl shadow-purple-600/30 hover:shadow-2xl hover:shadow-purple-600/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-base border border-white/20 hover:border-white/30 backdrop-blur-sm transition-all duration-200"
          >
            <Headphones className="w-4 h-4 text-purple-400" />
            <span>Talk to a Sales Specialist</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs text-slate-300">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>5-minute zero-code setup</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Meta Official API Partner</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Headphones className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>24/7 Dedicated Support</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CTA;
