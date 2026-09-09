import React from "react";
import { Star, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  location: string;
  rating: number;
  text: string;
  highlightMetric: string;
  avatar: string;
}

export const Testimonials: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";

  const TESTIMONIALS: Testimonial[] = [
    {
      name: isAr ? "راكان المنصور" : "Rajesh Sharma",
      role: isAr ? "مؤسس ورئيس تنفيذي" : "Founder & CEO",
      company: isAr ? "أورا لايف ستايل" : "Aura Lifestyle",
      location: isAr ? "الرياض، السعودية" : "Bengaluru, India",
      rating: 5,
      text: isAr
        ? "حوّل لينالا واتساب CRM محادثاتنا إلى المحرك الأول للإيرادات والمبيعات. تجربة شراء الكتالوج بضغطة واحدة زادت مبيعاتنا الشهرية بنسبة 3.8 أضعاف."
        : "Linala WhatsApp CRM turned our WhatsApp into our top revenue driver. 1-click catalog checkout boosted our monthly sales by 3.8x.",
      highlightMetric: isAr ? "+380% نمو المبيعات" : "+380% Sales Growth",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: isAr ? "طارق المنصوري" : "Tariq Al-Mansoor",
      role: isAr ? "مدير العمليات" : "Operations Director",
      company: isAr ? "أبكس للتطوير العقاري" : "Apex Real Estate",
      location: isAr ? "دبي، الإمارات" : "Dubai, UAE",
      rating: 5,
      text: isAr
        ? "الذكاء الاصطناعي الصوتي باللهجة الخليجية مذهل جداً. عملاء الإعلانات يستلمون فورياً رسائل صوتية مخصصة تجيب على استفساراتهم وتضاعف حجوزات المعاينة."
        : "The Arabic & English voice AI is incredible. Ad leads receive instant personalized voice replies, doubling our site visit bookings.",
      highlightMetric: isAr ? "2x حجوزات المعاينة" : "2x Site Bookings",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: isAr ? "بلال صديقي" : "Bilal Siddiqui",
      role: isAr ? "رئيس قطاع النمو" : "Head of Growth",
      company: isAr ? "سيلك آند ستيتش" : "Silk & Stitch",
      location: isAr ? "جدة، السعودية" : "Lahore, Pakistan",
      rating: 5,
      text: isAr
        ? "وكيل الذكاء الاصطناعي يتولى الاستفسارات ويقترح المنتجات المناسبة للعملاء على مدار الساعة. هبط زمن الرد من 45 دقيقة إلى ثانيتين فقط."
        : "Linala's AI agent handles inquiries and recommends catalog items 24/7. Response times dropped from 45 minutes to 2 seconds.",
      highlightMetric: isAr ? "استجابة < 2 ثانية" : "< 2s Response SLA",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: isAr ? "أوليفر بينيت" : "Oliver Bennett",
      role: isAr ? "مدير التسويق الرقمي" : "Growth Director",
      company: isAr ? "بلوم آند كو" : "Bloom & Co.",
      location: isAr ? "لندن، بريطانيا" : "London, UK",
      rating: 5,
      text: isAr
        ? "منشئ المسارات وسلاسل المتابعة التلقائية في غاية الاحترافية. إعداد مسار ما بعد الشراء لم يستغرق سوى دقائق وحقق نتائج استثنائية في ولاء العملاء."
        : "The flow builder and follow-up cadences are top-tier. Setting up automated post-purchase flows took minutes, and retention soared.",
      highlightMetric: isAr ? "98.4% معدل فتح" : "98.4% Open Rate",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: isAr ? "إيلينا روستوفا" : "Elena Rostova",
      role: isAr ? "مديرة العمليات الدولية" : "Global Operations Lead",
      company: isAr ? "كير بلس ويلنس" : "CarePlus Wellness",
      location: isAr ? "زيورخ، سويسرا" : "Zurich, Switzerland",
      rating: 5,
      text: isAr
        ? "فهم الرسائل الصوتية بأكثر من 40 لغة أحدث نقلة نوعية في تجربة عملائنا حول العالم، حيث يحصل كل عميل على مساعدة بلغته ونبرته المفضلة."
        : "Multilingual voice note understanding across 40+ languages is a game changer. Customers get instant assistance in their preferred native language.",
      highlightMetric: isAr ? "94% رضا العملاء" : "94% Satisfaction",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    {
      name: isAr ? "د. فاطمة الزهراني" : "Fatima Al-Zahra",
      role: isAr ? "المدير الطبي العام" : "Managing Director",
      company: isAr ? "مجمعات نور الطبية" : "Noor Clinics",
      location: isAr ? "الرياض، السعودية" : "Riyadh, Saudi Arabia",
      rating: 5,
      text: isAr
        ? "صندوق الوارد الجماعي وسلاسل التذكير التلقائية بالمواعيد قللت نسبة تخلف المرضى عن الحضور بنسبة 65% عبر 4 فروع طبية لدينا."
        : "The shared multi-agent inbox and automated reminder cadences cut our appointment no-shows by 65% across 4 clinic branches.",
      highlightMetric: isAr ? "65% انخفاض الغياب" : "65% Fewer No-Shows",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <section id="testimonials" className={`py-20 bg-white relative overflow-hidden ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "آراء وقصص نجاح العملاء" : "Social Proof"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "موثوق من أكثر من 500+ شركة وعلامة تجارية" : "Loved by 500+ High-Growth Brands"}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isAr
              ? "تعرّف كيف تحقق الشركات الريادية قفزات نوعية في المبيعات مع لينالا واتساب CRM."
              : "See how forward-thinking companies scale revenue with Linala WhatsApp CRM."}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 rounded-2xl p-6 border border-slate-200/80 hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                    {item.highlightMetric}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal mb-5">
                  "{item.text}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover border border-purple-200"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {item.role}، {item.company} • {item.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
