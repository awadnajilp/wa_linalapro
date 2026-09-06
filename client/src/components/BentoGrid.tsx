import React from "react";
import { Link } from "wouter";
import {
  Smartphone,
  Share2,
  Tags,
  CheckCircle,
  Zap,
  Shield,
  Layers,
} from "lucide-react";

export const BentoGrid: React.FC = () => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            Linala WhatsApp CRM Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Modern Commerce & Scale
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600">
            From Zapier webhooks to native mobile apps, manage your entire WhatsApp funnel in one place.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5">
          
          {/* Bento Card 1 (7 cols): Zapier & API */}
          <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-7 text-white border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-semibold mb-4 border border-purple-500/30">
                <Share2 className="w-3 h-3" /> 1,000+ Integrations
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                Zapier, Webhooks & REST API Connectors
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                Sync Linala WhatsApp CRM with Shopify, WooCommerce, HubSpot, Salesforce, and Google Sheets instantly.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: "Zapier & Make", badge: "Live Sync" },
                  { name: "Shopify / Woo", badge: "Auto Orders" },
                  { name: "Google Sheets", badge: "2-Way Sync" },
                  { name: "Custom API", badge: "REST & Hooks" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-purple-400 mt-0.5 font-mono">{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2 (5 cols): Native Android & iOS Apps */}
          <div className="lg:col-span-5 bg-purple-50/60 rounded-3xl p-7 border border-purple-200/80 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-semibold mb-4">
                <Smartphone className="w-3 h-3" /> Mobile Apps
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Native Android & iOS Apps
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Reply to high-ticket leads and track live orders on the go with real-time push alerts.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                  📱
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">App Store & Play Store</div>
                  <div className="text-[11px] text-purple-700 font-medium">Real-time Push Alerts</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
          </div>

          {/* Bento Card 3 (4 cols): Dynamic Tags */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 font-bold">
                <Tags className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Dynamic Tags & Segmentation
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Auto-tag contacts based on behavior, purchase intent, and response triggers.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {["🏷️ VIP Buyer", "⚡ Hot Lead", "🛒 Cart Pending", "🔥 Re-order Due"].map((tag, i) => (
                <span key={i} className="text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bento Card 4 (4 cols): Lead Scoring */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                AI Lead Qualification
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Score incoming buyer intent and route hot prospects to your closers instantly.
              </p>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-900">Score: 96 / 100</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Hot Lead</span>
              </div>
              <span className="text-[11px] text-slate-500">Auto-routed to senior rep</span>
            </div>
          </div>

          {/* Bento Card 5 (4 cols): Meta Cloud API */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Official Meta Cloud API
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Enterprise security, green badge verification, and 99.9% message deliverability.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5 text-purple-700">
                <CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Meta Verified
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 99.9% Uptime
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default BentoGrid;
