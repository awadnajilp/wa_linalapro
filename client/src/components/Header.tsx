import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  MessageSquare,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Users,
  Briefcase,
  Mail,
  Zap,
  BookOpen,
  FileText,
  TrendingUp,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  Radio,
  Workflow,
  Sparkles,
  Layers,
  GraduationCap,
  Building2,
  ShoppingCart,
  Plane,
  Code,
  Headphones,
  BarChart3,
  Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSelector } from "./language-selector";
import { AppSettings } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [location] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isAuthenticated, user, logout } = useAuth();
  const username = (user?.firstName || "") + " " + (user?.lastName || "");

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Desktop hover handlers with grace-period debounce
  const handleMouseEnter = (menuName: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveMega(menuName);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMega(null);
    }, 220); // 220ms grace period so cursor can effortlessly cross into dropdown
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setActiveMega(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveMega(null);
    setMobileExpanded(null);
  }, [location]);

  const { language } = useTranslation();
  const isAr = language === "ar";

  // Menu Items
  const featuresItems = [
    {
      title: isAr ? "الطيار الآلي للصوت بالذكاء الاصطناعي" : "Voice AI Autopilot",
      desc: isAr
        ? "مكالمات صوتية فائقة السرعة بأكثر من 40 لغة للرد الآلي على مدار الساعة."
        : "Sub-600ms latency voice calling in 40+ languages for 24/7 triage.",
      icon: Radio,
      path: "/features",
    },
    {
      title: isAr ? "إدارة علاقات العملاء (CRM)" : "Omnichannel CRM",
      desc: isAr
        ? "مسار صفقات كانبان مع حملات تواصل مؤتمتة لكل مرحلة بيعية."
        : "Kanban deal pipeline with automated stage cadences.",
      icon: Workflow,
      path: "/features",
    },
    {
      title: isAr ? "منشئ التدفقات والشات بوت" : "Flow Builder & Bots",
      desc: isAr
        ? "لوحة مرئية بدون كود مع ربط الويب هوك والتفرعات الشرطية."
        : "No-code visual canvas with API webhooks & condition branches.",
      icon: Zap,
      path: "/features",
    },
    {
      title: isAr ? "واجهة Meta السحابية الرسمية" : "Meta Official Cloud API",
      desc: isAr
        ? "بوابة مزود حلول معتمد من Meta مع قوالب موثقة وسرعة إرسال فائقة."
        : "Meta Approved Solution Provider gateway with verified templates & high throughput.",
      icon: ShieldCheck,
      path: "/features",
    },
    {
      title: isAr ? "صندوق الوارد المشترك للفريق" : "Shared Team Inbox",
      desc: isAr
        ? "مركز محادثات متعدد الموظفين لمنع التضارب والردود الجاهزة السريعة."
        : "Multi-agent chat hub with collision detection & canned replies.",
      icon: MessageSquare,
      path: "/features",
    },
    {
      title: isAr ? "التحليلات وعائد الاستثمار" : "Analytics & Attribution",
      desc: isAr
        ? "معدلات تسليم وقراءة حية ونسب النقر وعائد مبيعات الحملات."
        : "Real-time delivery rates, CTRs, and campaign revenue ROI.",
      icon: BarChart3,
      path: "/features",
    },
  ];

  const solutionsItems = [
    {
      title: isAr ? "التجارة الإلكترونية والتجزئة" : "E-Commerce & Retail",
      desc: isAr
        ? "كتالوجات واتساب، دفع بضغطة واحدة، واسترداد السلات المتروكة."
        : "WhatsApp catalogs, 1-click checkout & cart recovery drips.",
      icon: ShoppingCart,
      path: "/use-cases",
    },
    {
      title: isAr ? "العقارات والمطورين" : "Real Estate & Developers",
      desc: isAr
        ? "استقطاب عملاء الإعلانات وتأهيل الميزانيات وحجز المعاينات آلياً."
        : "Capture ad leads, qualify budgets & book site visits automatically.",
      icon: Building2,
      path: "/use-cases",
    },
    {
      title: isAr ? "الرعاية الصحية والعيادات" : "Healthcare & Clinics",
      desc: isAr
        ? "مواعيد الأطباء، إرسال تقارير المختبر، ومتابعة المرضى."
        : "Doctor appointments, digital lab reports & patient follow-ups.",
      icon: ShieldCheck,
      path: "/use-cases",
    },
    {
      title: isAr ? "الشركات وخدمات B2B" : "B2B, SaaS & Agencies",
      desc: isAr
        ? "تسريع إغلاق الصفقات بصندوق وارد متعدد الموظفين والأتمتة."
        : "Accelerate pipeline velocity with multi-agent inbox & cadences.",
      icon: Briefcase,
      path: "/use-cases",
    },
    {
      title: isAr ? "التعليم والتدريب الأكاديمي" : "Education & EdTech",
      desc: isAr
        ? "استشارات القبول، إرسال البروشورات وتذكيرات الرسوم."
        : "Admissions counseling, syllabus PDFs & fee reminder alerts.",
      icon: GraduationCap,
      path: "/use-cases",
    },
    {
      title: isAr ? "السياحة والضيافة" : "Travel & Hospitality",
      desc: isAr
        ? "كونسيرج ذكي 24/7، قسائم الحجز، وتفاصيل الرحلات على واتساب."
        : "24/7 AI concierge, WhatsApp booking vouchers & itineraries.",
      icon: Plane,
      path: "/use-cases",
    },
  ];

  const guidesItems = [
    {
      title: isAr ? "دليل Meta Cloud API" : "Meta Cloud API Guide",
      desc: isAr
        ? "خطوات توثيق النشاط التجاري والحصول على العلامة الخضراء."
        : "Step-by-step Meta Business Verification & Green Tick playbook.",
      icon: BookOpen,
      path: "/whatsapp-guide",
    },
    {
      title: isAr ? "أفضل الممارسات والامتثال" : "Best Practices & Compliance",
      desc: isAr
        ? "قواعد الموافقة وحماية تقييم الجودة وإرشادات منع الحظر."
        : "Opt-in rules, quality rating protection & anti-spam guidelines.",
      icon: ShieldCheck,
      path: "/best-practices",
    },
    {
      title: isAr ? "قصص النجاح والمقارنات" : "Case Studies & Benchmarks",
      desc: isAr
        ? "عائد استثمار حقيقي ونموذج نجاح كبرى الشركات."
        : "Enterprise ROI stories and growth benchmarks.",
      icon: TrendingUp,
      path: "/case-studies",
    },
  ];

  const companyItems = [
    {
      title: isAr ? "من نحن" : "About Us",
      desc: isAr
        ? "قصتنا، مراكزنا الـ 4 حول العالم، والقيادة والبنية التحتية."
        : "Our story, 4+ global hubs, leadership & enterprise infrastructure.",
      icon: Users,
      path: "/about",
    },
    {
      title: isAr ? "التكامل والربط" : "Integrations",
      desc: isAr
        ? "ربط نظام أوردر أون Orderown للمطاعم، زابيير، وشوبيفاي."
        : "Connect Orderown RMS, Zapier, Shopify, CRMs & AI models.",
      icon: Layers,
      path: "/integrations",
    },
    {
      title: isAr ? "الوظائف" : "Careers",
      desc: isAr
        ? "انضم إلى فريقنا العالمي في المبيعات والهندسة والتسويق."
        : "Join our global team across sales, engineering & marketing.",
      icon: Briefcase,
      path: "/careers",
    },
  ];

  return (
    <>
      <header
        ref={navContainerRef}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-2xs border-b border-slate-200/80 py-2.5"
            : "bg-white/90 backdrop-blur-md border-b border-slate-100 py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo (No extra text label) */}
            <Link href="/" className="flex items-center group flex-shrink-0">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-8 sm:h-9 object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
              )}
            </Link>

            {/* Desktop Navigation Links (Clean & debounced hover) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {/* Features Menu */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter("features")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "features" ? null : "features")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "features"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>{isAr ? "الميزات" : "Features"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      activeMega === "features" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {activeMega === "features" && (
                  <div
                    className="absolute left-0 top-full pt-2 w-[560px] z-50 animate-in fade-in duration-150"
                    onMouseEnter={() => handleMouseEnter("features")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {featuresItems.map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={idx}
                              href={item.path}
                              onClick={() => setActiveMega(null)}
                              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-purple-50/70 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs px-2">
                        <span className="text-slate-500 font-medium">{isAr ? "استكشف كافة إمكانيات المنصة" : "Explore all platform capabilities"}</span>
                        <Link
                          href="/features"
                          onClick={() => setActiveMega(null)}
                          className="font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <span>{isAr ? "جولة الميزات الكاملة ←" : "Full Feature Tour →"}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Menu */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter("solutions")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "solutions" ? null : "solutions")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "solutions"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>{isAr ? "الحلول" : "Solutions"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      activeMega === "solutions" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {activeMega === "solutions" && (
                  <div
                    className="absolute left-0 top-full pt-2 w-[560px] z-50 animate-in fade-in duration-150"
                    onMouseEnter={() => handleMouseEnter("solutions")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {solutionsItems.map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={idx}
                              href={item.path}
                              onClick={() => setActiveMega(null)}
                              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-purple-50/70 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs px-2">
                        <span className="text-slate-500 font-medium">{isAr ? "نماذج قطاعية جاهزة للإطلاق" : "Ready-to-deploy industry blueprints"}</span>
                        <Link
                          href="/use-cases"
                          onClick={() => setActiveMega(null)}
                          className="font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <span>{isAr ? "جميع الحلول ←" : "All Use Cases →"}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guides Menu */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter("guides")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "guides" ? null : "guides")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "guides"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>{isAr ? "الأدلة" : "Guides"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      activeMega === "guides" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {activeMega === "guides" && (
                  <div
                    className="absolute left-0 top-full pt-2 w-[520px] z-50 animate-in fade-in duration-150"
                    onMouseEnter={() => handleMouseEnter("guides")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 p-4 space-y-1.5">
                      {guidesItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={idx}
                            href={item.path}
                            onClick={() => setActiveMega(null)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/70 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Company Menu */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter("company")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "company" ? null : "company")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "company"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>{isAr ? "الشركة" : "Company"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      activeMega === "company" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {activeMega === "company" && (
                  <div
                    className="absolute left-0 top-full pt-2 w-[500px] z-50 animate-in fade-in duration-150"
                    onMouseEnter={() => handleMouseEnter("company")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 p-4 space-y-1.5">
                      {companyItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={idx}
                            href={item.path}
                            onClick={() => setActiveMega(null)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/70 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <Link
                href="/pricing"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                {isAr ? "الأسعار" : "Pricing"}
              </Link>

              {/* Contact */}
              <Link
                href="/contact"
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                {isAr ? "تواصل معنا" : "Contact"}
              </Link>
            </nav>

            {/* Right CTAs */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
              <div className="w-fit">
                <LanguageSelector />
              </div>

              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-purple-600 px-3 py-2 rounded-xl hover:bg-slate-100/70 transition-colors"
                  >
                    {isAr ? "تسجيل الدخول" : "Log In"}
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-4 py-2 h-9 shadow-xs text-xs sm:text-sm flex items-center gap-1.5 transition-all">
                      <span>{isAr ? "ابدأ مجاناً" : "Start Free"}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    {isAr ? "لوحة التحكم" : "Dashboard"}
                  </Link>

                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-100 hover:ring-purple-300 transition-all shadow-2xs"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          username
                        )}&background=7c3aed&color=fff`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200/80 rounded-2xl shadow-xl py-1.5 z-50">
                        <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-bold text-slate-800 truncate">
                          {username}
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" /> Settings
                        </Link>
                        <Link
                          href="/account"
                          className="flex items-center px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <User className="w-3.5 h-3.5 mr-2 text-slate-400" /> Account
                        </Link>
                        <button
                          onClick={logout}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* 100% Mobile Optimized Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <Link href="/" onClick={() => setIsMenuOpen(false)}>
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-8 object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                  <MessageSquare className="w-4 h-4" />
                </div>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 divide-y divide-slate-100">
            {/* Features Accordion */}
            <div className="pt-2">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "features" ? null : "features")}
                className="flex items-center justify-between w-full py-2.5 font-bold text-slate-900 text-sm text-left rtl:text-right"
              >
                <span>{isAr ? "الميزات" : "Features"}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "features" ? "rotate-180 text-purple-600" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "features" && (
                <div className="mt-1 mb-2 space-y-1 pl-2 rtl:pl-0 rtl:pr-2 animate-in fade-in duration-150">
                  {featuresItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 text-xs text-slate-700 font-medium hover:text-purple-600"
                      >
                        <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Solutions Accordion */}
            <div className="pt-2">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "solutions" ? null : "solutions")}
                className="flex items-center justify-between w-full py-2.5 font-bold text-slate-900 text-sm text-left rtl:text-right"
              >
                <span>{isAr ? "الحلول" : "Solutions"}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "solutions" ? "rotate-180 text-purple-600" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "solutions" && (
                <div className="mt-1 mb-2 space-y-1 pl-2 rtl:pl-0 rtl:pr-2 animate-in fade-in duration-150">
                  {solutionsItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 text-xs text-slate-700 font-medium hover:text-purple-600"
                      >
                        <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Guides Accordion */}
            <div className="pt-2">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "guides" ? null : "guides")}
                className="flex items-center justify-between w-full py-2.5 font-bold text-slate-900 text-sm text-left rtl:text-right"
              >
                <span>{isAr ? "الأدلة" : "Guides"}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "guides" ? "rotate-180 text-purple-600" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "guides" && (
                <div className="mt-1 mb-2 space-y-1 pl-2 rtl:pl-0 rtl:pr-2 animate-in fade-in duration-150">
                  {guidesItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 text-xs text-slate-700 font-medium hover:text-purple-600"
                      >
                        <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Company Accordion */}
            <div className="pt-2">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "company" ? null : "company")}
                className="flex items-center justify-between w-full py-2.5 font-bold text-slate-900 text-sm text-left rtl:text-right"
              >
                <span>{isAr ? "الشركة" : "Company"}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "company" ? "rotate-180 text-purple-600" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "company" && (
                <div className="mt-1 mb-2 space-y-1 pl-2 rtl:pl-0 rtl:pr-2 animate-in fade-in duration-150">
                  {companyItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 text-xs text-slate-700 font-medium hover:text-purple-600"
                      >
                        <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pricing Direct */}
            <div className="pt-2">
              <Link
                href="/pricing"
                onClick={() => setIsMenuOpen(false)}
                className="block font-bold text-slate-900 text-sm py-2"
              >
                {isAr ? "الأسعار" : "Pricing"}
              </Link>
            </div>

            {/* Contact Direct */}
            <div className="pt-1">
              <Link
                href="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="block font-bold text-slate-900 text-sm py-2"
              >
                {isAr ? "تواصل معنا" : "Contact"}
              </Link>
            </div>
          </div>

          {/* Mobile Footer Action Area */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
            <div className="w-full flex justify-center pb-1">
              <LanguageSelector />
            </div>

            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs shadow-2xs"
                >
                  {isAr ? "تسجيل الدخول" : "Log In"}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-500/20"
                >
                  {isAr ? "ابدأ مجاناً ←" : "Start Free →"}
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-3 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-500/20"
              >
                {isAr ? "الانتقال للوحة التحكم" : "Go to Dashboard"}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
