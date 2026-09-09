import React from "react";
import { TrendingUp, Zap, Clock, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const MetricsSection: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";

  const metrics = [
    {
      stat: "98.4%",
      label: isAr ? "متوسط معدل فتح الرسائل" : "Average Open Rate",
      sublabel: isAr
        ? "تفاعل يفوق التسويق عبر البريد الإلكتروني التقليدي بأكثر من 4 أضعاف."
        : "4x higher engagement than traditional email marketing.",
      trend: isAr ? "+76% زيادة تفاعل" : "+76% lift",
      icon: TrendingUp,
    },
    {
      stat: "3.8x",
      label: isAr ? "مضاعفة معدل التحويل" : "Higher Conversions",
      sublabel: isAr
        ? "مدعومة بتجربة الدفع والشراء بضغطة واحدة داخل واتساب مباشرة."
        : "Driven by 1-click WhatsApp checkout & Buy Now buttons.",
      trend: isAr ? "380% عائد استثماري" : "380% ROI",
      icon: Zap,
    },
    {
      stat: "0.4s",
      label: isAr ? "سرعة استجابة الذكاء الاصطناعي" : "AI Response Speed",
      sublabel: isAr
        ? "ردود صوتية ونصية فائقة السرعة باللهجات المحلية واللغات العالمية."
        : "Instant voice & text replies in regional languages.",
      trend: isAr ? "طيار آلي 24/7" : "Autopilot",
      icon: Clock,
    },
    {
      stat: "42%",
      label: isAr ? "استرداد السلات المتروكة" : "Cart Recovery",
      sublabel: isAr
        ? "متابعات تسلسلية ذكية ومؤتمتة لعملاء السلات المعلقة والمتروكة."
        : "Automated cadence follow-ups for abandoned carts.",
      trend: isAr ? "+42% طلبات مكتملة" : "+42% orders",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className={`py-16 lg:py-20 bg-slate-50/70 relative ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "نتائج وأرقام مثبتة مع لينالا واتساب CRM" : "Proven Results with Linala WhatsApp CRM"}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isAr
              ? "مؤشرات أداء حقيقية وموثقة من أكثر من 500+ علامة تجارية سريعة النمو."
              : "Real performance benchmarks from 500+ high-growth brands."}
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
                  {item.trend} <ArrowUpRight className={`w-3 h-3 ${isAr ? "rotate-90" : ""}`} />
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
