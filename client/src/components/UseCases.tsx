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

const USE_CASES: UseCaseItem[] = [
  {
    id: "ecom",
    icon: ShoppingCart,
    title: "E-Commerce & D2C",
    badge: "Retail Brands",
    headline: "Automate Catalogs & 1-Click WhatsApp Checkout",
    description:
      "Allow buyers to browse catalogs, purchase via UPI/Card, and receive automated abandoned cart reminders.",
    growthMetric: "+380%",
    metricLabel: "WhatsApp Sales Growth",
    highlights: [
      "Native WhatsApp catalogs with 1-click checkout",
      "Automated cart recovery drip sequences",
      "Instant PDF order invoices & dispatch tracking",
    ],
  },
  {
    id: "realestate",
    icon: Building2,
    title: "Real Estate",
    badge: "Developers & Brokers",
    headline: "Qualify High-Ticket Buyers & Book Site Visits",
    description:
      "Capture Click-to-WhatsApp ad leads, qualify buyer budgets with AI, and dispatch brochures automatically.",
    growthMetric: "82%",
    metricLabel: "Faster Lead-to-Visit Rate",
    highlights: [
      "Instant Click-to-WhatsApp ad lead capture",
      "Automated PDF brochures & video floor plans",
      "AI qualification of buyer budget and location",
    ],
  },
  {
    id: "healthcare",
    icon: Stethoscope,
    title: "Healthcare & Clinics",
    badge: "Clinics & Hospitals",
    headline: "Automate Appointments & Prescription Alerts",
    description:
      "Enable patients to book doctor slots, receive PDF prescriptions, and reduce no-shows with automated reminders.",
    growthMetric: "65%",
    metricLabel: "Fewer Patient No-Shows",
    highlights: [
      "24/7 automated doctor slot booking",
      "Instant WhatsApp confirmation with map directions",
      "Pre-visit preparation & follow-up cadences",
    ],
  },
  {
    id: "services",
    icon: Briefcase,
    title: "B2B & Agencies",
    badge: "Professional Services",
    headline: "Accelerate Sales Pipeline with Shared CRM",
    description:
      "Route enterprise prospects to reps, manage deals on Kanban boards, and sync notes with Zapier & HubSpot.",
    growthMetric: "4.2x",
    metricLabel: "Faster Sales Response SLA",
    highlights: [
      "Multi-agent team routing with collision avoidance",
      "Zapier & webhook sync with Salesforce & HubSpot",
      "Internal staff notes & custom deal stages",
    ],
  },
  {
    id: "education",
    icon: GraduationCap,
    title: "Education & EdTech",
    badge: "Institutes & Academies",
    headline: "Automate Course Inquiries & Enrollment",
    description:
      "Qualify prospective student interests, share syllabus PDFs, and collect tuition fees on WhatsApp.",
    growthMetric: "3.5x",
    metricLabel: "Higher Admissions Rate",
    highlights: [
      "Instant course syllabus & fee structure delivery",
      "Automated counseling slot scheduling",
      "Direct fee payment links via Razorpay & UPI",
    ],
  },
];

export const UseCases: React.FC = () => {
  const [activeId, setActiveId] = useState("ecom");
  const activeCase = USE_CASES.find((u) => u.id === activeId) || USE_CASES[0];

  return (
    <section id="solutions" className="py-20 lg:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Industry Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tailored for High-Growth Industries
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            See how Linala WhatsApp CRM powers revenue across diverse business verticals.
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
                  <span>Get Started for {activeCase.title}</span>
                  <ArrowRight className="w-4 h-4" />
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
                Average benchmark achieved by active Linala clients within 30 days.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default UseCases;
