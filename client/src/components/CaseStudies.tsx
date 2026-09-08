import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingCart,
  Heart,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Quote,
  ArrowRight as ArrowRightIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface CaseStudy {
  id: string;
  company: string;
  logoText: string;
  industry: string;
  industryAr: string;
  category: "all" | "ecommerce" | "healthcare" | "restaurant" | "realestate" | "edtech" | "b2b";
  title: string;
  titleAr: string;
  location: string;
  locationAr: string;
  image: string;
  summary: string;
  summaryAr: string;
  challenge: string;
  challengeAr: string;
  solution: string;
  solutionAr: string;
  heroMetric: string;
  heroMetricLabel: string;
  heroMetricLabelAr: string;
  metrics: {
    label: string;
    labelAr: string;
    value: string;
    trend: string;
    trendAr: string;
  }[];
  testimonial: {
    quote: string;
    quoteAr: string;
    author: string;
    role: string;
    roleAr: string;
    company: string;
  };
  technologies: string[];
  duration: string;
  durationAr: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "fashionhub-global",
    company: "FashionHub Retail",
    logoText: "FH",
    industry: "E-Commerce & Apparel",
    industryAr: "التجارة الإلكترونية والأزياء",
    category: "ecommerce",
    title: "How FashionHub Recovered $2.1M in Abandoned Carts via WhatsApp Flows",
    titleAr: "كيف استعادت فاشن هب 2.1 مليون دولار من السلات المتروكة عبر مسارات واتساب",
    location: "United Kingdom & UAE",
    locationAr: "المملكة المتحدة والإمارات",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    summary:
      "A fast-growing direct-to-consumer fashion retailer turned 68% of abandoned checkouts into completed orders with personalized 1-click WhatsApp cart recovery drips.",
    summaryAr:
      "نجحت علامة أزياء سريعة النمو في تحويل 68% من محاولات الشراء المتروكة إلى طلبات مكتملة عبر رسائل واتساب تفاعلية ومخصصة بنقرة واحدة.",
    challenge:
      "High mobile ad acquisition costs combined with a 72% abandoned cart rate on Shopify. Traditional email recovery had sub-12% open rates and was failing to re-engage impulse buyers.",
    challengeAr:
      "ارتفاع تكاليف الإعلانات مع نسبة سلات متروكة بلغت 72% على شوبيفاي، مع ضعف معدل فتح رسائل البريد الإلكتروني الذي لم يتجاوز 12%.",
    solution:
      "Connected Linala WhatsApp CRM directly to Shopify webhooks. When a shopper drops off at checkout, a dynamic WhatsApp template with item photos, discount countdowns, and 1-click WhatsApp payment checkout is dispatched in 15 minutes.",
    solutionAr:
      "ربط منصة لينالا مباشرة مع شوبيفاي لإرسال رسائل واتساب ذكية خلال 15 دقيقة تتضمن صور المنتجات المتروكة، وعد تنازلي للخصم، ورابط دفع فوري.",
    heroMetric: "+310%",
    heroMetricLabel: "Recovered Cart Revenue",
    heroMetricLabelAr: "نمو إيرادات السلات المستردة",
    metrics: [
      { label: "Cart Recovery Rate", labelAr: "معدل استرداد السلات", value: "46.2%", trend: "+34% vs email", trendAr: "+34% مقارنة بالإيميل" },
      { label: "WhatsApp Read Rate", labelAr: "معدل قراءة الواتساب", value: "94.8%", trend: "Within 5 minutes", trendAr: "خلال 5 دقائق" },
      { label: "Annual Revenue Impact", labelAr: "الأثر المالي السنوي", value: "$2.1M", trend: "Net new sales", trendAr: "مبيعات صافية إضافية" },
    ],
    testimonial: {
      quote:
        "Linala completely revolutionized our post-click conversion funnels. WhatsApp cart recovery delivers 8x higher ROI than any email tool we have ever used.",
      quoteAr:
        "أحدثت لينالا نقلة نوعية في تحويل الزوار إلى مشترين. استرداد السلات عبر واتساب حقق عائداً أعلى بـ 8 أضعاف مقارنة بأي أداة بريد إلكتروني استخدمناها.",
      author: "Sarah Jenkins",
      role: "VP of Growth Marketing",
      roleAr: "نائب رئيس التسويق والنمو",
      company: "FashionHub Retail",
    },
    technologies: ["Shopify Webhooks", "Meta Cloud API", "Visual Flow Builder", "Instant Payment Links"],
    duration: "45 Days Implementation",
    durationAr: "تنفيذ خلال 45 يوماً",
  },
  {
    id: "orderown-al-bustan",
    company: "Al Bustan Restaurant Chain",
    logoText: "AB",
    industry: "Food & Hospitality",
    industryAr: "المطاعم والضيافة",
    category: "restaurant",
    title: "Al Bustan Boosts Direct Repeat Orders by 185% with Orderown RMS Sync",
    titleAr: "سلسلة مطاعم البستان ترفع الطلبات المتكررة بنسبة 185% عبر ربط أوردر أون RMS",
    location: "Riyadh & Jeddah, KSA",
    locationAr: "الرياض وجدة، المملكة العربية السعودية",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    summary:
      "A leading casual dining chain across Saudi Arabia cut 3rd-party delivery aggregator commissions by shifting 60% of customer orders directly to WhatsApp with Orderown RMS.",
    summaryAr:
      "سلسلة مطاعم رائدة في المملكة قلصت عمولات تطبيقات التوصيل بتحويل 60% من طلبات العملاء مباشرة إلى واتساب باستخدام نظام أوردر أون RMS.",
    challenge:
      "Hefty 25% commission fees on third-party food delivery apps eroded profit margins. Customers also lacked real-time visibility into kitchen prep and delivery ETA.",
    challengeAr:
      "عمولات تطبيقات التوصيل المرتفعة التي تصل إلى 25% أثرت على الأرباح، مع غياب التتبع اللحظي لحالة الطلب في المطبخ وموعد وصول السائق.",
    solution:
      "Integrated Linala WhatsApp Automation with Orderown Restaurant RMS (orderown.com). Diners scan table QR codes or message the brand number to browse digital menus, pay instantly, and receive live KOT kitchen and driver GPS dispatch alerts.",
    solutionAr:
      "دمج أتمتة لينالا مع نظام Orderown RMS (orderown.com). يمسح العميل رمز QR أو يراسل رقم الواتساب لتصفح المنيو الرقمي، والدفع الفوري، وتتبع شاشة المطبخ KOT وموقع السائق المباشر.",
    heroMetric: "+185%",
    heroMetricLabel: "Direct Repeat Orders",
    heroMetricLabelAr: "زيادة الطلبات المباشرة",
    metrics: [
      { label: "Commission Saved", labelAr: "توفير العمولات", value: "25%", trend: "Per direct order", trendAr: "لكل طلب مباشر" },
      { label: "Average Ticket Size", labelAr: "متوسط قيمة الفاتورة", value: "+32%", trend: "Upsell recommendations", trendAr: "عبر الاقتراحات الذكية" },
      { label: "KOT Dispatch Speed", labelAr: "سرعة تجهيز المطبخ", value: "1.8 mins", trend: "Zero order errors", trendAr: "بدون أي أخطاء طلبات" },
    ],
    testimonial: {
      quote:
        "The synergy between Orderown RMS and Linala WhatsApp ordering gave us total ownership over our customer relationships while saving millions in aggregator fees.",
      quoteAr:
        "التكامل بين أوردر أون RMS وأتمتة واتساب من لينالا منحنا سيطرة تامة على علاقتنا مع العملاء ووفّر لنا مبالغ طائلة من عمولات المنصات الوسيطة.",
      author: "Tariq Al-Mansoor",
      role: "Operations Director",
      roleAr: "مدير العمليات التشغيلية",
      company: "Al Bustan Hospitality Group",
    },
    technologies: ["Orderown RMS", "Table QR Engine", "KOT Sync", "Delivery Dispatch Webhooks"],
    duration: "30 Days Implementation",
    durationAr: "تنفيذ خلال 30 يوماً",
  },
  {
    id: "mediclinic-health",
    company: "Apex Healthcare Network",
    logoText: "AH",
    industry: "Healthcare & Clinics",
    industryAr: "الرعاية الصحية والمستشفيات",
    category: "healthcare",
    title: "Apex Healthcare Reduces Patient No-Shows by 64% with Automated Reminders",
    titleAr: "شبكة أبيكس للرعاية الصحية تقلص غياب المرضى بنسبة 64% عبر التذكير المؤتمت",
    location: "Manama, Bahrain & Mumbai, India",
    locationAr: "المنامة، البحرين ومومباي، الهند",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    summary:
      "A multi-speciality clinical network automated appointment bookings, digital lab report PDF delivery, and multilingual reminders, dramatically increasing clinic utilization.",
    summaryAr:
      "شبكة مراكز طبية متعددة التخصصات قامت بأتمتة حجز المواعيد، وإرسال تقارير المختبرات بصيغة PDF المشفرة، والتذكيرات متعددة اللغات عبر واتساب.",
    challenge:
      "High patient no-show rates of 28% created severe scheduling bottlenecks. Front-desk staff spent 4+ hours daily calling patients manually for confirmation.",
    challengeAr:
      "نسبة عدم حضور المرضى البالغة 28% تسببت في هدر أوقات الأطباء، مع قضاء موظفي الاستقبال أكثر من 4 ساعات يومياً في الاتصال اليدوي بالمرضى.",
    solution:
      "Deployed 2-way interactive WhatsApp appointment confirmation flows with Google Calendar & HMS sync. Patients can reschedule or confirm with a single button tap and instantly receive encrypted lab test results as PDF attachments.",
    solutionAr:
      "إطلاق مسارات تفاعلية لتأكيد المواعيد عبر واتساب متزامنة مع نظام المستشفى الطبي، تتيح للمريض التأكيد أو إعادة الجدولة بنقرة زر واستلام التقارير الطبية فور صدورها.",
    heroMetric: "-64%",
    heroMetricLabel: "Reduction in No-Shows",
    heroMetricLabelAr: "انخفاض معدل غياب المرضى",
    metrics: [
      { label: "Attendance Rate", labelAr: "معدل الحضور الفعلي", value: "93.4%", trend: "+28% improvement", trendAr: "+28% تحسن سنوي" },
      { label: "Staff Time Saved", labelAr: "الوقت الموفر للموظفين", value: "22 hrs/wk", trend: "Per clinic location", trendAr: "لكل فرع أسبوعياً" },
      { label: "Patient Satisfaction", labelAr: "رضا المرضى", value: "4.9/5", trend: "Based on 14k ratings", trendAr: "بناءً على 14 ألف تقييم" },
    ],
    testimonial: {
      quote:
        "Our doctors love having full schedules, and our patients appreciate getting their prescription summaries and appointment reminders right on WhatsApp.",
      quoteAr:
        "أطباؤنا يقدرون امتلاء جداول المواعيد دون فجوات، والمرضى يشيدون بتلقي تذكيرات المواعيد وملخصات الوصفات الطبية مباشرة على تطبيق واتساب.",
      author: "Dr. Aisha Al-Khalifa",
      role: "Chief Medical Officer",
      roleAr: "المدير الطبي العام",
      company: "Apex Healthcare",
    },
    technologies: ["HMS API Integration", "PDF Auto-Generator", "Multilingual Bot (Arabic/English)", "Interactive Quick Buttons"],
    duration: "60 Days Implementation",
    durationAr: "تنفيذ خلال 60 يوماً",
  },
  {
    id: "gulf-estates-realty",
    company: "Gulf Horizon Real Estate",
    logoText: "GH",
    industry: "Real Estate & Developers",
    industryAr: "العقارات والمطورون",
    category: "realestate",
    title: "Gulf Horizon Converts 3.4x More Meta Ad Leads into Verified Site Visits",
    titleAr: "جلف هورايزون العقارية تضاعف تحويل إعلانات Meta إلى زيارات ميدانية بـ 3.4 أضعاف",
    location: "Dubai & Al Khobar, KSA",
    locationAr: "الخبر، المملكة العربية السعودية ودبي",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
    summary:
      "Luxury real estate developer replaced slow email follow-ups with instant Click-to-WhatsApp ad funnels and automated lead qualification cadences.",
    summaryAr:
      "مطور عقاري رائد استبدل المتابعات البطيئة عبر الإيميل بمسارات إعلانات النقر لواتساب مع تأهيل العملاء آلياً حسب الميزانية ونوع العقار.",
    challenge:
      "Prospective property buyers submitting web inquiry forms were cooling off before sales reps could call them back 6-12 hours later.",
    challengeAr:
      "فقدان اهتمام المشترين المحتملين عند تأخر التواصل الهاتفي من مسؤولي المبيعات لمدة تتراوح بين 6 إلى 12 ساعة بعد تعبئة النماذج التقليدية.",
    solution:
      "Built Click-to-WhatsApp (CTWA) ads routed directly into Linala Kanban CRM. An automated conversational bot immediately qualifies budget, property type, and preferred handover date, assigning high-intent leads to senior property advisors within 30 seconds.",
    solutionAr:
      "بناء إعلانات Click-to-WhatsApp تتصل بلوحة مبيعات لينالا Kanban، حيث يقوم روبوت محادثة ذكي بتأهيل الميزانية والموقع وتسليم الفرصة للمستشار العقاري خلال 30 ثانية.",
    heroMetric: "3.4x",
    heroMetricLabel: "Higher Ad Conversion",
    heroMetricLabelAr: "مضاعفة معدل تحويل الإعلانات",
    metrics: [
      { label: "Response Latency", labelAr: "زمن الاستجابة للعميل", value: "< 28 secs", trend: "Down from 8 hours", trendAr: "انخفض من 8 ساعات" },
      { label: "Qualified Site Visits", labelAr: "الزيارات الميدانية المؤكدة", value: "+142%", trend: "Month-over-month", trendAr: "نمو شهري مستمر" },
      { label: "Cost Per Qualified Lead", labelAr: "تكلفة العميل المؤهل", value: "-48%", trend: "Meta Ads ROAS jump", trendAr: "قفزة في عائد إعلانات Meta" },
    ],
    testimonial: {
      quote:
        "In luxury real estate, speed to lead is everything. Linala's automated qualification bot ensures no high-net-worth inquiry ever slips through the cracks.",
      quoteAr:
        "في قطاع العقارات الفاخرة، سرعة التواصل هي الفيصل. روبوت التأهيل الآلي في لينالا يضمن عدم ضياع أي استفسار عالي القيمة.",
      author: "Rashid Bin Khalid",
      role: "Managing Partner",
      roleAr: "الشريك التنفيذي",
      company: "Gulf Horizon Realty",
    },
    technologies: ["Click-to-WhatsApp (CTWA)", "Kanban Sales Cadence", "AI Budget Qualifier", "HubSpot CRM Sync"],
    duration: "21 Days Implementation",
    durationAr: "تنفيذ خلال 21 يوماً",
  },
  {
    id: "eduskill-global",
    company: "EduSkill Global Institute",
    logoText: "EG",
    industry: "Education & Higher Learning",
    industryAr: "التعليم العالي والتدريب الدولي",
    category: "edtech",
    title: "EduSkill Scales Admissions Inquiries by 240% with Realtime Voice AI",
    titleAr: "معهد إديوسكيل يرفع استفسارات القبول بنسبة 240% عبر الصوت بالذكاء الاصطناعي",
    location: "United Kingdom & India",
    locationAr: "المملكة المتحدة والهند",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    summary:
      "International certification academy deployed human-sounding Voice AI phone agents to answer course curriculum inquiries 24/7 across multiple time zones.",
    summaryAr:
      "أكاديمية تعليمية دولية أطلقت مساعدين صوتيين فوريين بالذكاء الاصطناعي للرد على استفسارات المناهج وشروط التسجيل على مدار الساعة.",
    challenge:
      "Prospective students calling after office hours were hitting voicemail, resulting in high drop-off and lost enrollments to competing universities.",
    challengeAr:
      "فقدان مئات الطلاب الراغبين في التسجيل بسبب الاتصال خارج أوقات العمل الرسمية وتحويلهم للبريد الصوتي دون رد مباشر.",
    solution:
      "Configured Linala Multilingual Voice AI with custom course knowledge bases. The Voice AI answers phone inquiries in sub-600ms, explains course modules, answers fee questions, and automatically texts application links over WhatsApp.",
    solutionAr:
      "تجهيز تقنية الصوت الذكي من لينالا بقاعدة معرفية شاملة للمقررات والرسوم للرد فورياً في أقل من 600ms وإرسال رابط التقديم لـ WhatsApp الطالب أثناء المكالمة.",
    heroMetric: "+240%",
    heroMetricLabel: "Admissions Inquiries Handled",
    heroMetricLabelAr: "زيادة معالجة طلبات القبول",
    metrics: [
      { label: "24/7 Call Answer Rate", labelAr: "معدل الرد الفوري 24/7", value: "99.8%", trend: "Zero missed calls", trendAr: "انعدام المكالمات الفائتة" },
      { label: "Application Submissions", labelAr: "طلبات التسجيل المكتملة", value: "+88%", trend: "Direct from WhatsApp", trendAr: "مباشرة من الواتساب" },
      { label: "Cost Per Enrollment", labelAr: "تكلفة تسجيل الطالب", value: "-38%", trend: "Lower support overhead", trendAr: "انخفاض تكاليف الدعم" },
    ],
    testimonial: {
      quote:
        "Students are amazed when our AI phone assistant answers instantly at midnight, speaks fluent English or Hindi, and sends the brochure to their WhatsApp before they hang up.",
      quoteAr:
        "ينبهر الطلاب عندما يرد المساعد الذكي في منتصف الليل بطلاقة ويرسل كتيب البرنامج إلى واتساب قبل انتهاء المكالمة.",
      author: "Prof. Arthur Pendelton",
      role: "Dean of Admissions",
      roleAr: "عميد شؤون القبول والتسجيل",
      company: "EduSkill Global",
    },
    technologies: ["Realtime Voice AI (WebRTC)", "OpenAI GPT-4o", "Deepgram STT", "Automated WhatsApp Brochure Dispatch"],
    duration: "30 Days Implementation",
    durationAr: "تنفيذ خلال 30 يوماً",
  },
  {
    id: "saasflow-b2b",
    company: "CloudCore B2B Logistics",
    logoText: "CC",
    industry: "B2B SaaS & Enterprise",
    industryAr: "الخدمات اللوجستية والشركات",
    category: "b2b",
    title: "CloudCore Accelerates Enterprise Deal Velocity by 55% with Multi-Agent Inbox",
    titleAr: "كلاود كور تسرّع إغلاق الصفقات بـ 55% عبر صندوق الوارد المشترك متعدد الوكلاء",
    location: "London, UK",
    locationAr: "لندن، المملكة المتحدة",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    summary:
      "Enterprise supply chain software provider consolidated partner communication, quotation approvals, and SLA tickets in a unified multi-agent WhatsApp inbox.",
    summaryAr:
      "مزود برمجيات سلاسل الإمداد وحّد اتصالات الشركاء والموافقات على عروض الأسعار وتذاكر الدعم في صندوق وارد واتساب مشترك.",
    challenge:
      "SLA updates were fragmented across scattered personal WhatsApp chats and unmonitored email threads, leading to customer frustration and renewal risks.",
    challengeAr:
      "تشتت محادثات الدعم والاتفاقيات عبر أرقام واتساب شخصية غير مركزية، مما سبب تأخر الردود وتراجع رضا الشركاء.",
    solution:
      "Standardized all partner communication on an official Meta Cloud API WhatsApp business number with collision avoidance, shared canned snippets, and Zapier sync into Salesforce.",
    solutionAr:
      "توحيد قنوات المراسلة عبر رقم WhatsApp رسمي معتمد من Meta Cloud API مع منع التضارب بين الموظفين والردود السريعة الجاهزة والمزامنة مع Salesforce.",
    heroMetric: "+55%",
    heroMetricLabel: "Faster Deal Closure",
    heroMetricLabelAr: "تسريع إغلاق الصفقات",
    metrics: [
      { label: "First Response SLA", labelAr: "سرعة أول استجابة", value: "< 4 mins", trend: "98% SLA compliance", trendAr: "التزام بنسبة 98%" },
      { label: "Customer Retention", labelAr: "استبقاء العملاء", value: "98.5%", trend: "Annual renewal rate", trendAr: "تجديد سنوي قياسي" },
      { label: "Salesforce CRM Sync", labelAr: "مزامنة Salesforce", value: "100%", trend: "Automated audit logs", trendAr: "سجلات آلية متطابقة" },
    ],
    testimonial: {
      quote:
        "Linala gave our enterprise account managers the superpower of collaborative WhatsApp chat with full enterprise security and compliance tracking.",
      quoteAr:
        "منحت لينالا مديري الحسابات لدينا قوة العمل الجماعي في محادثات واتساب مع أعلى معايير الأمان المؤسسي والامتثال.",
      author: "Marcus Vance",
      role: "Head of Customer Experience",
      roleAr: "رئيس تجربة العملاء",
      company: "CloudCore Logistics",
    },
    technologies: ["Multi-Agent Shared Inbox", "Salesforce Two-Way Sync", "Agent Collision Prevention", "Canned Response Library"],
    duration: "40 Days Implementation",
    durationAr: "تنفيذ خلال 40 يوماً",
  },
];

const CaseStudies: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeStudyModal, setActiveStudyModal] = useState<CaseStudy | null>(null);

  const categories = [
    { id: "all", label: "All Industries", labelAr: "جميع القطاعات" },
    { id: "ecommerce", label: "E-Commerce & Retail", labelAr: "التجارة الإلكترونية والتجزئة" },
    { id: "restaurant", label: "Restaurant RMS & Food", labelAr: "المطاعم ونظام RMS" },
    { id: "healthcare", label: "Healthcare & Clinics", labelAr: "الرعاية الصحية والعيادات" },
    { id: "realestate", label: "Real Estate", labelAr: "العقارات والتطوير" },
    { id: "edtech", label: "Education & Voice AI", labelAr: "التعليم والصوت الذكي" },
    { id: "b2b", label: "B2B & Enterprise", labelAr: "الشركات وB2B" },
  ];

  const filteredStudies =
    selectedCategory === "all"
      ? CASE_STUDIES
      : CASE_STUDIES.filter((study) => study.category === selectedCategory);

  return (
    <div className={`min-h-screen bg-white pt-20 ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="relative py-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "عائد استثمار مثبت ونتائج قياسية للمنشآت" : "Proven Enterprise ROI & Benchmarks"}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {isAr ? (
              <>
                كيف تنمو كبرى الشركات والعلامات مع{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  لينالا
                </span>
              </>
            ) : (
              <>
                How Leading Global Brands Scale with{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Linala
                </span>
              </>
            )}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "قصص نجاح واقعية، ومعدلات تحويل قياسية، وأثر مالي ملموس عبر أكثر من 4 دول و12 قطاعاً تجارياً حيوياً."
              : "Real enterprise transformations, verified conversion benchmarks, and measurable revenue impact across 4+ countries and 12+ industries."}
          </p>

          {/* Macro Metric Highlights */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-purple-600">310%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {isAr ? "متوسط العائد في 90 يوماً" : "Average ROI in 90 Days"}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-indigo-600">&lt; 30s</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {isAr ? "سرعة أول استجابة للعميل" : "First Response Speed"}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-pink-600">94.8%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {isAr ? "معدل قراءة رسائل الواتساب" : "Average WhatsApp Read Rate"}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-emerald-600">64%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {isAr ? "انخفاض تكاليف خدمة العملاء" : "Support Overhead Reduction"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 bg-white border-b border-slate-100 sticky top-16 z-30 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                {isAr ? cat.labelAr : cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            >
              {/* Card Image & Badges */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={study.image}
                  alt={study.company}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                
                <div className="absolute top-4 left-4 rtl:right-4 rtl:left-auto flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-800 shadow-xs">
                    {isAr ? study.industryAr : study.industry}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-600/90 backdrop-blur-sm text-xs font-bold text-white shadow-xs">
                    {isAr ? study.locationAr : study.location}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-medium text-purple-200 mb-0.5">{study.company}</p>
                  <h3 className="text-lg sm:text-xl font-bold leading-snug line-clamp-2">
                    {isAr ? study.titleAr : study.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {isAr ? study.summaryAr : study.summary}
                  </p>

                  {/* Primary Metrics Grid */}
                  <div className="mt-6 grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="col-span-1 text-center border-r rtl:border-r-0 rtl:border-l border-slate-200/80 pr-2 rtl:pr-0 rtl:pl-2">
                      <p className="text-xl sm:text-2xl font-extrabold text-purple-600">
                        {study.heroMetric}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                        {isAr ? study.heroMetricLabelAr : study.heroMetricLabel}
                      </p>
                    </div>
                    {study.metrics.slice(0, 2).map((m, mIdx) => (
                      <div key={mIdx} className="text-center px-1">
                        <p className="text-sm sm:text-base font-bold text-slate-800">{m.value}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                          {isAr ? m.labelAr : m.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Customer Quote Snippet */}
                  <div className="mt-5 p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-700 italic relative">
                    <Quote className="w-4 h-4 text-purple-400 absolute top-2 right-2 rtl:left-2 rtl:right-auto opacity-50" />
                    "{isAr ? study.testimonial.quoteAr : study.testimonial.quote}"
                    <div className="not-italic font-bold text-slate-900 mt-2">
                      — {study.testimonial.author},{" "}
                      <span className="text-slate-500 font-normal">
                        {isAr ? study.testimonial.roleAr : study.testimonial.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5 max-w-[65%]">
                    {study.technologies.slice(0, 2).map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveStudyModal(study)}
                    className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer group-hover:translate-x-0.5"
                  >
                    <span>{isAr ? "اقرأ القصة كاملة" : "Read Full Story"}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Detail Modal */}
      {activeStudyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative" dir={isAr ? "rtl" : "ltr"}>
            <button
              onClick={() => setActiveStudyModal(null)}
              className="absolute top-5 right-5 rtl:left-5 rtl:right-auto p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3">
                  {isAr
                    ? `${activeStudyModal.industryAr} • ${activeStudyModal.locationAr}`
                    : `${activeStudyModal.industry} • ${activeStudyModal.location}`}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {isAr ? activeStudyModal.titleAr : activeStudyModal.title}
                </h3>
              </div>

              {/* Metrics Showcase */}
              <div className="grid grid-cols-3 gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100">
                {activeStudyModal.metrics.map((m, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xl sm:text-2xl font-black text-purple-700">{m.value}</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {isAr ? m.labelAr : m.label}
                    </p>
                    <p className="text-[10px] text-purple-600 font-medium">
                      {isAr ? m.trendAr : m.trend}
                    </p>
                  </div>
                ))}
              </div>

              {/* Problem vs Solution */}
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-red-600">
                    {isAr ? "التحدي والمشكلة السابقة" : "The Challenge"}
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {isAr ? activeStudyModal.challengeAr : activeStudyModal.challenge}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-emerald-700">
                    {isAr ? "الحل المقدم من منصة لينالا" : "The Linala Solution"}
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {isAr ? activeStudyModal.solutionAr : activeStudyModal.solution}
                  </p>
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isAr ? "البنية التقنية والأنظمة المستخدمة" : "Architecture & Technologies Used"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeStudyModal.technologies.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-purple-100/60 text-purple-800 text-xs font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white">
                <p className="italic text-xs sm:text-sm text-slate-200 leading-relaxed">
                  "{isAr ? activeStudyModal.testimonial.quoteAr : activeStudyModal.testimonial.quote}"
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{activeStudyModal.testimonial.author}</p>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? activeStudyModal.testimonial.roleAr : activeStudyModal.testimonial.role},{" "}
                      {activeStudyModal.testimonial.company}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                    {isAr ? "عميل موثق" : "Verified Customer"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveStudyModal(null)}
                  className="rounded-xl text-xs"
                >
                  {isAr ? "إغلاق" : "Close"}
                </Button>
                <Link href="/contact">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">
                    {isAr ? "طلب حل وتطبيق مماثل" : "Request Similar Implementation"}
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5 rtl:mr-1.5 rtl:ml-0 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isAr ? "هل أنت مستعد لصناعة قصة نجاح مؤسستك عبر واتساب؟" : "Ready to Build Your Own WhatsApp Success Story?"}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "انضم إلى آلاف الشركات المبتكرة. تواصل مع مهندسي الحلول لدينا لتخطيط مساراتك المؤتمتة واستراتيجية الصوت بالذكاء الاصطناعي."
              : "Join thousands of forward-thinking businesses. Connect with our solution engineers to map out your automated flows and Voice AI strategy."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl px-7 py-3.5 h-12 shadow-lg shadow-purple-500/25">
                {isAr ? "ابدأ التجربة المجانية لـ 14 يوماً" : "Start Free 14-Day Trial"}
                <ArrowRightIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/60 text-white hover:bg-slate-800 rounded-xl px-7 py-3.5 h-12"
              >
                {isAr ? "حجز جلسة استشارية للبنية التقنية" : "Schedule Solution Architecture Call"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CaseStudies;
