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

import {
  format,
  isToday,
  isYesterday,
} from "date-fns";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import React from "react";

export function normalizeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return isNaN(ms) ? null : new Date(ms);
  }

  if (typeof value === "string") {
    const num = Number(value);
    if (!isNaN(num) && String(num) === value.trim()) {
      const ms = num < 1e12 ? num * 1000 : num;
      return isNaN(ms) ? null : new Date(ms);
    }

    let parsed = Date.parse(value);
    if (!isNaN(parsed)) return new Date(parsed);

    if (value.includes(" ")) {
      let formatted = value.replace(" ", "T");
      if (!formatted.endsWith("Z") && !/[+-]\d{2}(:?\d{2})?$/.test(formatted)) {
        formatted += "Z";
      }
      parsed = Date.parse(formatted);
      if (!isNaN(parsed)) return new Date(parsed);
    }
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizeTime(value: any): number {
  if (!value) return 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return isNaN(t) ? 0 : t;
  }

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const num = Number(value);
    if (!isNaN(num) && String(num) === value.trim()) {
      return num < 1e12 ? num * 1000 : num;
    }

    let parsed = Date.parse(value);
    if (!isNaN(parsed)) return parsed;

    if (value.includes(" ")) {
      let formatted = value.replace(" ", "T");
      if (!formatted.endsWith("Z") && !/[+-]\d{2}(:?\d{2})?$/.test(formatted)) {
        formatted += "Z";
      }
      parsed = Date.parse(formatted);
      if (!isNaN(parsed)) return parsed;
    }
  }

  const d = new Date(value);
  const t = d.getTime();
  return isNaN(t) ? 0 : t;
}

export const formatLastSeen = (value: any) => {
  const time = normalizeTime(value);
  if (!time) return "";

  const diff = Date.now() - time;

  if (diff < 0) return "Just now";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(time).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatMessageDate = (date: any) => {
  const messageDate = normalizeDate(date);
  if (!messageDate) return "";

  if (isToday(messageDate)) return "Today";
  if (isYesterday(messageDate)) return "Yesterday";
  return format(messageDate, "MMMM d, yyyy");
};

export const getMessageStatusIcon = (status: string) => {
  switch (status) {
    case "sent":
      return React.createElement(Check, { className: "w-3.5 h-3.5 text-[#8696a0]" });
    case "delivered":
      return React.createElement(CheckCheck, { className: "w-3.5 h-3.5 text-[#8696a0]" });
    case "read":
      return React.createElement(CheckCheck, { className: "w-3.5 h-3.5 text-[#53bdeb]" });
    case "failed":
      return React.createElement(AlertCircle, { className: "w-3.5 h-3.5 text-red-500" });
    default:
      return React.createElement(Clock, { className: "w-3.5 h-3.5 text-gray-400" });
  }
};
