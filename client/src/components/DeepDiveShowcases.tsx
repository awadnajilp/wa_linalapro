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
import { useTranslation } from "@/lib/i18n";

export const DeepDiveShowcases: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <section className={`py-20 lg:py-28 bg-[#0a0614] text-white relative overflow-hidden ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Refined subtle structural grid lines & brand ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#581c8712_1px,transparent_1px),linear-gradient(to_bottom,#581c8712_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {isAr ? "عائد استثماري فوري" : "Revenue Impact"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {isAr ? "حوّل واتساب إلى أقوى قنوات مبيعاتك" : "Turn WhatsApp into Your Top Sales Channel"}
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300">
            {isAr
              ? "أتمتة كاملة للطلبات وخدمة العملاء مع نظام لينالا لواتساب CRM."
              : "Automate orders and support with Linala WhatsApp CRM."}
          </p>
        </div>

        {/* Deep Dive 1: WhatsApp E-Commerce & Instant Checkout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center mb-24">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" /> {isAr ? "تجارة فورية بضغطة واحدة" : "Instant Commerce"}
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {isAr ? "من أول رسالة إلى طلب مدفوع في 60 ثانية" : "From First \"Hi\" to Paid Order in 60 Seconds"}
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {isAr
                ? "يتصفح عملاؤك الكتالوج داخل واتساب مباشرة، يحددون المقاسات والخيارات، ويدفعون فورياً عبر مدى، Apple Pay، أو الدفع عند الاستلام."
                : "Customers browse catalogs inside WhatsApp, select options, and pay instantly via UPI QR, Razorpay, Stripe, or Cash on Delivery."}
            </p>

            <div className="space-y-2.5 pt-1">
              {(isAr
                ? [
                    "بطاقات كتالوج تفاعلية مع عرض فوري للأسعار والمخزون",
                    "دفع سريع بضغطة واحدة مع جمع تلقائي لعنوان الشحن",
                    "تأكيد فوري للدفع وتحديثات مؤتمتة لتتبع الشحنة",
                  ]
                : [
                    "Interactive catalog cards with live stock & pricing",
                    "1-click checkout with automatic shipping address collection",
                    "Instant payment confirmation & automated tracking alerts",
                  ]
              ).map((point, idx) => (
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/25"
              >
                <span>{isAr ? "ابدأ متجر واتساب الآن" : "Launch WhatsApp Store"}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>

          {/* Visual Simulation Card */}
          <div className="lg:col-span-6 bg-[#110b22] p-6 rounded-3xl border border-purple-900/50 shadow-2xl relative">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/40 text-xs">
                <span className="text-slate-400">{isAr ? "العميل: سارة العتيبي" : "Customer: Sarah A."}</span>
                <span className="text-purple-400 font-mono font-semibold">{isAr ? "السلة: 249 ر.س" : "Cart: 249 SAR"}</span>
              </div>

              <div className="bg-[#181030] p-4 rounded-2xl border border-purple-800/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-base">
                    🛍️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{isAr ? "طقم كتان فاخر (طبيعي)" : "Silk Linen Outfit (Natural)"}</div>
                    <div className="text-[11px] text-purple-200/70">{isAr ? "المقاس: M • كحلي" : "Size: M • Navy Blue"}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-between text-xs">
                  <span className="text-purple-200 font-medium">
                    {isAr ? "رابط الدفع الفوري (Apple Pay / Mada)" : "Instant Checkout (Apple Pay / Mada)"}
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">{isAr ? "تم الدفع ✓" : "Paid ✓"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0f091c] border border-purple-900/40 flex items-center justify-between text-xs text-purple-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {isAr ? "تم تجهيز الشحنة وإرسالها" : "Order Dispatched"}
                </span>
                <span className="font-mono text-[11px] text-slate-400">Tracking #LN-9902</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Dive 2: Multilingual Voice Note AI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1 bg-[#110b22] p-6 rounded-3xl border border-purple-900/50 shadow-2xl">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/40 text-xs">
                <span className="text-slate-400">{isAr ? "استفسار صوتي من العميل" : "Multilingual Voice Query"}</span>
                <span className="text-purple-400 font-mono text-[11px]">0.4s Voice SLA</span>
              </div>

              <div className="bg-[#181030] p-4 rounded-2xl border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" /> {isAr ? "رسالة صوتية مولدة بالذكاء الاصطناعي" : "AI Synthesized Voice Note"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md shadow-purple-600/30"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 h-8 px-2.5 bg-[#0e081c] rounded-xl border border-purple-950/60">
                  {[25, 60, 30, 85, 95, 45, 75, 90, 40, 80, 100, 65, 35, 70, 50, 85, 30, 15].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        isPlayingAudio ? "bg-purple-400" : "bg-purple-950"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0f091c] border border-purple-900/40 flex items-center justify-between text-xs text-slate-400">
                <span>{isAr ? "دعم اللهجات الإقليمية:" : "Global Dialect Support:"}</span>
                <span className="text-purple-300 font-semibold">{isAr ? "اللهجة السعودية وأكثر من 40 لغة" : "40+ Dialects & Languages"}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <Bot className="w-3.5 h-3.5 text-purple-400" /> {isAr ? "ذكاء صوتي فائق" : "Voice Intelligence"}
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {isAr ? "ذكاء اصطناعي صوتي يحاكي الصوت البشري بدقة" : "Human-Like Multilingual Voice AI"}
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {isAr
                ? "استمع لرسائل العملاء الصوتية بمختلف اللهجات واللغات وأرسل ردوداً صوتية طبيعية وموثوقة تزيد من ثقة العميل ومعدل إتمام الشراء."
                : "Understand incoming audio across 40+ global languages and reply with natural voice notes that build instant customer trust."}
            </p>

            <div className="space-y-2.5 pt-1">
              {(isAr
                ? [
                    "تحويل فوري للصوت إلى نص بدقة 99.4% للهجات واللغات المتعددة",
                    "توليد صوتي واقعي وطبيعي بزمن استجابة لا يتجاوز أجزاء من الثانية",
                    "تسجيل المحادثة وتفاصيل الطلب في نظام الـ CRM آلياً",
                  ]
                : [
                    "Instant speech-to-text with 99.4% multilingual dialect accuracy",
                    "Natural voice synthesis with zero robotic latency",
                    "Automatic CRM logging and order attribution",
                  ]
              ).map((point, idx) => (
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/25"
              >
                <span>{isAr ? "جرّب المساعد الصوتي الآن" : "Experience Voice AI"}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default DeepDiveShowcases;
