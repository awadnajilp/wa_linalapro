import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShoppingBag,
  Workflow,
  Calendar,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Mic,
  CreditCard,
  Volume2,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface AgentSlide {
  id: string;
  agentName: string;
  shortLabel: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  bullets: string[];
  ctaText: string;
  ctaLink: string;
  preview: React.ReactNode;
}

export const Features: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [activeIdx, setActiveIdx] = useState(0);

  const AGENT_SLIDES: AgentSlide[] = [
    {
      id: "commerce",
      agentName: isAr ? "وكيل التجارة والطلبات" : "Commerce Agent",
      shortLabel: isAr ? "متجر واتساب بضغطة واحدة" : "1-Click WhatsApp Store",
      badge: isAr ? "تجارة واتساب المتكاملة" : "WhatsApp Commerce",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      icon: ShoppingBag,
      title: isAr ? "متجر تفاعلي ودفع فوري داخل واتساب" : "1-Click WhatsApp Store",
      description: isAr
        ? "أرسل كتالوجات منتجات تفاعلية واستقبل المدفوعات فورياً داخل محادثة واتساب بدون أي تحويلات خارجية معقدة."
        : "Send interactive product catalogs and collect instant payments inside WhatsApp with zero redirect friction.",
      bullets: isAr
        ? [
            "كتالوجات منتجات متعددة وخيارات المقاس والألوان",
            "دفع فوري عبر مدى، Apple Pay، والبطاقات",
            "استرداد تلقائي ومؤتمت للسلات المتروكة",
          ]
        : [
            "Native multi-item catalogs & variant selection",
            "Instant checkout with Razorpay, Stripe & UPI",
            "Automated abandoned cart recovery",
          ],
      ctaText: isAr ? "استكشف متجر واتساب" : "Explore WhatsApp Store",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner font-sans border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-purple-400 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> {isAr ? "طلب رقم #LN-8924" : "Order #LN-8924"}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "تم الدفع • مدى / Apple Pay" : "Paid • Instant Checkout"}
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 flex items-center gap-3 border border-slate-700/60">
            <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center text-purple-300 font-bold text-xs flex-shrink-0">
              PRO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white">{isAr ? "قميص كتان فاخر" : "Premium Linen Shirt"}</p>
              <p className="text-[11px] text-slate-400">{isAr ? "المقاس: L • كحلي" : "Size: L • Navy Blue"}</p>
              <p className="text-xs font-semibold text-purple-300 mt-0.5">{isAr ? "185 ر.س" : "$49.00"}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold text-center transition-colors">
              {isAr ? "شراء فوري بضغطة واحدة" : "1-Click Buy Now"}
            </button>
            <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
              {isAr ? "التفاصيل" : "View Details"}
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "voice",
      agentName: isAr ? "وكيل الذكاء الاصطناعي الصوتي" : "Voice AI Agent",
      shortLabel: isAr ? "مساعد صوتي ذكي متعدد اللغات" : "Multilingual Voice AI",
      badge: isAr ? "ذكاء اصطناعي صوتي متطور" : "Multilingual Voice AI",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: Mic,
      title: isAr ? "رسائل صوتية واقعية باللهجة السعودية" : "Human-Like Voice Notes",
      description: isAr
        ? "فهم دقيق للرسائل الصوتية بأكثر من 40 لغة وباللهجات الخليجية والسعودية مع ردود صوتية طبيعية فائقة السرعة."
        : "Understand voice notes in 40+ global languages and reply with ultra-fast, natural synthesized audio.",
      bullets: isAr
        ? [
            "دعم اللهجات السعودية والخليجية وأكثر من 40 لغة عالمية",
            "تحويل فوري للصوت إلى نص وفهم سياق ومشاعر العميل",
            "استجابة فائقة السرعة (0.4 ثانية) بنبرة بشرية طبيعية وموثوقة",
          ]
        : [
            "40+ global languages & regional dialects worldwide",
            "Instant audio transcription & sentiment context",
            "0.4s response time with zero robotic tone",
          ],
      ctaText: isAr ? "جرّب الذكاء الاصطناعي الصوتي" : "Test Voice AI",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> {isAr ? "رد صوتي بالذكاء الاصطناعي" : "Voice Note Reply"}
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "دعم اللهجات السعودية و40+ لغة" : "40+ Languages Supported"}
            </span>
          </div>

          <div className="bg-indigo-950/60 border border-indigo-800/40 rounded-xl p-3.5 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <span className="text-xs font-medium text-indigo-200">
                {isAr ? "مُولّد الصوت الذكي من لينالا" : "Linala Voice Synthesizer"}
              </span>
            </div>
            
            <div className="flex items-center gap-1 h-7 px-1">
              {[40, 65, 30, 90, 100, 75, 45, 80, 95, 60, 35, 70, 85, 40, 20].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-indigo-400/80 rounded-full"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-indigo-300/80 mt-1.5 font-mono">
              <span>0:18</span>
              <span>{isAr ? "صوت فائق النقاء وواقعي" : "128 kbps • High Quality"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "leads",
      agentName: isAr ? "وكيل تأهيل العملاء المحتملين" : "Lead CRM Agent",
      shortLabel: isAr ? "تأهيل وتصنيف العملاء" : "Lead Qualification",
      badge: isAr ? "تأهيل العملاء الذكي" : "Lead Qualification",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: Users,
      title: isAr ? "تقييم وتوجيه فوري للعملاء الجادين" : "Autonomous Lead Scoring",
      description: isAr
        ? "تأهيل العملاء الواردين على مدار الساعة، جمع متطلباتهم وتوجيه الصفقات المرتفعة لمسؤولي المبيعات فوراً."
        : "Qualify incoming prospects 24/7, capture custom attributes, and route high-intent buyers to top closers.",
      bullets: isAr
        ? [
            "نقاط نية الشراء بالذكاء الاصطناعي (0-100)",
            "استبيانات تأهيل مرنة وذكية لجمع المتطلبات",
            "توزيع تلقائي وصندوق وارد جماعي لمنع التضارب",
          ]
        : [
            "AI buyer intent score (0-100)",
            "Dynamic qualification questionnaires",
            "Auto-routing & collision-free team inbox",
          ],
      ctaText: isAr ? "أتمتة تدفق العملاء المحتملين" : "Automate Lead Flow",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> {isAr ? "عميل عالي الاهتمام (جاهز للإغلاق)" : "High-Intent Lead"}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "التقييم: 96 / 100" : "Score: 96 / 100"}
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 space-y-2 text-xs border border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "الميزانية المتوقعة:" : "Budget:"}</span>
              <span className="font-semibold text-emerald-300">{isAr ? "+18,000 ر.س / شهرياً" : "$5,000+ / mo"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "الجدول الزمني:" : "Timeline:"}</span>
              <span className="font-semibold text-white">{isAr ? "فوري (خلال 7 أيام)" : "Immediate (Next 7 Days)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "الإجراء التلقائي:" : "Action:"}</span>
              <span className="font-semibold text-purple-300">{isAr ? "تم التحويل لمسؤول كبار العملاء" : "Auto-assigned to Senior Rep"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "expense",
      agentName: isAr ? "وكيل المسح الضوئي والمصروفات" : "Expense OCR Agent",
      shortLabel: isAr ? "سجل فواتير ومصروفات الشركات" : "SME Receipt Ledger",
      badge: isAr ? "محاسبة وفواتير مبسطة" : "SME Accounting",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Receipt,
      title: isAr ? "قراءة الفواتير وتوثيق المصاريف آلياً" : "Receipt OCR & Ledger",
      description: isAr
        ? "التقط صور الفواتير الورقية عبر واتساب، ليقوم الذكاء الاصطناعي باستخراج اسم المورد، الضريبة والمجموع بدقة وتصديرها."
        : "Snap photos of receipts on WhatsApp. AI extracts vendor, tax, and totals into an instant exportable ledger.",
      bullets: isAr
        ? [
            "مسح ضوئي لفواتير الكاميرا عبر واتساب مباشرة",
            "حساب ضريبة القيمة المضافة والتصنيف التلقائي",
            "تصدير فوري بضغطة واحدة إلى Excel و CSV",
          ]
        : [
            "Camera receipt photo scanning via WhatsApp",
            "Automatic GST / VAT tax categorizing",
            "1-click export to CSV & balance sheets",
          ],
      ctaText: isAr ? "جرّب المسح الضوئي للفواتير" : "Try Receipt OCR",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> {isAr ? "استخراج بيانات الفاتورة بالذكاء الاصطناعي" : "AI Receipt OCR"}
            </span>
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "تم التوثيق آلياً" : "Auto-Logged"}
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 space-y-1.5 text-xs border border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "المورد:" : "Vendor:"}</span>
              <span className="font-semibold text-white">{isAr ? "مستلزمات ومعدات مكتبية" : "Office Supplies"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "ضريبة القيمة المضافة (15%):" : "Tax / VAT:"}</span>
              <span className="font-semibold text-amber-300">{isAr ? "69.00 ر.س" : "$18.40 (5%)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "المجموع الكلي:" : "Total:"}</span>
              <span className="font-bold text-emerald-400">{isAr ? "1,449.00 ر.س" : "$386.40"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cadence",
      agentName: isAr ? "وكيل المتابعات البيعية" : "Cadence Agent",
      shortLabel: isAr ? "سلاسل المتابعة الذكية" : "Follow-Up Cadence",
      badge: isAr ? "متابعات المبيعات المؤتمتة" : "Sales Follow-Ups",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      icon: Calendar,
      title: isAr ? "متابعة ذكية متعددة المراحل" : "Smart Follow-Up Cadence",
      description: isAr
        ? "تشغيل حملات متابعة تسلسلية مؤتمتة تتوقف تلقائياً وفوراً بمجرد رد العميل وبدون أي إزعاج."
        : "Run automated multi-touch follow-up sequences that auto-pause instantly as soon as a customer responds.",
      bullets: isAr
        ? [
            "سلاسل تواصل وتربية عملاء مجدولة على أيام محددة",
            "إيقاف ذكي فوري ومؤتمت عند استلام أي رد من العميل",
            "فترات تأخير مدروسة لمنع أي حظر للأرقام وضمان أمان الحساب",
          ]
        : [
            "Recurring multi-day nurturing sequences",
            "Smart auto-stop on incoming reply",
            "Zero spam risk with cadence delays",
          ],
      ctaText: isAr ? "إنشاء سلسلة متابعة" : "Build Cadence Sequence",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {isAr ? "سلسلة من 3 خطوات" : "3-Step Sequence"}
            </span>
            <span className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "مسار نشط" : "Active Flow"}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <span className="text-slate-200 flex-1 font-medium">
                {isAr ? "اليوم 1: رسالة ترحيبية وفيديو توضيحي" : "Day 1: Intro & Demo Video"}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">{isAr ? "تم الإرسال" : "Sent"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <span className="text-slate-200 flex-1 font-medium">
                {isAr ? "اليوم 3: دراسة حالة وقصة نجاح العميل" : "Day 3: Case Study & Proof"}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">{isAr ? "في الانتظار" : "Queued"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "workflow",
      agentName: isAr ? "وكيل مسارات العمل والربط" : "Workflow Agent",
      shortLabel: isAr ? "الأتمتة المرئية وتكامل Zapier" : "Visual Automations",
      badge: isAr ? "أتمتة وسير عمل مرئي" : "Visual Automations",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Workflow,
      title: isAr ? "أتمتة مرئية وتكامل سلس مع تطبيقاتك" : "Visual Automations & Zapier",
      description: isAr
        ? "صمم مسارات محادثة بالسحب والإفلات واربطها بسهولة مع Zapier ونقاط الويب هوك وتطبيقات عملك."
        : "Design drag-and-drop conversational workflows and sync seamlessly with Zapier, webhooks, and your tech stack.",
      bullets: isAr
        ? [
            "لوحة سحب وإفلات تفاعلية ومرئية لمنطق المحادثة",
            "تكامل مباشر مع Zapier و REST API ونظام Orderown",
            "وسوم مخصصة، سمات تفاعلية، ومشغلات Webhook فورية",
          ]
        : [
            "Drag-and-drop visual logic canvas",
            "Native Zapier & REST API endpoints",
            "Custom tags, attributes & webhook triggers",
          ],
      ctaText: isAr ? "استكشف الأتمتة ومسارات العمل" : "Explore Automations",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-blue-400 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5" /> {isAr ? "منشئ المسارات المرئي" : "Flow Builder"}
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {isAr ? "مزامنة مباشرة" : "Live Sync"}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl text-xs border border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">
                {isAr ? "المشغل: طلب جديد" : "Trigger: New Order"}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-purple-300">
              {isAr ? "مزامنة Zapier + CRM" : "Sync Zapier + CRM"}
            </span>
          </div>
        </div>
      ),
    },
  ];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : AGENT_SLIDES.length - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev < AGENT_SLIDES.length - 1 ? prev + 1 : 0));
  };

  const activeSlide = AGENT_SLIDES[activeIdx];

  return (
    <section id="features" className={`py-20 lg:py-28 bg-slate-50/70 text-slate-900 relative overflow-hidden ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Brevo-Style 2-Column Split: Explainer on Left, Slider Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Explainer, Title, Agent Switcher & Slider Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                {isAr ? "وكلاء الذكاء الاصطناعي في لينالا" : "Linala WhatsApp CRM AI Agents"}
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {isAr ? "وكلاء ذكاء اصطناعي يعملون معك ولأجلك" : "AI agents that work with you, and for you"}
              </h2>
              
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                {isAr ? (
                  <>
                    وكلاء أذكياء متخصصون مبنيون مباشرة داخل نظام <strong className="text-purple-700 font-semibold">Linala WhatsApp CRM</strong> لتأهيل العملاء المحتملين، إدارة ومعالجة الطلبات، ومضاعفة المبيعات على مدار 24/7.
                  </>
                ) : (
                  <>
                    Task-scoped autonomous AI agents built directly into <strong className="text-purple-700 font-semibold">Linala WhatsApp CRM</strong> to qualify leads, process store orders, and scale revenue 24/7.
                  </>
                )}
              </p>
            </div>

            {/* Vertical Interactive Agent Selector Menu (Brevo Style) */}
            <div className="space-y-1.5 pt-2">
              {AGENT_SLIDES.map((slide, idx) => {
                const Icon = slide.icon;
                const isActive = activeIdx === idx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl ${isAr ? "text-right" : "text-left"} text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-white text-purple-700 shadow-sm border border-purple-200/80 scale-[1.01]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors ${
                          isActive ? "bg-purple-600 text-white" : "bg-slate-200/70 text-slate-600"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span>{slide.agentName}</span>
                    </div>

                    <span className={`text-xs font-mono font-medium ${isActive ? "text-purple-600" : "text-slate-400"}`}>
                      0{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider Navigation Controls (Left/Right Arrows + Counter) */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 font-mono">0{activeIdx + 1}</span>
                <span className="text-xs text-slate-400">/ 0{AGENT_SLIDES.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full bg-white hover:bg-purple-600 hover:text-white text-slate-700 border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-10 h-10 rounded-full bg-white hover:bg-purple-600 hover:text-white text-slate-700 border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Large Active Showcase Card (Brevo Light Theme) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-9 border border-slate-200/90 shadow-xl shadow-purple-950/5 relative overflow-hidden transition-all duration-300">
              
              {/* Visual Mockup Preview */}
              <div className="mb-6 rounded-2xl overflow-hidden shadow-md">
                {activeSlide.preview}
              </div>

              {/* Agent Category Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${activeSlide.badgeColor}`}>
                  {activeSlide.badge}
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                  {isAr ? "مفعّل في لينالا" : "Active in Linala"}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {activeSlide.title}
              </h3>
              
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                {activeSlide.description}
              </p>

              {/* Bullets */}
              <div className="space-y-2.5 mb-7">
                {activeSlide.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              {/* Action Link */}
              <Link
                href={activeSlide.ctaLink}
                className="inline-flex items-center justify-between w-full py-3.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 hover:shadow-lg transition-all duration-200 group"
              >
                <span>{activeSlide.ctaText}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1"} transition-transform`} />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Features;

