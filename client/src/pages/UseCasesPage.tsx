import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingCart,
  Building2,
  Stethoscope,
  GraduationCap,
  Briefcase,
  Plane,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
  BarChart3,
  Bot,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface IndustryUseCase {
  id: string;
  icon: React.ElementType;
  title: string;
  badge: string;
  headline: string;
  description: string;
  growthMetric: string;
  metricLabel: string;
  color: string;
  accentBg: string;
  highlights: string[];
  workflow: { step: string; label: string }[];
}

const INDUSTRIES: IndustryUseCase[] = [
  {
    id: "ecommerce",
    icon: ShoppingCart,
    title: "E-Commerce & D2C",
    badge: "Retail & Consumer Brands",
    headline: "Automate Catalogs, Instant Checkout & Cart Recovery",
    description:
      "Transform WhatsApp into a high-converting automated sales funnel. Customers browse interactive product catalogs, select variants, and complete 1-click payments with automated order tracking alerts.",
    growthMetric: "+380%",
    metricLabel: "WhatsApp Revenue Growth",
    color: "from-purple-600 to-indigo-600",
    accentBg: "bg-purple-50 text-purple-700 border-purple-200",
    highlights: [
      "Native WhatsApp catalogs with automated 1-click checkout",
      "Dynamic abandoned cart recovery drip sequences with personalized discount codes",
      "Instant PDF order invoices, automated shipping tracking & COD confirmation",
      "Shopify & WooCommerce automated webhook synchronization",
    ],
    workflow: [
      { step: "1", label: "Customer clicks ad / browses WhatsApp catalog" },
      { step: "2", label: "AI recommends bundles & collects shipping address" },
      { step: "3", label: "Instant payment via UPI / Card / COD confirmation" },
      { step: "4", label: "Automated dispatch tracking & post-purchase review request" },
    ],
  },
  {
    id: "realestate",
    icon: Building2,
    title: "Real Estate & Developers",
    badge: "Property & Brokerages",
    headline: "Qualify High-Ticket Buyers & Automate Site Visits",
    description:
      "Capture high-intent property leads from Click-to-WhatsApp ads. AI instantly qualifies buyer budgets, sends PDF brochures and video floor plans, and syncs booked site visits with agents' calendars.",
    growthMetric: "82%",
    metricLabel: "Faster Lead-to-Visit Rate",
    color: "from-blue-600 to-cyan-600",
    accentBg: "bg-blue-50 text-blue-700 border-blue-200",
    highlights: [
      "Instant Click-to-WhatsApp ad lead capture with 0-second response latency",
      "Automated dispatch of high-resolution PDF brochures and floor plans",
      "AI conversational budget qualification and preferred location screening",
      "Smart CRM stage cadence: Lead -> Contacted -> Site Visit Booked -> Deal Won",
    ],
    workflow: [
      { step: "1", label: "Buyer engages via Meta Ad or Website Widget" },
      { step: "2", label: "AI Voice & Chat qualifies budget & project preferences" },
      { step: "3", label: "Automated PDF brochure & site visit slot confirmation" },
      { step: "4", label: "Automated location map & reminder sequence before visit" },
    ],
  },
  {
    id: "healthcare",
    icon: Stethoscope,
    title: "Healthcare & Clinics",
    badge: "Hospitals & Diagnostics",
    headline: "Automate Appointments, Lab Reports & Tele-Triage",
    description:
      "Reduce no-shows and staff workload by automating patient appointments, doctor schedule matching, digital prescription delivery, and proactive preventive care follow-ups.",
    growthMetric: "65%",
    metricLabel: "Fewer Patient No-Shows",
    color: "from-emerald-600 to-teal-600",
    accentBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    highlights: [
      "24/7 automated doctor slot booking & department routing",
      "Instant PDF lab test reports & digital prescription dispatch",
      "Automated reminder sequences with clinic map links and pre-test prep instructions",
      "HIPAA and GDPR-compliant secure patient data handling",
    ],
    workflow: [
      { step: "1", label: "Patient requests appointment or report" },
      { step: "2", label: "Bot matches available doctor slots in real-time" },
      { step: "3", label: "Instant WhatsApp confirmation & prep checklist" },
      { step: "4", label: "Automated post-consultation feedback & medicine reminder" },
    ],
  },
  {
    id: "b2b",
    icon: Briefcase,
    title: "B2B, SaaS & Agencies",
    badge: "High-Growth Companies",
    headline: "Accelerate Deal Velocity with Automated CRM Cadence",
    description:
      "Empower your sales team with a multi-agent shared inbox, automated lead distribution, and intelligent deal cadences that move prospects from inquiry to signed contracts faster.",
    growthMetric: "4.2x",
    metricLabel: "Faster Sales Response SLA",
    color: "from-indigo-600 to-violet-600",
    accentBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    highlights: [
      "Multi-agent shared team inbox with collision detection and collision locking",
      "Automated lead stage progression and WhatsApp follow-up cadences",
      "Deep 2-way sync with HubSpot, Salesforce, Zoho, and Webhooks",
      "Internal private staff notes, mention tags, and deal value tracking",
    ],
    workflow: [
      { step: "1", label: "Inbound inquiry from landing page or referral" },
      { step: "2", label: "Round-robin assignment to available sales rep" },
      { step: "3", label: "Automated follow-up cadence triggered on stage move" },
      { step: "4", label: "Closed-won notification synced to team analytics" },
    ],
  },
  {
    id: "education",
    icon: GraduationCap,
    title: "Education & EdTech",
    badge: "Universities & Academies",
    headline: "Streamline Admissions, Counseling & Student Alerts",
    description:
      "Engage prospective students on their preferred channel. Automate course counseling, syllabus PDF downloads, fee reminder alerts, and live student support.",
    growthMetric: "3.5x",
    metricLabel: "Higher Admissions Conversion",
    color: "from-amber-600 to-orange-600",
    accentBg: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: [
      "Automated course eligibility checking and brochure downloads",
      "Fee payment links with instant receipt generation",
      "Broadcast exam schedules, holiday notices, and campus announcements",
      "Multi-language support for international students across 40+ languages",
    ],
    workflow: [
      { step: "1", label: "Student inquires about course or syllabus" },
      { step: "2", label: "AI provides curriculum details & checks eligibility" },
      { step: "3", label: "Admission form link & counselor callback scheduled" },
      { step: "4", label: "Onboarding checklist & fee reminder alerts dispatched" },
    ],
  },
  {
    id: "hospitality",
    icon: Plane,
    title: "Travel & Hospitality",
    badge: "Hotels, Airlines & Umrah",
    headline: "24/7 AI Concierge, Itinerary Alerts & Booking Updates",
    description:
      "Deliver 5-star guest experiences from booking to checkout. Provide automated flight and hotel confirmations, itinerary PDFs, room service requests, and multilingual voice assistance.",
    growthMetric: "92%",
    metricLabel: "Guest Satisfaction Rate",
    color: "from-rose-600 to-pink-600",
    accentBg: "bg-rose-50 text-rose-700 border-rose-200",
    highlights: [
      "Instant WhatsApp booking vouchers and PDF flight/hotel itineraries",
      "24/7 multilingual Voice & Chat AI concierge for room service and FAQs",
      "Real-time flight delay and gate change notification broadcasts",
      "Automated checkout feedback collection and loyalty rewards",
    ],
    workflow: [
      { step: "1", label: "Guest confirms reservation online" },
      { step: "2", label: "Instant WhatsApp itinerary with check-in instructions" },
      { step: "3", label: "AI Concierge handles requests & local recommendations" },
      { step: "4", label: "Automated 1-click feedback & loyalty points summary" },
    ],
  },
];

export const UseCasesPage: React.FC = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ecommerce");

  const current = INDUSTRIES.find((ind) => ind.id === selectedIndustry) || INDUSTRIES[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Enterprise Solutions & Blueprints
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Built for Every Industry.{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Engineered for Explosive Growth.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover how leading global enterprises use Linala's Omnichannel Voice & WhatsApp CRM to automate conversions, accelerate response times, and drive measurable revenue.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-6 py-3 h-12 shadow-md shadow-purple-500/20">
                Start Free 14-Day Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 py-3 h-12">
                Talk to Solution Experts
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Industry Tabs & Showcase */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Select Your Industry
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Tailored workflows, compliance frameworks, and automation templates ready for immediate deployment.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {INDUSTRIES.map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === selectedIndustry;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedIndustry(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Industry Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5 overflow-hidden p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${current.accentBg}`}>
                  {current.badge}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{current.growthMetric} {current.metricLabel}</span>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {current.headline}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium leading-normal">{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link href="/signup">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs text-xs sm:text-sm font-semibold">
                    Deploy {current.title} Blueprint
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="ghost" className="text-slate-600 hover:text-purple-600 text-xs sm:text-sm font-medium">
                    Speak with an Industry Specialist &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Interactive Workflow Visualizer */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 shadow-inner space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Automated Lifecycle Flow</span>
                </div>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">Live Engine</span>
              </div>

              <div className="space-y-3">
                {current.workflow.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {w.step}
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-snug">
                      {w.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/60 flex items-center gap-3">
                <Bot className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <p className="text-[11px] text-purple-900 font-medium">
                  Voice Autopilot & WhatsApp Meta API seamlessly handle all steps with 99.99% uptime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions by Department */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              Department Solutions
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Purpose-Built for Your Entire Organization
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Whether you are driving revenue, managing support volume, or executing high-yield campaigns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 shadow-2xs">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">For Sales & Revenue</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Accelerate deal cycles with automatic lead assignment, instant Click-to-WhatsApp routing, and automated deal stage cadences.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-600" /> Automated follow-up drips</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-600" /> Kanban pipeline with revenue metrics</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-600" /> Instant outbound Voice AI qualification</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 shadow-2xs">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">For Customer Support</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Resolve 70%+ of customer tickets autonomously with conversational AI agents while giving human agents a unified multi-agent workspace.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> 24/7 AI Voice & Chatbot resolution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Multi-agent collision detection</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Canned responses & SLA monitoring</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-6 shadow-2xs">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">For Marketing & Growth</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Launch hyper-personalized broadcasts with 98% open rates and rich multimedia templates verified by Meta's Official Cloud API.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-600" /> Dynamic variable audience segmentation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-600" /> Real-time CTR & revenue attribution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-600" /> Green-tick official template engine</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Enterprise-Grade Scale & Security
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Ready to Transform Your Customer Communication?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of modern businesses accelerating revenue and customer happiness on Linala.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-sm">
                Get Started Free Today
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 h-12 text-sm">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UseCasesPage;
