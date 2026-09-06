import React from "react";
import { Star, Quote, CheckCircle2, Sparkles } from "lucide-react";

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

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Rajesh Sharma",
    role: "Founder & CEO",
    company: "Aura Lifestyle",
    location: "Bengaluru, India",
    rating: 5,
    text: "Linala transformed our WhatsApp into our highest-converting channel. The 1-click catalog checkout and automated abandoned cart recovery boosted our monthly store revenue by 3.8x with zero extra ad spend.",
    highlightMetric: "+380% E-Com Revenue",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Tariq Al-Mansoor",
    role: "Operations Director",
    company: "Apex Real Estate",
    location: "Dubai, UAE",
    rating: 5,
    text: "The multilingual AI voice notes in Arabic and English are unbelievable. Leads who click our Instagram ads get immediate, personalized voice replies. Our site visit bookings doubled in 3 weeks.",
    highlightMetric: "2x Site Visit Bookings",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Bilal Siddiqui",
    role: "Head of Growth",
    company: "Silk & Stitch Apparel",
    location: "Lahore, Pakistan",
    rating: 5,
    text: "Our team used to drown in repetitive inquiries. Linala's AI takes over customer chats 24/7 and recommends catalog items autonomously. Our response time dropped from 45 minutes to 2 seconds.",
    highlightMetric: "< 2s Response SLA",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Oliver Bennett",
    role: "Growth Director",
    company: "Bloom & Co.",
    location: "London, UK",
    rating: 5,
    text: "The drag-and-drop flow builder and multi-touch cadence are pure magic. Setting up automated post-purchase drip campaigns took 15 minutes, and our customer retention has never been higher.",
    highlightMetric: "98.4% Open Rate",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Priya Nair",
    role: "Director of Operations",
    company: "Kerala Ayurvedic Health",
    location: "Kochi, India",
    rating: 5,
    text: "The Malayalam & Manglish voice note understanding is a game changer for our local patients. They feel like they're speaking with a dedicated doctor concierge every single time.",
    highlightMetric: "94% Patient Satisfaction",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Fatima Al-Zahra",
    role: "Managing Director",
    company: "Noor Clinics",
    location: "Riyadh, Saudi Arabia",
    rating: 5,
    text: "Managing team assignments across 4 clinic branches was chaotic before Linala. The shared multi-agent inbox and automated appointment reminders reduced patient no-shows by 65%.",
    highlightMetric: "65% Fewer No-Shows",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Social Proof & Results
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Loved by 500+ Fast-Growing Businesses Worldwide
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            See how forward-thinking brands across GCC, India, UK, and global markets scale revenue with Linala.
          </p>
        </div>

        {/* Testimonials Grid (Brevo Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Rating & Metric Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                    {item.highlightMetric}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "{item.text}"
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/70">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-200"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {item.name}
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.role} · <span className="font-semibold text-slate-700">{item.company}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{item.location}</div>
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
