import React, { useState } from "react";
import { Link } from "wouter";
import {
  Zap,
  Layers,
  Utensils,
  CreditCard,
  Bot,
  Database,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Search,
  Workflow,
  Radio,
  Building2,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntegrationItem {
  name: string;
  category: "restaurant" | "ai" | "automation" | "ecommerce" | "payment" | "crm";
  badge: string;
  badgeColor?: string;
  description: string;
  features: string[];
  externalUrl?: string;
  highlight?: boolean;
}

const ALL_INTEGRATIONS: IntegrationItem[] = [
  // Restaurant RMS (Orderown)
  {
    name: "Orderown Restaurant RMS",
    category: "restaurant",
    badge: "Featured Partner",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    description:
      "Full two-way synchronization with Orderown (orderown.com) — the premier Restaurant Management System. Automate WhatsApp food orders, live Table QR billing, Kitchen Display System (KDS) sync, and delivery dispatch notifications.",
    features: [
      "1-Click WhatsApp digital menu & instant ordering",
      "Automated WhatsApp order confirmation with live KOT kitchen status",
      "Real-time delivery driver dispatch & live map tracking updates",
      "Automated post-dine review collection & loyalty point rewards",
    ],
    externalUrl: "https://orderown.com",
    highlight: true,
  },

  // AI & Speech Intelligence
  {
    name: "OpenAI GPT-4o & ChatGPT",
    category: "ai",
    badge: "AI Engine",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Power conversational bots with advanced contextual understanding, document retrieval, and intelligent objection handling.",
    features: [
      "Custom system prompts & knowledge base injection",
      "Function calling & live database querying",
      "Multi-turn conversational memory in WhatsApp",
    ],
  },
  {
    name: "ElevenLabs Voice AI",
    category: "ai",
    badge: "Speech Model",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Ultra-realistic multilingual voice synthesis with natural human cadence, emotion, and low latency for outbound and inbound calls.",
    features: [
      "Sub-500ms voice generation",
      "Custom voice cloning & studio-grade audio quality",
      "40+ global language accents and nuances",
    ],
  },
  {
    name: "Deepgram Realtime Speech",
    category: "ai",
    badge: "Voice-to-Text",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Ultra-fast live speech-to-text transcription for real-time audio phone conversations and customer voice note processing.",
    features: [
      "Instant word-by-word streaming transcription",
      "Accented speech & background noise suppression",
      "Automated punctuation & entity extraction",
    ],
  },
  {
    name: "Google Gemini 2.0 & Anthropic Claude",
    category: "ai",
    badge: "Multimodal AI",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Process customer product photos, PDF invoices, and complex multimodal inquiries directly inside WhatsApp chat.",
    features: [
      "Vision analysis for prescription & receipt reading",
      "High token context window for large documentation",
      "Multilingual translation across global dialects",
    ],
  },

  // Zapier & Automation
  {
    name: "Zapier (5,000+ Apps)",
    category: "automation",
    badge: "No-Code Ecosystem",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description:
      "Connect Linala with over 5,000+ web applications without writing code. Trigger automated WhatsApp notifications on any event.",
    features: [
      "Trigger WhatsApp broadcast on new Google Sheets row or Typeform submit",
      "Sync incoming WhatsApp contacts to Google Contacts, Slack, or Mailchimp",
      "Multi-step automated Zaps with conditional branching filters",
    ],
    highlight: true,
  },
  {
    name: "Make.com (Integromat)",
    category: "automation",
    badge: "Visual Scenarios",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description:
      "Build complex enterprise data routing scenarios and multi-app syncs with visual drag-and-drop nodes.",
    features: [
      "Visual scenario builder with data transformation routers",
      "Real-time webhook triggers with instant execution",
      "Error-handling paths and automated fallback actions",
    ],
  },
  {
    name: "Custom Webhooks & REST API",
    category: "automation",
    badge: "Developer First",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    description:
      "Bi-directional webhooks to receive inbound messages, delivery receipts, button clicks, and trigger programmatic messages from any backend.",
    features: [
      "Signed SHA-256 HMAC payload verification",
      "Immediate event dispatch for message status updates",
      "Swagger & Postman collections ready for quick testing",
    ],
  },

  // E-Commerce
  {
    name: "Shopify & Shopify Plus",
    category: "ecommerce",
    badge: "Native E-Com",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Automate order confirmation alerts, dispatch tracking numbers, recover abandoned checkouts, and sync WhatsApp catalog inventory.",
    features: [
      "Automatic abandoned cart recovery drip sequence",
      "Order created, fulfilled, and out-for-delivery alerts",
      "COD verification button to reduce return-to-origin (RTO)",
    ],
    highlight: true,
  },
  {
    name: "WooCommerce & WordPress",
    category: "ecommerce",
    badge: "Open Source",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Plug-and-play integration for WooCommerce stores to send instant WhatsApp PDF invoices, delivery status, and promotional broadcasts.",
    features: [
      "Instant checkout notifications with PDF receipt attachments",
      "Customizable order status trigger webhooks",
      "1-Click chat-to-order button for WooCommerce product pages",
    ],
  },

  // Payment Gateways
  {
    name: "Stripe Payments",
    category: "payment",
    badge: "Global Payments",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Generate dynamic Stripe checkout links inside WhatsApp chat and automatically dispatch receipts upon successful payment.",
    features: [
      "Global card, Apple Pay, Google Pay support",
      "Automated subscription invoice alerts & dunning reminders",
      "Instant webhook payment confirmation to unlock digital access",
    ],
  },
  {
    name: "Razorpay & UPI QR",
    category: "payment",
    badge: "India & GCC",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Accept payments natively via dynamic UPI QR codes and Razorpay payment links generated automatically in chat.",
    features: [
      "Instant UPI QR generation with auto-reconciliation",
      "Automated COD payment collection via WhatsApp link",
      "Instant payment receipts with GST breakdown",
    ],
  },

  // CRMs
  {
    name: "HubSpot CRM",
    category: "crm",
    badge: "CRM Sync",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Log all WhatsApp conversations directly inside HubSpot contact timelines. Trigger WhatsApp workflows from HubSpot deal stages.",
    features: [
      "2-Way contact property sync and conversation logging",
      "Send WhatsApp templates directly from HubSpot contact records",
      "HubSpot workflow action to trigger automated WhatsApp broadcasts",
    ],
  },
  {
    name: "Salesforce & Zoho CRM",
    category: "crm",
    badge: "Enterprise CRM",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    description:
      "Bi-directional synchronization with enterprise CRM records, lead scoring, and automated sales rep assignment.",
    features: [
      "Sync WhatsApp leads into Salesforce Leads and Contacts",
      "Automate task creation for sales reps on inbound customer replies",
      "Custom field mapping and pipeline stage progression",
    ],
  },
];

export const Integrations: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredIntegrations = ALL_INTEGRATIONS.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            Ecosystem & Integrations
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Connect Linala with Your{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Entire Software Stack
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From Orderown Restaurant RMS and 5,000+ Zapier apps to AI models, Shopify, Stripe, and enterprise CRMs — automate your customer workflows seamlessly.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations (e.g. Orderown, Zapier, Shopify, OpenAI)..."
              className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Categories & Integration Cards */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: "all", label: "All Integrations" },
            { id: "restaurant", label: "Restaurant RMS (Orderown)" },
            { id: "automation", label: "Zapier & Automation" },
            { id: "ai", label: "AI & Speech Models" },
            { id: "ecommerce", label: "E-Commerce" },
            { id: "payment", label: "Payment Gateways" },
            { id: "crm", label: "CRMs & Databases" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((item, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-3xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                item.highlight
                  ? "border-purple-300 shadow-lg shadow-purple-500/5 ring-1 ring-purple-100"
                  : "border-slate-200/80 shadow-xs hover:shadow-xl hover:border-purple-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.badgeColor || "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                  {item.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 font-medium leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold text-orange-600 hover:text-orange-700 group"
                  >
                    <span>Visit {item.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <Link
                    href="/signup"
                    className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 group"
                  >
                    <span>Connect in 1-Click</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Need a Custom API or Enterprise CRM Connector?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Our integration engineering team can build dedicated webhooks and custom pipelines for your enterprise infrastructure.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-xs sm:text-sm">
                Request Custom Integration
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Integrations;
