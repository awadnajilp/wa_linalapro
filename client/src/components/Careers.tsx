import React, { useState } from "react";
import { Link } from "wouter";
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Zap,
  Globe,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

interface JobOpening {
  id: string;
  title: string;
  titleAr: string;
  department: string;
  departmentAr: string;
  location: string;
  locationAr: string;
  type: string;
  typeAr: string;
  experience: string;
  experienceAr: string;
  summary: string;
  summaryAr: string;
  responsibilities: string[];
  responsibilitiesAr: string[];
  requirements: string[];
  requirementsAr: string[];
  badge: string;
  badgeAr: string;
}

const OPEN_POSITIONS: JobOpening[] = [
  {
    id: "bde",
    title: "Business Development Executive",
    titleAr: "مسؤول تطوير الأعمال (BDE)",
    department: "Sales & Growth",
    departmentAr: "المبيعات والنمو",
    location: "India / KSA / Bahrain / Remote",
    locationAr: "السعودية / البحرين / الهند / عن بُعد",
    type: "Full-time",
    typeAr: "دوام كامل",
    experience: "1-3 Years",
    experienceAr: "1-3 سنوات",
    badge: "Hot Opening",
    badgeAr: "شواغر عاجلة",
    summary:
      "Drive outbound pipeline generation, engage high-growth SMB and enterprise prospects, and showcase Linala's WhatsApp CRM & Voice AI solutions.",
    summaryAr:
      "قيادة توليد الفرص البيعية والتواصل مع الشركات النامية والمؤسسات الكبرى لعرض حلول إدارة علاقات العملاء عبر واتساب والذكاء الاصطناعي الصوتي من لينالا.",
    responsibilities: [
      "Identify, prospect, and qualify outbound leads across target industries (E-Commerce, Real Estate, Healthcare, EdTech)",
      "Execute consultative discovery calls and product demos over Zoom/Google Meet",
      "Collaborate with sales leadership to exceed monthly and quarterly SQL and revenue targets",
      "Maintain active pipeline records and deal velocity metrics in Linala CRM",
    ],
    responsibilitiesAr: [
      "تحديد وتأهيل العملاء المحتملين عبر القطاعات المستهدفة (التجارة الإلكترونية، العقارات، الرعاية الصحية، التقنية التعليمية)",
      "إجراء مكالمات استشارية وعروض توضيحية للمنصة عبر زووم وجوجل ميت",
      "التعاون مع إدارة المبيعات لتجاوز أهداف الإيرادات والفرص البيعية المؤهلة شهرياً وربع سنوياً",
      "تسجيل وتحديث بيانات الصفقات ومراحلها بدقة داخل نظام لينالا CRM",
    ],
    requirements: [
      "1-3 years of proven experience in B2B SaaS, IT sales, or digital solutions",
      "Exceptional verbal and written communication skills in English (Arabic/Hindi is a strong plus)",
      "Self-driven mindset with a passion for conversational marketing and AI technology",
      "Familiarity with CRM tools and consultative selling methodologies",
    ],
    requirementsAr: [
      "خبرة 1-3 سنوات في مبيعات B2B SaaS، أو تقنية المعلومات، أو الحلول الرقمية",
      "مهارات تواصل شفهية وكتابية ممتازة (اللغة العربية والإنجليزية)",
      "شغف بالتقنيات الحديثة والتسويق التحادثي والذكاء الاصطناعي",
      "إلمام بأنظمة CRM وأساليب البيع الاستشاري الحديثة",
    ],
  },
  {
    id: "sales-counselor",
    title: "Sales Counselor",
    titleAr: "مستشار مبيعات وحلول أعمال",
    department: "Customer Advisory",
    departmentAr: "استشارات العملاء",
    location: "India / KSA / Remote",
    locationAr: "السعودية / الهند / عن بُعد",
    type: "Full-time",
    typeAr: "دوام كامل",
    experience: "1-4 Years",
    experienceAr: "1-4 سنوات",
    badge: "Immediate Hire",
    badgeAr: "توظيف فوري",
    summary:
      "Guide incoming inquiries and qualified business owners to understand the optimal WhatsApp Meta Cloud API and Voice AI architecture for their specific workflow.",
    summaryAr:
      "إرشاد العملاء وأصحاب المنشآت لفهم البنية المثالية لـ Meta Cloud API وتقنيات الصوت الذكي المناسبة لمجالات أعمالهم.",
    responsibilities: [
      "Conduct in-depth advisory sessions with business owners evaluating WhatsApp marketing & voice automation",
      "Recommend tailored pricing tiers, messaging volume packages, and custom flow setups",
      "Address technical and onboarding questions to ensure rapid customer time-to-value",
      "Nurture trial users into committed long-term enterprise subscriptions",
    ],
    responsibilitiesAr: [
      "إجراء جلسات استشارية متعمقة مع أصحاب الشركات الراغبين في أتمتة الواتساب والمكالمات الصوتية",
      "اقتراح باقات الأسعار وحزم الرسائل ومسارات العمل المناسبة لحجم العميل",
      "الإجابة عن الاستفسارات التقنية وتسهيل عملية الانضمام السريع للعملاء الجدد",
      "متابعة المستخدمين في الفترة التجريبية لتحويلهم إلى اشتراكات سنوية ومؤسسية مستدامة",
    ],
    requirements: [
      "Proven track record in client counseling, sales advisory, or EdTech/SaaS customer consultation",
      "Strong empathetic listening and problem-solving abilities",
      "Ability to articulate complex technical workflows in simple, business-friendly terms",
      "Bachelor's degree or equivalent practical experience",
    ],
    requirementsAr: [
      "سجل موثوق في الاستشارات البيعية أو مبيعات البرمجيات SaaS",
      "قدرة عالية على الاستماع وفهم متطلبات العميل وحل المشكلات",
      "القدرة على تبسيط وشرح المفاهيم التقنية المعقدة بلغة تجارية واضحة",
      "شهادة بكالوريوس أو خبرة عملية معادلة",
    ],
  },
  {
    id: "meta-digital-marketer",
    title: "Meta Certified Digital Marketing Associate",
    titleAr: "أخصائي تسويق رقمي معتمد من Meta",
    department: "Performance Marketing",
    departmentAr: "التسويق بالأداء والنمو",
    location: "United Kingdom / India / Remote",
    locationAr: "المملكة المتحدة / الهند / عن بُعد",
    type: "Full-time",
    typeAr: "دوام كامل",
    experience: "2-4 Years",
    experienceAr: "2-4 سنوات",
    badge: "Meta Specialist",
    badgeAr: "خبير Meta",
    summary:
      "Own Meta Ads and Click-to-WhatsApp campaign strategies, driving high-converting inbound leads and helping clients maximize ROAS through automated WhatsApp flows.",
    summaryAr:
      "إدارة استراتيجيات إعلانات Meta وحملات النقر إلى واتساب (CTWA) لتحقيق أعلى عائد على الإنفاق الإعلاني (ROAS) عبر مسارات واتساب المؤتمتة.",
    responsibilities: [
      "Plan, launch, and optimize high-converting Click-to-WhatsApp (CTWA) and lead generation campaigns on Meta Ads Manager",
      "Design A/B test experiments for ad creatives, headlines, target audiences, and WhatsApp welcome flows",
      "Track full-funnel attribution from first ad impression to closed WhatsApp deal",
      "Produce actionable monthly performance reports and ROAS benchmarks",
    ],
    responsibilitiesAr: [
      "تخطيط وإطلاق وتحسين إعلانات Click-to-WhatsApp وتوليد العملاء المحتملين عبر Meta Ads Manager",
      "تصميم اختبارات A/B للصور والنصوص والفئات المستهدفة ومسارات الترحيب التلقائية في واتساب",
      "تتبع مسار التحويل الكامل من أول ظهور للإعلان حتى إتمام الصفقة في واتساب",
      "إعداد تقارير شهرية لقياس الأداء وتحليل العائد على الإنفاق الإعلاني",
    ],
    requirements: [
      "Official Meta Certification (Media Buying, Digital Marketing Associate, or Marketing Science)",
      "2+ years of hands-on experience managing substantial ad budgets on Meta Ads Manager",
      "Deep understanding of Meta Pixel, Conversions API (CAPI), and CTWA ad mechanics",
      "Analytical mindset with expertise in Google Analytics 4, Looker Studio, and CRM attribution",
    ],
    requirementsAr: [
      "شهادة معتمدة من Meta (شراء الوسائط الإعلانية أو علوم التسويق الرقمي)",
      "خبرة لا تقل عن سنتين في إدارة ميزانيات إعلانية ضخمة عبر منصة إعلانات Meta",
      "فهم عميق لـ Meta Pixel وConversions API (CAPI) وآليات إعلانات النقر لواتساب",
      "مهارات تحليلية قوية وخبرة في Google Analytics وLooker Studio وأنظمة تتبع الـ CRM",
    ],
  },
  {
    id: "account-manager",
    title: "Account Manager",
    titleAr: "مدير حسابات عملاء رئيسيين",
    department: "Customer Success",
    departmentAr: "نجاح العملاء",
    location: "Bahrain / KSA / UK / Remote",
    locationAr: "السعودية / البحرين / بريطانيا / عن بُعد",
    type: "Full-time",
    typeAr: "دوام كامل",
    experience: "2-5 Years",
    experienceAr: "2-5 سنوات",
    badge: "Key Role",
    badgeAr: "وظيفة رئيسية",
    summary:
      "Nurture relationships with key enterprise accounts, ensure high customer satisfaction, drive platform adoption, and manage renewals and upsells.",
    summaryAr:
      "بناء وتعزيز العلاقات مع كبار العملاء والشركات، وضمان رضاهم الكامل عن المنصة، وإدارة عمليات تجديد الاشتراكات والتوسعات.",
    responsibilities: [
      "Act as the primary strategic partner and trusted advisor for high-tier enterprise clients",
      "Conduct regular quarterly business reviews (QBRs) and deliver usage optimization recommendations",
      "Identify opportunities for plan upgrades, additional channel add-ons, and voice AI minutes",
      "Coordinate with engineering and support teams to resolve enterprise client escalations swiftly",
    ],
    responsibilitiesAr: [
      "العمل كشريك استراتيجي ومستشار موثوق لكبار العملاء والمؤسسات",
      "إجراء مراجعات دورية ربع سنوية وتقديم توصيات لرفع كفاءة الاستخدام والمبيعات",
      "تحديد فرص ترقية الباقات وإضافة قنوات جديدة ودقائق الذكاء الاصطناعي الصوتي",
      "التنسيق مع فرق الهندسة والدعم الفني لحل متطلبات العملاء الكبار بسرعة فائقة",
    ],
    requirements: [
      "2+ years in SaaS Account Management, Client Relationship Management, or Customer Success",
      "Strong relationship-building, negotiation, and contract renewal skills",
      "Experience working with enterprise clients in the GCC, UK, or APAC markets",
      "Proactive, solution-oriented approach with high attention to customer metrics",
    ],
    requirementsAr: [
      "خبرة سنتين فأكثر في إدارة الحسابات أو نجاح العملاء في قطاع برمجيات SaaS",
      "مهارات تفاوض وبناء علاقات قوية وتجديد العقود التجارية",
      "خبرة في التعامل مع عملاء ومؤسسات في أسواق دول الخليج أو بريطانيا",
      "نهج استباقي يركز على الحلول ومؤشرات رضا العميل ومعدلات الاستبقاء",
    ],
  },
  {
    id: "sales-manager",
    title: "Sales Manager",
    titleAr: "مدير مبيعات إقليمي",
    department: "Sales Leadership",
    departmentAr: "قيادة المبيعات",
    location: "KSA / Bahrain / India / UK",
    locationAr: "السعودية / البحرين / الهند / بريطانيا",
    type: "Full-time",
    typeAr: "دوام كامل",
    experience: "4-7 Years",
    experienceAr: "4-7 سنوات",
    badge: "Leadership",
    badgeAr: "قيادة تنفيذية",
    summary:
      "Lead, mentor, and scale our regional sales teams across Middle East, UK, and Asia-Pacific markets to achieve aggressive revenue targets.",
    summaryAr:
      "قيادة وتدريب وتوسيع فرق المبيعات الإقليمية عبر أسواق الشرق الأوسط وبريطانيا وآسيا لتحقيق مستهدفات النمو والإيرادات.",
    responsibilities: [
      "Manage and coach a high-performing team of Business Development Executives and Sales Counselors",
      "Define regional go-to-market strategies, sales quotas, and revenue forecasting models",
      "Participate in high-value enterprise deal negotiations and strategic client pitches",
      "Optimize the sales pipeline conversion rates and shorten overall deal closing cycles",
    ],
    responsibilitiesAr: [
      "إدارة وتوجيه فريق عالي الكفاءة من مسؤولي تطوير الأعمال ومستشاري المبيعات",
      "تحديد استراتيجيات الدخول للأسواق وحصص المبيعات ونماذج التنبؤ بالإيرادات",
      "المشاركة في إغلاق الصفقات الكبرى وتقديم العروض للشركات والمؤسسات الضخمة",
      "تحسين معدلات التحويل في مسار المبيعات وتقليص دورة إغلاق الصفقات",
    ],
    requirements: [
      "4+ years of B2B sales experience with at least 2 years in a leadership/managerial capacity in SaaS/Tech",
      "Demonstrated history of consistently achieving or exceeding team ARR targets",
      "Strong understanding of the GCC, UK, or South Asian SaaS and business messaging ecosystem",
      "Inspiring leadership style with strong data-driven pipeline management skills",
    ],
    requirementsAr: [
      "خبرة 4 سنوات فأكثر في مبيعات B2B مع سنتين على الأقل في منصب قيادي/إداري في قطاع التقنية أو SaaS",
      "سجل مثبت في تحقيق وتجاوز مستهدفات الإيرادات السنوية المتكررة (ARR)",
      "فهم عميق لقطاع البرمجيات وحلول المراسلة في دول الخليج والمملكة المتحدة",
      "أسلوب قيادي ملهم مع خبرة في إدارة خطوط المبيعات بالاعتماد على البيانات",
    ],
  },
];

export const Careers: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicantData, setApplicantData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    experience: "",
    coverNote: "",
  });

  const handleOpenApply = (job: JobOpening) => {
    setSelectedJob(job);
    setIsApplying(true);
  };

  const handleCloseModal = () => {
    setIsApplying(false);
    setSelectedJob(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate application dispatch to backend contact/career endpoint
    try {
      const res = await fetch("/api/contact/sendmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: applicantData.name,
          email: applicantData.email,
          company: `Application for ${selectedJob?.title}`,
          subject: `Job Application: ${selectedJob?.title} - ${applicantData.name}`,
          message: `Phone: ${applicantData.phone}\nLinkedIn: ${applicantData.linkedin}\nExperience: ${applicantData.experience}\nNote: ${applicantData.coverNote}`,
        }),
      });

      toast({
        title: isAr ? "تم إرسال طلب التقديم بنجاح" : "Application Submitted Successfully",
        description: isAr
          ? `شكراً لتقديمك على وظيفة ${selectedJob?.titleAr || selectedJob?.title}. سيقوم فريق الموارد البشرية بمراجعة ملفك والتواصل معك.`
          : `Thank you for applying for the ${selectedJob?.title} position. Our talent team will review your profile!`,
      });
      handleCloseModal();
      setApplicantData({
        name: "",
        email: "",
        phone: "",
        linkedin: "",
        experience: "",
        coverNote: "",
      });
    } catch {
      toast({
        title: isAr ? "تم استلام الطلب" : "Application Received",
        description: isAr
          ? "تم تسجيل بيانات طلبك وسيتواصل معك فريق الاستقطاب قريباً."
          : "Your application has been logged. Our HR team will reach out soon.",
      });
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-white ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "نستقطب الكفاءات والخبرات المتميزة" : "We Are Hiring Global Talent"}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {isAr ? (
              <>
                شارك في بناء مستقبل{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  الذكاء الاصطناعي للشركات
                </span>
              </>
            ) : (
              <>
                Build the Future of{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Enterprise Conversational AI
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "انضم إلى فريق دولي سريع النمو ينشط في المملكة العربية السعودية، والبحرين، وبريطانيا، والهند. نحن نتوسع بقوة ونبحث عن قادة شغوفين بالابتكار."
              : "Join a fast-paced, international team operating across India, Bahrain, Saudi Arabia, and the UK. We are scaling rapidly and looking for passionate leaders."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>{isAr ? "+4 مراكز دولية" : "4+ International Hubs"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? "بيئة عمل مرنة وعن بُعد" : "Remote & Hybrid Culture"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? "حوافز ومكافآت تنافسية" : "Competitive Compensation"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Open Vacancies Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-3 border border-purple-200">
            <Briefcase className="w-3.5 h-3.5" />
            {isAr ? "الشواغر والوظائف المتاحة" : "Active Job Openings"}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "الوظائف المتاحة حالياً" : "Available Positions"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAr
              ? "استعرض الفرص الوظيفية الشاغرة وقدّم سيرتك الذاتية مباشرة إلى فريق الاستقطاب لدينا."
              : "Explore our open roles below and apply directly to our recruitment team."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
          {OPEN_POSITIONS.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {isAr ? job.departmentAr : job.department}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {isAr ? job.badgeAr : job.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {isAr ? job.titleAr : job.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isAr ? job.summaryAr : job.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isAr ? job.locationAr : job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isAr ? job.typeAr : job.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-pink-600" />
                    <span>{isAr ? `الخبرة: ${job.experienceAr}` : `Exp: ${job.experience}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <Button
                  onClick={() => handleOpenApply(job)}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-xs sm:text-sm px-6 py-3 h-11 shadow-xs group-hover:shadow-md transition-all w-full md:w-auto"
                >
                  <span>{isAr ? "قدّم الآن" : "Apply Now"}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 rtl:mr-1.5 rtl:ml-0 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application Modal */}
      {isApplying && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200" dir={isAr ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  {isAr ? selectedJob.departmentAr : selectedJob.department}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {isAr ? `التقديم على وظيفة: ${selectedJob.titleAr}` : `Apply for ${selectedJob.title}`}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? "الاسم الكامل *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantData.name}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, name: e.target.value })
                    }
                    placeholder={isAr ? "محمد عبد الله" : "John Doe"}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? "البريد الإلكتروني *" : "Email Address *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={applicantData.email}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? "رقم الهاتف / واتساب *" : "Phone / WhatsApp *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={applicantData.phone}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, phone: e.target.value })
                    }
                    placeholder="+966 50 123 4567"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? "سنوات الخبرة *" : "Years of Experience *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantData.experience}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, experience: e.target.value })
                    }
                    placeholder={isAr ? "مثال: 3 سنوات" : "e.g. 3 Years"}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? "رابط الملف الشخصي على لينكد إن (LinkedIn)" : "LinkedIn Profile URL"}
                </label>
                <input
                  type="url"
                  value={applicantData.linkedin}
                  onChange={(e) =>
                    setApplicantData({ ...applicantData, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? "نبذة تعريفية وأبرز الإنجازات" : "Brief Introduction & Key Achievements"}
                </label>
                <textarea
                  rows={3}
                  value={applicantData.coverNote}
                  onChange={(e) =>
                    setApplicantData({ ...applicantData, coverNote: e.target.value })
                  }
                  placeholder={
                    isAr
                      ? "أخبرنا عن إنجازاتك السابقة، والمهارات المناسبة، ولماذا ترغب في الانضمام إلى لينالا..."
                      : "Tell us about your recent wins, relevant skills, and why you'd be a great fit for Linala..."
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-500/20 text-xs sm:text-sm"
                >
                  {isSubmitting
                    ? isAr
                      ? "جاري إرسال الطلب..."
                      : "Submitting Application..."
                    : isAr
                    ? "إرسال طلب التقديم"
                    : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Careers;
