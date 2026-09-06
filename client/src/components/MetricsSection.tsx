import React from "react";
import { TrendingUp, Zap, Clock, ShieldCheck, ArrowUpRight } from "lucide-react";

export const MetricsSection: React.FC = () => {
  const metrics = [
    {
      stat: "98.4%",
      label: "Average Open Rate",
      sublabel: "Compared to 21.5% industry standard on email marketing",
      trend: "+76.9% lift",
      icon: TrendingUp,
    },
    {
      stat: "3.8x",
      label: "Higher Conversion Rate",
      sublabel: "Driven by 1-click WhatsApp catalog buy buttons & instant checkout",
      trend: "380% ROI",
      icon: Zap,
    },
    {
      stat: "< 2.5s",
      label: "AI Audio Response Time",
      sublabel: "Multilingual voice note synthesis in Malayalam, Hinglish & English",
      trend: "Instant Autopilot",
      icon: Clock,
    },
    {
      stat: "42%",
      label: "Cart Recovery Rate",
      sublabel: "Automated 3-step cadence sequences for abandoned carts",
      trend: "+$18.4k recovered",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Measurable ROI Delivered to Fast-Growing Brands Every Day
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Real data from over 5,000+ businesses powered by our WhatsApp intelligence engine.
          </p>
        </div>

        {/* Stats Grid (Brevo Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {item.trend} <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {item.stat}
              </div>

              <div className="text-sm font-bold text-slate-800 mt-1">
                {item.label}
              </div>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
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
