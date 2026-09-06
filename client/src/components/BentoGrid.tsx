import React from "react";
import { Link } from "wouter";
import {
  Smartphone,
  Share2,
  Tags,
  CheckCircle,
  QrCode,
  CreditCard,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Layers,
  FileSpreadsheet,
  Globe2,
} from "lucide-react";

export const BentoGrid: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Engineered for Modern Growth
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Built with Every Micro-Feature Your Business Demands
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            From Zapier integrations to native mobile apps, experience enterprise agility without enterprise complexity.
          </p>
        </div>

        {/* Bento Grid Layout (Brevo-Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
          
          {/* Bento Card 1 (Large - 7 cols): Zapier, Webhooks & API Ecosystem */}
          <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-8 text-white border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6 border border-emerald-500/30">
                <Share2 className="w-3.5 h-3.5" />
                1,000+ App Connectors
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Zapier, Webhooks & REST API Connectors
              </h3>
              <p className="mt-3 text-sm text-slate-400 max-w-lg leading-relaxed">
                Connect your WhatsApp sales engine directly with Shopify, WooCommerce, Salesforce, HubSpot, Google Sheets, or custom backend webhooks with zero delay.
              </p>
            </div>

            {/* Interactive Node Network Visual */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "Zapier & Make", badge: "Instant Sync" },
                  { name: "Shopify / Woo", badge: "Auto Orders" },
                  { name: "Google Sheets", badge: "2-Way Sync" },
                  { name: "Custom API", badge: "JSON Webhooks" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-xs font-bold text-white">{item.name}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-mono">{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2 (5 cols): Native Android & iOS Mobile Apps */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-3xl p-8 border border-emerald-200/80 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold mb-6 shadow-xs">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile First
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Native Android & iOS Mobile Apps
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Never miss an urgent VIP customer inquiry or high-ticket order. Reply in real time, view deals, and manage catalog orders directly from your phone.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  📱
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">App Store & Play Store</div>
                  <div className="text-[11px] text-emerald-700 font-medium">Real-time Push Notifications</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Available Now
              </span>
            </div>
          </div>

          {/* Bento Card 3 (4 cols): Dynamic Tags & Smart CRM Segmentation */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-7 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5 font-bold">
                <Tags className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Advanced Dynamic Tagging
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Auto-tag leads as "VIP Buyer", "High Intent", "Cart Abandoned", or "Follow-Up Pending" based on real-time conversational triggers.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {["🏷️ VIP Buyer", "⚡ Hot Lead", "🛒 Cart Pending", "🔥 Re-order Due"].map((tag, i) => (
                <span key={i} className="text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bento Card 4 (4 cols): Automated Lead Qualification */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-7 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                AI Lead Qualification & Scoring
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Filter high-intent buyers from casual window shoppers automatically using interactive branching questions and AI sentiment score.
              </p>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-900">Lead Score: 94 / 100</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">High Intent</span>
              </div>
              <span className="text-[11px] text-slate-500">Auto routed to Senior Sales Agent</span>
            </div>
          </div>

          {/* Bento Card 5 (4 cols): Dual Channels (Official Cloud API + QR) */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-7 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Dual Channel Flexibility
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Choose between Meta WhatsApp Cloud API with official green badge verification or instant QR Channel with automated warm-up safeguarding.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Meta Verified
              </span>
              <span className="flex items-center gap-1.5 text-teal-700">
                <CheckCircle className="w-4 h-4 text-teal-600" /> QR Channel
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default BentoGrid;
