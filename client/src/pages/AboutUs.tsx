import React, { useState } from "react";
import { Link } from "wouter";
import {
  Globe,
  Users,
  Target,
  Zap,
  ShieldCheck,
  TrendingUp,
  Building2,
  MapPin,
  Phone,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Radio,
  Workflow,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfficeBranch {
  name: string;
  address: string;
  phone: string;
  mapQuery: string;
}

interface CountryHub {
  country: string;
  flag: string;
  region: string;
  offices: OfficeBranch[];
}

const GLOBAL_HUBS: CountryHub[] = [
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    region: "Europe & Global Strategy",
    offices: [
      {
        name: "UK Headquarters",
        address: "57, Grangemouth, FK3 8AW, United Kingdom",
        phone: "+44 75 0007 1363",
        mapQuery: "57, Grangemouth, FK3 8AW, United Kingdom",
      },
    ],
  },
  {
    country: "Saudi Arabia (KSA)",
    flag: "🇸🇦",
    region: "Middle East & GCC Operations",
    offices: [
      {
        name: "Jeddah Branch",
        address: "Sharafiya, Jeddah, Kingdom of Saudi Arabia",
        phone: "+966 564955765",
        mapQuery: "Sharafiya, Jeddah, Saudi Arabia",
      },
      {
        name: "Al Khobar Branch",
        address: "4th St, Al Khobar, Kingdom of Saudi Arabia",
        phone: "+966 564955765",
        mapQuery: "4th St, Al Khobar, Saudi Arabia",
      },
    ],
  },
  {
    country: "Bahrain",
    flag: "🇧🇭",
    region: "GCC Commercial Hub",
    offices: [
      {
        name: "Manama Office",
        address: "3rd Floor, Building 256, Office 302, Road 2705, Adliya, Bahrain",
        phone: "+973 7799 2124",
        mapQuery: "Building 256, Road 2705, Adliya, Bahrain",
      },
    ],
  },
  {
    country: "India",
    flag: "🇮🇳",
    region: "Asia-Pacific Engineering & R&D",
    offices: [
      {
        name: "Kerala Technology Centre",
        address: "1st Floor, Vilakathil Arcade, No. 408, Mukkam Road, Areekode, Kerala 673639",
        phone: "+91 90481 05191",
        mapQuery: "Vilakathil Arcade, Mukkam Road, Areekode, Kerala 673639, India",
      },
      {
        name: "Mumbai Commercial Branch",
        address: "44, Ashoka Shopping Centre, CST Area, Mumbai 400001, Maharashtra",
        phone: "+91 90481 05191",
        mapQuery: "Ashoka Shopping Centre, CST Area, Mumbai 400001, India",
      },
    ],
  },
];

const AboutUs: React.FC = () => {
  const [selectedCountryIdx, setSelectedCountryIdx] = useState(0);
  const [selectedOfficeIdx, setSelectedOfficeIdx] = useState(0);

  const activeCountry = GLOBAL_HUBS[selectedCountryIdx];
  const activeOffice =
    activeCountry.offices[selectedOfficeIdx] || activeCountry.offices[0];

  const handleCountryChange = (idx: number) => {
    setSelectedCountryIdx(idx);
    setSelectedOfficeIdx(0);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-purple-600" />
            Global Enterprise Conversational AI & Meta BSP
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Connecting Global Enterprises with{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Sub-Second AI Conversations
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Founded in 2025, Linala is an international technology company powering conversational marketing, automated deal pipelines, and real-time Voice AI across 4+ countries and 12+ major industries.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">4+ Hubs</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">India, Bahrain, KSA & UK</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">12+ Sectors</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Retail, Real Estate, Health & more</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-pink-600">40+ Langs</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Voice AI & Omnichannel Chat</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">99.99%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Meta Cloud API Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Story & Mission */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              <Sparkles className="w-3.5 h-3.5" />
              Our Story & Origin
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Regional Vision to International Scale
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Launched in early 2025, Linala was founded by engineering leaders who recognized that legacy messaging gateways and slow, disjointed email queues were failing modern businesses.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Starting across key commercial corridors in <strong>India, the Kingdom of Saudi Arabia, Bahrain, and the United Kingdom</strong>, we engineered a unified platform combining official Meta Cloud API infrastructure with human-parity Realtime Voice AI and automated CRM pipelines.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Today, thousands of organizations rely on Linala daily to process high-throughput customer engagements, automate order checkouts, and deliver 24/7 multilingual phone assistance without downtime.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Voice AI Innovation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pioneering sub-600ms WebRTC voice calling capable of understanding accents and regional dialects across 40+ global languages.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Official Meta BSP</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct integration with Meta's official Cloud API ensures highest throughput messaging tiers, green tick verification, and zero ban risks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-2xs">
                <Workflow className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated CRM Cadence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kanban deal tracking that automatically triggers scheduled WhatsApp outreach when leads advance through sales stages.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Global Compliance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enterprise security with TLS 1.3 encryption, GDPR and DPDP readiness, and regional data handling frameworks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Offices & Physical Hubs */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-3">
              <Building2 className="w-3.5 h-3.5" />
              Global Physical Footprint
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Our International Offices & Operations
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Operating with local offices in the United Kingdom, Saudi Arabia, Bahrain, and India to support regional enterprises 24/7.
            </p>
          </div>

          {/* Country Switcher Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {GLOBAL_HUBS.map((hub, idx) => (
              <button
                key={idx}
                onClick={() => handleCountryChange(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  selectedCountryIdx === idx
                    ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20"
                    : "bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/20"
                }`}
              >
                <span>{hub.flag}</span>
                <span>{hub.country}</span>
              </button>
            ))}
          </div>

          {/* Office Details & Map View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Office list & selected details */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Select Branch
                  </h3>
                  <span className="text-xs font-semibold text-purple-600">
                    {activeCountry.region}
                  </span>
                </div>

                <div className="space-y-2">
                  {activeCountry.offices.map((office, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOfficeIdx(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        selectedOfficeIdx === idx
                          ? "bg-white border-purple-600 shadow-sm ring-1 ring-purple-100"
                          : "bg-white/70 border-slate-200 hover:border-purple-200 hover:bg-white"
                      }`}
                    >
                      <h4
                        className={`text-xs font-bold ${
                          selectedOfficeIdx === idx
                            ? "text-purple-700"
                            : "text-slate-800"
                        }`}
                      >
                        {office.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {office.address}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Branch Detail Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    {activeCountry.country}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1">
                    {activeOffice.name}
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{activeOffice.address}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <a
                      href={`tel:${activeOffice.phone.replace(/\s+/g, "")}`}
                      className="hover:text-purple-600 font-semibold"
                    >
                      {activeOffice.phone}
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      activeOffice.mapQuery
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100/70 rounded-xl font-bold text-xs transition-colors group"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Embedded Google Maps */}
            <div className="lg:col-span-7 min-h-[340px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs bg-white">
              <iframe
                title="Office Location Map"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "340px" }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  activeOffice.mapQuery
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Build Your Enterprise Communication Future
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Ready to Partner with Linala?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover why global organizations trust our infrastructure to deliver millions of conversations monthly.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl px-8 py-3.5 h-12 shadow-lg shadow-purple-500/20 text-sm">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 h-12 text-sm"
              >
                Contact Global Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
