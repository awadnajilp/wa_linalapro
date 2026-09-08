/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

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

interface CaseStudy {
  id: string;
  company: string;
  logoText: string;
  industry: string;
  category: "all" | "ecommerce" | "healthcare" | "restaurant" | "realestate" | "edtech" | "b2b";
  title: string;
  location: string;
  image: string;
  summary: string;
  challenge: string;
  solution: string;
  heroMetric: string;
  heroMetricLabel: string;
  metrics: {
    label: string;
    value: string;
    trend: string;
  }[];
  testimonial: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
  technologies: string[];
  duration: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "fashionhub-global",
    company: "FashionHub Retail",
    logoText: "FH",
    industry: "E-Commerce & Apparel",
    category: "ecommerce",
    title: "How FashionHub Recovered $2.1M in Abandoned Carts via WhatsApp Flows",
    location: "United Kingdom & UAE",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    summary:
      "A fast-growing direct-to-consumer fashion retailer turned 68% of abandoned checkouts into completed orders with personalized 1-click WhatsApp cart recovery drips.",
    challenge:
      "High mobile ad acquisition costs combined with a 72% abandoned cart rate on Shopify. Traditional email recovery had sub-12% open rates and was failing to re-engage impulse buyers.",
    solution:
      "Connected Linala WhatsApp CRM directly to Shopify webhooks. When a shopper drops off at checkout, a dynamic WhatsApp template with item photos, discount countdowns, and 1-click WhatsApp payment checkout is dispatched in 15 minutes.",
    heroMetric: "+310%",
    heroMetricLabel: "Recovered Cart Revenue",
    metrics: [
      { label: "Cart Recovery Rate", value: "46.2%", trend: "+34% vs email" },
      { label: "WhatsApp Read Rate", value: "94.8%", trend: "Within 5 minutes" },
      { label: "Annual Revenue Impact", value: "$2.1M", trend: "Net new sales" },
    ],
    testimonial: {
      quote:
        "Linala completely revolutionized our post-click conversion funnels. WhatsApp cart recovery delivers 8x higher ROI than any email tool we have ever used.",
      author: "Sarah Jenkins",
      role: "VP of Growth Marketing",
      company: "FashionHub Retail",
    },
    technologies: ["Shopify Webhooks", "Meta Cloud API", "Visual Flow Builder", "Instant Payment Links"],
    duration: "45 Days Implementation",
  },
  {
    id: "orderown-al-bustan",
    company: "Al Bustan Restaurant Chain",
    logoText: "AB",
    industry: "Food & Hospitality",
    category: "restaurant",
    title: "Al Bustan Boosts Direct Repeat Orders by 185% with Orderown RMS Sync",
    location: "Riyadh & Jeddah, KSA",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    summary:
      "A leading casual dining chain across Saudi Arabia cut 3rd-party delivery aggregator commissions by shifting 60% of customer orders directly to WhatsApp with Orderown RMS.",
    challenge:
      "Hefty 25% commission fees on third-party food delivery apps eroded profit margins. Customers also lacked real-time visibility into kitchen prep and delivery ETA.",
    solution:
      "Integrated Linala WhatsApp Automation with Orderown Restaurant RMS (orderown.com). Diners scan table QR codes or message the brand number to browse digital menus, pay instantly, and receive live KOT kitchen and driver GPS dispatch alerts.",
    heroMetric: "+185%",
    heroMetricLabel: "Direct Repeat Orders",
    metrics: [
      { label: "Commission Saved", value: "25%", trend: "Per direct order" },
      { label: "Average Ticket Size", value: "+32%", trend: "Upsell recommendations" },
      { label: "KOT Dispatch Speed", value: "1.8 mins", trend: "Zero order errors" },
    ],
    testimonial: {
      quote:
        "The synergy between Orderown RMS and Linala WhatsApp ordering gave us total ownership over our customer relationships while saving millions in aggregator fees.",
      author: "Tariq Al-Mansoor",
      role: "Operations Director",
      company: "Al Bustan Hospitality Group",
    },
    technologies: ["Orderown RMS", "Table QR Engine", "KOT Sync", "Delivery Dispatch Webhooks"],
    duration: "30 Days Implementation",
  },
  {
    id: "mediclinic-health",
    company: "Apex Healthcare Network",
    logoText: "AH",
    industry: "Healthcare & Clinics",
    category: "healthcare",
    title: "Apex Healthcare Reduces Patient No-Shows by 64% with Automated Reminders",
    location: "Manama, Bahrain & Mumbai, India",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    summary:
      "A multi-speciality clinical network automated appointment bookings, digital lab report PDF delivery, and multilingual reminders, dramatically increasing clinic utilization.",
    challenge:
      "High patient no-show rates of 28% created severe scheduling bottlenecks. Front-desk staff spent 4+ hours daily calling patients manually for confirmation.",
    solution:
      "Deployed 2-way interactive WhatsApp appointment confirmation flows with Google Calendar & HMS sync. Patients can reschedule or confirm with a single button tap and instantly receive encrypted lab test results as PDF attachments.",
    heroMetric: "-64%",
    heroMetricLabel: "Reduction in No-Shows",
    metrics: [
      { label: "Attendance Rate", value: "93.4%", trend: "+28% improvement" },
      { label: "Staff Time Saved", value: "22 hrs/wk", trend: "Per clinic location" },
      { label: "Patient Satisfaction", value: "4.9/5", trend: "Based on 14k ratings" },
    ],
    testimonial: {
      quote:
        "Our doctors love having full schedules, and our patients appreciate getting their prescription summaries and appointment reminders right on WhatsApp.",
      author: "Dr. Aisha Al-Khalifa",
      role: "Chief Medical Officer",
      company: "Apex Healthcare",
    },
    technologies: ["HMS API Integration", "PDF Auto-Generator", "Multilingual Bot (Arabic/English)", "Interactive Quick Buttons"],
    duration: "60 Days Implementation",
  },
  {
    id: "gulf-estates-realty",
    company: "Gulf Horizon Real Estate",
    logoText: "GH",
    industry: "Real Estate & Developers",
    category: "realestate",
    title: "Gulf Horizon Converts 3.4x More Meta Ad Leads into Verified Site Visits",
    location: "Dubai & Al Khobar, KSA",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
    summary:
      "Luxury real estate developer replaced slow email follow-ups with instant Click-to-WhatsApp ad funnels and automated lead qualification cadences.",
    challenge:
      "Prospective property buyers submitting web inquiry forms were cooling off before sales reps could call them back 6-12 hours later.",
    solution:
      "Built Click-to-WhatsApp (CTWA) ads routed directly into Linala Kanban CRM. An automated conversational bot immediately qualifies budget, property type, and preferred handover date, assigning high-intent leads to senior property advisors within 30 seconds.",
    heroMetric: "3.4x",
    heroMetricLabel: "Higher Ad Conversion",
    metrics: [
      { label: "Response Latency", value: "< 28 secs", trend: "Down from 8 hours" },
      { label: "Qualified Site Visits", value: "+142%", trend: "Month-over-month" },
      { label: "Cost Per Qualified Lead", value: "-48%", trend: "Meta Ads ROAS jump" },
    ],
    testimonial: {
      quote:
        "In luxury real estate, speed to lead is everything. Linala's automated qualification bot ensures no high-net-worth inquiry ever slips through the cracks.",
      author: "Rashid Bin Khalid",
      role: "Managing Partner",
      company: "Gulf Horizon Realty",
    },
    technologies: ["Click-to-WhatsApp (CTWA)", "Kanban Sales Cadence", "AI Budget Qualifier", "HubSpot CRM Sync"],
    duration: "21 Days Implementation",
  },
  {
    id: "eduskill-global",
    company: "EduSkill Global Institute",
    logoText: "EG",
    industry: "Education & Higher Learning",
    category: "edtech",
    title: "EduSkill Scales Admissions Inquiries by 240% with Realtime Voice AI",
    location: "United Kingdom & India",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    summary:
      "International certification academy deployed human-sounding Voice AI phone agents to answer course curriculum inquiries 24/7 across multiple time zones.",
    challenge:
      "Prospective students calling after office hours were hitting voicemail, resulting in high drop-off and lost enrollments to competing universities.",
    solution:
      "Configured Linala Multilingual Voice AI with custom course knowledge bases. The Voice AI answers phone inquiries in sub-600ms, explains course modules, answers fee questions, and automatically texts application links over WhatsApp.",
    heroMetric: "+240%",
    heroMetricLabel: "Admissions Inquiries Handled",
    metrics: [
      { label: "24/7 Call Answer Rate", value: "99.8%", trend: "Zero missed calls" },
      { label: "Application Submissions", value: "+88%", trend: "Direct from WhatsApp" },
      { label: "Cost Per Enrollment", value: "-38%", trend: "Lower support overhead" },
    ],
    testimonial: {
      quote:
        "Students are amazed when our AI phone assistant answers instantly at midnight, speaks fluent English or Hindi, and sends the brochure to their WhatsApp before they hang up.",
      author: "Prof. Arthur Pendelton",
      role: "Dean of Admissions",
      company: "EduSkill Global",
    },
    technologies: ["Realtime Voice AI (WebRTC)", "OpenAI GPT-4o", "Deepgram STT", "Automated WhatsApp Brochure Dispatch"],
    duration: "30 Days Implementation",
  },
  {
    id: "saasflow-b2b",
    company: "CloudCore B2B Logistics",
    logoText: "CC",
    industry: "B2B SaaS & Enterprise",
    category: "b2b",
    title: "CloudCore Accelerates Enterprise Deal Velocity by 55% with Multi-Agent Inbox",
    location: "London, UK",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    summary:
      "Enterprise supply chain software provider consolidated partner communication, quotation approvals, and SLA tickets in a unified multi-agent WhatsApp inbox.",
    challenge:
      "SLA updates were fragmented across scattered personal WhatsApp chats and unmonitored email threads, leading to customer frustration and renewal risks.",
    solution:
      "Standardized all partner communication on an official Meta Cloud API WhatsApp business number with collision avoidance, shared canned snippets, and Zapier sync into Salesforce.",
    heroMetric: "+55%",
    heroMetricLabel: "Faster Deal Closure",
    metrics: [
      { label: "First Response SLA", value: "< 4 mins", trend: "98% SLA compliance" },
      { label: "Customer Retention", value: "98.5%", trend: "Annual renewal rate" },
      { label: "Salesforce CRM Sync", value: "100%", trend: "Automated audit logs" },
    ],
    testimonial: {
      quote:
        "Linala gave our enterprise account managers the superpower of collaborative WhatsApp chat with full enterprise security and compliance tracking.",
      author: "Marcus Vance",
      role: "Head of Customer Experience",
      company: "CloudCore Logistics",
    },
    technologies: ["Multi-Agent Shared Inbox", "Salesforce Two-Way Sync", "Agent Collision Prevention", "Canned Response Library"],
    duration: "40 Days Implementation",
  },
];

const CaseStudies: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeStudyModal, setActiveStudyModal] = useState<CaseStudy | null>(null);

  const categories = [
    { id: "all", label: "All Industries" },
    { id: "ecommerce", label: "E-Commerce & Retail" },
    { id: "restaurant", label: "Restaurant RMS & Food" },
    { id: "healthcare", label: "Healthcare & Clinics" },
    { id: "realestate", label: "Real Estate" },
    { id: "edtech", label: "Education & Voice AI" },
    { id: "b2b", label: "B2B & Enterprise" },
  ];

  const filteredStudies =
    selectedCategory === "all"
      ? CASE_STUDIES
      : CASE_STUDIES.filter((study) => study.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero Header */}
      <section className="relative py-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Proven Enterprise ROI & Benchmarks
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            How Leading Global Brands Scale with{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Linala
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Real enterprise transformations, verified conversion benchmarks, and measurable revenue impact across 4+ countries and 12+ industries.
          </p>

          {/* Macro Metric Highlights */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-purple-600">310%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Average ROI in 90 Days</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-indigo-600">&lt; 30s</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">First Response Speed</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-pink-600">94.8%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Average WhatsApp Read Rate</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <p className="text-3xl font-extrabold text-emerald-600">64%</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Support Overhead Reduction</p>
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
                {cat.label}
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
                
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-800 shadow-xs">
                    {study.industry}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-600/90 backdrop-blur-sm text-xs font-bold text-white shadow-xs">
                    {study.location}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-medium text-purple-200 mb-0.5">{study.company}</p>
                  <h3 className="text-lg sm:text-xl font-bold leading-snug line-clamp-2">
                    {study.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {study.summary}
                  </p>

                  {/* Primary Metrics Grid */}
                  <div className="mt-6 grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="col-span-1 text-center border-r border-slate-200/80 pr-2">
                      <p className="text-xl sm:text-2xl font-extrabold text-purple-600">
                        {study.heroMetric}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                        {study.heroMetricLabel}
                      </p>
                    </div>
                    {study.metrics.slice(0, 2).map((m, mIdx) => (
                      <div key={mIdx} className="text-center px-1">
                        <p className="text-sm sm:text-base font-bold text-slate-800">{m.value}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Customer Quote Snippet */}
                  <div className="mt-5 p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-700 italic relative">
                    <Quote className="w-4 h-4 text-purple-400 absolute top-2 right-2 opacity-50" />
                    "{study.testimonial.quote}"
                    <div className="not-italic font-bold text-slate-900 mt-2">
                      — {study.testimonial.author},{" "}
                      <span className="text-slate-500 font-normal">{study.testimonial.role}</span>
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
                    <span>Read Full Story</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
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
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setActiveStudyModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3">
                  {activeStudyModal.industry} • {activeStudyModal.location}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {activeStudyModal.title}
                </h3>
              </div>

              {/* Metrics Showcase */}
              <div className="grid grid-cols-3 gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100">
                {activeStudyModal.metrics.map((m, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xl sm:text-2xl font-black text-purple-700">{m.value}</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{m.label}</p>
                    <p className="text-[10px] text-purple-600 font-medium">{m.trend}</p>
                  </div>
                ))}
              </div>

              {/* Problem vs Solution */}
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-red-600">
                    The Challenge
                  </h4>
                  <p className="text-slate-600 leading-relaxed">{activeStudyModal.challenge}</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-emerald-700">
                    The Linala Solution
                  </h4>
                  <p className="text-slate-700 leading-relaxed">{activeStudyModal.solution}</p>
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Architecture & Technologies Used
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
                  "{activeStudyModal.testimonial.quote}"
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{activeStudyModal.testimonial.author}</p>
                    <p className="text-[11px] text-slate-400">
                      {activeStudyModal.testimonial.role}, {activeStudyModal.testimonial.company}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                    Verified Customer
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveStudyModal(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
                <Link href="/contact">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">
                    Request Similar Implementation
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
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
            Ready to Build Your Own WhatsApp Success Story?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Join thousands of forward-thinking businesses. Connect with our solution engineers to map out your automated flows and Voice AI strategy.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl px-7 py-3.5 h-12 shadow-lg shadow-purple-500/25">
                Start Free 14-Day Trial
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/60 text-white hover:bg-slate-800 rounded-xl px-7 py-3.5 h-12"
              >
                Schedule Solution Architecture Call
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CaseStudies;
