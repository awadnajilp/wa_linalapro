import React, { useState } from "react";
import { Link } from "wouter";
import {
  Zap,
  Layers,
  Utensils,
  CreditCard,
  Bot,
  Database,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Search,
  Workflow,
  Radio,
  Building2,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface IntegrationItem {
  name: string;
  nameAr?: string;
  category: "restaurant" | "ai" | "automation" | "ecommerce" | "payment" | "crm";
  badge: string;
  badgeAr?: string;
  badgeColor?: string;
  description: string;
  descriptionAr?: string;
  features: string[];
  featuresAr?: string[];
  externalUrl?: string;
  highlight?: boolean;
}

const ALL_INTEGRATIONS: IntegrationItem[] = [
  // Restaurant RMS (Orderown)
  {
    name: "Orderown Restaurant RMS",
    nameAr: "نظام أوردر أون لإدارة المطاعم (Orderown)",
    category: "restaurant",
    badge: "Featured Partner",
    badgeAr: "شريك استراتيجي",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    description:
      "Full two-way synchronization with Orderown (orderown.com) — the premier Restaurant Management System. Automate WhatsApp food orders, live Table QR billing, Kitchen Display System (KDS) sync, and delivery dispatch notifications.",
    descriptionAr:
      "مزامنة كاملة وشاملة مع نظام أوردر أون (orderown.com) الرائد لإدارة المطاعم والكافيهات. أتمتة طلبات الطعام عبر واتساب، ومنيو الطاولة برمز QR، وتتبع شاشة المطبخ KDS وتنبيهات وصول السائق للعميل.",
    features: [
      "1-Click WhatsApp digital menu & instant ordering",
      "Automated WhatsApp order confirmation with live KOT kitchen status",
      "Real-time delivery driver dispatch & live map tracking updates",
      "Automated post-dine review collection & loyalty point rewards",
    ],
    featuresAr: [
      "منيو رقمي وطلب فوري عبر واتساب بنقرة واحدة",
      "تأكيد تلقائي للطلب مع حالة تجهيز المطبخ KOT لحظياً",
      "تنبيهات إسناد السائق ورابط تتبع الخريطة الحي",
      "جمع تقييمات العملاء بعد الوجبة ومكافآت نقاط الولاء",
    ],
    externalUrl: "https://orderown.com",
    highlight: true,
  },

  // AI & Speech Intelligence
  {
    name: "OpenAI GPT-4o & ChatGPT",
    nameAr: "OpenAI GPT-4o والذكاء الاصطناعي التوليدي",
    category: "ai",
    badge: "AI Engine",
    badgeAr: "محرك ذكاء اصطناعي",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Power conversational bots with advanced contextual understanding, document retrieval, and intelligent objection handling.",
    descriptionAr:
      "تمكين روبوتات الواتساب من فهم سياق العميل المتقدم، واسترجاع المعلومات من ملفات الشركة، والرد الذكي على الاعتراضات.",
    features: [
      "Custom system prompts & knowledge base injection",
      "Function calling & live database querying",
      "Multi-turn conversational memory in WhatsApp",
    ],
    featuresAr: [
      "تخصيص نبرة المساعد وتزويده بملفات وقواعد معرفة المنشأة",
      "استدعاء الدوال البرمجية والاستعلام اللحظي من قواعد البيانات",
      "حفظ سياق المحادثة متعددة الجولات داخل الواتساب",
    ],
  },
  {
    name: "ElevenLabs Voice AI",
    nameAr: "ElevenLabs لتوليد الصوت البشري",
    category: "ai",
    badge: "Speech Model",
    badgeAr: "نموذج صوتي",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Ultra-realistic multilingual voice synthesis with natural human cadence, emotion, and low latency for outbound and inbound calls.",
    descriptionAr:
      "توليد صوتي واقعي يحاكي الصوت البشري بنبرات طبيعية وزمن استجابة فائق السرعة للمكالمات الصادرة والواردة.",
    features: [
      "Sub-500ms voice generation",
      "Custom voice cloning & studio-grade audio quality",
      "40+ global language accents and nuances",
    ],
    featuresAr: [
      "توليد صوتي فوري في أقل من 500 ملي ثانية",
      "استنساخ نبرة الصوت المخصصة بجودة الاستوديو الاحترافية",
      "دعم أكثر من 40 لغة ولهجة إقليمية",
    ],
  },
  {
    name: "Deepgram Realtime Speech",
    nameAr: "Deepgram لتحويل الصوت إلى نص فوري",
    category: "ai",
    badge: "Voice-to-Text",
    badgeAr: "تحويل الصوت لنص",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Ultra-fast live speech-to-text transcription for real-time audio phone conversations and customer voice note processing.",
    descriptionAr:
      "تفريغ نصي صوتي فائق السرعة للمحادثات الهاتفية ومعالجة الرسائل الصوتية المرسلة من العملاء في واتساب.",
    features: [
      "Instant word-by-word streaming transcription",
      "Accented speech & background noise suppression",
      "Automated punctuation & entity extraction",
    ],
    featuresAr: [
      "تفريغ صوتي لحظي كلمة بكلمة في الوقت الفعلي",
      "عزل الضوضاء الخلفية وفهم اللهجات المحلية بذكاء",
      "ترقيم تلقائي واستخراج البيانات الحيوية من المكالمة",
    ],
  },
  {
    name: "Google Gemini 2.0 & Anthropic Claude",
    nameAr: "Google Gemini 2.0 و Anthropic Claude",
    category: "ai",
    badge: "Multimodal AI",
    badgeAr: "ذكاء متعدد الوسائط",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Process customer product photos, PDF invoices, and complex multimodal inquiries directly inside WhatsApp chat.",
    descriptionAr:
      "معالجة صور المنتجات وفواتير PDF واستفسارات العملاء المعقدة متعددة الوسائط مباشرة في محادثة الواتساب.",
    features: [
      "Vision analysis for prescription & receipt reading",
      "High token context window for large documentation",
      "Multilingual translation across global dialects",
    ],
    featuresAr: [
      "تحليل بصري لقراءة الوصفات الطبية وإيصالات الشراء",
      "نافذة سياق ضخمة لاستيعاب الكتيبات والوثائق المطولة",
      "ترجمة احترافية فورية متعددة اللهجات",
    ],
  },

  // Zapier & Automation
  {
    name: "Zapier (5,000+ Apps)",
    nameAr: "Zapier (أكثر من 5,000 تطبيق)",
    category: "automation",
    badge: "No-Code Ecosystem",
    badgeAr: "أتمتة بدون كود",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description:
      "Connect Linala with over 5,000+ web applications without writing code. Trigger automated WhatsApp notifications on any event.",
    descriptionAr:
      "ربط منصة لينالا مع أكثر من 5000 تطبيق دون الحاجة لكتابة كود برمجي. أطلق إشعارات واتساب تلقائية عند أي حدث.",
    features: [
      "Trigger WhatsApp broadcast on new Google Sheets row or Typeform submit",
      "Sync incoming WhatsApp contacts to Google Contacts, Slack, or Mailchimp",
      "Multi-step automated Zaps with conditional branching filters",
    ],
    featuresAr: [
      "إرسال رسالة واتساب عند إضافة صف في Google Sheets أو استبيان جديد",
      "مزامنة جهات اتصال واتساب مع Slack وGoogle Contacts وMailchimp",
      "مسارات أتمتة متعددة الخطوات مع شروط وفلاتر مخصصة",
    ],
    highlight: true,
  },
  {
    name: "Make.com (Integromat)",
    nameAr: "Make.com (Integromat)",
    category: "automation",
    badge: "Visual Scenarios",
    badgeAr: "سيناريوهات بصرية",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description:
      "Build complex enterprise data routing scenarios and multi-app syncs with visual drag-and-drop nodes.",
    descriptionAr:
      "بناء سيناريوهات توجيه بيانات معقدة ومزامنة الأنظمة المتعددة باستخدام عقد السحب والإفلات البصرية.",
    features: [
      "Visual scenario builder with data transformation routers",
      "Real-time webhook triggers with instant execution",
      "Error-handling paths and automated fallback actions",
    ],
    featuresAr: [
      "منشئ سيناريوهات مرئي مع محولات تحويل وتنسيق البيانات",
      "مشغلات ويب هوك فورية مع تنفيذ فوري للأحداث",
      "مسارات معالجة الأخطاء والإجراءات الاحتياطية التلقائية",
    ],
  },
  {
    name: "Custom Webhooks & REST API",
    nameAr: "Webhooks وواجهات REST API المخصصة",
    category: "automation",
    badge: "Developer First",
    badgeAr: "للمطورين والأنظمة",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    description:
      "Bi-directional webhooks to receive inbound messages, delivery receipts, button clicks, and trigger programmatic messages from any backend.",
    descriptionAr:
      "ويب هوك ثنائي الاتجاه لاستقبال الرسائل الواردة، وإيصالات القراءة، ونقرات الأزرار، وإرسال رسائل برمجية من أي خادم.",
    features: [
      "Signed SHA-256 HMAC payload verification",
      "Immediate event dispatch for message status updates",
      "Swagger & Postman collections ready for quick testing",
    ],
    featuresAr: [
      "التحقق الأمني من البيانات بتوقيع SHA-256 HMAC",
      "إرسال فوري للأحداث عند تغير حالة الرسائل",
      "مكتبات Swagger وPostman جاهزة للاختبار الفوري",
    ],
  },

  // E-Commerce
  {
    name: "Shopify & Shopify Plus",
    nameAr: "Shopify و Shopify Plus",
    category: "ecommerce",
    badge: "Native E-Com",
    badgeAr: "متاجر إلكترونية",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Automate order confirmation alerts, dispatch tracking numbers, recover abandoned checkouts, and sync WhatsApp catalog inventory.",
    descriptionAr:
      "أتمتة إشعارات تأكيد الطلبات، وإرسال أرقام التتبع، واستعادة السلات المتروكة، ومزامنة مخزون كتالوج منتجات واتساب.",
    features: [
      "Automatic abandoned cart recovery drip sequence",
      "Order created, fulfilled, and out-for-delivery alerts",
      "COD verification button to reduce return-to-origin (RTO)",
    ],
    featuresAr: [
      "سلسلة رسائل تلقائية لاستعادة السلات المتروكة مع خصومات",
      "تنبيهات لحظية لإنشاء الطلب وتجهيزه وخروجه مع مندوب التوصيل",
      "زر تأكيد الدفع عند الاستلام للحد من رجوع الشحنات",
    ],
    highlight: true,
  },
  {
    name: "WooCommerce & WordPress",
    nameAr: "WooCommerce و WordPress",
    category: "ecommerce",
    badge: "Open Source",
    badgeAr: "ووردبريس",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Plug-and-play integration for WooCommerce stores to send instant WhatsApp PDF invoices, delivery status, and promotional broadcasts.",
    descriptionAr:
      "تكامل جاهز وفوري لمتاجر ووكومرس لإرسال فواتير PDF على واتساب، وتحديثات الشحن، والحملات الترويجية.",
    features: [
      "Instant checkout notifications with PDF receipt attachments",
      "Customizable order status trigger webhooks",
      "1-Click chat-to-order button for WooCommerce product pages",
    ],
    featuresAr: [
      "إشعارات فورية عند الدفع مرفقة بفاتورة PDF رسمية",
      "مشغلات مخصصة لتحديثات حالات الطلب المختلفة",
      "زر الشراء والمراسلة الفورية في صفحات المنتجات",
    ],
  },

  // Payment Gateways
  {
    name: "Stripe Payments",
    nameAr: "بوابة دفع Stripe العالمية",
    category: "payment",
    badge: "Global Payments",
    badgeAr: "مدفوعات دولية",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Generate dynamic Stripe checkout links inside WhatsApp chat and automatically dispatch receipts upon successful payment.",
    descriptionAr:
      "إنشاء روابط دفع Stripe ديناميكية داخل محادثة واتساب وإرسال إيصالات الدفع فور إتمام العملية بنجاح.",
    features: [
      "Global card, Apple Pay, Google Pay support",
      "Automated subscription invoice alerts & dunning reminders",
      "Instant webhook payment confirmation to unlock digital access",
    ],
    featuresAr: [
      "دعم البطاقات البنكية وApple Pay وGoogle Pay عالمياً",
      "تنبيهات الفواتير الدورية وتذكيرات تجديد الاشتراكات",
      "تأكيد فوري بالدفع لتفعيل الخدمات والمنتجات الرقمية",
    ],
  },
  {
    name: "Razorpay & UPI QR",
    nameAr: "Razorpay ورموز الاستجابة السريعة UPI",
    category: "payment",
    badge: "India & GCC",
    badgeAr: "دفع سريع",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Accept payments natively via dynamic UPI QR codes and Razorpay payment links generated automatically in chat.",
    descriptionAr:
      "قبول المدفوعات محلياً عبر رموز QR الديناميكية وروابط الدفع التي يتم إنشاؤها تلقائياً داخل المحادثة.",
    features: [
      "Instant UPI QR generation with auto-reconciliation",
      "Automated COD payment collection via WhatsApp link",
      "Instant payment receipts with GST breakdown",
    ],
    featuresAr: [
      "توليد فوري لرمز الاستجابة السريعة مع التسوية الآلية",
      "تحصيل المدفوعات المؤجلة عبر روابط واتساب مشفرة",
      "إيصالات دفع فورية مع التفاصيل الضريبية الكاملة",
    ],
  },

  // CRMs
  {
    name: "HubSpot CRM",
    nameAr: "HubSpot CRM لإدارة العملاء",
    category: "crm",
    badge: "CRM Sync",
    badgeAr: "مزامنة CRM",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Log all WhatsApp conversations directly inside HubSpot contact timelines. Trigger WhatsApp workflows from HubSpot deal stages.",
    descriptionAr:
      "تسجيل جميع محادثات واتساب تلقائياً داخل سجلات جهات اتصال HubSpot وإطلاق رسائل ومسارات من مراحل الصفقات.",
    features: [
      "2-Way contact property sync and conversation logging",
      "Send WhatsApp templates directly from HubSpot contact records",
      "HubSpot workflow action to trigger automated WhatsApp broadcasts",
    ],
    featuresAr: [
      "مزامنة ثنائية لخصائص جهات الاتصال وتاريخ المحادثات",
      "إرسال قوالب واتساب مباشرة من واجهة HubSpot",
      "إجراءات سير العمل (Workflows) لإطلاق حملات واتساب المؤتمتة",
    ],
  },
  {
    name: "Salesforce & Zoho CRM",
    nameAr: "Salesforce و Zoho CRM للمنشآت",
    category: "crm",
    badge: "Enterprise CRM",
    badgeAr: "أنظمة المؤسسات",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Bi-directional synchronization with enterprise CRM records, lead scoring, and automated sales rep assignment.",
    descriptionAr:
      "مزامنة ثنائية مع سجلات أنظمة إدارة العملاء للمؤسسات، وتقييم جودة العملاء المحتملين وتوزيعهم آلياً على مسؤولي المبيعات.",
    features: [
      "Sync WhatsApp leads into Salesforce Leads and Contacts",
      "Automate task creation for sales reps on inbound customer replies",
      "Custom field mapping and pipeline stage progression",
    ],
    featuresAr: [
      "مزامنة الفرص البيعية من واتساب إلى Salesforce وZoho فوراً",
      "إنشاء مهام تلقائية للمناديب عند رد العميل على المحادثة",
      "ربط الحقول المخصصة وتحديث مراحل الصفقات تلقائياً",
    ],
  },
];

export const Integrations: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredIntegrations = ALL_INTEGRATIONS.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const nameMatch = isAr
      ? (item.nameAr || item.name).toLowerCase().includes(searchQuery.toLowerCase())
      : item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = isAr
      ? (item.descriptionAr || item.description).toLowerCase().includes(searchQuery.toLowerCase())
      : item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (nameMatch || descMatch);
  });

  return (
    <div className={`min-h-screen bg-white ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "منظومة الربط والتكامل الشامل" : "Ecosystem & Integrations"}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {isAr ? (
              <>
                اربط منصة لينالا مع{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  منظومة برامجك وأنظمتك الحالية
                </span>
              </>
            ) : (
              <>
                Connect Linala with Your{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Entire Software Stack
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "من نظام Orderown لإدارة المطاعم وأكثر من 5,000 تطبيق عبر Zapier، إلى نماذج الذكاء الاصطناعي وشوبيفاي وبوابات الدفع وأنظمة الـ CRM — أتمت أعمالك بسهولة تامة."
              : "From Orderown Restaurant RMS and 5,000+ Zapier apps to AI models, Shopify, Stripe, and enterprise CRMs — automate your customer workflows seamlessly."}
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? "ابحث في منصات الربط (مثل Orderown، Zapier، Shopify، OpenAI)..."
                  : "Search integrations (e.g. Orderown, Zapier, Shopify, OpenAI)..."
              }
              className="w-full pl-11 rtl:pl-4 rtl:pr-11 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Categories & Integration Cards */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: "all", label: "All Integrations", labelAr: "جميع المنصات" },
            { id: "restaurant", label: "Restaurant RMS (Orderown)", labelAr: "نظام المطاعم (Orderown RMS)" },
            { id: "automation", label: "Zapier & Automation", labelAr: "أتمتة Zapier والتطبيقات" },
            { id: "ai", label: "AI & Speech Models", labelAr: "الذكاء الاصطناعي والصوت" },
            { id: "ecommerce", label: "E-Commerce", labelAr: "المتاجر الإلكترونية" },
            { id: "payment", label: "Payment Gateways", labelAr: "بوابات الدفع الإلكتروني" },
            { id: "crm", label: "CRMs & Databases", labelAr: "أنظمة CRM وقواعد البيانات" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              {isAr ? cat.labelAr : cat.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((item, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-3xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                item.highlight
                  ? "border-purple-300 shadow-lg shadow-purple-500/5 ring-1 ring-purple-100"
                  : "border-slate-200/80 shadow-xs hover:shadow-xl hover:border-purple-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isAr && item.nameAr ? item.nameAr : item.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.badgeColor || "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {isAr && item.badgeAr ? item.badgeAr : item.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                  {isAr && item.descriptionAr ? item.descriptionAr : item.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {(isAr && item.featuresAr ? item.featuresAr : item.features).map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 font-medium leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold text-orange-600 hover:text-orange-700 group"
                  >
                    <span>
                      {isAr ? `زيارة موقع ${item.name}` : `Visit ${item.name}`}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <Link
                    href="/signup"
                    className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 group"
                  >
                    <span>{isAr ? "ربط بنقرة واحدة" : "Connect in 1-Click"}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isAr ? "هل تحتاج إلى ربط مخصص مع أنظمة مؤسستك الداخلية؟" : "Need a Custom API or Enterprise CRM Connector?"}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "فريق مهندسي الحلول لدينا جاهز لبناء ويب هوك مخصص ومسارات بيانات مؤمنة تتوافق بدقة مع بنية شركتك التحتية."
              : "Our integration engineering team can build dedicated webhooks and custom pipelines for your enterprise infrastructure."}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-xs sm:text-sm">
                {isAr ? "طلب ربط وتكامل مخصص" : "Request Custom Integration"}
                <ArrowRight className="w-4 h-4 ml-1.5 rtl:mr-1.5 rtl:ml-0 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Integrations;
