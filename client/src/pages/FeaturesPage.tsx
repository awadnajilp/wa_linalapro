import React from "react";
import { Link } from "wouter";
import {
  Bot,
  Zap,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
  Layers,
  Cpu,
  BarChart3,
  Lock,
  Headphones,
  FileCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export const FeaturesPage: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";

  const features = [
    {
      icon: Radio,
      title: "Real-Time AI Voice Autopilot",
      titleAr: "المساعد الصوتي الذكي فائق السرعة",
      badge: "Flagship 2026",
      badgeAr: "إصدار 2026",
      badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
      description:
        "Human-parity voice AI with sub-600ms latency. Speaks in 40+ global languages natively with realistic turn-taking, objection handling, and real-time CRM data extraction.",
      descriptionAr:
        "صوت ذكي فوري بزمن استجابة أقل من 600ms يحاكي الإنسان. يدعم أكثر من 40 لغة بطلاقة مع التعامل مع الاعتراضات وتحديث بيانات الـ CRM لحظياً.",
      bullets: [
        "WebRTC ultra-low latency audio pipeline",
        "Natural interruptions, tone modulation & dynamic script branches",
        "Instant post-call transcriptions, summaries & CRM stage updates",
        "Automated fallback to WhatsApp message with meeting notes",
      ],
      bulletsAr: [
        "بنية WebRTC فائقة السرعة لمكالمات صوتية بدون تأخير",
        "مقاطعة طبيعية وتعديل النبرة وتفرع ذكي حسب إجابات العميل",
        "تفريغ نصي فوري وتلخيص المكالمة وتحديث مرحلة الصفقة",
        "إرسال ملخص المكالمة ورابط المتابعة تلقائياً على واتساب",
      ],
    },
    {
      icon: Workflow,
      title: "Omnichannel CRM & Stage Cadence",
      titleAr: "لوحة CRM التفاعلية ومسارات المتابعة",
      badge: "Core Platform",
      badgeAr: "النواة المركزية",
      badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
      description:
        "A fast Kanban-style deal pipeline designed specifically for WhatsApp and omnichannel selling. Drag-and-drop deals to automatically trigger targeted follow-up cadences.",
      descriptionAr:
        "لوحة صفقات Kanban سريعة مصممة خصيصاً لمبيعات واتساب والقنوات المتعددة. اسحب الصفقات لتشغيل سلاسل المتابعة التلقائية فوراً.",
      bullets: [
        "Automated WhatsApp message triggers when deals move stages",
        "Custom fields, tags, deal value metrics & collision locks",
        "Round-robin lead distribution across sales reps",
        "Automated cadence badges on Kanban stage columns",
      ],
      bulletsAr: [
        "إطلاق رسائل واتساب تلقائية فور تحريك الصفقات بين المراحل",
        "حقول مخصصة، وسوم، وقيم مالية مع قفل لمنع تضارب المناديب",
        "توزيع الفرص البيعية بالتناوب (Round-Robin) على فريق المبيعات",
        "شارات المسارات التلقائية موضحة على أعمدة المراحل",
      ],
    },
    {
      icon: Zap,
      title: "Visual Flow Builder & Bots",
      titleAr: "منشئ المسارات البصري والمحادثات الآلية",
      badge: "No-Code",
      badgeAr: "بدون كود",
      badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      description:
        "Build sophisticated conversational journeys with our visual drag-and-drop canvas. Integrate conditional branches, API webhooks, media dispatch, and human handoff.",
      descriptionAr:
        "صمم رحلات محادثة احترافية عبر لوحة السحب والإفلات البصرية. ادمج الشروط المخصصة، والـ Webhooks، وإرسال الوسائط، والتحويل لموظف خدمة العملاء.",
      bullets: [
        "Drag-and-drop node canvas with live simulator",
        "REST API webhooks, condition rules & time delays",
        "Dynamic button & list menus natively rendered in WhatsApp",
        "Seamless bot-to-human agent routing",
      ],
      bulletsAr: [
        "لوحة عقد بصرية تفاعلية مع محاكي تجربة مباشر",
        "ربط واجهات REST API، وقواعد شرطية، ومؤقتات تأخير زمني",
        "أزرار تفاعلية وقوائم منسدلة تعمل داخل واتساب مباشرة",
        "تحويل سلس وفوري للمحادثة من الروبوت إلى الموظف البشري",
      ],
    },
    {
      icon: ShieldCheck,
      title: "Official Meta Cloud API Gateway",
      titleAr: "بوابة Meta Cloud API السحابية الرسمية",
      badge: "Meta Approved Partner",
      badgeAr: "معتمد من Meta",
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
      description:
        "Direct connection to Meta's Cloud API infrastructure. Enjoy highest throughput messaging tiers, green tick verification support, and official compliance protection.",
      descriptionAr:
        "ربط مباشر ورسمي مع بنية Meta السحابية. تمتع بأعلى سعات إرسال، ودعم توثيق الشارة الخضراء، وحماية كاملة ضد الحظر.",
      bullets: [
        "Tier 1 to Tier Unlimited messaging throughput",
        "Direct Meta Business Manager template sync & fast approval",
        "Zero risk of unofficial gateway bans or number blocks",
        "24/7 serverless uptime with 99.99% message delivery SLA",
      ],
      bulletsAr: [
        "سعات إرسال ضخمة من المستوى الأول إلى مستويات غير محدودة",
        "مزامنة واعتماد فوري لقوالب الرسائل من Meta Business Manager",
        "انعدام مخاطر حظر الأرقام المرتبطة بالبوابات غير الرسمية",
        "جاهزية سحابية على مدار الساعة مع ضمان تسليم 99.99%",
      ],
    },
    {
      icon: MessageSquare,
      title: "Multi-Agent Shared Inbox",
      titleAr: "صندوق الوارد الموحد متعدد الوكلاء",
      badge: "Collaboration",
      badgeAr: "العمل الجماعي",
      badgeColor: "bg-pink-100 text-pink-700 border-pink-200",
      description:
        "Unify all customer conversations across channels in one shared inbox. Equip your support and sales team with collision avoidance, private notes, and AI smart replies.",
      descriptionAr:
        "وحّد جميع محادثات العملاء عبر القنوات في صندوق وارد مركزي واحد. جهّز فريقك بميزات منع التضارب، والملاحظات الداخلية، والردود الذكية.",
      bullets: [
        "Live typing indicators & agent collision prevention",
        "Canned responses & keyboard shortcuts for 10x faster replies",
        "Private internal staff notes & teammate mentions",
        "Filter by channel, unassigned, tag, or assigned rep",
      ],
      bulletsAr: [
        "مؤشرات الكتابة المباشرة ومنع فتح المحادثة من موظفين في آن واحد",
        "ردود جاهزة واختصارات لوحة المفاتيح لرد أسرع بـ 10 أضعاف",
        "ملاحظات داخلية خاصة وإشارة للزملاء داخل المحادثة",
        "فلترة متقدمة حسب القناة، أو الوسم، أو الموظف المسؤول",
      ],
    },
    {
      icon: BarChart3,
      title: "Attribution & Revenue Analytics",
      titleAr: "تحليلات الأداء والعائد على الاستثمار",
      badge: "Intelligence",
      badgeAr: "تقارير ذكية",
      badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
      description:
        "Track end-to-end performance across broadcasts, flows, and voice calls. Measure real-time delivery rates, read rates, CTRs, and closed-won revenue attribution.",
      descriptionAr:
        "تتبع دقيق وشامل لأداء الحملات، والمسارات، والمكالمات الصوتية. قِس معدلات التسليم، والقراءة، ونسب النقر، والإيرادات المحققة في الوقت الفعلي.",
      bullets: [
        "Daily, weekly, and monthly message delivery & read rates",
        "Per-campaign ROI, link click tracking & conversion funnels",
        "Agent response time SLAs & team leaderboard metrics",
        "Exportable PDF and CSV reports for executive reviews",
      ],
      bulletsAr: [
        "معدلات يومية وأسبوعية وشهرية لنسب استلام وقراءة الرسائل",
        "عائد الاستثمار لكل حملة مع تتبع النقرات ومسار التحويل",
        "مؤشرات سرعة استجابة الموظفين ولوحة تصدر الفريق",
        "تقارير قابلة للتصدير بصيغة PDF وCSV لمراجعات الإدارة",
      ],
    },
  ];

  return (
    <div className={`min-h-screen bg-white ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "بنية تحتية رقمية مؤسسية لعام 2026" : "2026 Enterprise Architecture"}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {isAr ? (
              <>
                المنصة المتكاملة لأتمتة{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  محادثات العملاء بالذكاء الاصطناعي
                </span>
              </>
            ) : (
              <>
                The Complete Platform for{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Omnichannel AI Customer Engagement
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "كل ما تحتاجه المنشآت والشركات الحديثة لأتمتة المبيعات، وخدمة العملاء، والحملات الإعلانية عبر Meta Cloud API الرسمية ومكالمات الذكاء الاصطناعي الصوتي فائق السرعة."
              : "Everything modern enterprises need to automate sales, customer care, and marketing broadcasts with official Meta Cloud API reliability and ultra-low latency Voice AI."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-6 py-3 h-12 shadow-md shadow-purple-500/20">
                {isAr ? "استكشف المنصة بالكامل مجاناً" : "Explore Full Platform Free"}
                <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 py-3 h-12">
                {isAr ? "طلب عرض توضيحي للحلول" : "Request Solution Demo"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${feat.badgeColor}`}>
                      {isAr ? feat.badgeAr : feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {isAr ? feat.titleAr : feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {isAr ? feat.descriptionAr : feat.description}
                  </p>

                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    {(isAr ? feat.bulletsAr : feat.bullets).map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-slate-700">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link href="/signup" className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">
                    <span>{isAr ? `جرب ${feat.titleAr}` : `Try ${feat.title}`}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise Security & Infrastructure */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              {isAr ? "الموثوقية والأمان المؤسسي" : "Trust & Security"}
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {isAr ? "موثوقية وامتثال بمستوى المؤسسات الكبرى" : "Enterprise-Grade Reliability and Compliance"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isAr
                ? "مصممة للقطاعات الحيوية المنظمة وكبرى العلامات التجارية العالمية ذات الكثافة العالية."
                : "Designed for regulated industries and high-volume global brands."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Meta Approved Solution Provider",
                titleAr: "مزود حلول معتمد من Meta",
                desc: "100% compliant with Meta Business Policies & zero ban risks.",
                descAr: "توافق تام بنسبة 100% مع سياسات Meta للأعمال وانعدام مخاطر الحظر.",
              },
              {
                icon: Lock,
                title: "End-to-End Encryption",
                titleAr: "تشفير شامل للبيانات",
                desc: "Encrypted data in transit (TLS 1.3) and at rest (AES-256).",
                descAr: "تشفير البيانات أثناء النقل (TLS 1.3) وأثناء التخزين (AES-256).",
              },
              {
                icon: Globe,
                title: "GDPR & DPDP Ready",
                titleAr: "الامتثال للوائح حماية البيانات",
                desc: "Full data residency options, opt-out management, and privacy compliance.",
                descAr: "خيارات حفظ البيانات محلياً، وإدارة إلغاء الاشتراك، والامتثال للخصوصية.",
              },
              {
                icon: Cpu,
                title: "99.99% Uptime SLA",
                titleAr: "99.99% ضمان تشغيل الخدمة",
                desc: "Distributed microservices infrastructure with redundant fallback routes.",
                descAr: "بنية خدمات موزعة متكررة تضمن عدم انقطاع الخدمة نهائياً.",
              },
            ].map((sec, idx) => (
              <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <sec.icon className="w-8 h-8 text-purple-600 mb-4" />
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  {isAr ? sec.titleAr : sec.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isAr ? sec.descAr : sec.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {isAr ? "عزّز قنوات التواصل مع عملائك اليوم" : "Supercharge Your Customer Channels Today"}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "أنشئ حسابك في 60 ثانية واكتشف قوة التسويق التحادثي والصوت بالذكاء الاصطناعي."
              : "Create your account in 60 seconds and experience the future of conversational marketing and voice AI."}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-sm">
                {isAr ? "ابدأ مجاناً الآن" : "Get Started Free"}
                <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 h-12 text-sm">
                {isAr ? "تحدث مع مهندس حلول" : "Talk to an Architect"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
