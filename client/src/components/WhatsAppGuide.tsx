import React, { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  ArrowRight,
  MessageCircle,
  Settings,
  Users,
  BarChart3,
  Zap,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Layers,
  Key,
  BadgeCheck,
  Send,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  headline: string;
  summary: string;
  steps: {
    number: string;
    title: string;
    description: string;
    tips?: string[];
  }[];
  proTip: string;
}

const META_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Meta Architecture Overview",
    icon: Zap,
    headline: "Understanding Meta's Official WhatsApp Cloud API",
    summary:
      "Meta Cloud API allows businesses to communicate directly with over 2.7+ billion WhatsApp users globally using official Meta-hosted cloud servers with 99.99% uptime and zero infrastructure maintenance.",
    steps: [
      {
        number: "01",
        title: "Official Cloud API vs Unofficial QR Gateways",
        description:
          "Unofficial web automation tools risk permanent phone number bans and offer no SLA. Meta's official Cloud API provides guaranteed delivery, official messaging tiers, and full API webhook support.",
        tips: [
          "Zero ban risk when following Meta Commerce Policy",
          "Access to high-speed tier throughput (up to 1,000+ msg/sec)",
          "Eligibility for Official Green Tick verification badge",
        ],
      },
      {
        number: "02",
        title: "24-Hour Customer Care Window",
        description:
          "When a user messages your business, a 24-hour service window opens where you can send free-form session messages with zero Meta template fees.",
        tips: [
          "Automate responses instantly using Linala AI Autopilot",
          "Session resets for another 24 hours every time the customer replies",
        ],
      },
    ],
    proTip:
      "Always prioritize driving inbound messages (e.g. via Click-to-WhatsApp ads or website widgets) to maximize free 24-hour conversation windows.",
  },
  {
    id: "business-verification",
    title: "Meta Business Verification",
    icon: ShieldCheck,
    headline: "Step-by-Step Meta Business Verification Blueprint",
    summary:
      "Verifying your Meta Business Manager unlocks Tier 2 messaging (10,000+ unique contacts/day) and qualifies your brand for the Official Green Tick badge.",
    steps: [
      {
        number: "01",
        title: "Prepare Required Legal Documents",
        description:
          "Meta requires official government documentation showing your registered business name, legal address, and operating phone number.",
        tips: [
          "Accepted: Certificate of Incorporation, GST / VAT Registration, Business Tax License",
          "Proof of Address: Recent utility bill or bank statement matching the legal business name",
        ],
      },
      {
        number: "02",
        title: "Domain Verification in Meta Business Manager",
        description:
          "Add your primary website domain to Meta Business Settings -> Brand Safety -> Domains and verify via DNS TXT record or HTML meta tag.",
      },
      {
        number: "03",
        title: "Submit for Instant Verification",
        description:
          "Navigate to Security Center in Business Manager, click 'Start Verification', upload the documents, and verify the verification code sent to your official company domain email.",
      },
    ],
    proTip:
      "Ensure your website footer contains your legal company name and address matching your submitted government documents for 24-48 hour fast-track approval.",
  },
  {
    id: "phone-registration",
    title: "Phone Number & Display Name",
    icon: Settings,
    headline: "Registering Your Official WhatsApp Business Phone Number",
    summary:
      "Connect a dedicated clean phone number to your Meta WABA account and set an approved Display Name.",
    steps: [
      {
        number: "01",
        title: "Phone Number Requirements",
        description:
          "The phone number must be able to receive an SMS or voice verification call and must NOT be currently registered on the standard WhatsApp mobile app.",
        tips: [
          "If already on mobile WhatsApp, delete the account in App Settings -> Account -> Delete Account before registration",
          "Virtual numbers, landlines with IVR (direct voice OTP), and toll-free numbers are fully supported",
        ],
      },
      {
        number: "02",
        title: "Display Name Guidelines & Branding Consistency",
        description:
          "Your WhatsApp Display Name must have clear branding correlation with your business, website, or legal certificate.",
        tips: [
          "Must match website branding or trademarked brand name",
          "Avoid excessive capitalization or generic terms (e.g. use 'Linala Support' instead of 'BEST SUPPORT')",
        ],
      },
      {
        number: "03",
        title: "Enable Two-Step Verification PIN",
        description:
          "Set a 6-digit security PIN in your Linala WABA settings to lock the number against unauthorized porting.",
      },
    ],
    proTip:
      "Use a dedicated corporate phone number so your team never loses ownership when staff members change.",
  },
  {
    id: "templates",
    title: "Template Creation & Approval",
    icon: MessageCircle,
    headline: "Crafting High-Converting, Meta-Approved Message Templates",
    summary:
      "Outbound notifications outside the 24-hour window require pre-approved message templates categorized as Utility, Authentication, or Marketing.",
    steps: [
      {
        number: "01",
        title: "Template Categories Explained",
        description:
          "Meta enforces 3 distinct template categories with separate pricing models:",
        tips: [
          "Utility: Order updates, delivery tracking, appointment confirmations (Lowest Meta fee)",
          "Authentication: OTPs and verification codes with 1-tap copy buttons",
          "Marketing: Product promotions, offers, newsletters, and announcements",
        ],
      },
      {
        number: "02",
        title: "Variable Parameters & Dynamic Buttons",
        description:
          "Use {{1}}, {{2}} placeholders for dynamic customer names, order IDs, and tracking links. Add interactive Quick Reply buttons or Call-to-Action URL buttons.",
      },
      {
        number: "03",
        title: "Passing Meta AI Template Review in Under 5 Minutes",
        description:
          "Provide realistic sample values for all variables during submission. Avoid spammy capitalization and include clear opt-out language for marketing broadcasts.",
      },
    ],
    proTip:
      "Adding a simple 'STOP / Opt-Out' quick reply button significantly lowers user spam reports and keeps your WhatsApp Quality Rating in the Green zone.",
  },
  {
    id: "green-tick",
    title: "Official Green Tick Verification",
    icon: BadgeCheck,
    headline: "How to Apply for the WhatsApp Verified Green Tick Badge",
    summary:
      "The Green Tick badge displays your verified business name instead of a phone number, increasing customer trust and message open rates to 98%+.",
    steps: [
      {
        number: "01",
        title: "Eligibility Criteria",
        description:
          "To qualify for the Official Business Account (OBA) Green Tick badge, your business must satisfy Meta's authenticity and notability standards.",
        tips: [
          "Meta Business Manager must be fully verified",
          "Two-step verification enabled on the WABA phone number",
          "Demonstrated organic notability (coverage in leading news publications, PR articles, Wikipedia)",
          "Tier 2 messaging tier or higher with a 'High' Quality Rating",
        ],
      },
      {
        number: "02",
        title: "Submitting the OBA Application",
        description:
          "Navigate to WhatsApp Manager -> Phone Numbers -> Profile -> Submit Official Business Account Request. Provide your official website and up to 5 reputable news articles.",
      },
    ],
    proTip:
      "If your initial Green Tick application is rejected by Meta, you can re-apply after 30 days. Rejections do not affect your ability to send broadcast campaigns.",
  },
  {
    id: "messaging-tiers",
    title: "Messaging Tiers & Warming",
    icon: BarChart3,
    headline: "Scaling From 1,000 to Unlimited Messages Per Day",
    summary:
      "Meta dynamically scales your daily outbound messaging limits as you maintain high quality and engagement.",
    steps: [
      {
        number: "01",
        title: "Understanding Meta Messaging Tiers",
        description: "Meta limits how many unique business-initiated contacts you can message in a rolling 24-hour period:",
        tips: [
          "Unverified Business: 250 unique contacts/day",
          "Tier 1 (Verified): 1,000 unique contacts/day",
          "Tier 2: 10,000 unique contacts/day (Automatically upgraded after sending 50% of Tier 1 within 7 days)",
          "Tier 3: 100,000 unique contacts/day",
          "Tier 4: Unlimited unique contacts/day",
        ],
      },
      {
        number: "02",
        title: "Safe Tier Warming Strategy",
        description:
          "When scaling up, start by sending high-relevance transactional messages (e.g. order updates) to your most active customers to build a strong quality reputation before launching broad marketing campaigns.",
      },
    ],
    proTip:
      "Monitor your Phone Number Quality Rating daily in Linala dashboard. If rating drops to Medium or Low, immediately pause broadcast campaigns to prevent tier demotion.",
  },
];

export const WhatsAppGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("getting-started");

  const current =
    META_GUIDE_SECTIONS.find((sec) => sec.id === activeTab) ||
    META_GUIDE_SECTIONS[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            Meta Official Cloud API & WABA Playbook (2026 Edition)
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            The Complete Guide to{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              WhatsApp Meta Cloud API
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about Meta Business Verification, official WABA setup, Green Tick approval, template optimization, and safe tier warming.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-6 py-3 h-12 shadow-md shadow-purple-500/20">
                Connect Your Meta WABA Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a
              href="https://business.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 py-3 h-12">
                Open Meta Business Suite
                <ExternalLink className="w-4 h-4 ml-2 text-slate-400" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Main Guide Content */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-2">
            <div className="sticky top-28 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
                Guide Chapters
              </h3>
              {META_GUIDE_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isSelected = sec.id === activeTab;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Chapter Content */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xl shadow-slate-900/5 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3 border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  {current.title}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {current.headline}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {current.summary}
                </p>
              </div>

              {/* Step Cards */}
              <div className="space-y-6">
                {current.steps.map((st, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {st.number}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {st.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                      {st.description}
                    </p>
                    {st.tips && st.tips.length > 0 && (
                      <div className="pl-10 pt-2 space-y-2">
                        {st.tips.map((tip, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-700 font-medium leading-relaxed">
                              {tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pro Tip Box */}
              <div className="p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl border border-purple-200/80 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                    Meta Architect Pro Tip
                  </h4>
                  <p className="text-xs sm:text-sm text-purple-800 leading-relaxed font-medium">
                    {current.proTip}
                  </p>
                </div>
              </div>

              {/* CTA footer inside chapter */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Need 1-on-1 Onboarding Assistance?</h4>
                  <p className="text-xs text-slate-500">Our Meta Certified Solution Engineers will help verify your account.</p>
                </div>
                <Link href="/contact">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">
                    Request Setup Support
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhatsAppGuide;
