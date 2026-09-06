import React from "react";
import { TrendingUp, Zap, Clock, ShieldCheck, ArrowUpRight } from "lucide-react";

export const MetricsSection: React.FC = () => {
  const metrics = [
    {
      stat: "98.4%",
      label: "Average Open Rate",
      sublabel: "4x higher engagement than traditional email marketing.",
      trend: "+76% lift",
      icon: TrendingUp,
    },
    {
      stat: "3.8x",
      label: "Higher Conversions",
      sublabel: "Driven by 1-click WhatsApp checkout & Buy Now buttons.",
      trend: "380% ROI",
      icon: Zap,
    },
    {
      stat: "0.4s",
      label: "AI Response Speed",
      sublabel: "Instant voice & text replies in regional languages.",
      trend: "Autopilot",
      icon: Clock,
    },
    {
      stat: "42%",
      label: "Cart Recovery",
      sublabel: "Automated cadence follow-ups for abandoned carts.",
      trend: "+42% orders",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-slate-50/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Proven Results with Linala WhatsApp CRM
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Real performance benchmarks from 500+ high-growth brands.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  {item.trend} <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>

              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {item.stat}
              </div>

              <div className="text-sm font-bold text-slate-800 mt-1">
                {item.label}
              </div>

              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {item.sublabel}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default MetricsSection;
