import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How fast can I get started with Linala?",
    answer:
      "You can launch in under 5 minutes. Connect your official Meta WhatsApp Business account, configure your brand profile, and start sending campaigns or receiving automated orders right away.",
  },
  {
    question: "How does the Multilingual AI Voice Note feature work?",
    answer:
      "Linala's AI understands customer text and audio messages in regional languages (including Malayalam script, Manglish, Hindi/Hinglish, Arabic, and English). It synthesizes natural, human-like voice note audio replies in real time with zero robotic delay.",
  },
  {
    question: "How does the WhatsApp Store and 1-Click Checkout work?",
    answer:
      "Customers browse your product catalog directly inside WhatsApp. When they choose an item, Linala automatically collects shipping details and offers seamless payments via UPI QR, Razorpay, Stripe, or Cash on Delivery.",
  },
  {
    question: "What is the SME Expense & Financial Ledger?",
    answer:
      "Business owners and employees can simply take photos of paper receipts on WhatsApp. Our AI OCR instantly reads the vendor, items, tax, and amounts, categorizing them automatically into an exportable balance sheet.",
  },
  {
    question: "Can multiple team members manage the same WhatsApp number?",
    answer:
      "Yes. Linala offers a unified multi-agent team inbox with collision prevention, agent assignments, Kanban deal stages, and private internal notes.",
  },
  {
    question: "Is Linala approved by Meta?",
    answer:
      "Yes, Linala is integrated with official Meta WhatsApp Cloud API standards, providing green-badge verified enterprise messaging, 99.9% uptime, and high deliverability.",
  },
];

export const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-slate-50/70 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100/70 border border-purple-200/80 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Know
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Have questions about Linala? Here are the most common answers.
          </p>
        </div>

        {/* Compact Accordion List */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-slate-900">
                    {item.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? "bg-purple-600 text-white rotate-180"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100">
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
