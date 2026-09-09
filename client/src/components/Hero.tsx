import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Bot,
  ShoppingBag,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Play,
  Pause,
  TrendingUp,
  CreditCard,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const Hero: React.FC = () => {
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const [wordIdx, setWordIdx] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);
  const [activeTab, setActiveTab] = useState<"chat" | "checkout" | "analytics">("chat");

  const TYPING_HIGHLIGHTS = isAr
    ? [
        "متجر وكتالوج واتساب والدفع المباشر",
        "الردود الصوتية بالذكاء الاصطناعي واللهجات المحلية",
        "أتمتة التدفقات ومسارات العمل المرئية",
        "متابعات التذكير والسلاسل التلقائية",
        "دفتر المصروفات والمالية للشركات",
        "صندوق وارد الفريق المشترك وإدارة علاقات العملاء (CRM)",
      ]
    : [
        "WhatsApp E-Commerce & Checkout",
        "Multilingual Voice Note AI",
        "Visual Workflow Automations",
        "Automated Cadence Follow-ups",
        "SME Expense & Financial Ledger",
        "Unified Multi-Agent CRM Inbox",
      ];

  // Typewriter effect
  useEffect(() => {
    const current = TYPING_HIGHLIGHTS[wordIdx] || TYPING_HIGHLIGHTS[0];
    let timer: NodeJS.Timeout;

    if (!isDeleting && displayText === current) {
      timer = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setWordIdx((prev) => (prev + 1) % TYPING_HIGHLIGHTS.length);
    } else {
      const speed = isDeleting ? 30 : 65;
      timer = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? current.substring(0, displayText.length - 1)
            : current.substring(0, displayText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, wordIdx, isAr]);

  // Simulated audio progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress((prev) => (prev >= 100 ? 0 : prev + 4));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-gradient-to-b from-purple-50/50 via-white to-slate-50/50">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-tr from-purple-200/25 via-indigo-100/30 to-purple-300/15 rounded-full blur-3xl opacity-70 animate-pulse duration-10000" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#9333EA_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-[0.07]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <Link
            href="/#features"
            className="group inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 shadow-xs hover:border-purple-300 hover:bg-purple-100/60 transition-all duration-300"
          >
            <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-ping" />
            <span className="text-xs font-semibold text-purple-900 tracking-wide">
              {isAr ? "جديد: الردود الصوتية بالذكاء الاصطناعي ومتجر واتساب الفوري" : "NEW: AI Voice Note Replies & Instant WhatsApp Store"}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-purple-700 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
              {isAr ? "اكتشف الجديد" : "See what's new"} <ChevronRight className="w-3.5 h-3.5 ml-0.5 rtl:rotate-180" />
            </span>
          </Link>
        </div>

        {/* Hero Main Copy */}
        <div className="text-center max-w-4xl mx-auto mb-10 lg:mb-14">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            {isAr ? "انطلق ونمّ أسرع مع " : "Grow Faster with "}{" "}
            <span className="text-purple-600">{isAr ? "نظام لينالا لواتساب CRM" : "Linala WhatsApp CRM"}</span>{" "}
            {isAr ? "لـ " : "for "}
            <span className="block mt-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent">
              {displayText}
              <span className="inline-block w-[3px] h-[0.85em] bg-purple-600 ml-1.5 rtl:mr-1.5 align-middle animate-pulse" />
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            {isAr
              ? "المنصة الشاملة لأتمتة واتساب وإدارة علاقات العملاء (CRM). أطلق وكلاء ذكاء اصطناعي مستقلين، أنشئ متاجر واتساب مع دفع فوري بنقرة واحدة، تأهيل العملاء المحتملين ومضاعفة المبيعات على مدار الساعة."
              : "The all-in-one Linala WhatsApp CRM. Deploy autonomous AI agents, launch WhatsApp stores with 1-click checkout, qualify leads, and automate revenue 24/7."}
          </p>

          {/* Dual CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/35 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>{isAr ? "ابدأ تجربة مجانية لمدة 14 يوماً" : "Start 14-Day Free Trial"}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </Link>

            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "احجز عرضاً توضيحياً مباشراً" : "Book Live Demo"}</span>
            </Link>
          </div>

          {/* Trust Value Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "بدون بطاقة ائتمانية" : "No credit card required"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "إعداد خلال 5 دقائق بدون برمجة" : "5-minute zero-code setup"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "بوابة Meta Cloud API الرسمية" : "Official Meta Cloud API"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "ضمان تشغيل بنسبة 99.9%" : "99.9% Uptime SLA"}</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive App & WhatsApp Showcase (Brevo/SaaS Style) */}
        <div className="relative max-w-6xl mx-auto">
          {/* Outer glow frame */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-600/20 rounded-3xl blur-xl opacity-80" />

          {/* Main Dashboard Preview Container */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 overflow-hidden">
            
            {/* Top Mockup Header Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-semibold text-slate-400 font-mono hidden sm:inline">
                  wa.linalapro.com / workspace / live-hub
                </span>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "chat"
                      ? "bg-white text-purple-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isAr ? "💬 محادثة صوتية ذكية" : "💬 AI Voice Chat"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("checkout")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "checkout"
                      ? "bg-white text-purple-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isAr ? "🛒 متجر واتساب فوري" : "🛒 Instant Ecom"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("analytics")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "analytics"
                      ? "bg-white text-purple-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isAr ? "📊 تحليلات حية" : "📊 Live Insights"}
                </button>
              </div>
            </div>

            {/* Mockup Body: Split Layout */}
            <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Side: Interactive WhatsApp Interface */}
              <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-3 sm:p-4 text-slate-100 shadow-xl border border-slate-800">
                {/* WhatsApp Chat Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm shadow">
                        L
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-white">{isAr ? "متجر زنتا الفاخر" : "Zenta Premium Store"}</span>
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-[11px] text-purple-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                        {isAr ? "وكيل ذكاء اصطناعي نشط (40+ لغة)" : "AI Agent Active (40+ Global Languages)"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono bg-slate-800/80 px-2 py-1 rounded">
                    {isAr ? "واجهة Meta الرسمية" : "Official API"}
                  </span>
                </div>

                {/* WhatsApp Messages Stream */}
                <div className="space-y-3 font-sans text-xs">
                  {/* Incoming Customer Message */}
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-xs px-3.5 py-2.5 max-w-[85%] shadow-sm">
                      <p className="leading-relaxed">
                        {isAr
                          ? "مرحباً! هل متوفر عندكم قميص الكتان الفاخر باللون الكحلي مقاس L؟ وكم سعره؟ وهل أقدر أطلب وأدفع هنا مباشرة؟"
                          : "Hello! Do you have the Signature Linen Shirt in Blue (Size L)? What's the price, and can I checkout directly?"}
                      </p>
                      <span className="text-[10px] text-slate-400 block text-right mt-1">10:42 AM</span>
                    </div>
                  </div>

                  {/* AI Autopilot Voice Note Reply */}
                  <div className="flex justify-end">
                    <div className="bg-purple-950/70 border border-purple-500/30 text-white rounded-2xl rounded-tr-xs p-3 max-w-[90%] shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-purple-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-300" /> {isAr ? "ملاحظة صوتية بالذكاء الاصطناعي (لهجة محلية)" : "AI Voice Note (Multilingual)"}
                        </span>
                        <span className="text-[10px] text-purple-200">0:14</span>
                      </div>

                      {/* Interactive Audio Player Pill */}
                      <div className="flex items-center gap-2.5 bg-slate-900/90 p-2 rounded-xl border border-purple-600/30">
                        <button
                          type="button"
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
                          title={isPlayingAudio ? "Pause Voice Note" : "Play Voice Note"}
                        >
                          {isPlayingAudio ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                        </button>
                        
                        {/* Audio Waveform Bars */}
                        <div className="flex-1 flex items-center gap-0.5 h-6">
                          {[40, 65, 30, 85, 95, 45, 75, 100, 60, 80, 50, 90, 70, 40, 85, 60, 30, 75].map((h, i) => {
                            const isBarActive = (i / 18) * 100 <= audioProgress;
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-150 ${
                                  isBarActive ? "bg-purple-400" : "bg-purple-900/60"
                                }`}
                                style={{ height: `${h}%` }}
                              />
                            );
                          })}
                        </div>
                        <Volume2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      </div>

                      <p className="text-[11px] text-purple-100 mt-2 leading-relaxed">
                        {isAr
                          ? "\"أهلاً بك! نعم متوفر قميص الكتان الكحلي مقاس L وسعره 185 ر.س. تفضل بالضغط أدناه لإتمام طلبك والدفع الفوري الآمن.\""
                          : "\"Yes! The Blue Linen Shirt in Size L is in stock for $49.00. Tap below to complete your instant checkout.\""}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Interactive Product Card */}
                  <div className="flex justify-end">
                    <div className="bg-slate-800 rounded-2xl rounded-tr-xs p-3 max-w-[88%] border border-slate-700/80 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-7 h-7 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {isAr ? "قميص كتان فاخر (كحلي)" : "Signature Linen Shirt (Blue)"}
                          </div>
                          <div className="text-purple-400 font-bold text-sm mt-0.5">
                            {isAr ? "185 ر.س" : "$49.00"} <span className="text-[10px] text-slate-400 line-through">{isAr ? "299 ر.س" : "$79.00"}</span>
                          </div>
                          <span className="text-[10px] text-emerald-300 font-medium">
                            {isAr ? "✓ متوفر في المخزون (توصيل سريع)" : "✓ In Stock (Express Delivery)"}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" /> {isAr ? "اشترِ الآن" : "Buy Now"}
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          🏬 {isAr ? "تصفح الكتالوج" : "View Catalog"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Real-time Live Automation & KPI Canvas */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Floating Metric 1: Conversion Rate & Speed */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {isAr ? "سرعة ومعدل التحويل عبر واتساب" : "WhatsApp Conversion Velocity"}
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        3.8x <span className="text-xs font-semibold text-purple-600">{isAr ? "+280% مقارنة بالبريد" : "+280% vs Email"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                      {isAr ? "⚡ سرعة استجابة 1.8 ثانية" : "⚡ 1.8s AI Latency"}
                    </span>
                  </div>
                </div>

                {/* Floating Metric 2: Live Checkout Alert */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {isAr ? "تم تأكيد عملية دفع فورية عبر واتساب" : "Instant WhatsApp Payment Confirmed"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {isAr ? "العميل: محمد ع. · دفع فوري مدى / أبل باي · طلب #9482" : "Customer: Alex M. · Instant 1-Click Pay · Order #9482"}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                      {isAr ? "+185 ر.س" : "+$49.00"}
                    </span>
                  </div>

                  {/* Flow Progress Step */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-purple-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                      {isAr ? "تم إرسال الفاتورة عبر واتساب" : "Receipt Sent on WhatsApp"}
                    </span>
                    <span>{isAr ? "تم إرسال رابط التتبع المباشر" : "Tracking URL Dispatched"}</span>
                  </div>
                </div>

                {/* Floating Metric 3: Automated Cadence & Expense Tracking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-900">{isAr ? "سلاسل المتابعة التلقائية" : "Drip Followup Cadence"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {isAr
                        ? "تم استرداد 42 سلة متروكة اليوم تلقائياً عبر كوبونات خصم ديناميكية."
                        : "Auto recovered 42 abandoned carts today with personalized discount coupons."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">{isAr ? "ماسح المصروفات للشركات" : "SME Expense Scanner"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {isAr
                        ? "صوّر الفاتورة بواتساب ← يقوم الذكاء الاصطناعي بقيدها في الدفاتر المالية خلال ثانيتين."
                        : "Snap bill photos on WhatsApp → AI auto logs into category ledger in 2s."}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Global Logo Cloud & Social Proof */}
        <div className="mt-16 sm:mt-20 pt-10 border-t border-slate-200/70 text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-7">
            {isAr
              ? "موثوق من أكثر من 5,000 علامة تجارية ومؤسسة رائدة في المملكة والخليج والعالم"
              : "Trusted by 5,000+ fast-growing brands, D2C merchants, and global enterprises"}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            {["Shopify", "WooCommerce", "Razorpay", "Stripe", "Zapier", "Meta Cloud API", "HubSpot", "Salesforce"].map(
              (brand, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200/80 text-slate-700 font-semibold text-xs sm:text-sm tracking-tight shadow-2xs hover:border-purple-300 hover:text-purple-700 hover:shadow-xs transition-all"
                >
                  {brand}
                </span>
              )
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;
