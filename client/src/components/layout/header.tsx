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
  Plus,
  LogOut,
  Settings,
  User,
  Menu,
  ScrollText,
  Headphones,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

import { useSidebar } from "@/contexts/sidebar-context";
import { LanguageSelector } from "../language-selector";
import NotificationBell from "@/components/notification/NotificationBell";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  userPhotoUrl?: string;
}

export default function Header({
  title,
  subtitle,
  action,
  userPhotoUrl,
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleBackToAdmin = async () => {
    try {
      const res = await apiRequest("POST", "/api/auth/unimpersonate");
      if (res.ok) {
        toast({
          title: "Session Restored",
          description: "Switched back to superadmin session.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        window.location.href = "/users";
      } else {
        const err = await res.json();
        toast({
          title: "Error switching back",
          description: err.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to contact server",
        variant: "destructive",
      });
    }
  };

  const username = (user?.firstName || "") + " " + (user?.lastName || "");

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const { isOpen, toggle } = useSidebar();

  // UI unchanged --------------------------------------
  return (
    <>
      <header className="bg-white/95 backdrop-blur-md shadow-2xs border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30 transition-all">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="lg:hidden p-2 bg-white rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 hidden lg:block font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-fit">
              {action && (
                <Button
                  onClick={action.onClick}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-sm shadow-purple-500/20 rounded-xl px-3 py-1.5 h-9 text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{" "}
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              )}
            </div>
            {user?.originalSuperadmin && (
              <Button
                onClick={handleBackToAdmin}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-xs border border-rose-700 h-9 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin</span>
              </Button>
            )}
            <div className="w-fit hidden sm:block">
              <LanguageSelector />
            </div>

            {user?.role != "superadmin" && (
              <>
                <button
                  onClick={() => setLocation("/settings?tab=support")}
                  className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 border border-transparent hover:border-purple-100 transition-all"
                  title="Support"
                >
                  <Headphones className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLocation("/settings?tab=message_logs")}
                  className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50/60 border border-transparent hover:border-purple-100 transition-all"
                  title="Message Logs"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
                <NotificationBell />
              </>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-100 hover:ring-purple-300 transition-all shadow-2xs"
                onClick={() => setDropdownOpen((x) => !x)}
              >
                <img
                  src={
                    userPhotoUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      username
                    )}&background=7c3aed&color=fff`
                  }
                  className="w-full h-full object-cover"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 text-slate-800 font-semibold text-xs">
                    {username}
                  </div>

                  <button
                    className="flex items-center w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    onClick={() => {
                      setLocation("/settings");
                      setDropdownOpen(false);
                    }}
                  >
                    <Settings className="w-3.5 h-3.5 mr-2.5 text-slate-400" /> Settings
                  </button>

                  <button
                    className="flex items-center w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    onClick={() => {
                      setLocation("/account");
                      setDropdownOpen(false);
                    }}
                  >
                    <User className="w-3.5 h-3.5 mr-2.5 text-slate-400" /> Account
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    className="flex items-center w-full px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    onClick={logout}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2.5" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    </>
  );
}
