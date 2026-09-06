import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShoppingBag,
  Workflow,
  Calendar,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Mic,
  CreditCard,
  Volume2,
  TrendingUp,
} from "lucide-react";

interface AgentSlide {
  id: string;
  agentName: string;
  shortLabel: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  bullets: string[];
  ctaText: string;
  ctaLink: string;
  preview: React.ReactNode;
}

export const Features: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  const AGENT_SLIDES: AgentSlide[] = [
    {
      id: "commerce",
      agentName: "Commerce Agent",
      shortLabel: "1-Click WhatsApp Store",
      badge: "WhatsApp Commerce",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      icon: ShoppingBag,
      title: "1-Click WhatsApp Store",
      description:
        "Send interactive product catalogs and collect instant payments inside WhatsApp with zero redirect friction.",
      bullets: [
        "Native multi-item catalogs & variant selection",
        "Instant checkout with Razorpay, Stripe & UPI",
        "Automated abandoned cart recovery",
      ],
      ctaText: "Explore WhatsApp Store",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner font-sans border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-purple-400 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Order #LN-8924
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Paid • UPI Instant
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 flex items-center gap-3 border border-slate-700/60">
            <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center text-purple-300 font-bold text-xs flex-shrink-0">
              PRO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white">Premium Linen Shirt</p>
              <p className="text-[11px] text-slate-400">Size: L • Navy Blue</p>
              <p className="text-xs font-semibold text-purple-300 mt-0.5">$49.00</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold text-center transition-colors">
              1-Click Buy Now
            </button>
            <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
              View Details
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "voice",
      agentName: "Voice AI Agent",
      shortLabel: "Multilingual Voice AI",
      badge: "Multilingual Voice AI",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: Mic,
      title: "Human-Like Voice Notes",
      description:
        "Understand voice notes in regional dialects and reply with ultra-fast, natural synthesized audio.",
      bullets: [
        "Regional languages: Malayalam, Hindi, Arabic, English",
        "Instant audio transcription & sentiment context",
        "0.4s response time with zero robotic tone",
      ],
      ctaText: "Test Voice AI",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Voice Note Reply
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Malayalam / Manglish
            </span>
          </div>

          <div className="bg-indigo-950/60 border border-indigo-800/40 rounded-xl p-3.5 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <span className="text-xs font-medium text-indigo-200">Linala Voice Synthesizer</span>
            </div>
            
            <div className="flex items-center gap-1 h-7 px-1">
              {[40, 65, 30, 90, 100, 75, 45, 80, 95, 60, 35, 70, 85, 40, 20].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-indigo-400/80 rounded-full"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-indigo-300/80 mt-1.5 font-mono">
              <span>0:18</span>
              <span>128 kbps • High Quality</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "leads",
      agentName: "Lead CRM Agent",
      shortLabel: "Lead Qualification",
      badge: "Lead Qualification",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: Users,
      title: "Autonomous Lead Scoring",
      description:
        "Qualify incoming prospects 24/7, capture custom attributes, and route high-intent buyers to top closers.",
      bullets: [
        "AI buyer intent score (0-100)",
        "Dynamic qualification questionnaires",
        "Auto-routing & collision-free team inbox",
      ],
      ctaText: "Automate Lead Flow",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> High-Intent Lead
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Score: 96 / 100
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 space-y-2 text-xs border border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-slate-400">Budget:</span>
              <span className="font-semibold text-emerald-300">$5,000+ / mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timeline:</span>
              <span className="font-semibold text-white">Immediate (Next 7 Days)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Action:</span>
              <span className="font-semibold text-purple-300">Auto-assigned to Senior Rep</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "expense",
      agentName: "Expense OCR Agent",
      shortLabel: "SME Receipt Ledger",
      badge: "SME Accounting",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Receipt,
      title: "Receipt OCR & Ledger",
      description:
        "Snap photos of receipts on WhatsApp. AI extracts vendor, tax, and totals into an instant exportable ledger.",
      bullets: [
        "Camera receipt photo scanning via WhatsApp",
        "Automatic GST / VAT tax categorizing",
        "1-click export to CSV & balance sheets",
      ],
      ctaText: "Try Receipt OCR",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> AI Receipt OCR
            </span>
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Auto-Logged
            </span>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 space-y-1.5 text-xs border border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-slate-400">Vendor:</span>
              <span className="font-semibold text-white">Office Supplies</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tax / VAT:</span>
              <span className="font-semibold text-amber-300">$18.40 (5%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total:</span>
              <span className="font-bold text-emerald-400">$386.40</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cadence",
      agentName: "Cadence Agent",
      shortLabel: "Follow-Up Cadence",
      badge: "Sales Follow-Ups",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      icon: Calendar,
      title: "Smart Follow-Up Cadence",
      description:
        "Run automated multi-touch follow-up sequences that auto-pause instantly as soon as a customer responds.",
      bullets: [
        "Recurring multi-day nurturing sequences",
        "Smart auto-stop on incoming reply",
        "Zero spam risk with cadence delays",
      ],
      ctaText: "Build Cadence Sequence",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> 3-Step Sequence
            </span>
            <span className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Active Flow
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <span className="text-slate-200 flex-1 font-medium">Day 1: Intro & Demo Video</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Sent</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <span className="text-slate-200 flex-1 font-medium">Day 3: Case Study & Proof</span>
              <span className="text-[10px] text-amber-400 font-semibold">Queued</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "workflow",
      agentName: "Workflow Agent",
      shortLabel: "Visual Automations",
      badge: "Visual Automations",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Workflow,
      title: "Visual Automations & Zapier",
      description:
        "Design drag-and-drop conversational workflows and sync seamlessly with Zapier, webhooks, and your tech stack.",
      bullets: [
        "Drag-and-drop visual logic canvas",
        "Native Zapier & REST API endpoints",
        "Custom tags, attributes & webhook triggers",
      ],
      ctaText: "Explore Automations",
      ctaLink: "/signup",
      preview: (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-blue-400 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5" /> Flow Builder
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Live Sync
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl text-xs border border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">Trigger: New Order</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-purple-300">Sync Zapier + CRM</span>
          </div>
        </div>
      ),
    },
  ];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : AGENT_SLIDES.length - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev < AGENT_SLIDES.length - 1 ? prev + 1 : 0));
  };

  const activeSlide = AGENT_SLIDES[activeIdx];

  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-50/70 text-slate-900 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Brevo-Style 2-Column Split: Explainer on Left, Slider Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Explainer, Title, Agent Switcher & Slider Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Linala WhatsApp CRM AI Agents
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                AI agents that work with you, and for you
              </h2>
              
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                Task-scoped autonomous AI agents built directly into <strong className="text-purple-700 font-semibold">Linala WhatsApp CRM</strong> to qualify leads, process store orders, and scale revenue 24/7.
              </p>
            </div>

            {/* Vertical Interactive Agent Selector Menu (Brevo Style) */}
            <div className="space-y-1.5 pt-2">
              {AGENT_SLIDES.map((slide, idx) => {
                const Icon = slide.icon;
                const isActive = activeIdx === idx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-white text-purple-700 shadow-sm border border-purple-200/80 scale-[1.01]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors ${
                          isActive ? "bg-purple-600 text-white" : "bg-slate-200/70 text-slate-600"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span>{slide.agentName}</span>
                    </div>

                    <span className={`text-xs font-mono font-medium ${isActive ? "text-purple-600" : "text-slate-400"}`}>
                      0{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider Navigation Controls (Left/Right Arrows + Counter) */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 font-mono">0{activeIdx + 1}</span>
                <span className="text-xs text-slate-400">/ 0{AGENT_SLIDES.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full bg-white hover:bg-purple-600 hover:text-white text-slate-700 border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-10 h-10 rounded-full bg-white hover:bg-purple-600 hover:text-white text-slate-700 border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Large Active Showcase Card (Brevo Light Theme) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-9 border border-slate-200/90 shadow-xl shadow-purple-950/5 relative overflow-hidden transition-all duration-300">
              
              {/* Visual Mockup Preview */}
              <div className="mb-6 rounded-2xl overflow-hidden shadow-md">
                {activeSlide.preview}
              </div>

              {/* Agent Category Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${activeSlide.badgeColor}`}>
                  {activeSlide.badge}
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                  Active in Linala
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {activeSlide.title}
              </h3>
              
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                {activeSlide.description}
              </p>

              {/* Bullets */}
              <div className="space-y-2.5 mb-7">
                {activeSlide.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              {/* Action Link */}
              <Link
                href={activeSlide.ctaLink}
                className="inline-flex items-center justify-between w-full py-3.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 hover:shadow-lg transition-all duration-200 group"
              >
                <span>{activeSlide.ctaText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Features;
