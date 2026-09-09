import React from "react";
import { Link } from "wouter";
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Zap, Headphones } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const CTA: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";

  return (
    <section className={`py-20 lg:py-28 bg-[#090e1a] text-white relative overflow-hidden ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Subtle structural grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          {isAr ? "ابدأ اليوم مع لينالا" : "Get Started with Linala"}
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto text-white">
          {isAr ? (
            <>
              ضاعف مبيعاتك وأرباحك مع{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">
                Linala WhatsApp CRM
              </span>
            </>
          ) : (
            <>
              Scale Your Revenue with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">
                Linala WhatsApp CRM
              </span>
            </>
          )}
        </h2>

        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          {isAr
            ? "انضم إلى أكثر من 500+ علامة تجارية تحقق أعلى نسب إغلاق للمبيعات مع الرسائل الصوتية الذكية، متاجر واتساب الفورية، وسلاسل المتابعة التلقائية."
            : "Join 500+ businesses closing more deals with AI voice notes, native WhatsApp stores, and automated sales cadences."}
        </p>

        {/* Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>{isAr ? "ابدأ تجربتك المجانية لمدة 14 يوماً" : "Start 14-Day Free Trial"}</span>
            <ArrowRight className={`w-4 h-4 text-white ${isAr ? "rotate-180" : ""}`} />
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold text-sm border border-slate-700 transition-all duration-200"
          >
            <Headphones className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "احجز عرضاً حياً وتجربة مباشرة" : "Book Live Demo"}</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-7 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "لا يلزم بطاقة ائتمانية للتسجيل" : "No credit card required"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "إعداد سريع في 5 دقائق بدون أي كود" : "5-minute zero-code setup"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "واجهة Meta السحابية المعتمدة رسمياً" : "Official Meta Cloud API"}</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CTA;
