import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Building2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Headphones,
  Radio,
  ChevronDown,
  HelpCircle,
  Clock,
  Layers,
  Bot,
  MessageSquare,
  Workflow,
  Utensils,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PaymentProvidersResponse, Plan, PlansDataTypes } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import CheckoutModal from "@/components/modals/CheckoutPage";

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();
  const { user, currencySymbol, currency } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch currency map
  const { data: currencyMapData } = useQuery<{
    success: boolean;
    data: {
      currencyMap: Record<string, { providerKey: string; providerId: string; providerName: string }[]>;
      availableCurrencies: string[];
    };
  }>({
    queryKey: ["/api/payment-providers/currency-map"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-providers/currency-map");
      return res.json();
    },
  });

  const availableCurrencies = currencyMapData?.data?.availableCurrencies || [];
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  useEffect(() => {
    if (availableCurrencies.length > 0 && !selectedCurrency) {
      const upper = currency?.toUpperCase() || "";
      if (availableCurrencies.includes(upper)) {
        setSelectedCurrency(upper);
      } else {
        setSelectedCurrency(availableCurrencies[0]);
      }
    }
  }, [availableCurrencies, currency]);

  const currencySymbolMap: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SAR: "﷼",
    BHD: "BD",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
    JPY: "¥",
  };

  const activeCurrencySymbol = selectedCurrency
    ? (currencySymbolMap[selectedCurrency] || selectedCurrency + " ")
    : currencySymbol || "$";

  const fetchPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/admin/plans");
      const data: PlansDataTypes = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      setLocation("/login");
      return;
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const calculatePrice = (plan: Plan) => {
    const basePrice = isAnnual
      ? parseFloat(plan.yearlyPrice || plan.price || "0")
      : parseFloat(plan.price || "0");
    return basePrice;
  };

  const faqs = [
    {
      q: "Are Meta Cloud API conversation fees included in the subscription?",
      a: "Our plans cover full platform software access, visual flow builders, shared inboxes, and Voice AI orchestration. Meta's official per-conversation charges (Marketing, Utility, Authentication, and Service) are billed directly at Meta's exact pass-through wholesale rates without markups.",
    },
    {
      q: "How does the 14-day free trial work?",
      a: "You get unrestricted access to the complete Linala platform for 14 days without entering a credit card. You can connect your Meta Business Manager, build visual flows, test Voice AI calling, and invite team agents.",
    },
    {
      q: "Can I upgrade, downgrade, or cancel at any time?",
      a: "Yes. You can switch plans or cancel your subscription directly from your billing dashboard with 1 click. If you cancel, your access continues until the end of your prepaid billing period.",
    },
    {
      q: "How does the Orderown Restaurant RMS integration work?",
      a: "Orderown Restaurant RMS sync is available on Pro & Enterprise tiers. It automatically connects table QR menus, KOT kitchen displays, and live WhatsApp delivery tracking to your restaurant branch without additional middleware.",
    },
    {
      q: "What payment methods do you support?",
      a: "We accept all major international Credit/Debit cards (Visa, Mastercard, Amex), Stripe, Razorpay, UPI QR (India), and regional GCC debit cards (Mada, Benefit, KNET). Wire transfers are available for annual enterprise contracts.",
    },
    {
      q: "Do you offer custom SLA & dedicated account managers?",
      a: "Yes. Enterprise plans include a dedicated Solution Architect, 99.99% uptime SLA, custom webhook integration assistance, and priority 24/7 WhatsApp & phone escalations.",
    },
  ];

  const comparisonFeatures = [
    {
      category: "WhatsApp Core & Meta Infrastructure",
      items: [
        { name: "Official Meta Cloud API Gateway", starter: "Included", pro: "Included", enterprise: "Included" },
        { name: "Meta Business Green Tick Assistance", starter: "Guide Included", pro: "Priority Support", enterprise: "Dedicated Concierge" },
        { name: "Messaging Tier Throughput", starter: "Tier 1 (1k/day)", pro: "Tier 3 (100k/day)", enterprise: "Tier Unlimited" },
        { name: "Visual Flow Builder & Bot Simulator", starter: "5 Active Flows", pro: "Unlimited Flows", enterprise: "Unlimited + Custom Nodes" },
        { name: "WhatsApp Interactive Buttons & Lists", starter: "Yes", pro: "Yes", enterprise: "Yes" },
      ],
    },
    {
      category: "Realtime Voice AI & Multilingual Speech",
      items: [
        { name: "Sub-600ms Multilingual Voice AI", starter: "Pay-as-you-go", pro: "Included Bundled Mins", enterprise: "Dedicated Cluster" },
        { name: "40+ Language & Dialect Recognition", starter: "Yes", pro: "Yes", enterprise: "Yes" },
        { name: "Custom Voice Cloning & Tone Tuning", starter: "No", pro: "Yes", enterprise: "Yes (Unlimited)" },
        { name: "Inbound & Outbound Phone Number Routing", starter: "1 Number", pro: "3 Numbers", enterprise: "Unlimited Numbers" },
      ],
    },
    {
      category: "CRM, E-Commerce & Team Collaboration",
      items: [
        { name: "Shared Multi-Agent Team Inbox", starter: "2 Agents", pro: "10 Agents", enterprise: "Unlimited Agents" },
        { name: "Kanban Deal Pipeline & Cadences", starter: "Basic", pro: "Automated Triggers", enterprise: "Multi-Pipeline Enterprise" },
        { name: "Orderown Restaurant RMS Direct Sync", starter: "Add-on", pro: "Included (Full KOT)", enterprise: "Multi-Branch Enterprise" },
        { name: "Shopify & WooCommerce 1-Click Sync", starter: "Basic", pro: "Full Cart Recovery", enterprise: "Deep Custom Sync" },
        { name: "Zapier & Webhooks (5,000+ Apps)", starter: "Webhooks only", pro: "Zapier + Webhooks", enterprise: "Custom API & SDK" },
      ],
    },
    {
      category: "Security, SLA & Support",
      items: [
        { name: "GDPR & DPDP Data Residency", starter: "Standard", pro: "Standard", enterprise: "Custom Region Hosting" },
        { name: "Support Response SLA", starter: "24 Hours", pro: "&lt; 2 Hours", enterprise: "15 Mins (24/7 Dedicated)" },
        { name: "Dedicated Solution Architect", starter: "No", pro: "Onboarding Session", enterprise: "Dedicated Account Manager" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero Header */}
      <section className="relative py-20 bg-gradient-to-b from-slate-50 via-purple-50/20 to-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-6 border border-purple-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Transparent Pricing • No Hidden Setup Fees
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Predictable Plans to Scale from{" "}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              First Chat to Millions
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Choose the perfect plan for your business. All plans include official Meta Cloud API infrastructure, visual flow builders, and shared team inboxes.
          </p>

          {/* Controls: Billing Toggle & Currency Switcher */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  !isAnnual
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isAnnual
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                  Save 20%
                </span>
              </button>
            </div>

            {/* Currency Selector */}
            {availableCurrencies.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500">Currency:</span>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-2xs"
                >
                  {availableCurrencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr} ({currencySymbolMap[curr] || curr})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">Loading plan options...</p>
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, idx) => {
              const price = calculatePrice(plan);
              const isPopular = plan.isPopular || idx === 1;

              return (
                <div
                  key={plan.id || idx}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    isPopular
                      ? "bg-white border-2 border-purple-600 shadow-2xl shadow-purple-500/10 scale-102 z-10"
                      : "bg-white border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-slate-300"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold px-4 py-1 rounded-full shadow-md shadow-purple-500/30 uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                        {isPopular ? <Crown className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 min-h-[36px] leading-relaxed">
                      {plan.description || "Everything you need to automate conversations and drive revenue."}
                    </p>

                    <div className="my-6 pb-6 border-b border-slate-100 flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        {activeCurrencySymbol}{price.toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        /{isAnnual ? "year" : "month"}
                      </span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        What's Included:
                      </p>
                      {plan.features && Array.isArray(plan.features) ? (
                        plan.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Official Meta Cloud API Gateway</span>
                          </div>
                          <div className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Visual Drag & Drop Flow Builder</span>
                          </div>
                          <div className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>Shared Multi-Agent Team Inbox</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full rounded-xl py-3.5 h-12 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isPopular
                        ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md shadow-purple-500/25 hover:opacity-95"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <span>Get Started with {plan.name}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Default Static Tier Cards if backend hasn't configured plans yet */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter */}
            <div className="rounded-3xl p-8 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                  <Rocket className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  Ideal for solo entrepreneurs, local clinics, and small retail stores getting started.
                </p>
                <div className="my-6 pb-6 border-b border-slate-100 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {activeCurrencySymbol}{isAnnual ? "390" : "39"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/{isAnnual ? "year" : "month"}</span>
                </div>
                <div className="space-y-3 mb-8 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Official Meta Cloud API Gateway (Tier 1)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>2 Team Agent Inbox Seats</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>5 Visual Flow Automations</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Basic Contact Manager & Tags</span>
                  </div>
                </div>
              </div>
              <Link href="/signup">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 text-xs font-bold">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>

            {/* Growth / Pro */}
            <div className="rounded-3xl p-8 bg-white border-2 border-purple-600 shadow-2xl shadow-purple-500/10 flex flex-col justify-between relative scale-102">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold px-4 py-1 rounded-full shadow-md uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Growth Pro</h3>
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  For fast-scaling E-commerce brands, restaurant chains, and high-volume marketing teams.
                </p>
                <div className="my-6 pb-6 border-b border-slate-100 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">
                    {activeCurrencySymbol}{isAnnual ? "890" : "89"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/{isAnnual ? "year" : "month"}</span>
                </div>
                <div className="space-y-3 mb-8 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Official Meta Cloud API (Tier 3 Throughput)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>10 Team Agent Inbox Seats</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Unlimited Visual Flows & Bots</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Orderown Restaurant RMS & Shopify Direct Sync</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Multilingual Voice AI Phone Integration</span>
                  </div>
                </div>
              </div>
              <Link href="/signup">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl h-12 text-xs font-bold shadow-md shadow-purple-500/25">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-3xl p-8 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  Custom high-throughput infrastructure, dedicated clusters, and 24/7 SLA for global enterprises.
                </p>
                <div className="my-6 pb-6 border-b border-slate-100 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                </div>
                <div className="space-y-3 mb-8 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Unlimited Official Meta API Throughput</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Unlimited Agents & Multi-Brand Channels</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Dedicated Voice AI Cluster & Custom Models</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Dedicated Account Manager & 99.99% SLA</span>
                  </div>
                </div>
              </div>
              <Link href="/contact">
                <Button variant="outline" className="w-full border-slate-300 text-slate-900 hover:bg-slate-50 rounded-xl h-12 text-xs font-bold">
                  Contact Enterprise Sales
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Compare Platform Capabilities
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Detailed breakdown of features across all plans.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="p-5">Platform Feature</th>
                    <th className="p-5 text-center">Starter</th>
                    <th className="p-5 text-center text-purple-700 bg-purple-50/50">Growth Pro</th>
                    <th className="p-5 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {comparisonFeatures.map((sec, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <tr className="bg-slate-100/70">
                        <td
                          colSpan={4}
                          className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-800"
                        >
                          {sec.category}
                        </td>
                      </tr>
                      {sec.items.map((item, iIdx) => (
                        <tr key={iIdx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-semibold text-slate-800">{item.name}</td>
                          <td className="p-5 text-center text-slate-600">{item.starter}</td>
                          <td className="p-5 text-center font-bold text-purple-700 bg-purple-50/20">
                            {item.pro}
                          </td>
                          <td className="p-5 text-center text-slate-800 font-semibold">{item.enterprise}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Add-ons & Scalability */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3">
            <Layers className="w-3.5 h-3.5" />
            Flexible Add-Ons
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Scale Only What You Need
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Extend any plan with modular capacity without forcing higher tier jumps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Voice AI Minute Packs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Add packs of 1,000 to 50,000 Realtime Multilingual Voice AI minutes with sub-600ms latency.
            </p>
            <p className="text-xs font-bold text-purple-600 pt-2">Starting from $0.06 / min</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Extra WhatsApp Numbers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect additional branch or brand phone numbers under a single unified dashboard.
            </p>
            <p className="text-xs font-bold text-indigo-600 pt-2">$15 / month per number</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Dedicated Solution Engineer</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hands-on workflow architecture, custom webhook payloads, and Meta Business verification setup.
            </p>
            <p className="text-xs font-bold text-pink-600 pt-2">Custom Engagement</p>
          </div>
        </div>
      </section>

      {/* Pricing FAQ Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500">
              Clear answers regarding billing, Meta Cloud API fees, and platform limits.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all hover:border-slate-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base pr-4">
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

      {/* Enterprise Consultation CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Need High-Volume Custom Quotations?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            For organizations sending over 500,000 monthly messages or requiring multi-tenant white labeling, our enterprise architecture team will build a tailored package.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/contact">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl px-7 py-3.5 h-12 shadow-lg shadow-purple-500/25">
                Contact Enterprise Sales
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-800/60 text-white hover:bg-slate-800 rounded-xl px-7 py-3.5 h-12"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          plan={selectedPlan}
          isAnnual={isAnnual}
          selectedCurrency={selectedCurrency}
        />
      )}
    </div>
  );
};

export default PricingPage;
