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

import React from "react";
import {
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  Bot,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

interface LoadingAnimationProps {
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
  color?: "purple" | "white" | "blue" | "green";
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  onComplete,
  size = "lg",
  color = "purple",
}) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const steps = [
    {
      text: "Initializing Linala AI Core & Omnichannel Engine...",
      icon: MessageSquare,
    },
    { text: "Syncing Voice Autopilot & AI Models...", icon: Bot },
    { text: "Loading CRM & Multi-Channel Pipelines...", icon: TrendingUp },
    { text: "Connecting WhatsApp Meta Cloud API...", icon: Zap },
    { text: "Workspace Ready to Scale!", icon: CheckCircle },
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setProgress((prev) => prev + 20);
      } else {
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 800);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [currentStep, steps.length, onComplete]);

  // Small loading spinner for buttons
  if (size === "sm") {
    return (
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${
          size === "sm" ? "w-4 h-4" : "w-6 h-6"
        } ${
          color === "white"
            ? "border-white"
            : color === "blue"
            ? "border-blue-600"
            : color === "green"
            ? "border-emerald-600"
            : "border-purple-600"
        }`}
      ></div>
    );
  }

  // Medium loading spinner
  if (size === "md") {
    return (
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent w-6 h-6 ${
          color === "white"
            ? "border-white"
            : color === "blue"
            ? "border-blue-600"
            : color === "green"
            ? "border-emerald-600"
            : "border-purple-600"
        }`}
      ></div>
    );
  }

  // Full page loading animation - MODERN 2026 LIGHT MODE
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-slate-50 to-purple-50/40 flex items-center justify-center z-50">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-pink-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Logo / Brand Icon */}
        <div className="flex items-center justify-center space-x-3 mb-10">
          {brandSettings?.logo ? (
            <img
              src={brandSettings?.logo}
              alt="Logo"
              className="h-12 object-contain animate-bounce"
            />
          ) : (
            <div className="bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-4 rounded-2xl shadow-xl shadow-purple-500/20">
              <Sparkles className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Floating live badges */}
        <div className="relative mb-10 h-36 perspective">
          {[
            { text: "AI Voice Autopilot Synced ✓", color: "bg-purple-500" },
            { text: "Meta Cloud API Connected ✓", color: "bg-indigo-500" },
            { text: "Smart Pipeline Ready ✓", color: "bg-pink-500" },
          ].map((item, i) => (
            <div
              key={i}
              className={`absolute bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-md border border-slate-200/80 transition-all ${
                i === 0
                  ? "left-2 top-0"
                  : i === 1
                  ? "right-2 top-8"
                  : "left-1/2 transform -translate-x-1/2 top-20"
              }`}
              style={{
                animation: `float 3s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            >
              <div className="flex items-center space-x-2.5">
                <div className={`w-2.5 h-2.5 ${item.color} rounded-full animate-pulse`}></div>
                <span className="text-xs font-semibold text-slate-700">
                  {item.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Step Box */}
        <div className="mb-6 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-center space-x-3">
            <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-2.5 rounded-xl shadow-md shadow-purple-500/20 text-white">
              {React.createElement(steps[currentStep].icon, {
                className: "w-5 h-5 animate-pulse",
                strokeWidth: 2,
              })}
            </div>
            <span className="text-sm font-semibold text-slate-800 text-left">
              {steps[currentStep].text}
            </span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2.5 mb-5 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Status Text */}
        <p className="text-xs font-medium text-slate-500">
          Setting up your 2026 Linala AI Workspace...
        </p>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-2 mt-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingAnimation;
