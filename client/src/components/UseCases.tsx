import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingCart,
  Building2,
  Stethoscope,
  GraduationCap,
  Briefcase,
  Store,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
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
    title: "E-Commerce & D2C Brands",
    badge: "Retail & Direct-to-Consumer",
    headline: "Automate Catalogs, Checkout & 3.8x More Sales on WhatsApp",
    description:
      "Allow customers to discover products, view real-time variants, buy via UPI QR/Card, and receive automated abandoned cart reminders.",
    growthMetric: "+380%",
    metricLabel: "Increase in WhatsApp Sales Volume",
    highlights: [
      "Native WhatsApp catalogs with direct 'Buy Now' action",
      "Automated abandoned cart recovery drip campaigns",
      "Instant PDF order invoices & tracking link dispatch",
      "AI recommendations tailored to customer preferences",
    ],
  },
  {
    id: "realestate",
    icon: Building2,
    title: "Real Estate & Property",
    badge: "Property Developers & Agents",
    headline: "Qualify High-Ticket Buyers & Auto-Schedule Site Visits",
    description:
      "Capture leads from Meta ads instantly, qualify buyer budgets with AI questionnaires, and dispatch floor plan brochures via WhatsApp.",
    growthMetric: "82%",
    metricLabel: "Faster Lead-to-Visit Conversion",
    highlights: [
      "Instant lead capture from Facebook & Instagram Click-to-WhatsApp ads",
      "Automated brochure PDF & virtual tour video delivery",
      "AI qualification of buyer budget, locality & timeline",
      "Automated reminder cadence for scheduled site visits",
    ],
  },
  {
    id: "healthcare",
    icon: Stethoscope,
    title: "Healthcare & Clinics",
    badge: "Hospitals, Clinics & Wellness",
    headline: "Automate Appointment Bookings & Prescription Reminders",
    description:
      "Enable patients to book doctor consultations, receive digital prescriptions, and get medication reminder cadences automatically.",
    growthMetric: "65%",
    metricLabel: "Reduction in Patient No-Shows",
    highlights: [
      "24/7 automated doctor slot booking & rescheduling",
      "Instant WhatsApp confirmation with location map pin",
      "Automated pre-visit preparation instructions",
      "Follow-up medication & feedback reminder cadences",
    ],
  },
  {
    id: "services",
    icon: Briefcase,
    title: "B2B, SaaS & Agencies",
    badge: "Professional Services & Tech",
    headline: "Accelerate Inbound Sales Cycles with Multi-Agent CRM",
    description:
      "Route incoming enterprise leads to the right account executive, track deal stages on Kanban boards, and sync conversation notes with CRM.",
    growthMetric: "4.2x",
    metricLabel: "Faster Sales Response SLA",
    highlights: [
      "Multi-agent team routing with collision avoidance",
      "Zapier & Webhook 2-way sync with Salesforce & HubSpot",
      "Internal team collaboration notes & custom contact tagging",
      "Automated contract follow-up & renewal alerts",
    ],
  },
  {
    id: "education",
    icon: GraduationCap,
    title: "Education & EdTech",
    badge: "Academies, Institutes & Online Courses",
    headline: "Boost Course Admissions with Instant Syllabus & AI Guidance",
    description:
      "Counsel prospective students with multilingual voice notes, share course PDFs instantly, and automate admission fee collection.",
    growthMetric: "74%",
    metricLabel: "Increase in Lead-to-Enrollment Rate",
    highlights: [
      "AI student guidance in Malayalam, Hinglish & English",
      "Instant syllabus & fee structure PDF dispatch",
      "Automated webinar reminders & attendance tracking",
      "Direct fee payment links via Razorpay & UPI QR",
    ],
  },
];

export const UseCases: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeCase = USE_CASES[activeIdx];

  return (
    <section id="use-cases" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Tailored Industry Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Designed for the Specific Needs of Your Industry
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Discover how companies across diverse sectors scale revenue and delight customers with our WhatsApp platform.
          </p>
        </div>

        {/* Industry Pill Tabs (Brevo Style) */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-12 no-scrollbar">
          {USE_CASES.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeIdx === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-purple-600"}`} />
                <span>{item.title.split("&")[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Active Industry Showcase Card */}
        <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-3xl p-8 sm:p-12 border border-purple-100 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-purple-200 text-purple-800 text-xs font-semibold">
                <activeCase.icon className="w-3.5 h-3.5 text-purple-600" />
                {activeCase.badge}
              </span>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {activeCase.headline}
              </h3>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {activeCase.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeCase.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-700">{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/20"
                >
                  <span>Explore {activeCase.title.split("&")[0]} Solution</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Metric Box */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-8 border border-purple-200 shadow-md flex flex-col justify-center items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {activeCase.growthMetric}
              </div>
              <div className="text-sm font-bold text-purple-800 mt-2">
                {activeCase.metricLabel}
              </div>
              <p className="text-xs text-slate-500 mt-3 max-w-xs">
                Verified impact benchmark achieved by our active platform customers in this sector.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default UseCases;
