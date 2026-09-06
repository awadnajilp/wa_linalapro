import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { AppSettings } from "@/types/types";

export const WhatsAppWidget: React.FC = () => {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem("hideWaWidget") === "true";
  });

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Only show on the public landing page (root route) and for non-dismissed unauthenticated visitors
  if (location !== "/" || isAuthenticated || isDismissed) {
    return null;
  }

  // Default number: +91 483 435 4892
  const rawNumber = (brandSettings as any)?.supportWhatsapp || "+914834354892";
  const cleanPhone = rawNumber.replace(/[^0-9]/g, "");

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(
      "Hi Linala! I'm interested in the WhatsApp AI & Commerce platform. Could you share more details?"
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem("hideWaWidget", "true");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      {/* Floating Tooltip Pill with Close Button */}
      <div className="mb-2 bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-slate-200/90 flex items-center gap-2 animate-bounce">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span onClick={handleOpenWhatsApp} className="cursor-pointer hover:text-purple-600">
          Chat with us on WhatsApp
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
          aria-label="Dismiss chat widget"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Main WhatsApp Floating Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleOpenWhatsApp}
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-xl shadow-green-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Chat on WhatsApp"
          title="Chat on WhatsApp"
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            stroke="currentColor"
            strokeWidth="0"
            fill="currentColor"
          >
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.944.821 2.796.821 3.18 0 5.767-2.587 5.767-5.766.001-3.185-2.585-5.772-5.767-5.772zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.058.376-.058c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.419-.101.824z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WhatsAppWidget;

