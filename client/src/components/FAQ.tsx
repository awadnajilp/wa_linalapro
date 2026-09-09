import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: React.FC = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const FAQ_ITEMS: FAQItem[] = [
    {
      question: isAr ? "كم يستغرق البدء في تشغيل منصة لينالا واتساب CRM؟" : "How fast can I get started with Linala WhatsApp CRM?",
      answer: isAr
        ? "يمكنك البدء في أقل من 5 دقائق. اربط حساب واتساب للأعمال الرسمي (Meta WhatsApp Cloud API)، وفعّل متجرك أو وكلاء الذكاء الاصطناعي، وابدأ في إطلاق الحملات واستقبال الطلبات فوراً."
        : "You can launch in under 5 minutes. Connect your official Meta WhatsApp Business account, configure your catalog or AI agents, and start sending campaigns or receiving orders immediately.",
    },
    {
      question: isAr ? "كيف تعمل ميزة الرسائل الصوتية الذكية المتعددة اللهجات؟" : "How does the Multilingual AI Voice Note feature work?",
      answer: isAr
        ? "يفهم محرك الذكاء الاصطناعي في لينالا التسجيلات الصوتية باللهجة السعودية وأكثر من 40 لغة عالمية، ويقوم بالرد فورياً برسائل صوتية واقعية بنبرة طبيعية وبسرعة استجابة لا تتعدى 0.4 ثانية."
        : "Linala's AI understands customer voice notes across 40+ global languages and generates natural, human-like voice note replies in real time with 0.4s response speed.",
    },
    {
      question: isAr ? "كيف تتم تجربة الشراء والدفع بضغطة واحدة داخل متجر واتساب؟" : "How does 1-Click WhatsApp Store checkout work?",
      answer: isAr
        ? "يتصفح عملاؤك كتالوج المنتجات مباشرة داخل المحادثة. وعند اختيار المنتجات، يقوم النظام بجمع بيانات التوصيل ومعالجة الدفع فورياً عبر مدى، Apple Pay، البطاقات الائتمانية، أو الدفع عند الاستلام."
        : "Customers browse your product catalog directly inside WhatsApp. When they choose an item, Linala collects delivery details and processes payments via UPI QR, Razorpay, Stripe, or Cash on Delivery.",
    },
    {
      question: isAr ? "ما هو نظام المسح الضوئي وتوثيق فواتير الشركات (OCR)؟" : "What is the SME Expense & Receipt OCR Ledger?",
      answer: isAr
        ? "يقوم موظفوك بالتقاط صور الفواتير الورقية وإرسالها عبر واتساب، حيث يتعرف الذكاء الاصطناعي تلقائياً على اسم المورد، الضريبة (15%)، والمجموع، ويسجلها في جدول محاسبي جاهز للتصدير."
        : "Team members simply take photos of paper receipts on WhatsApp. AI OCR instantly extracts vendor, items, tax, and amounts, auto-logging them into an exportable financial balance sheet.",
    },
    {
      question: isAr ? "هل يمكن لعدة موظفين إدارة نفس رقم واتساب في نفس الوقت؟" : "Can multiple team members manage the same WhatsApp number?",
      answer: isAr
        ? "نعم، توفر لينالا صندوق وارد جماعي متطور يتيح لعدة موظفين الرد وتوزيع المحادثات دون أي تضارب، مع لوحة كانبان للمراحل البيعية وملاحظات داخلية خاصة عبر الويب وتطبيقات الجوال."
        : "Yes. Linala WhatsApp CRM provides a shared multi-agent inbox with collision prevention, agent assignments, Kanban deal stages, and internal private notes on web and mobile apps.",
    },
    {
      question: isAr ? "هل لينالا معتمدة رسمياً ومربوطة بسحابة Meta؟" : "Is Linala WhatsApp CRM approved by Meta?",
      answer: isAr
        ? "نعم، لينالا متكاملة وتعمل عبر واجهة Meta الرسمية لواتساب السحابي (Meta Cloud API)، مما يضمن توثيق الحساب بالعلامة الخضراء، استقرار بنسبة 99.9%، وأعلى معدلات وصول للرسائل."
        : "Yes, Linala is built on official Meta WhatsApp Cloud API standards, providing green-badge verified messaging, 99.9% uptime, and high deliverability.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className={`py-20 bg-slate-50/70 relative ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100/70 border border-purple-200/80 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            {isAr ? "الأسئلة الشائعة" : "FAQ"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isAr ? "الأسئلة الأكثر تكراراً" : "Frequently Asked Questions"}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isAr ? "كل ما تحتاج معرفته حول منصة لينالا لواتساب CRM." : "Everything you need to know about Linala WhatsApp CRM."}
          </p>
        </div>

        {/* Compact Accordion List */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className={`w-full p-5 ${isAr ? "text-right" : "text-left"} flex items-center justify-between gap-4 cursor-pointer focus:outline-none`}
                >
                  <span className="text-base sm:text-lg font-bold text-slate-900">
                    {item.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${
                      isOpen
                        ? "bg-purple-600 text-white rotate-180"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQ;
