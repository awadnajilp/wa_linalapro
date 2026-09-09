import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingCart,
  Building2,
  Stethoscope,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface UseCaseItem {
  id: string;
  icon: React.ElementType;
  title: string;
  badge: string;
  headline: string;
  description: string;
  growthMetric: string;
  metricLabel: string;
  highlights: string[];
}

export const UseCases: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [activeId, setActiveId] = useState("ecom");

  const USE_CASES: UseCaseItem[] = [
    {
      id: "ecom",
      icon: ShoppingCart,
      title: isAr ? "التجارة الإلكترونية والبراندات" : "E-Commerce & D2C",
      badge: isAr ? "المتاجر والعلامات التجارية" : "Retail Brands",
      headline: isAr ? "أتمتة الكتالوجات والشراء بضغطة واحدة" : "Automate Catalogs & 1-Click WhatsApp Checkout",
      description: isAr
        ? "تمكين العملاء من استعراض المنتجات، إتمام الشراء عبر مدى والبطاقات، واستلام تذكيرات مؤتمتة للسلات المتروكة."
        : "Allow buyers to browse catalogs, purchase via UPI/Card, and receive automated abandoned cart reminders.",
      growthMetric: "+380%",
      metricLabel: isAr ? "نمو مبيعات واتساب" : "WhatsApp Sales Growth",
      highlights: isAr
        ? [
            "كتالوجات أصلية داخل واتساب مع شراء فوري",
            "سلاسل تذكير ذكية لاسترجاع السلات المتروكة",
            "إصدار فوري لفواتير PDF وتتبع الشحنات آلياً",
          ]
        : [
            "Native WhatsApp catalogs with 1-click checkout",
            "Automated cart recovery drip sequences",
            "Instant PDF order invoices & dispatch tracking",
          ],
    },
    {
      id: "realestate",
      icon: Building2,
      title: isAr ? "العقارات والتطوير العقاري" : "Real Estate",
      badge: isAr ? "المطورون والوسطاء العقاريون" : "Developers & Brokers",
      headline: isAr ? "تأهيل العملاء وحجز مواعيد المعاينة آلياً" : "Qualify High-Ticket Buyers & Book Site Visits",
      description: isAr
        ? "استقبال عملاء إعلانات واتساب، تأهيل ميزانيات الشراء بالذكاء الاصطناعي، وإرسال البروشورات ومخططات المشاريع فورياً."
        : "Capture Click-to-WhatsApp ad leads, qualify buyer budgets with AI, and dispatch brochures automatically.",
      growthMetric: "82%",
      metricLabel: isAr ? "زيارة أسرع للمشاريع العقارية" : "Faster Lead-to-Visit Rate",
      highlights: isAr
        ? [
            "استقبال فوري للعملاء من إعلانات Click-to-WhatsApp",
            "إرسال فوري لكتيبات PDF ومخططات المشاريع بالفيديو",
            "تأهيل ميزانية العميل والمدينة المفضلة بالذكاء الاصطناعي",
          ]
        : [
            "Instant Click-to-WhatsApp ad lead capture",
            "Automated PDF brochures & video floor plans",
            "AI qualification of buyer budget and location",
          ],
    },
    {
      id: "healthcare",
      icon: Stethoscope,
      title: isAr ? "المراكز الطبية والعيادات" : "Healthcare & Clinics",
      badge: isAr ? "المستشفيات والعيادات" : "Clinics & Hospitals",
      headline: isAr ? "أتمتة حجز المواعيد وتنبيهات الوصفات" : "Automate Appointments & Prescription Alerts",
      description: isAr
        ? "حجز مواعيد الأطباء، إرسال تذكيرات المواعيد للحد من عدم الحضور، وإرسال التقارير الطبية بأمان."
        : "Enable patients to book doctor slots, receive PDF prescriptions, and reduce no-shows with automated reminders.",
      growthMetric: "65%",
      metricLabel: isAr ? "انخفاض في تغيب المرضى" : "Fewer Patient No-Shows",
      highlights: isAr
        ? [
            "حجز مواعيد العيادات على مدار 24/7 آلياً",
            "تأكيد الموعد فوراً مع موقع العيادة على خرائط جوجل",
            "سلاسل توجيه ومتابعة المريض قبل وبعد الكشف",
          ]
        : [
            "24/7 automated doctor slot booking",
            "Instant WhatsApp confirmation with map directions",
            "Pre-visit preparation & follow-up cadences",
          ],
    },
    {
      id: "services",
      icon: Briefcase,
      title: isAr ? "الشركات والخدمات المهنية" : "B2B & Agencies",
      badge: isAr ? "الخدمات والشركات" : "Professional Services",
      headline: isAr ? "تسريع إغلاق الصفقات مع صندوق محادثات مشترك" : "Accelerate Sales Pipeline with Shared CRM",
      description: isAr
        ? "توزيع العملاء والشركات على مسؤولي المبيعات، إدارة مراحل الصفقات على كانبان، ومزامنة الملاحظات مع Zapier و CRM."
        : "Route enterprise prospects to reps, manage deals on Kanban boards, and sync notes with Zapier & HubSpot.",
      growthMetric: "4.2x",
      metricLabel: isAr ? "استجابة أسرع لاتفاقيات المبيعات" : "Faster Sales Response SLA",
      highlights: isAr
        ? [
            "توزيع المحادثات على الفريق بدون أي تضارب",
            "ربط Zapier والويب هوك مع أنظمة CRM العالمية",
            "ملاحظات داخلية خاصة ومراحل صفقات مخصصة",
          ]
        : [
            "Multi-agent team routing with collision avoidance",
            "Zapier & webhook sync with Salesforce & HubSpot",
            "Internal staff notes & custom deal stages",
          ],
    },
    {
      id: "education",
      icon: GraduationCap,
      title: isAr ? "التعليم والمعاهد والتدريب" : "Education & EdTech",
      badge: isAr ? "الأكاديميات والجامعات" : "Institutes & Academies",
      headline: isAr ? "أتمتة استفسارات الدورات والتسجيل الفوري" : "Automate Course Inquiries & Enrollment",
      description: isAr
        ? "تأهيل اهتمامات الطلاب والدارسين، مشاركة مناهج الدورات التدريبية كملف PDF، واستقبال رسوم التسجيل عبر واتساب."
        : "Qualify prospective student interests, share syllabus PDFs, and collect tuition fees on WhatsApp.",
      growthMetric: "3.5x",
      metricLabel: isAr ? "معدل قبول وتسجيل أعلى" : "Higher Admissions Rate",
      highlights: isAr
        ? [
            "إرسال الخطة الدراسية وتفاصيل الرسوم فوراً",
            "جدولة جلسات الاستشارة الأكاديمية آلياً",
            "روابط دفع رسوم مباشرة عبر بوابة آمنة",
          ]
        : [
            "Instant course syllabus & fee structure delivery",
            "Automated counseling slot scheduling",
            "Direct fee payment links via Razorpay & UPI",
          ],
    },
  ];

  const activeCase = USE_CASES.find((u) => u.id === activeId) || USE_CASES[0];

  return (
    <section id="solutions" className={`py-20 lg:py-24 bg-white relative ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "حلول ونماذج القطاعات" : "Industry Solutions"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "حلول مخصصة للقطاعات سريعة النمو" : "Tailored for High-Growth Industries"}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isAr
              ? "تعرّف كيف يساهم لينالا واتساب CRM في زيادة المبيعات عبر مختلف مجالات الأعمال."
              : "See how Linala WhatsApp CRM powers revenue across diverse business verticals."}
          </p>
        </div>

        {/* Industry Pill Tabs */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            const isActive = activeId === uc.id;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => setActiveId(uc.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-purple-600"}`} />
                <span>{uc.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Use Case Card */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 text-white border border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-md border border-purple-500/30">
                {activeCase.badge}
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {activeCase.headline}
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {activeCase.description}
              </p>

              <div className="space-y-2 pt-2">
                {activeCase.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20"
                >
                  <span>{isAr ? `ابدأ الآن مع ${activeCase.title}` : `Get Started for ${activeCase.title}`}</span>
                  <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </div>

            {/* Metric Display */}
            <div className="lg:col-span-4 bg-slate-950/80 p-6 rounded-2xl border border-slate-800 text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-purple-400 font-mono">
                {activeCase.growthMetric}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300 mt-2">
                {activeCase.metricLabel}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {isAr
                  ? "متوسط النتائج المحققة لعملاء لينالا خلال أول 30 يوماً من الاستخدام."
                  : "Average benchmark achieved by active Linala clients within 30 days."}
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default UseCases;
