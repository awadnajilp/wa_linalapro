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
  BadgeCheck,
  ExternalLink,
  Code,
  Globe,
  Headphones,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSelector } from "./language-selector";
import { AppSettings } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, logout } = useAuth();

  const username = (user?.firstName || "") + " " + (user?.lastName || "");

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

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

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveMega(null);
    setMobileExpanded(null);
  }, [location]);

  // Mega Menu Data Structures
  const featuresItems = [
    {
      title: "Real-Time Voice AI Autopilot",
      desc: "Sub-600ms latency voice calling in 40+ languages for 24/7 inbound & outbound phone triage.",
      icon: Radio,
      path: "/features",
      badge: "Flagship",
    },
    {
      title: "Omnichannel CRM & Kanban",
      desc: "Automated stage cadences, deal velocity tracking, and round-robin sales distribution.",
      icon: Workflow,
      path: "/features",
      badge: "Core",
    },
    {
      title: "Visual Flow Builder & Bots",
      desc: "No-code drag-and-drop conversational canvas with condition branches and API webhooks.",
      icon: Zap,
      path: "/features",
    },
    {
      title: "Meta Official Cloud API",
      desc: "Direct BSP connection with verified templates, Tier 1 to Unlimited scale, and zero ban risks.",
      icon: ShieldCheck,
      path: "/features",
      badge: "Verified",
    },
    {
      title: "Multi-Agent Shared Inbox",
      desc: "Unified support chat hub with collision detection, private staff notes, and canned replies.",
      icon: MessageSquare,
      path: "/features",
    },
    {
      title: "Attribution & Revenue Analytics",
      desc: "Real-time delivery rates, read rates, CTRs, and closed-won campaign revenue ROI.",
      icon: BarChart3,
      path: "/features",
    },
  ];

  const useCasesIndustries = [
    {
      title: "E-Commerce & D2C",
      desc: "Automate WhatsApp catalogs, 1-click checkout, and abandoned cart recovery drips.",
      icon: ShoppingCart,
      path: "/use-cases",
    },
    {
      title: "Real Estate & Developers",
      desc: "Capture Click-to-WhatsApp ad leads, qualify buyer budgets, and automate site visits.",
      icon: Building2,
      path: "/use-cases",
    },
    {
      title: "Healthcare & Clinics",
      desc: "Automate 24/7 doctor slot booking, digital lab reports, and reduce no-shows.",
      icon: ShieldCheck,
      path: "/use-cases",
    },
    {
      title: "B2B, SaaS & Agencies",
      desc: "Accelerate pipeline velocity with multi-agent inbox and automated follow-up cadences.",
      icon: Briefcase,
      path: "/use-cases",
    },
    {
      title: "Education & EdTech",
      desc: "Qualify prospective student inquiries, share syllabus PDFs, and collect tuition fees.",
      icon: GraduationCap,
      path: "/use-cases",
    },
    {
      title: "Travel & Hospitality",
      desc: "24/7 multilingual AI concierge, WhatsApp booking vouchers, and itinerary dispatch.",
      icon: Plane,
      path: "/use-cases",
    },
  ];

  const useCasesDepartments = [
    {
      title: "Sales & Revenue",
      desc: "Accelerate deal closures with instant automated outreach.",
      icon: TrendingUp,
      path: "/use-cases",
    },
    {
      title: "Customer Support",
      desc: "Resolve 70%+ of queries autonomously with Voice & Chat AI.",
      icon: Headphones,
      path: "/use-cases",
    },
    {
      title: "Marketing & Growth",
      desc: "Achieve 98% open rates with hyper-targeted broadcasts.",
      icon: Zap,
      path: "/use-cases",
    },
  ];

  const resourcesItems = [
    {
      title: "WhatsApp Meta Cloud API Guide",
      desc: "Complete blueprint for Meta Business Verification, WABA setup & Official Green Tick approval.",
      icon: BookOpen,
      path: "/whatsapp-guide",
      badge: "Official",
    },
    {
      title: "Best Practices & Compliance",
      desc: "Opt-in policies, maintaining Green Quality Rating, rate-limiting, and avoiding spam blocks.",
      icon: ShieldCheck,
      path: "/best-practices",
    },
    {
      title: "Developer API Reference",
      desc: "REST APIs, webhooks, payload schemas, and SDKs to integrate Linala into your tech stack.",
      icon: Code,
      path: "/api-docs",
      badge: "REST",
    },
    {
      title: "Case Studies & Success Stories",
      desc: "Real benchmark metrics and revenue growth stories from high-growth enterprise brands.",
      icon: TrendingUp,
      path: "/case-studies",
    },
    {
      title: "Interactive Live Demo",
      desc: "Experience Linala's Voice AI and WhatsApp CRM live in an interactive sandbox.",
      icon: Sparkles,
      path: "/demo",
      badge: "Interactive",
    },
  ];

  const companyItems = [
    {
      title: "About Linala",
      desc: "Our mission, leadership, enterprise infrastructure, and global presence.",
      icon: Users,
      path: "/about",
    },
    {
      title: "Integrations Ecosystem",
      desc: "Native plugins for Shopify, WooCommerce, HubSpot, Salesforce, Zoho, and Zapier.",
      icon: Layers,
      path: "/integrations",
    },
    {
      title: "Careers & Culture",
      desc: "Join our global remote team building the next generation of conversational AI.",
      icon: Briefcase,
      path: "/careers",
      badge: "We're Hiring",
    },
    {
      title: "Press Kit & Media Assets",
      desc: "Official brand guidelines, logos, media kits, and press announcements.",
      icon: FileText,
      path: "/press-kit",
    },
    {
      title: "Contact Sales & Support",
      desc: "Connect with our solution architects for custom enterprise onboarding and SLAs.",
      icon: Mail,
      path: "/contact",
    },
  ];

  return (
    <>
      <header
        ref={navContainerRef}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-2.5"
            : "bg-white/90 backdrop-blur-md border-b border-slate-100 py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-9 sm:h-10 object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
              )}
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {brandSettings?.title || "Linala"}
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {/* Features Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveMega("features")}
                onMouseLeave={() => setActiveMega(null)}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "features" ? null : "features")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "features"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>Platform & Features</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMega === "features" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {/* Features Mega Menu */}
                {activeMega === "features" && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[720px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="grid grid-cols-2 gap-4">
                      {featuresItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={idx}
                            href={item.path}
                            onClick={() => setActiveMega(null)}
                            className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-purple-50/60 transition-all duration-150 group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                  {item.title}
                                </h4>
                                {item.badge && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-slate-800">
                          Looking for complete technical specifications?
                        </span>
                      </div>
                      <Link
                        href="/features"
                        onClick={() => setActiveMega(null)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 group"
                      >
                        <span>View All Features</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Use Cases Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveMega("use-cases")}
                onMouseLeave={() => setActiveMega(null)}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "use-cases" ? null : "use-cases")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "use-cases"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>Use Cases & Solutions</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMega === "use-cases" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {/* Use Cases Mega Menu */}
                {activeMega === "use-cases" && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[780px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="grid grid-cols-12 gap-6">
                      {/* Industries column */}
                      <div className="col-span-8">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                          By Industry
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {useCasesIndustries.map((ind, idx) => {
                            const Icon = ind.icon;
                            return (
                              <Link
                                key={idx}
                                href={ind.path}
                                onClick={() => setActiveMega(null)}
                                className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-purple-50/60 transition-all duration-150 group"
                              >
                                <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                    {ind.title}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                    {ind.desc}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      {/* Department column */}
                      <div className="col-span-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                            By Department
                          </h4>
                          <div className="space-y-3">
                            {useCasesDepartments.map((dep, idx) => {
                              const Icon = dep.icon;
                              return (
                                <Link
                                  key={idx}
                                  href={dep.path}
                                  onClick={() => setActiveMega(null)}
                                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-all group"
                                >
                                  <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                                    {dep.title}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200/80">
                          <Link
                            href="/use-cases"
                            onClick={() => setActiveMega(null)}
                            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 group"
                          >
                            <span>Explore All Blueprints</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resources & Guides Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveMega("resources")}
                onMouseLeave={() => setActiveMega(null)}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "resources" ? null : "resources")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "resources"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>Resources & Guides</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMega === "resources" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {/* Resources Mega Menu */}
                {activeMega === "resources" && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[640px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="grid grid-cols-2 gap-4">
                      {resourcesItems.map((res, idx) => {
                        const Icon = res.icon;
                        return (
                          <Link
                            key={idx}
                            href={res.path}
                            onClick={() => setActiveMega(null)}
                            className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-purple-50/60 transition-all duration-150 group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                  {res.title}
                                </h4>
                                {res.badge && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {res.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                                {res.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-purple-50/60 rounded-2xl p-4">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900">
                          Need WhatsApp Green Tick Verification Assistance?
                        </span>
                      </div>
                      <Link
                        href="/whatsapp-guide"
                        onClick={() => setActiveMega(null)}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                      >
                        <span>Read Meta Guide &rarr;</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Company Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setActiveMega("company")}
                onMouseLeave={() => setActiveMega(null)}
              >
                <button
                  onClick={() => setActiveMega(activeMega === "company" ? null : "company")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    activeMega === "company"
                      ? "text-purple-600 bg-purple-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>Company</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMega === "company" ? "rotate-180 text-purple-600" : "text-slate-400"
                    }`}
                  />
                </button>

                {/* Company Mega Menu */}
                {activeMega === "company" && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[580px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="grid grid-cols-2 gap-4">
                      {companyItems.map((comp, idx) => {
                        const Icon = comp.icon;
                        return (
                          <Link
                            key={idx}
                            href={comp.path}
                            onClick={() => setActiveMega(null)}
                            className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-purple-50/60 transition-all duration-150 group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                  {comp.title}
                                </h4>
                                {comp.badge && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    {comp.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                                {comp.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Direct Link */}
              <Link
                href="/#pricing"
                className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                Pricing
              </Link>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-fit">
                <LanguageSelector />
              </div>

              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    className="text-xs sm:text-sm font-bold text-slate-700 hover:text-purple-600 px-3.5 py-2 rounded-xl hover:bg-slate-100/70 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl px-4 py-2 h-10 shadow-md shadow-purple-500/20 text-xs sm:text-sm flex items-center gap-1.5 transition-all">
                      <span>Start Free Trial</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="text-xs sm:text-sm font-bold text-purple-700 bg-purple-50 px-3.5 py-2 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    Go to Workspace
                  </Link>

                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-100 hover:ring-purple-300 transition-all shadow-2xs"
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
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 z-50">
                        <div className="px-4 py-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                          {username}
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" /> Settings
                        </Link>
                        <Link
                          href="/account"
                          className="flex items-center px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <User className="w-3.5 h-3.5 mr-2 text-slate-400" /> Account
                        </Link>
                        <button
                          onClick={logout}
                          className="flex items-center w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Accordion Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-xs pt-16">
          <div className="bg-white h-full overflow-y-auto px-5 py-6 space-y-4 shadow-2xl border-t border-slate-100">
            {/* Features Mobile Accordion */}
            <div className="border-b border-slate-100 pb-3">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "features" ? null : "features")}
                className="flex items-center justify-between w-full text-left py-2 font-bold text-slate-900 text-sm"
              >
                <span>Platform & Features</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "features" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "features" && (
                <div className="mt-2 space-y-2 pl-2">
                  {featuresItems.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-1.5 text-xs text-slate-600 font-medium hover:text-purple-600"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Use Cases Mobile Accordion */}
            <div className="border-b border-slate-100 pb-3">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "use-cases" ? null : "use-cases")}
                className="flex items-center justify-between w-full text-left py-2 font-bold text-slate-900 text-sm"
              >
                <span>Use Cases & Solutions</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "use-cases" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "use-cases" && (
                <div className="mt-2 space-y-2 pl-2">
                  {useCasesIndustries.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-1.5 text-xs text-slate-600 font-medium hover:text-purple-600"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Resources Mobile Accordion */}
            <div className="border-b border-slate-100 pb-3">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "resources" ? null : "resources")}
                className="flex items-center justify-between w-full text-left py-2 font-bold text-slate-900 text-sm"
              >
                <span>Resources & Guides</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "resources" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "resources" && (
                <div className="mt-2 space-y-2 pl-2">
                  {resourcesItems.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-1.5 text-xs text-slate-600 font-medium hover:text-purple-600"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Company Mobile Accordion */}
            <div className="border-b border-slate-100 pb-3">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "company" ? null : "company")}
                className="flex items-center justify-between w-full text-left py-2 font-bold text-slate-900 text-sm"
              >
                <span>Company</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    mobileExpanded === "company" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileExpanded === "company" && (
                <div className="mt-2 space-y-2 pl-2">
                  {companyItems.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-1.5 text-xs text-slate-600 font-medium hover:text-purple-600"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Direct */}
            <div className="py-1">
              <Link
                href="/#pricing"
                onClick={() => setIsMenuOpen(false)}
                className="block font-bold text-slate-900 text-sm py-1"
              >
                Pricing
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="pt-4 space-y-3">
              <div className="w-full pb-2">
                <LanguageSelector />
              </div>

              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-3 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-purple-500/20"
                  >
                    Start Free Trial &rarr;
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-center py-3 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20"
                >
                  Open Dashboard Workspace
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
