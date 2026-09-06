import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How fast can I get started with Linala WhatsApp CRM?",
    answer:
      "You can launch in under 5 minutes. Connect your official Meta WhatsApp Business account, configure your catalog or AI agents, and start sending campaigns or receiving orders immediately.",
  },
  {
    question: "How does the Multilingual AI Voice Note feature work?",
    answer:
      "Linala's AI understands customer voice notes in regional dialects (Malayalam, Hindi, Arabic, English) and generates natural, human-like voice note replies in real time with 0.4s response speed.",
  },
  {
    question: "How does 1-Click WhatsApp Store checkout work?",
    answer:
      "Customers browse your product catalog directly inside WhatsApp. When they choose an item, Linala collects delivery details and processes payments via UPI QR, Razorpay, Stripe, or Cash on Delivery.",
  },
  {
    question: "What is the SME Expense & Receipt OCR Ledger?",
    answer:
      "Team members simply take photos of paper receipts on WhatsApp. AI OCR instantly extracts vendor, items, tax, and amounts, auto-logging them into an exportable financial balance sheet.",
  },
  {
    question: "Can multiple team members manage the same WhatsApp number?",
    answer:
      "Yes. Linala WhatsApp CRM provides a shared multi-agent inbox with collision prevention, agent assignments, Kanban deal stages, and internal private notes on web and mobile apps.",
  },
  {
    question: "Is Linala WhatsApp CRM approved by Meta?",
    answer:
      "Yes, Linala is built on official Meta WhatsApp Cloud API standards, providing green-badge verified messaging, 99.9% uptime, and high deliverability.",
  },
];

export const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-slate-50/70 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100/70 border border-purple-200/80 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Everything you need to know about Linala WhatsApp CRM.
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
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
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
