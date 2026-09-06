import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShoppingBag,
  Bot,
  Workflow,
  Calendar,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CreditCard,
  Mic,
  Zap,
  Tag,
  ShieldCheck,
  TrendingUp,
  Volume2,
  Play,
  Pause,
  Layers,
  ChevronRight,
} from "lucide-react";

interface ProductModule {
  id: string;
  badge: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
  ctaText: string;
  ctaLink: string;
  previewType: "ecommerce" | "voice_ai" | "flow_builder" | "cadence" | "expense" | "crm";
}

const PRODUCT_MODULES: ProductModule[] = [
  {
    id: "ecommerce",
    badge: "Instant WhatsApp Commerce",
    icon: ShoppingBag,
    title: "WhatsApp Storefront & 1-Click Checkout",
    tagline: "Turn every WhatsApp conversation into a frictionless purchasing funnel.",
    description:
      "Showcase interactive product catalogs, send smart Buy Now buttons, collect payments via UPI QR, Razorpay, Stripe, or Cash on Delivery, and auto-recover abandoned carts.",
    benefits: [
      "Native WhatsApp single-product & multi-product catalog cards",
      "One-click direct checkout flow with automatic address collection",
      "Seamless payment gateway integration (Razorpay, Stripe, UPI QR, COD)",
      "Automated abandoned cart recovery drip sequences (+32% recovery rate)",
      "Instant PDF order invoices, payment confirmations & tracking alerts",
    ],
    ctaText: "Launch WhatsApp Store",
    ctaLink: "/signup",
    previewType: "ecommerce",
  },
  {
    id: "voice_ai",
    badge: "Multilingual Conversational AI",
    icon: Bot,
    title: "Voice Note AI & Autonomous Store Assistant",
    tagline: "Human-grade AI that understands & replies in Malayalam, Manglish, Hinglish & English.",
    description:
      "Deliver lifelike audio replies with natural accent synthesis, understand mixed regional dialects, answer customer queries with zero hallucinations, and trigger product flows automatically.",
    benefits: [
      "Realistic voice note synthesis with Sarvam AI, OpenAI & Groq engines",
      "Fluent understanding of Malayalam script, Manglish, Hinglish, Arabic & English",
      "Autonomous product advisor that recommends items from your catalog",
      "Intelligent human handoff with graceful fallbacks for custom inquiries",
      "Customizable brand tone, assistant profiles & knowledge base grounding",
    ],
    ctaText: "Explore Voice AI",
    ctaLink: "/signup",
    previewType: "voice_ai",
  },
  {
    id: "flow_builder",
    badge: "Visual Automation Canvas",
    icon: Workflow,
    title: "Drag-and-Drop Workflow & Bot Builder",
    tagline: "Build sophisticated automated customer journeys without touching code.",
    description:
      "Design complex conversational flows with intuitive drag-and-drop nodes, conditional branching based on user intent, time delays, webhook dispatches, and interactive list menus.",
    benefits: [
      "Intuitive canvas with triggers, actions, conditions, and delay nodes",
      "Branch conversations based on keywords, tags, or button clicks",
      "Send interactive quick replies, list pickers, media cards, and CTA buttons",
      "Trigger webhooks and sync customer data instantly with your CRM or ERP",
      "Zero-latency execution powered by high-concurrency event queues",
    ],
    ctaText: "Build Your First Flow",
    ctaLink: "/signup",
    previewType: "flow_builder",
  },
  {
    id: "cadence",
    badge: "Smart Follow-Up Engine",
    icon: Calendar,
    title: "Automated Cadence & Recurring Campaigns",
    tagline: "High-deliverability broadcasts and automated multi-touch nurturing.",
    description:
      "Schedule recurring broadcast campaigns, launch multi-day automated follow-up cadences, and re-engage dormant contacts with personalized dynamic tag segmentation.",
    benefits: [
      "Automated multi-step drip sequences triggered by contact actions",
      "Recurring campaigns with daily, weekly, or custom interval scheduling",
      "Dynamic placeholder tags ({{first_name}}, {{order_id}}, {{due_date}})",
      "Smart throttling and anti-ban safeguards with humanized delivery rates",
      "Detailed delivery, read, and reply rate telemetry with real-time logs",
    ],
    ctaText: "Start Campaign",
    ctaLink: "/signup",
    previewType: "cadence",
  },
  {
    id: "expense",
    badge: "SME Financial Management",
    icon: Receipt,
    title: "WhatsApp Expense & Financial Ledger",
    tagline: "Snap receipts on WhatsApp and get an automated business ledger.",
    description:
      "Effortlessly manage small business finances. Employees or business owners can snap receipts on WhatsApp; our AI automatically extracts vendor, tax, amount, and category into a clean balance sheet.",
    benefits: [
      "AI OCR receipt scanning directly from WhatsApp camera messages",
      "Automated expense categorization (inventory, travel, marketing, operations)",
      "Real-time cash flow, revenue vs expense breakdown, and profit analytics",
      "Multi-currency support with one-click PDF & Excel ledger exports",
      "Role-based expense approval workflows for SME teams",
    ],
    ctaText: "Explore Expense Ledger",
    ctaLink: "/signup",
    previewType: "expense",
  },
  {
    id: "crm",
    badge: "Unified Customer Hub",
    icon: Users,
    title: "Multi-Agent Team Inbox & CRM Pipeline",
    tagline: "Empower your entire sales and support team on a single WhatsApp number.",
    description:
      "Manage all customer conversations across multiple WhatsApp channels in a collaborative inbox. Assign conversations, track deal stages with Kanban pipelines, and qualify leads automatically.",
    benefits: [
      "Shared multi-agent inbox with collision detection and agent assignment",
      "Kanban deal pipeline with stages: New Lead, Contacted, Qualified, Won",
      "Automated lead qualification questionnaires & smart scoring",
      "Dynamic tagging, custom contact attributes, and private internal notes",
      "Android & iOS native mobile apps for on-the-go customer engagement",
    ],
    ctaText: "Try Team Inbox",
    ctaLink: "/signup",
    previewType: "crm",
  },
];

const Features: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeModule = PRODUCT_MODULES[activeIdx];
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <section id="features" className="py-24 lg:py-32 bg-slate-50/70 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header (Brevo Style) */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100/70 border border-purple-200/80 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            The Unified WhatsApp Growth Suite
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            One Platform. Every Tool You Need to{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent">
              Acquire, Sell & Retain.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Replace 6 disconnected tools with one integrated WhatsApp operating system designed for maximum conversion.
          </p>
        </div>

        {/* Brevo-Style Interactive Cloud Tabs Bar */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {PRODUCT_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            const isActive = activeIdx === idx;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-purple-600"}`} />
                <span>{mod.title.split("&")[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display: Brevo Feature Stage */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 overflow-hidden transition-all duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-6 sm:p-10 lg:p-12 items-center">
            
            {/* Left Column: Feature Deep Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200/60">
                <activeModule.icon className="w-3.5 h-3.5 text-purple-600" />
                {activeModule.badge}
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                  {activeModule.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base font-medium text-purple-700">
                  {activeModule.tagline}
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {activeModule.description}
                </p>
              </div>

              {/* Value Bullets */}
              <div className="space-y-2.5 pt-2">
                {activeModule.benefits.map((benefit, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Link */}
              <div className="pt-4">
                <Link
                  href={activeModule.ctaLink}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/30 transition-all"
                >
                  <span>{activeModule.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column: Simulated Live Interactive Visual Preview */}
            <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 sm:p-6 lg:p-7 text-white shadow-2xl border border-slate-800">
              
              {/* Preview Window Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2">
                    module://whatsway/{activeModule.id}
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  Live Engine Active
                </span>
              </div>

              {/* Dynamic Preview Modes */}
              {activeModule.previewType === "ecommerce" && (
                <div className="space-y-3 font-sans">
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-purple-400">🛍️ WhatsApp Native Catalog Message</span>
                      <span className="text-[10px] text-slate-400">Status: Sent & Read</span>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-lg bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-8 h-8 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white">Linen Slim-Fit Shirt (Teal Blue)</div>
                        <div className="text-xs text-slate-400 mt-0.5">SKU: LNN-4092 · In Stock (18 units)</div>
                        <div className="text-sm font-bold text-purple-400 mt-1">₹1,499 <span className="text-xs text-slate-500 line-through">₹2,299</span></div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="py-2 px-3 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <CreditCard className="w-3.5 h-3.5" /> 1-Click Buy Now
                      </button>
                      <button className="py-2 px-3 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5">
                        🏬 Browse Catalog
                      </button>
                    </div>
                  </div>

                  <div className="bg-purple-950/60 border border-purple-800/50 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-200">Payment Gateway Handshake: Razorpay / Stripe / UPI QR</span>
                    </div>
                    <span className="font-mono text-purple-400 font-bold">200 OK</span>
                  </div>
                </div>
              )}

              {activeModule.previewType === "voice_ai" && (
                <div className="space-y-3 font-sans">
                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Customer Audio Input (Malayalam / Manglish)</span>
                      <span className="text-purple-400 font-mono">Recognized: ml-IN</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg text-xs text-slate-300 font-mono">
                      "നമസ്കാരം, ഈ പ്രോഡക്റ്റിന്റെ വാറന്റി എത്ര കാലമാണ്? നാളെ ഡെലിവറി കിട്ടുമോ?"
                    </div>
                  </div>

                  <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs text-purple-300 font-semibold mb-2">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Synthesized Voice Note Audio</span>
                      <span className="text-[11px] text-purple-400 font-mono">Sarvam AI / Groq</span>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg flex items-center gap-3">
                      <button
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-purple-400 transition-colors"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                      </button>
                      <div className="flex-1 flex items-center gap-1 h-6">
                        {[30, 80, 45, 90, 60, 100, 75, 40, 85, 95, 50, 70, 30, 85, 40, 60].map((h, i) => (
                          <div key={i} className="flex-1 bg-purple-400 rounded-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <Volume2 className="w-4 h-4 text-purple-400" />
                    </div>
                    
                    <p className="text-xs text-purple-100 mt-2.5 leading-relaxed">
                      "നമസ്കാരം! ഇതിന് 1 വർഷത്തെ വാറന്റി ലഭ്യമാണ്. ഇന്ന് 3 മണിക്ക് മുൻപ് ഓർഡർ ചെയ്താൽ നാളെ തന്നെ എക്സ്പ്രസ് ഡെലിവറി ലഭിക്കും!"
                    </p>
                  </div>
                </div>
              )}

              {activeModule.previewType === "flow_builder" && (
                <div className="space-y-2.5 font-sans">
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        TRG
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Trigger: Keyword "PRICING" or "CATALOG"</div>
                        <div className="text-[10px] text-slate-400">Match Type: Regex or Fuzzy Word</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded">Trigger 01</span>
                  </div>

                  <div className="flex justify-center text-slate-600">↓</div>

                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        ACT
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Action: Send Interactive Store Catalog</div>
                        <div className="text-[10px] text-slate-400">Interactive Buy Now Buttons Attached</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded">Action 02</span>
                  </div>

                  <div className="flex justify-center text-slate-600">↓</div>

                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        CND
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Condition: If Abandoned in Cart (2 Hours)</div>
                        <div className="text-[10px] text-slate-400">Dispatch Auto Follow-up Promo #OFFER10</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded">Delay 2h</span>
                  </div>
                </div>
              )}

              {activeModule.previewType === "cadence" && (
                <div className="space-y-3 font-sans">
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Cadence: 3-Step Automated Nurturing</span>
                      <span className="text-[10px] text-purple-400 font-semibold">98.2% Delivery Rate</span>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300">Day 0: Welcome Video & Brand Introduction</span>
                        <span className="text-purple-400 font-mono text-[11px]">Delivered (1,402)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300">Day 2: Customer Case Study & Social Proof</span>
                        <span className="text-purple-400 font-mono text-[11px]">84% Open Rate</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300">Day 4: Limited VIP Discount Checkout Link</span>
                        <span className="text-amber-400 font-mono text-[11px]">41% Conversions</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Recurring Broadcast Engine</span>
                    <span className="text-purple-400 font-medium">Smart Anti-Ban Throttling: Active</span>
                  </div>
                </div>
              )}

              {activeModule.previewType === "expense" && (
                <div className="space-y-3 font-sans">
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-purple-400">📸 WhatsApp Bill Photo Scanner</span>
                      <span className="text-slate-400 text-[10px]">AI OCR Extraction in 1.4s</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Vendor / Store</span>
                        <span className="font-semibold text-white">Apple Store Dubai Mall</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Amount & Currency</span>
                        <span className="font-bold text-purple-400">AED 4,899.00</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Category Auto-Tag</span>
                        <span className="text-indigo-300">Office Hardware / Capex</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Tax / VAT Included</span>
                        <span className="text-slate-300">5% (AED 244.95)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-950/60 border border-purple-800/50 p-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-purple-200 font-medium">Ledger Status: Balanced & Export Ready</span>
                    <span className="text-purple-400 font-mono font-bold">PDF / XLS</span>
                  </div>
                </div>
              )}

              {activeModule.previewType === "crm" && (
                <div className="space-y-3 font-sans">
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-white">Kanban Sales Pipeline</span>
                      <span className="text-purple-400 text-[11px] font-semibold">12 Active Deals ($48,200)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-semibold mb-1">New Lead (4)</div>
                        <div className="bg-slate-900 p-1.5 rounded text-[11px] text-slate-200">Anand R. · ₹45k</div>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-amber-400 font-semibold mb-1">Negotiation (3)</div>
                        <div className="bg-slate-900 p-1.5 rounded text-[11px] text-slate-200">Zenta Labs · $2.4k</div>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-emerald-400 font-semibold mb-1">Won & Paid (5)</div>
                        <div className="bg-slate-900 p-1.5 rounded text-[11px] text-emerald-300">Apex Retail · $8.1k</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      Multi-Agent Collision Shield Active
                    </span>
                    <span className="text-slate-200 font-medium">iOS & Android App Synced</span>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default Features;
