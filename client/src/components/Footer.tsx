import React from "react";
import { Link } from "wouter";
import {
  MessageSquare,
  Twitter,
  Linkedin,
  Github,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const Footer: React.FC = () => {
  const { t } = useTranslation();

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const links = {
    product: [
      { name: "WhatsApp Store & Checkout", href: "/#features" },
      { name: "Multilingual Voice AI", href: "/#features" },
      { name: "Visual Flow Builder", href: "/#features" },
      { name: "Cadence & Campaigns", href: "/#features" },
      { name: "SME Financial Ledger", href: "/#features" },
      { name: "Team Inbox & CRM", href: "/#features" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "Contact Sales & Support", href: "/contact" },
      { name: "Careers", href: "/careers" },
    ],
    resources: [
      { name: "Case Studies", href: "/case-studies" },
      { name: "WhatsApp Business Guide", href: "/whatsapp-guide" },
      { name: "Best Practices", href: "/best-practices" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookie-policy" },
    ],
  };

  const renderLink = (link: { name: string; href: string }, index: number) => (
    <li key={index}>
      {link.href.startsWith("/") ? (
        <Link
          to={link.href}
          className="text-slate-400 hover:text-purple-400 text-xs sm:text-sm transition-all duration-200 hover:translate-x-0.5 inline-block"
        >
          {link.name}
        </Link>
      ) : (
        <a
          href={link.href}
          className="text-slate-400 hover:text-purple-400 text-xs sm:text-sm transition-all duration-200 hover:translate-x-0.5 inline-block"
        >
          {link.name}
        </a>
      )}
    </li>
  );

  return (
    <footer className="bg-slate-950 text-white relative border-t border-slate-900">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="flex items-center space-x-2.5">
              {brandSettings?.logo2 && brandSettings.logo2 !== "/uploads/null" ? (
                <img
                  src={brandSettings.logo2}
                  alt="Logo"
                  className="h-10 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : brandSettings?.logo ? (
                <img
                  src={brandSettings.logo}
                  alt="Logo"
                  className="h-10 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div className="bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-xl p-2">
                  <MessageSquare className="h-6 w-6" />
                </div>
              )}
            </Link>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              The next-generation WhatsApp AI, Automation, and Instant Commerce platform. Empowering ambitious businesses worldwide to turn conversations into revenue.
            </p>

            <div className="flex space-x-2.5 pt-2">
              <a
                href="https://x.com"
                className="bg-slate-900 p-2.5 rounded-xl hover:bg-purple-950 border border-slate-800 hover:border-purple-500/40 transition-all text-slate-400 hover:text-purple-400"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                className="bg-slate-900 p-2.5 rounded-xl hover:bg-purple-950 border border-slate-800 hover:border-purple-500/40 transition-all text-slate-400 hover:text-purple-400"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                className="bg-slate-900 p-2.5 rounded-xl hover:bg-purple-950 border border-slate-800 hover:border-purple-500/40 transition-all text-slate-400 hover:text-purple-400"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Platform & Features
            </h3>
            <ul className="space-y-2.5">
              {links.product.map((link, index) => renderLink(link, index))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Company
            </h3>
            <ul className="space-y-2.5">
              {links.company.map((link, index) => renderLink(link, index))}
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Resources & Legal
            </h3>
            <ul className="space-y-2.5">
              {links.resources.map((link, index) => renderLink(link, index))}
              {links.legal.map((link, index) => renderLink(link, index + 10))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} {brandSettings?.title || "WhatsWay"}. All rights reserved. Built for high-growth commerce.
            </p>
            <div className="flex items-center space-x-5 text-xs text-slate-500">
              <Link to="/terms" className="hover:text-slate-300 transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy-policy" className="hover:text-slate-300 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/cookie-policy" className="hover:text-slate-300 transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
