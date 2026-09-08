import React from "react";
import { Link } from "wouter";
import {
  Bot,
  Zap,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
  Layers,
  Cpu,
  BarChart3,
  Lock,
  Headphones,
  FileCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      icon: Radio,
      title: "Real-Time AI Voice Autopilot",
      badge: "Flagship 2026",
      badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
      description:
        "Human-parity voice AI with sub-600ms latency. Speaks in 40+ global languages natively with realistic turn-taking, objection handling, and real-time CRM data extraction.",
      bullets: [
        "WebRTC ultra-low latency audio pipeline",
        "Natural interruptions, tone modulation & dynamic script branches",
        "Instant post-call transcriptions, summaries & CRM stage updates",
        "Automated fallback to WhatsApp message with meeting notes",
      ],
    },
    {
      icon: Workflow,
      title: "Omnichannel CRM & Stage Cadence",
      badge: "Core Platform",
      badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
      description:
        "A fast Kanban-style deal pipeline designed specifically for WhatsApp and omnichannel selling. Drag-and-drop deals to automatically trigger targeted follow-up cadences.",
      bullets: [
        "Automated WhatsApp message triggers when deals move stages",
        "Custom fields, tags, deal value metrics & collision locks",
        "Round-robin lead distribution across sales reps",
        "Automated cadence badges on Kanban stage columns",
      ],
    },
    {
      icon: Zap,
      title: "Visual Flow Builder & Bots",
      badge: "No-Code",
      badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      description:
        "Build sophisticated conversational journeys with our visual drag-and-drop canvas. Integrate conditional branches, API webhooks, media dispatch, and human handoff.",
      bullets: [
        "Drag-and-drop node canvas with live simulator",
        "REST API webhooks, condition rules & time delays",
        "Dynamic button & list menus natively rendered in WhatsApp",
        "Seamless bot-to-human agent routing",
      ],
    },
    {
      icon: ShieldCheck,
      title: "Official Meta Cloud API Gateway",
      badge: "Enterprise BSP",
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
      description:
        "Direct connection to Meta's Cloud API infrastructure. Enjoy highest throughput messaging tiers, green tick verification support, and official compliance protection.",
      bullets: [
        "Tier 1 to Tier Unlimited messaging throughput",
        "Direct Meta Business Manager template sync & fast approval",
        "Zero risk of unofficial gateway bans or number blocks",
        "24/7 serverless uptime with 99.99% message delivery SLA",
      ],
    },
    {
      icon: MessageSquare,
      title: "Multi-Agent Shared Inbox",
      badge: "Collaboration",
      badgeColor: "bg-pink-100 text-pink-700 border-pink-200",
      description:
        "Unify all customer conversations across channels in one shared inbox. Equip your support and sales team with collision avoidance, private notes, and AI smart replies.",
      bullets: [
        "Live typing indicators & agent collision prevention",
        "Canned responses & keyboard shortcuts for 10x faster replies",
        "Private internal staff notes & teammate mentions",
        "Filter by channel, unassigned, tag, or assigned rep",
      ],
    },
    {
      icon: BarChart3,
      title: "Attribution & Revenue Analytics",
      badge: "Intelligence",
      badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
      description:
        "Track end-to-end performance across broadcasts, flows, and voice calls. Measure real-time delivery rates, read rates, CTRs, and closed-won revenue attribution.",
      bullets: [
        "Daily, weekly, and monthly message delivery & read rates",
        "Per-campaign ROI, link click tracking & conversion funnels",
        "Agent response time SLAs & team leaderboard metrics",
        "Exportable PDF and CSV reports for executive reviews",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            2026 Enterprise Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            The Complete Platform for{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Omnichannel AI Customer Engagement
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Everything modern enterprises need to automate sales, customer care, and marketing broadcasts with official Meta Cloud API reliability and ultra-low latency Voice AI.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-6 py-3 h-12 shadow-md shadow-purple-500/20">
                Explore Full Platform Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-6 py-3 h-12">
                Watch 3-Minute Product Tour
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {feat.description}
                  </p>

                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    {feat.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-slate-700">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link href="/signup" className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">
                    <span>Try {feat.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise Security & Infrastructure */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Trust & Security
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Enterprise-Grade Reliability and Compliance
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Designed for regulated industries and high-volume global brands.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Meta BSP Verified",
                desc: "100% compliant with Meta Business Policies & zero ban risks.",
              },
              {
                icon: Lock,
                title: "End-to-End Encryption",
                desc: "Encrypted data in transit (TLS 1.3) and at rest (AES-256).",
              },
              {
                icon: Globe,
                title: "GDPR & DPDP Ready",
                desc: "Full data residency options, opt-out management, and privacy compliance.",
              },
              {
                icon: Cpu,
                title: "99.99% Uptime SLA",
                desc: "Distributed microservices infrastructure with redundant fallback routes.",
              },
            ].map((sec, idx) => (
              <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <sec.icon className="w-8 h-8 text-purple-600 mb-4" />
                <h4 className="text-base font-bold text-slate-900 mb-1">{sec.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{sec.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Supercharge Your Customer Channels Today
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Create your account in 60 seconds and experience the future of conversational marketing and voice AI.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-sm">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 h-12 text-sm">
                Talk to an Architect
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
