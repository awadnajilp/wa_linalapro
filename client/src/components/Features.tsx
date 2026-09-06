import React, { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ShoppingBag,
  Bot,
  Workflow,
  Calendar,
  Receipt,
  Users,
  CheckCircle,
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
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const AGENT_SLIDES: AgentSlide[] = [
    {
      id: "commerce",
      agentName: "Commerce Agent",
      badge: "WhatsApp Commerce",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner font-sans border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-purple-400 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Order #LN-8924
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              Paid • UPI Instant
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 mb-3 flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center text-purple-300 font-bold text-xs flex-shrink-0">
              PRO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">Premium Linen Shirt</p>
              <p className="text-[11px] text-slate-400">Size: L • Navy Blue</p>
              <p className="text-xs font-semibold text-purple-300 mt-0.5">$49.00</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold text-center transition-colors">
              1-Click Buy Now
            </button>
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
              Details
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "voice",
      agentName: "Voice AI Agent",
      badge: "Multilingual Voice AI",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Voice Note Reply
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[11px] font-semibold">
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
      badge: "Lead Qualification",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> High-Intent Lead
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              Score: 96 / 100
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 mb-3 space-y-2 text-xs">
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
      badge: "SME Accounting",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> AI Receipt OCR
            </span>
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              Auto-Logged
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 mb-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Vendor:</span>
              <span className="font-semibold text-white">Office Depot</span>
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
      badge: "Sales Follow-Ups",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> 3-Step Sequence
            </span>
            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              Active Flow
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <span className="text-slate-200 flex-1 font-medium">Day 1: Intro & Demo Video</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Sent</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg">
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
      badge: "Visual Automations",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
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
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-blue-400 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5" /> Flow Builder
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[11px] font-semibold">
              Live Sync
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl text-xs">
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

  const checkScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    const cardWidth = sliderRef.current.clientWidth > 768 ? 420 : 320;
    const currentIdx = Math.round(scrollLeft / cardWidth);
    setActiveIdx(Math.min(currentIdx, AGENT_SLIDES.length - 1));
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
    }
    return () => el?.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const cardWidth = sliderRef.current.clientWidth > 768 ? 420 : 320;
    const shift = direction === "left" ? -cardWidth : cardWidth;
    sliderRef.current.scrollBy({ left: shift, behavior: "smooth" });
  };

  const scrollToIndex = (index: number) => {
    if (!sliderRef.current) return;
    const cardWidth = sliderRef.current.clientWidth > 768 ? 420 : 320;
    sliderRef.current.scrollTo({ left: index * cardWidth, behavior: "smooth" });
    setActiveIdx(index);
  };

  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with Brevo-Style Navigation Arrows */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Linala WhatsApp CRM AI Agents
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              AI agents that work with you, and for you
            </h2>
            
            <p className="mt-3 text-base sm:text-lg text-slate-400 max-w-2xl">
              Specialized autonomous AI agents built into <strong className="text-purple-300 font-semibold">Linala WhatsApp CRM</strong> to qualify leads, process store orders, and scale sales.
            </p>
          </div>

          {/* Navigation Arrows (Brevo Style) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "bg-slate-900 text-white hover:bg-purple-600 hover:border-purple-500 shadow-lg cursor-pointer"
                  : "bg-slate-900/40 text-slate-600 cursor-not-allowed border-slate-800/40"
              }`}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center transition-all ${
                canScrollRight
                  ? "bg-slate-900 text-white hover:bg-purple-600 hover:border-purple-500 shadow-lg cursor-pointer"
                  : "bg-slate-900/40 text-slate-600 cursor-not-allowed border-slate-800/40"
              }`}
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Slider Track */}
        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {AGENT_SLIDES.map((slide, idx) => {
            return (
              <div
                key={slide.id}
                className="w-[85vw] sm:w-[380px] lg:w-[410px] flex-shrink-0 snap-start bg-slate-900/90 rounded-3xl p-6 sm:p-7 border border-slate-800/80 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between group shadow-xl"
              >
                <div>
                  {/* Visual Preview Window */}
                  <div className="mb-6 rounded-2xl overflow-hidden group-hover:scale-[1.01] transition-transform duration-300">
                    {slide.preview}
                  </div>

                  {/* Agent Category Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${slide.badgeColor}`}>
                      {slide.badge}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      0{idx + 1} / 0{AGENT_SLIDES.length}
                    </span>
                  </div>

                  {/* Title & Short Description */}
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {slide.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                    {slide.description}
                  </p>

                  {/* Bullets */}
                  <div className="space-y-2 mb-6">
                    {slide.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Link */}
                <Link
                  href={slide.ctaLink}
                  className="inline-flex items-center justify-between w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-200"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Bottom Progress Indicator Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {AGENT_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIdx === idx ? "w-8 bg-purple-500" : "w-2 bg-slate-800 hover:bg-slate-700"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;
