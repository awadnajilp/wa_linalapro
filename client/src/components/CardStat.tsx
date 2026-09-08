/**
 * ============================================================
 * © 2026 Linala — Modern Dashboard Grid Counter
 * ============================================================
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CardStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  iconClassName?: string;
  valueClassName?: string;
  borderColor?: string;
}

export function CardStat({
  label,
  value,
  icon,
  subtitle,
  iconClassName = "bg-purple-50 text-purple-600",
  valueClassName = "text-slate-900",
}: CardStatProps) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200/90 transition-all duration-200 bg-white group overflow-hidden relative">
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/0 to-transparent group-hover:via-purple-500 transition-all duration-300" />

      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconClassName}`}>
            {icon}
          </div>
        </div>

        {/* Counter Value */}
        <div className={`text-2xl sm:text-3xl font-black tracking-tight ${valueClassName}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {/* Optional Subtitle */}
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

