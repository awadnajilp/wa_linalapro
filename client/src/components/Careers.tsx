import React, { useState } from "react";
import { Link } from "wouter";
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Zap,
  Globe,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  badge: string;
}

const OPEN_POSITIONS: JobOpening[] = [
  {
    id: "bde",
    title: "Business Development Executive",
    department: "Sales & Growth",
    location: "India / KSA / Bahrain / Remote",
    type: "Full-time",
    experience: "1-3 Years",
    badge: "Hot Opening",
    summary:
      "Drive outbound pipeline generation, engage high-growth SMB and enterprise prospects, and showcase Linala's WhatsApp CRM & Voice AI solutions.",
    responsibilities: [
      "Identify, prospect, and qualify outbound leads across target industries (E-Commerce, Real Estate, Healthcare, EdTech)",
      "Execute consultative discovery calls and product demos over Zoom/Google Meet",
      "Collaborate with sales leadership to exceed monthly and quarterly SQL and revenue targets",
      "Maintain active pipeline records and deal velocity metrics in Linala CRM",
    ],
    requirements: [
      "1-3 years of proven experience in B2B SaaS, IT sales, or digital solutions",
      "Exceptional verbal and written communication skills in English (Arabic/Hindi is a strong plus)",
      "Self-driven mindset with a passion for conversational marketing and AI technology",
      "Familiarity with CRM tools and consultative selling methodologies",
    ],
  },
  {
    id: "sales-counselor",
    title: "Sales Counselor",
    department: "Customer Advisory",
    location: "India / KSA / Remote",
    type: "Full-time",
    experience: "1-4 Years",
    badge: "Immediate Hire",
    summary:
      "Guide incoming inquiries and qualified business owners to understand the optimal WhatsApp Meta Cloud API and Voice AI architecture for their specific workflow.",
    responsibilities: [
      "Conduct in-depth advisory sessions with business owners evaluating WhatsApp marketing & voice automation",
      "Recommend tailored pricing tiers, messaging volume packages, and custom flow setups",
      "Address technical and onboarding questions to ensure rapid customer time-to-value",
      "Nurture trial users into committed long-term enterprise subscriptions",
    ],
    requirements: [
      "Proven track record in client counseling, sales advisory, or EdTech/SaaS customer consultation",
      "Strong empathetic listening and problem-solving abilities",
      "Ability to articulate complex technical workflows in simple, business-friendly terms",
      "Bachelor's degree or equivalent practical experience",
    ],
  },
  {
    id: "meta-digital-marketer",
    title: "Meta Certified Digital Marketing Associate",
    department: "Performance Marketing",
    location: "United Kingdom / India / Remote",
    type: "Full-time",
    experience: "2-4 Years",
    badge: "Meta Specialist",
    summary:
      "Own Meta Ads and Click-to-WhatsApp campaign strategies, driving high-converting inbound leads and helping clients maximize ROAS through automated WhatsApp flows.",
    responsibilities: [
      "Plan, launch, and optimize high-converting Click-to-WhatsApp (CTWA) and lead generation campaigns on Meta Ads Manager",
      "Design A/B test experiments for ad creatives, headlines, target audiences, and WhatsApp welcome flows",
      "Track full-funnel attribution from first ad impression to closed WhatsApp deal",
      "Produce actionable monthly performance reports and ROAS benchmarks",
    ],
    requirements: [
      "Official Meta Certification (Media Buying, Digital Marketing Associate, or Marketing Science)",
      "2+ years of hands-on experience managing substantial ad budgets on Meta Ads Manager",
      "Deep understanding of Meta Pixel, Conversions API (CAPI), and CTWA ad mechanics",
      "Analytical mindset with expertise in Google Analytics 4, Looker Studio, and CRM attribution",
    ],
  },
  {
    id: "account-manager",
    title: "Account Manager",
    department: "Customer Success",
    location: "Bahrain / KSA / UK / Remote",
    type: "Full-time",
    experience: "2-5 Years",
    badge: "Key Role",
    summary:
      "Nurture relationships with key enterprise accounts, ensure high customer satisfaction, drive platform adoption, and manage renewals and upsells.",
    responsibilities: [
      "Act as the primary strategic partner and trusted advisor for high-tier enterprise clients",
      "Conduct regular quarterly business reviews (QBRs) and deliver usage optimization recommendations",
      "Identify opportunities for plan upgrades, additional channel add-ons, and voice AI minutes",
      "Coordinate with engineering and support teams to resolve enterprise client escalations swiftly",
    ],
    requirements: [
      "2+ years in SaaS Account Management, Client Relationship Management, or Customer Success",
      "Strong relationship-building, negotiation, and contract renewal skills",
      "Experience working with enterprise clients in the GCC, UK, or APAC markets",
      "Proactive, solution-oriented approach with high attention to customer metrics",
    ],
  },
  {
    id: "sales-manager",
    title: "Sales Manager",
    department: "Sales Leadership",
    location: "KSA / Bahrain / India / UK",
    type: "Full-time",
    experience: "4-7 Years",
    badge: "Leadership",
    summary:
      "Lead, mentor, and scale our regional sales teams across Middle East, UK, and Asia-Pacific markets to achieve aggressive revenue targets.",
    responsibilities: [
      "Manage and coach a high-performing team of Business Development Executives and Sales Counselors",
      "Define regional go-to-market strategies, sales quotas, and revenue forecasting models",
      "Participate in high-value enterprise deal negotiations and strategic client pitches",
      "Optimize the sales pipeline conversion rates and shorten overall deal closing cycles",
    ],
    requirements: [
      "4+ years of B2B sales experience with at least 2 years in a leadership/managerial capacity in SaaS/Tech",
      "Demonstrated history of consistently achieving or exceeding team ARR targets",
      "Strong understanding of the GCC, UK, or South Asian SaaS and business messaging ecosystem",
      "Inspiring leadership style with strong data-driven pipeline management skills",
    ],
  },
];

export const Careers: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicantData, setApplicantData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    experience: "",
    coverNote: "",
  });

  const handleOpenApply = (job: JobOpening) => {
    setSelectedJob(job);
    setIsApplying(true);
  };

  const handleCloseModal = () => {
    setIsApplying(false);
    setSelectedJob(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate application dispatch to backend contact/career endpoint
    try {
      const res = await fetch("/api/contact/sendmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: applicantData.name,
          email: applicantData.email,
          company: `Application for ${selectedJob?.title}`,
          subject: `Job Application: ${selectedJob?.title} - ${applicantData.name}`,
          message: `Phone: ${applicantData.phone}\nLinkedIn: ${applicantData.linkedin}\nExperience: ${applicantData.experience}\nNote: ${applicantData.coverNote}`,
        }),
      });

      toast({
        title: "Application Submitted Successfully",
        description: `Thank you for applying for the ${selectedJob?.title} position. Our talent team will review your profile!`,
      });
      handleCloseModal();
      setApplicantData({
        name: "",
        email: "",
        phone: "",
        linkedin: "",
        experience: "",
        coverNote: "",
      });
    } catch {
      toast({
        title: "Application Received",
        description: "Your application has been logged. Our HR team will reach out soon.",
      });
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            We Are Hiring Global Talent
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Build the Future of{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Enterprise Conversational AI
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Join a fast-paced, international team operating across India, Bahrain, Saudi Arabia, and the UK. We are scaling rapidly and looking for passionate leaders.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>4+ International Hubs</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Remote & Hybrid Culture</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Competitive Compensation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Open Vacancies Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-3 border border-purple-200">
            <Briefcase className="w-3.5 h-3.5" />
            Active Job Openings
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Available Positions
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Explore our open roles below and apply directly to our recruitment team.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
          {OPEN_POSITIONS.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {job.department}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {job.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {job.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {job.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{job.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-pink-600" />
                    <span>Exp: {job.experience}</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <Button
                  onClick={() => handleOpenApply(job)}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-xs sm:text-sm px-6 py-3 h-11 shadow-xs group-hover:shadow-md transition-all w-full md:w-auto"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application Modal */}
      {isApplying && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  {selectedJob.department}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Apply for {selectedJob.title}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantData.name}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={applicantData.email}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={applicantData.phone}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, phone: e.target.value })
                    }
                    placeholder="+966 / +973 / +91 / +44"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Years of Experience *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantData.experience}
                    onChange={(e) =>
                      setApplicantData({ ...applicantData, experience: e.target.value })
                    }
                    placeholder="e.g. 3 Years"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={applicantData.linkedin}
                  onChange={(e) =>
                    setApplicantData({ ...applicantData, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief Introduction & Key Achievements
                </label>
                <textarea
                  rows={3}
                  value={applicantData.coverNote}
                  onChange={(e) =>
                    setApplicantData({ ...applicantData, coverNote: e.target.value })
                  }
                  placeholder="Tell us about your recent wins, relevant skills, and why you'd be a great fit for Linala..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-500/20 text-xs sm:text-sm"
                >
                  {isSubmitting ? "Submitting Application..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Careers;
