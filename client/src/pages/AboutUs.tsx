import React, { useState } from "react";
import { Link } from "wouter";
import {
  Globe,
  Users,
  Target,
  Zap,
  ShieldCheck,
  TrendingUp,
  Building2,
  MapPin,
  Phone,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Radio,
  Workflow,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface OfficeBranch {
  name: string;
  nameAr?: string;
  address: string;
  addressAr?: string;
  phone: string;
  mapQuery: string;
}

interface CountryHub {
  country: string;
  countryAr: string;
  flag: string;
  region: string;
  regionAr: string;
  offices: OfficeBranch[];
}

const GLOBAL_HUBS: CountryHub[] = [
  {
    country: "Saudi Arabia (KSA)",
    countryAr: "المملكة العربية السعودية",
    flag: "🇸🇦",
    region: "Middle East & GCC Operations",
    regionAr: "عمليات الشرق الأوسط ودول الخليج",
    offices: [
      {
        name: "Jeddah Branch",
        nameAr: "فرع جدة",
        address: "Sharafiya, Jeddah, Kingdom of Saudi Arabia",
        addressAr: "حي الشرفية، جدة، المملكة العربية السعودية",
        phone: "+966 564955765",
        mapQuery: "Sharafiya, Jeddah, Saudi Arabia",
      },
      {
        name: "Al Khobar Branch",
        nameAr: "فرع الخبر",
        address: "4th St, Al Khobar, Kingdom of Saudi Arabia",
        addressAr: "الشارع الرابع، الخبر، المملكة العربية السعودية",
        phone: "+966 564955765",
        mapQuery: "4th St, Al Khobar, Saudi Arabia",
      },
    ],
  },
  {
    country: "Bahrain",
    countryAr: "مملكة البحرين",
    flag: "🇧🇭",
    region: "GCC Commercial Hub",
    regionAr: "المركز التجاري للخليج العربي",
    offices: [
      {
        name: "Manama Office",
        nameAr: "مكتب المنامة",
        address: "3rd Floor, Building 256, Office 302, Road 2705, Adliya, Bahrain",
        addressAr: "الطابق الثالث، مبنى 256، مكتب 302، طريق 2705، العدلية، البحرين",
        phone: "+973 7799 2124",
        mapQuery: "Building 256, Road 2705, Adliya, Bahrain",
      },
    ],
  },
  {
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    flag: "🇬🇧",
    region: "Europe & Global Strategy",
    regionAr: "أوروبا والاستراتيجية العالمية",
    offices: [
      {
        name: "UK Headquarters",
        nameAr: "المقر الرئيسي في المملكة المتحدة",
        address: "57, Grangemouth, FK3 8AW, United Kingdom",
        addressAr: "57، غرانجموث، FK3 8AW، المملكة المتحدة",
        phone: "+44 75 0007 1363",
        mapQuery: "57, Grangemouth, FK3 8AW, United Kingdom",
      },
    ],
  },
  {
    country: "India",
    countryAr: "الهند",
    flag: "🇮🇳",
    region: "Asia-Pacific Engineering & R&D",
    regionAr: "مركز الهندسة والبحث والتطوير لآسيا",
    offices: [
      {
        name: "Kerala Technology Centre",
        nameAr: "مركز كيرلا للتكنولوجيا والابتكار",
        address: "1st Floor, Vilakathil Arcade, No. 408, Mukkam Road, Areekode, Kerala 673639",
        addressAr: "الطابق الأول، فيلاكاثيل أركيد، طريق موكام، أريكود، كيرلا 673639",
        phone: "+91 90481 05191",
        mapQuery: "Vilakathil Arcade, Mukkam Road, Areekode, Kerala 673639, India",
      },
      {
        name: "Mumbai Commercial Branch",
        nameAr: "فرع مومباي التجاري",
        address: "44, Ashoka Shopping Centre, CST Area, Mumbai 400001, Maharashtra",
        addressAr: "44، مركز أشوكا التجاري، منطقة CST، مومباي 400001، ماهاراشترا",
        phone: "+91 90481 05191",
        mapQuery: "Ashoka Shopping Centre, CST Area, Mumbai 400001, India",
      },
    ],
  },
];

const AboutUs: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [selectedCountryIdx, setSelectedCountryIdx] = useState(0);
  const [selectedOfficeIdx, setSelectedOfficeIdx] = useState(0);

  const activeCountry = GLOBAL_HUBS[selectedCountryIdx];
  const activeOffice =
    activeCountry.offices[selectedOfficeIdx] || activeCountry.offices[0];

  const handleCountryChange = (idx: number) => {
    setSelectedCountryIdx(idx);
    setSelectedOfficeIdx(0);
  };

  return (
    <div className={`min-h-screen bg-white ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-purple-600" />
            {isAr
              ? "مزود حلول معتمد من Meta والذكاء الاصطناعي التحادثي للمنشآت"
              : "Global Enterprise Conversational AI & Meta Approved Solution Provider"}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {isAr ? (
              <>
                تمكين المنشآت والشركات عبر{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  محادثات ذكاء اصطناعي فائقة السرعة
                </span>
              </>
            ) : (
              <>
                Connecting Global Enterprises with{" "}
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Sub-Second AI Conversations
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "تأسست لينالا في عام 2025، وهي شركة تقنية دولية تقود أتمتة التسويق التحادثي، ومسارات المبيعات الذكية، ومكالمات الصوت بالذكاء الاصطناعي الفوري عبر أكثر من 4 دول و12 قطاعاً حيوياً."
              : "Founded in 2025, Linala is an international technology company powering conversational marketing, automated deal pipelines, and real-time Voice AI across 4+ countries and 12+ major industries."}
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">{isAr ? "+4 مراكز" : "4+ Hubs"}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr ? "السعودية، البحرين، بريطانيا والهند" : "India, Bahrain, KSA & UK"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{isAr ? "+12 قطاعاً" : "12+ Sectors"}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr ? "التجارة، العقارات، الصحة والمزيد" : "Retail, Real Estate, Health & more"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-pink-600">{isAr ? "+40 لغة" : "40+ Langs"}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr ? "صوت ذكي ومحادثات متعددة القنوات" : "Voice AI & Omnichannel Chat"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">99.99%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr ? "مستوى الخدمة لـ Meta Cloud API" : "Meta Cloud API Uptime SLA"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Story & Mission */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? "قصتنا وانطلاقتنا" : "Our Story & Origin"}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {isAr ? "من رؤية إقليمية إلى توسع عالمي متكامل" : "From Regional Vision to International Scale"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isAr
                ? "انطلقت لينالا في أوائل عام 2025 بقيادة نخبة من رواد الهندسة البرمجية بعد ملاحظة قصور بوابات المراسلة التقليدية وقوائم البريد الإلكتروني البطيئة عن تلبية متطلبات قطاع الأعمال الحديث."
                : "Launched in early 2025, Linala was founded by engineering leaders who recognized that legacy messaging gateways and slow, disjointed email queues were failing modern businesses."}
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isAr ? (
                <>
                  من خلال مراكزنا التشغيلية في{" "}
                  <strong>المملكة العربية السعودية، ومملكة البحرين، والمملكة المتحدة، وجمهورية الهند</strong>، قمنا
                  ببناء منصة موحدة تجمع بين البنية التحتية الرسمية لـ Meta Cloud API وتقنيات الصوت بالذكاء الاصطناعي الفوري
                  مع مسارات إدارة علاقات العملاء (CRM) المؤتمتة.
                </>
              ) : (
                <>
                  Starting across key commercial corridors in{" "}
                  <strong>India, the Kingdom of Saudi Arabia, Bahrain, and the United Kingdom</strong>, we engineered a unified
                  platform combining official Meta Cloud API infrastructure with human-parity Realtime Voice AI and automated CRM
                  pipelines.
                </>
              )}
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isAr
                ? "واليوم، تعتمد آلاف المنشآت والشركات الرائدة يومياً على لينالا لإدارة ملايين المحادثات التفاعلية، وأتمتة مسارات الطلبات وإتمام المبيعات، وتقديم دعم صوتي متعدد اللغات على مدار الساعة."
                : "Today, thousands of organizations rely on Linala daily to process high-throughput customer engagements, automate order checkouts, and deliver 24/7 multilingual phone assistance without downtime."}
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "ابتكار الصوت بالذكاء الاصطناعي" : "Voice AI Innovation"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "مكالمات صوتية عبر WebRTC بزمن استجابة أقل من 600 ملي ثانية تفهم اللهجات الإقليمية واللغات المتعددة."
                  : "Pioneering sub-600ms WebRTC voice calling capable of understanding accents and regional dialects across 40+ global languages."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "مزود حلول معتمد من Meta" : "Meta Solution Provider"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "ربط مباشر مع واجهة Meta Cloud API الرسمية يضمن أعلى معدلات إرسال وتوثيق الشارة الخضراء وحماية كاملة ضد الحظر."
                  : "Direct integration with Meta's official Cloud API ensures highest throughput messaging tiers, green tick verification, and zero ban risks."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-2xs">
                <Workflow className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "مسارات CRM التلقائية" : "Automated CRM Cadence"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "لوحات كانبان لإدارة الصفقات مع إطلاق رسائل واتساب متابعة مؤتمتة عند انتقال العملاء بين مراحل البيع."
                  : "Kanban deal tracking that automatically triggers scheduled WhatsApp outreach when leads advance through sales stages."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "الامتثال والأمان المؤسسي" : "Global Compliance"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "أمان بمستوى المؤسسات الكبرى مع تشفير TLS 1.3 والتوافق مع معايير حماية البيانات والخصوصية المعتمدة."
                  : "Enterprise security with TLS 1.3 encryption, GDPR and DPDP readiness, and regional data handling frameworks."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Offices & Physical Hubs */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-3">
              <Building2 className="w-3.5 h-3.5" />
              {isAr ? "التواجد الميداني والمكاتب الرسمية" : "Global Physical Footprint"}
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {isAr ? "مكاتبنا وعملياتنا الدولية" : "Our International Offices & Operations"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isAr
                ? "نعمل من خلال مكاتب محلية في المملكة العربية السعودية، ومملكة البحرين، والمملكة المتحدة، والهند لدعم عملائنا على مدار الساعة."
                : "Operating with local offices in Saudi Arabia, Bahrain, the United Kingdom, and India to support regional enterprises 24/7."}
            </p>
          </div>

          {/* Country Switcher Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {GLOBAL_HUBS.map((hub, idx) => (
              <button
                key={idx}
                onClick={() => handleCountryChange(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  selectedCountryIdx === idx
                    ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20"
                    : "bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/20"
                }`}
              >
                <span>{hub.flag}</span>
                <span>{isAr ? hub.countryAr : hub.country}</span>
              </button>
            ))}
          </div>

          {/* Office Details & Map View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Office list & selected details */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {isAr ? "اختر الفرع" : "Select Branch"}
                  </h3>
                  <span className="text-xs font-semibold text-purple-600">
                    {isAr ? activeCountry.regionAr : activeCountry.region}
                  </span>
                </div>

                <div className="space-y-2">
                  {activeCountry.offices.map((office, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOfficeIdx(idx)}
                      className={`w-full text-left rtl:text-right p-3.5 rounded-xl border transition-all ${
                        selectedOfficeIdx === idx
                          ? "bg-white border-purple-600 shadow-sm ring-1 ring-purple-100"
                          : "bg-white/70 border-slate-200 hover:border-purple-200 hover:bg-white"
                      }`}
                    >
                      <h4
                        className={`text-xs font-bold ${
                          selectedOfficeIdx === idx
                            ? "text-purple-700"
                            : "text-slate-800"
                        }`}
                      >
                        {isAr && office.nameAr ? office.nameAr : office.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {isAr && office.addressAr ? office.addressAr : office.address}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Branch Detail Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    {isAr ? activeCountry.countryAr : activeCountry.country}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1">
                    {isAr && activeOffice.nameAr ? activeOffice.nameAr : activeOffice.name}
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {isAr && activeOffice.addressAr ? activeOffice.addressAr : activeOffice.address}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <a
                      href={`tel:${activeOffice.phone.replace(/\s+/g, "")}`}
                      className="hover:text-purple-600 font-semibold dir-ltr text-left"
                      dir="ltr"
                    >
                      {activeOffice.phone}
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      activeOffice.mapQuery
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100/70 rounded-xl font-bold text-xs transition-colors group"
                  >
                    <span>{isAr ? "عرض في خرائط جوجل" : "Open in Google Maps"}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5 rtl:mr-1.5 rtl:ml-0 group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Embedded Google Maps */}
            <div className="lg:col-span-7 min-h-[340px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs bg-white">
              <iframe
                title="Office Location Map"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "340px" }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  activeOffice.mapQuery
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {isAr ? "اصنع مستقبل التواصل لمؤسستك اليوم" : "Build Your Enterprise Communication Future"}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {isAr ? "هل أنت مستعد للشراكة مع لينالا؟" : "Ready to Partner with Linala?"}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "اكتشف لماذا تثق المؤسسات والشركات الرائدة ببنيتنا التحتية لإدارة ملايين المحادثات شهرياً."
              : "Discover why global organizations trust our infrastructure to deliver millions of conversations monthly."}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-sm">
                {isAr ? "ابدأ التجربة المجانية" : "Start Free Trial"}
                <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 h-12 text-sm"
              >
                {isAr ? "تواصل مع المبيعات" : "Contact Global Sales"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
