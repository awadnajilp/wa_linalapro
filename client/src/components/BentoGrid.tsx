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
import { useTranslation } from "@/lib/i18n";

export const BentoGrid: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";

  return (
    <section className={`py-20 bg-white relative overflow-hidden ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "مزايا وتكاملات منصة لينالا" : "Linala WhatsApp CRM Features"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "مصممة لنمو تجارتك ومبيعاتك بكفاءة" : "Built for Modern Commerce & Scale"}
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600">
            {isAr
              ? "من تكاملات Zapier والويب هوك إلى تطبيقات الجوال الأصلية، أدر مسار مبيعات واتساب بالكامل في مكان واحد."
              : "From Zapier webhooks to native mobile apps, manage your entire WhatsApp funnel in one place."}
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5">
          
          {/* Bento Card 1 (7 cols): Zapier & API */}
          <div className="lg:col-span-7 bg-[#090e1a] rounded-3xl p-7 text-white border border-slate-800/80 flex flex-col justify-between relative overflow-hidden group shadow-lg">
            {/* Structural subtle grid & emerald/indigo glow */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/25">
                <Share2 className="w-3 h-3" /> {isAr ? "+1000 تكامل وربط مباشر" : "1,000+ Integrations"}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isAr ? "تكاملات Zapier، الويب هوك و REST API" : "Zapier, Webhooks & REST API Connectors"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                {isAr
                  ? "اربط لينالا فورياً مع شوبيفاي، زد، سلة، ووكومرس، Orderown، هب سبوت، وجداول جوجل بكل سلاسة."
                  : "Sync Linala WhatsApp CRM with Shopify, WooCommerce, HubSpot, Salesforce, and Google Sheets instantly."}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 relative z-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: isAr ? "Zapier و Make" : "Zapier & Make", badge: isAr ? "مزامنة حية" : "Live Sync" },
                  { name: isAr ? "سلة / زد / شوبيفاي" : "Shopify / Woo", badge: isAr ? "طلبات تلقائية" : "Auto Orders" },
                  { name: isAr ? "جداول جوجل" : "Google Sheets", badge: isAr ? "مزامنة ثنائية" : "2-Way Sync" },
                  { name: isAr ? "Orderown & API" : "Custom API", badge: isAr ? "ويب هوك مباشر" : "REST & Hooks" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2 (5 cols): Native Android & iOS Apps */}
          <div className="lg:col-span-5 bg-purple-50/60 rounded-3xl p-7 border border-purple-200/80 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-semibold mb-4">
                <Smartphone className="w-3 h-3" /> {isAr ? "تطبيقات الجوال" : "Mobile Apps"}
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {isAr ? "تطبيقات أصلية لنظامي أندرويد و iOS" : "Native Android & iOS Apps"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isAr
                  ? "رد على العملاء وتابع الطلبات والمحادثات أينما كنت مع إشعارات فورية مباشرة."
                  : "Reply to high-ticket leads and track live orders on the go with real-time push alerts."}
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                  📱
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{isAr ? "متجر آب ستور وجوجل بلاي" : "App Store & Play Store"}</div>
                  <div className="text-[11px] text-purple-700 font-medium">{isAr ? "إشعارات دفع حية وفورية" : "Real-time Push Alerts"}</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {isAr ? "متاح الآن" : "Live"}
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
                {isAr ? "الوسوم الذكية وتقسيم العملاء" : "Dynamic Tags & Segmentation"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "تصنيف تلقائي للمحادثات والعملاء حسب السلوك، نية الشراء، والتفاعل."
                  : "Auto-tag contacts based on behavior, purchase intent, and response triggers."}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {(isAr
                ? ["🏷️ عميل VIP", "⚡ عميل مهتم جداً", "🛒 سلة معلقة", "🔥 موعد إعادة شراء"]
                : ["🏷️ VIP Buyer", "⚡ Hot Lead", "🛒 Cart Pending", "🔥 Re-order Due"]
              ).map((tag, i) => (
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
                {isAr ? "تأهيل العملاء بالذكاء الاصطناعي" : "AI Lead Qualification"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "تقييم نية الشراء آلياً وتوجيه الصفقات الجاهزة لمسؤولي الإغلاق فوراً."
                  : "Score incoming buyer intent and route hot prospects to your closers instantly."}
              </p>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-900">{isAr ? "التقييم: 96 / 100" : "Score: 96 / 100"}</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{isAr ? "فرصة ممتازة" : "Hot Lead"}</span>
              </div>
              <span className="text-[11px] text-slate-500">{isAr ? "تم التوجيه تلقائياً لمسؤول المبيعات" : "Auto-routed to senior rep"}</span>
            </div>
          </div>

          {/* Bento Card 5 (4 cols): Meta Cloud API */}
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {isAr ? "واجهة Meta السحابية الرسمية" : "Official Meta Cloud API"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? "أمان بمستوى المؤسسات، توثيق بالعلامة الخضراء، ومعدل تسليم رسائل يصل إلى 99.9%."
                  : "Enterprise security, green badge verification, and 99.9% message deliverability."}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5 text-purple-700">
                <CheckCircle className="w-3.5 h-3.5 text-purple-600" /> {isAr ? "معتمد من Meta" : "Meta Verified"}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {isAr ? "استقرار 99.9%" : "99.9% Uptime"}
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default BentoGrid;
