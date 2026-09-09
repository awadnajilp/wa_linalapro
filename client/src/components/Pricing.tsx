/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import React, { useEffect, useState } from "react";
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Building,
  ArrowRight,
  AlertCircle,
  Star,
  Globe2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PaymentProvidersResponse, Plan, PlansDataTypes } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import CheckoutModal from "./modals/CheckoutPage";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";

const defaultExchangeRates: Record<string, number> = {
  USD: 1.0,
  SAR: 3.75,
  AED: 3.67,
  INR: 95.70,
  GBP: 0.78,
  EUR: 0.92,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  QAR: 3.64,
  EGP: 48.0,
};

const defaultCurrencyList = ["USD", "SAR", "AED", "INR", "EUR", "GBP", "KWD", "BHD", "OMR", "QAR", "EGP"];

const Pricing = () => {
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const { toast } = useToast();
  const { user, currencySymbol, currency } = useAuth();

  const [, setLocation] = useLocation();
  // Fetch payment providers
  const { data: paymentProviders, isLoading: isLoadingProviders } =
    useQuery<PaymentProvidersResponse>({
      queryKey: ["/api/payment-providers"],
      queryFn: async () => {
        try {
          const res = await fetch("/api/payment-providers");
          if (!res.ok) return { success: false, data: [] } as any;
          return await res.json();
        } catch {
          return { success: false, data: [] } as any;
        }
      },
      retry: false,
    });

  // Fetch currency map and exchange rates
  const { data: currencyMapData } = useQuery<{
    success: boolean;
    data: {
      currencyMap: Record<string, { providerKey: string; providerId: string; providerName: string }[]>;
      availableCurrencies: string[];
      exchangeRates?: Record<string, number>;
    };
  }>({
    queryKey: ["/api/payment-providers/currency-map"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/payment-providers/currency-map");
        if (!res.ok) return { success: false, data: { currencyMap: {}, availableCurrencies: defaultCurrencyList, exchangeRates: defaultExchangeRates } };
        return await res.json();
      } catch {
        return { success: false, data: { currencyMap: {}, availableCurrencies: defaultCurrencyList, exchangeRates: defaultExchangeRates } };
      }
    },
    retry: false,
  });

  const availableCurrencies = currencyMapData?.data?.availableCurrencies?.length
    ? currencyMapData.data.availableCurrencies
    : defaultCurrencyList;
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

  const currencySymbolMap: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    AED: "د.إ ",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
    JPY: "¥",
    CNY: "¥",
    BRL: "R$",
    MXN: "MX$",
    ZAR: "R",
    SAR: "ر.س ",
    KWD: "د.ك ",
    BHD: "د.ب ",
    OMR: "ر.ع ",
    QAR: "ر.ق ",
    EGP: "ج.م ",
  };

  const activeCurrencySymbol = selectedCurrency
    ? (currencySymbolMap[selectedCurrency] || selectedCurrency + " ")
    : "$ ";

  const calculateConvertedPrice = (rawPrice: string | number | undefined) => {
    const num = typeof rawPrice === "string" ? parseFloat(rawPrice) : (typeof rawPrice === "number" ? rawPrice : 0);
    if (isNaN(num)) return 0;
    const rates = currencyMapData?.data?.exchangeRates || defaultExchangeRates;
    const rate = rates[selectedCurrency] || defaultExchangeRates[selectedCurrency] || 1.0;
    const converted = num * rate;
    return converted >= 10 ? Math.round(converted) : parseFloat(converted.toFixed(2));
  };

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Crown,
    Rocket,
    Star,
    Building,
  };

  const fetchPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/plans");
      if (!response.ok) return;
      const data: PlansDataTypes = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      }
    } catch (error) {
      console.warn("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      setLocation("/login");
      // return toast({
      //   title: t("Landing.pricingSec.authRequired.title"),
      //   description: t("Landing.pricingSec.authRequired.description"),
      //   variant: "destructive",
      // });
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const renderPlansContent = () => {
    if (loading) {
      return (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">
            {t("Landing.pricingSec.loading")}
          </p>
        </div>
      );
    }

    if (plans.length === 0) {
      return (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t("Landing.pricingSec.noPlans.title")}
          </h3>
          <p className="text-gray-600">
            {t("Landing.pricingSec.noPlans.description")}
          </p>
        </div>
      );
    }
    const sortedPlans = plans.sort((a, b) => {
      const priceA = Number(isAnnual ? a.annualPrice : a.monthlyPrice);
      const priceB = Number(isAnnual ? b.annualPrice : b.monthlyPrice);
      return priceA - priceB;
    });
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-16">
        {sortedPlans.map((plan, index) => {
          const IconComponent = iconMap[plan.icon] || Zap;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`bg-white p-8 rounded-2xl shadow-lg border-2 ${
                isPopular ? "relative transform scale-105" : ""
              } hover:shadow-xl transition-all flex flex-col h-full`}
              style={{ borderColor: plan.color || '#e5e7eb' }}
            >
              {/* Popular Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8 flex-shrink-0">
                {/* Icon */}
                <div className="bg-gray-100 p-3 rounded-xl w-fit mx-auto mb-4">
                  <IconComponent className="w-8 h-8 text-gray-700" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {activeCurrencySymbol}
                    {calculateConvertedPrice(isAnnual ? (plan.annualPrice || plan.yearlyPrice) : (plan.monthlyPrice || plan.price))}
                  </span>
                  <span className="text-gray-600 ml-2">
                    /
                    {isAnnual
                      ? (isAr ? "سنة" : t("Landing.pricingSec.pricing.year"))
                      : (isAr ? "شهر" : t("Landing.pricingSec.pricing.month"))}
                  </span>
                </div>

                {/* Permissions */}
                {plan.permissions && (
                  <div className="space-y-1">
                    <div className="text-gray-600 text-sm">
                      {t("Landing.pricingSec.pricing.upTo")}{" "}
                      {plan.permissions.contacts}{" "}
                      {t("Landing.pricingSec.pricing.contacts")}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {plan.permissions.channel}{" "}
                      {t("Landing.pricingSec.pricing.channels")}
                    </div>
                    {plan.permissions.automation && (
                      <div className="text-gray-600 text-sm">
                        {plan.permissions.automation}{" "}
                        {t("Landing.pricingSec.pricing.automation")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Features - Grow to fill space */}
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features && Array.isArray(plan.features) && plan.features.length > 0 ? (
                  plan.features.map((feature: any, featureIndex: number) => {
                    const featName = typeof feature === "string" ? feature : feature?.name || "";
                    const isIncluded = typeof feature === "string" ? true : feature?.included !== false;
                    if (!featName) return null;
                    return (
                      <li
                        key={`${featName}-${featureIndex}`}
                        className="flex items-start space-x-3"
                      >
                        {isIncluded ? (
                          <Check className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            isIncluded ? "text-gray-700" : "text-gray-400"
                          }`}
                        >
                          {featName}
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.contacts}{" "}
                        {t("Landing.pricingSec.pricing.contacts")}
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.channel}{" "}
                        {t("Landing.pricingSec.pricing.channels")}
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.automation}{" "}
                        {t("Landing.pricingSec.pricing.automation")}
                      </span>
                    </li>
                  </>
                )}
              </ul>

              {/* CTA Button - Always at bottom */}
              <button
                onClick={() => handleSelectPlan(plan)}
                className="w-full py-3 rounded-xl font-semibold transition-all transform hover:scale-105 text-white flex-shrink-0 hover:opacity-90"
                style={{ backgroundColor: plan.buttonColor || '#10b981' }}
              >
                {Number.parseFloat(plan.monthlyPrice) === 0
                  ? t("Landing.pricingSec.planCTA.freeButton")
                  : t("Landing.pricingSec.planCTA.paidButton")}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Get FAQ data from translation
  const faqData = t("Landing.pricingSec.faq.questions") as unknown as Array<{
    q: string;
    a: string;
  }>;

  return (
    <>
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Crown className="w-4 h-4 mr-2" />
              {t("Landing.pricingSec.introTagline")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("Landing.pricingSec.headlinePre")}{" "}
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {t("Landing.pricingSec.headlineHighlight")}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {t("Landing.pricingSec.subHeadline")}
            </p>

            {/* Billing Toggle & Currency Switcher Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-12">
              {/* Monthly / Annual Switcher */}
              <div className="inline-flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    !isAnnual
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {isAr ? "اشتراك شهري" : t("Landing.pricingSec.billingToggle.monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnnual(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isAnnual
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <span>{isAr ? "اشتراك سنوي" : t("Landing.pricingSec.billingToggle.annual")}</span>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    {isAr ? "وفر 20%" : t("Landing.pricingSec.billingToggle.saveLabel")}
                  </span>
                </button>
              </div>

              {/* Currency Selector */}
              {availableCurrencies.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-xs">
                  <Globe2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-500">
                    {isAr ? "العملة:" : "Currency:"}
                  </span>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-bold text-gray-900 focus:outline-none cursor-pointer outline-none"
                  >
                    {availableCurrencies.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur} ({currencySymbolMap[cur] || cur})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Plans Content */}
          {renderPlansContent()}

          {/* Enterprise CTA */}
          <div className="mt-16 bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              {t("Landing.pricingSec.enterprise.title")}
            </h3>
            <p className="text-gray-300 mb-6">
              {t("Landing.pricingSec.enterprise.description")}
            </p>
            <Link
              href="/contact"
              className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center mx-auto group w-fit"
            >
              {t("Landing.pricingSec.enterprise.button")}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isAnnual={isAnnual}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          userId={user?.id}
          paymentProviders={paymentProviders?.data}
          isLoadingProviders={isLoadingProviders}
          selectedCurrency={selectedCurrency}
        />
      )}
    </>
  );
};

export default Pricing;
