import React from "react";
import { Star, Sparkles } from "lucide-react";

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
    text: "Linala WhatsApp CRM turned our WhatsApp into our top revenue driver. 1-click catalog checkout boosted our monthly sales by 3.8x.",
    highlightMetric: "+380% Sales Growth",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Tariq Al-Mansoor",
    role: "Operations Director",
    company: "Apex Real Estate",
    location: "Dubai, UAE",
    rating: 5,
    text: "The Arabic & English voice AI is incredible. Ad leads receive instant personalized voice replies, doubling our site visit bookings.",
    highlightMetric: "2x Site Bookings",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Bilal Siddiqui",
    role: "Head of Growth",
    company: "Silk & Stitch",
    location: "Lahore, Pakistan",
    rating: 5,
    text: "Linala's AI agent handles inquiries and recommends catalog items 24/7. Response times dropped from 45 minutes to 2 seconds.",
    highlightMetric: "< 2s Response SLA",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Oliver Bennett",
    role: "Growth Director",
    company: "Bloom & Co.",
    location: "London, UK",
    rating: 5,
    text: "The flow builder and follow-up cadences are top-tier. Setting up automated post-purchase flows took minutes, and retention soared.",
    highlightMetric: "98.4% Open Rate",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Priya Nair",
    role: "Operations Lead",
    company: "Kerala Ayurvedic",
    location: "Kochi, India",
    rating: 5,
    text: "Malayalam & Manglish voice note understanding is a game changer. Patients get instant assistance in their preferred native dialect.",
    highlightMetric: "94% Satisfaction",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Fatima Al-Zahra",
    role: "Managing Director",
    company: "Noor Clinics",
    location: "Riyadh, Saudi Arabia",
    rating: 5,
    text: "The shared multi-agent inbox and automated reminder cadences cut our appointment no-shows by 65% across 4 clinic branches.",
    highlightMetric: "65% Fewer No-Shows",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Social Proof
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Loved by 500+ High-Growth Brands
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            See how forward-thinking companies scale revenue with Linala WhatsApp CRM.
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
                    {item.role}, {item.company} • {item.location}
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
