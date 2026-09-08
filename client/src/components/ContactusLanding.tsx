import React, { useState } from "react";
import {
  Mail,
  Send,
  MessageCircle,
  Clock,
  ShieldCheck,
  Globe2,
  ChevronDown,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";
import OfficeLocations from "./OfficeLocations";

const ContactusLanding = () => {
  const [loading, setLoading] = useState(false);
  const { t, language } = useTranslation();
  const isAr = language === "ar";
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "sales",
    message: "",
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contact/sendmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        toast({
          title: isAr ? "تعذر إرسال الرسالة" : "Failed to send message",
          description: data?.message || (isAr ? "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً." : "Something went wrong."),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isAr ? "تم إرسال رسالتك بنجاح" : "Message Sent Successfully",
        description: isAr
          ? "تلقينا رسالتك وسيتواصل معك أحد مستشارينا في أقرب وقت."
          : "We received your message and our team will get back to you shortly.",
      });

      setFormData({
        name: "",
        email: "",
        company: "",
        subject: "sales",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: isAr ? "خطأ في الإرسال" : "Error sending message",
        description: error?.message || (isAr ? "يرجى المحاولة مرة أخرى." : "Please try again later."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const subjects = [
    { id: "sales", label: "Enterprise Sales & Demo", labelAr: "مبيعات الشركات وعرض النظام" },
    { id: "support", label: "Technical & API Support", labelAr: "الدعم الفني وربط الـ API" },
    { id: "partnership", label: "Partnership & Agency", labelAr: "الشراكات والوكالات" },
    { id: "general", label: "General Inquiry", labelAr: "استفسار عام" },
  ];

  const saudiFaqs = [
    {
      q: "كيف يمكنني البدء مع منصة لينالا للواتساب والذكاء الاصطناعي؟",
      a: "يمكنك التسجيل في التجربة المجانية لمدة 14 يومًا فورًا دون الحاجة لبطاقة ائتمانية، وسيقوم فريق هندسة الحلول بمساعدتك في توثيق حساب Meta Business وربط الرقم الرسمي في دقائق.",
    },
    {
      q: "هل لينالا مزود حلول معتمد لـ WhatsApp Cloud API؟",
      a: "نعم، منصة لينالا هي مزود حلول معتمد من Meta (Meta Approved Solution Provider)، مما يضمن لك أعلى معايير الأمان وتوافرية 99.99% مع توثيق العلامة الخضراء الرسمية.",
    },
    {
      q: "هل تقدمون تكاملاً مع برامج إدارة المطاعم مثل Orderown RMS ونقاط البيع؟",
      a: "نعم، لدينا تكامل مباشر وسلس مع نظام أوردر أون لإدارة المطاعم (Orderown RMS) ونقاط البيع المختلفة لإرسال إشعارات الطلبات وتأكيدات الدفع وتتبع التوصيل تلقائياً.",
    },
    {
      q: "هل يمكنني ربط رقم واتساب الحالي الخاص بشركتي؟",
      a: "نعم بكل تأكيد، يمكنك ربط رقمك الحالي (سواء كان هاتفاً أرضياً أو جوالاً أو رقماً مجانياً 800/9200) مباشرة عبر Meta Cloud API دون انقطاع خدماتك.",
    },
    {
      q: "ما هي مستويات الدعم الفني واتفاقيات مستوى الخدمة (SLA) المتاحة؟",
      a: "نوفر دعمًا فنيًا مباشرًا على مدار الساعة عبر واتساب والبريد والهاتف، مع توفير مدير حساب مخصص واستجابة سريعة خلال أقل من 15 دقيقة لباقات الشركات.",
    },
  ];

  const translatedFaq = t("contactUs.faq.questions") as unknown as Array<{
    q: string;
    a: string;
  }>;

  const displayFaqs = isAr ? saudiFaqs : (translatedFaq && translatedFaq.length > 0 ? translatedFaq : saudiFaqs);

  return (
    <div className={`pt-16 bg-white min-h-screen ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-purple-100/80 border border-purple-200/80 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {isAr
                ? "مزود حلول معتمد من Meta • فريق هندسي وتقني عالمي"
                : "Meta Approved Solution Provider • Global Engineering Team"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            {isAr ? "دعنا نطور أعمالك ونضاعف نموك عبر " : "Let’s Scale Your Business on "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              {isAr ? "واتساب والذكاء الاصطناعي" : "WhatsApp"}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "هل لديك استفسارات حول ربط Meta Cloud API، أو روبوتات الذكاء الاصطناعي الصوتي، أو أتمتة الأنظمة المؤسسية؟ فريقنا الهندسي عبر 4 مقرات دولية في خدمتك."
              : "Have questions about Meta Cloud API, Voice AI bots, or custom enterprise workflows? Our solution architects across 4 international hubs are here to assist."}
          </p>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/70 py-2.5 px-4 rounded-xl shadow-2xs">
              <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                {isAr ? "استجابة سريعة خلال أقل من 15 دقيقة" : "< 15 min typical response"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/70 py-2.5 px-4 rounded-xl shadow-2xs">
              <Globe2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                {isAr ? "4+ مقرات إقليمية ودولية" : "4+ Global Hubs & Support"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/70 py-2.5 px-4 rounded-xl shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700">
                {isAr ? "اتفاقيات مستوى خدمة SLA للشركات" : "Enterprise SLA Available"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Contact Form Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/80 relative">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {isAr ? "أرسل لنا رسالتك" : "Send us a message"}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {isAr
                  ? "املأ البيانات أدناه وسيقوم مستشار الحلول بالتواصل معك مباشرة."
                  : "Fill in the details below and our team will get in touch with you right away."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Inquiry Type Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  {isAr ? "كيف يمكننا مساعدتك؟" : "What can we help you with?"}{" "}
                  <span className="text-purple-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {subjects.map((s) => {
                    const isSelected = formData.subject === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, subject: s.id })}
                        className={`text-xs font-semibold py-2.5 px-3 rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80"
                        }`}
                      >
                        {isAr ? s.labelAr : s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isAr ? "الاسم الكامل" : "Your Name"} <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder={isAr ? "مثال: عبد العزيز القحطاني" : "e.g. Sarah Jenkins"}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isAr ? "البريد الإلكتروني للعمل" : "Business Email"} <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder={isAr ? "name@company.com" : "sarah@company.com"}
                    required
                  />
                </div>
              </div>

              {/* Company & Phone / Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isAr ? "اسم الشركة / المؤسسة" : "Company / Organization Name"}
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                  placeholder={isAr ? "مثال: شركة المدار القابضة" : "e.g. Acme Global Logistics"}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isAr ? "نص الرسالة أو تفاصيل طلبك" : "Your Message"} <span className="text-purple-600">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-slate-900 bg-slate-50/50 focus:bg-white transition-all resize-none placeholder:text-slate-400"
                  placeholder={
                    isAr
                      ? "أخبرنا عن حجم الرسائل الشهري التقريبي، أنظمتكم الحالية، أو أي استفسار ترغب في مناقشته..."
                      : "Tell us about your estimated monthly WhatsApp volume, current tech stack, or questions..."
                  }
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white py-3.5 rounded-xl font-semibold hover:opacity-95 transition-all duration-200 flex items-center justify-center group shadow-md shadow-purple-200 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isAr ? "إرسال الرسالة الآن" : "Send Message"}</span>
                    <Send className={`w-4 h-4 ${isAr ? "mr-2 rtl:rotate-180" : "ml-2"} group-hover:translate-x-1 transition-transform`} />
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? "لا يتطلب بطاقة ائتمان" : "No credit card required"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? "اتفاقية سرية وحماية بيانات" : "NDA & data privacy compliant"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? "استشارة وإعداد أولي مجاني" : "Free onboarding consultation"}</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Office Locations (Global Tabbed Component) */}
      <OfficeLocations />

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/80 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
              {isAr ? "الأسئلة الشائعة" : (t("contactUs.faq.heading") || "Frequently Asked Questions")}
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              {isAr
                ? "إليك أبرز الإجابات عن التوثيق والربط والأسعار والدعم الفني"
                : (t("contactUs.faq.subtitle") || "Everything you need to know about our services, onboarding, and platform.")}
            </p>
          </div>

          <div className="space-y-3">
            {displayFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className={`w-full flex items-center justify-between p-5 ${isAr ? "text-right" : "text-left"} cursor-pointer`}
                >
                  <h3 className={`font-semibold text-slate-900 text-sm sm:text-base ${isAr ? "pl-4" : "pr-4"}`}>
                    {faq.q}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactusLanding;
