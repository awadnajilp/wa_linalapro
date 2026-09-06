import React from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import BentoGrid from "@/components/BentoGrid";
import DeepDiveShowcases from "@/components/DeepDiveShowcases";
import MetricsSection from "@/components/MetricsSection";
import UseCases from "@/components/UseCases";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import OfficeLocations from "@/components/OfficeLocations";
import CTA from "@/components/CTA";
import { useQuery } from "@tanstack/react-query";
import { PlansDataTypes } from "@/types/types";

const Home: React.FC = () => {
  const { data: paymentProviders } = useQuery<PlansDataTypes>({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plans");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* 1. Brevo-Inspired Hero Section */}
      <Hero />

      {/* 2. Unified Product Cloud Suite (6 Core Tabs) */}
      <Features />

      {/* 3. Deep-Dive Storytelling Showcases */}
      <DeepDiveShowcases />

      {/* 4. Bento Grid Micro-Features Showcase */}
      <BentoGrid />

      {/* 5. Proven Metrics & ROI Proof Section */}
      <MetricsSection />

      {/* 6. Industry & Use-Case Solutions */}
      <UseCases />

      {/* 7. Customer Testimonials & Social Proof */}
      <Testimonials />

      {/* 8. Dynamic Pricing Plans */}
      {paymentProviders?.success && paymentProviders?.data?.length > 0 && (
        <Pricing />
      )}

      {/* 9. Global Office Locations */}
      <OfficeLocations />

      {/* 10. High-Converting Full-Width Bottom CTA */}
      <CTA />
    </div>
  );
};

export default Home;
