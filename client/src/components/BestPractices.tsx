import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  Zap,
  Users,
  MessageCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  ThumbsUp,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PracticeCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  title: string;
  description: string;
  items: {
    title: string;
    description: string;
    tips: string[];
    impact: string;
  }[];
}

const BEST_PRACTICES_DATA: PracticeCategory[] = [
  {
    id: "compliance",
    name: "Opt-In & Meta Compliance",
    icon: ShieldCheck,
    title: "User Consent & Meta Policy Guidelines",
    description: "Ensure 100% compliance with Meta WhatsApp Business Policies and global privacy regulations (GDPR / DPDP).",
    items: [
      {
        title: "Explicit Opt-In Collection",
        description: "Always obtain clear, unambiguous affirmative consent from customers before sending business-initiated marketing messages.",
        tips: [
          "Use clear checkboxes during checkout, lead forms, or interactive website widgets",
          "Clearly state the types of messages (e.g. order alerts, promotions)",
          "Never purchase third-party phone lists — this triggers immediate quality blocks",
        ],
        impact: "Zero Spam Reports & Protected Phone Tier",
      },
      {
        title: "Simple 1-Tap Opt-Out Mechanism",
        description: "Provide an easy way for customers to unsubscribe at any point with instant acknowledgment.",
        tips: [
          "Include a 'STOP' or 'Unsubscribe' quick reply button in promotional templates",
          "Linala automatically flags and suppresses opted-out contacts instantly",
        ],
        impact: "Reduces user blocks by 85%",
      },
    ],
  },
  {
    id: "quality-rating",
    name: "Quality Rating & Tier Protection",
    icon: TrendingUp,
    title: "Maintaining a 'High' WhatsApp Quality Score",
    description: "Meta measures recipient feedback over a 7-day rolling window to assign Green, Yellow, or Red status.",
    items: [
      {
        title: "Pacing & Audience Segmentation",
        description: "Avoid blasting entire subscriber lists in a single second. Segment by user interest, recency, and purchase history.",
        tips: [
          "Use dynamic tags to filter hyper-relevant cohorts",
          "Utilize Linala's automated rate-limiting to stagger broadcasts safely",
        ],
        impact: "+45% Higher Read & Engagement Rates",
      },
      {
        title: "Handling Status Drop (Yellow/Red Alert)",
        description: "If your quality rating drops to Yellow or Red, Meta enters a warning phase before downgrading your tier.",
        tips: [
          "Immediately pause all promotional broadcasts for 48 hours",
          "Send only high-value transactional messages (OTPs, order tracking) to rebuild score",
        ],
        impact: "Restores Green tier within 3-5 days",
      },
    ],
  },
  {
    id: "engagement",
    name: "Copywriting & High-Converting Formats",
    icon: MessageCircle,
    title: "Crafting WhatsApp Messages People Love Reading",
    description: "WhatsApp is a personal channel. Messages should feel conversational, concise, and immediately valuable.",
    items: [
      {
        title: "Concise Text with Rich Media Headers",
        description: "Keep message body under 300 characters. Pair with eye-catching product images, video demos, or PDF invoices.",
        tips: [
          "Use personalized variables (e.g. 'Hey {{1}}, your order #{{2}} is ready!')",
          "Add interactive buttons (Quick Replies / URL CTA) instead of raw text links",
        ],
        impact: "3.2x Higher CTR compared to plain text",
      },
      {
        title: "Optimal Sending Timing by Region",
        description: "Deliver messages when customers are active in their local timezone. Avoid late night or early morning pings.",
        tips: [
          "Optimal B2C retail hours: 11:00 AM – 2:00 PM & 6:00 PM – 8:30 PM",
          "Optimal B2B sales hours: Tuesday to Thursday, 10:00 AM – 4:00 PM",
        ],
        impact: "+28% Response Rate",
      },
    ],
  },
  {
    id: "automation",
    name: "Voice AI & Instant Response SLAs",
    icon: Zap,
    title: "Sub-Second Response Velocity with AI",
    description: "Customers expect immediate answers on messaging apps. Slow replies directly hurt conversion rates.",
    items: [
      {
        title: "0-Second Autonomous First Response",
        description: "Deploy Linala Voice AI and Chatbot flows to greet prospects instantly and qualify intent.",
        tips: [
          "Acknowledge every incoming message within 5 seconds",
          "Seamlessly escalate complex queries to live team members during business hours",
        ],
        impact: "4x Faster Lead Qualification",
      },
    ],
  },
];

export const BestPractices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("compliance");

  const current =
    BEST_PRACTICES_DATA.find((cat) => cat.id === activeTab) ||
    BEST_PRACTICES_DATA[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Meta Compliance & Enterprise Best Practices
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            WhatsApp Marketing &{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Compliance Best Practices
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Protect your sender reputation, maximize message deliverability, and maintain a 5-star Meta Quality Rating with our official blueprint.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation */}
          <div className="lg:col-span-4 space-y-2">
            <div className="sticky top-28 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
                Core Domains
              </h3>
              {BEST_PRACTICES_DATA.map((cat) => {
                const Icon = cat.icon;
                const isSelected = cat.id === activeTab;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xl shadow-slate-900/5 space-y-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {current.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {current.description}
                </p>
              </div>

              <div className="space-y-6">
                {current.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Impact: {item.impact}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="space-y-2 pt-2">
                      {item.tips.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 font-medium leading-relaxed">
                            {t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Start Messaging with 100% Policy Confidence</h4>
                  <p className="text-xs text-slate-500">Linala automatically enforces Meta compliance guardrails.</p>
                </div>
                <Link href="/signup">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">
                    Launch Compliant Campaigns
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

export default BestPractices;
