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

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import SignupPopup from "./SignupPopup";

export function SignupPopupHandler() {
  const { isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Only for unauthenticated users
    if (isAuthenticated) return;

    try {
      const popupShown = typeof window !== "undefined" && sessionStorage.getItem("signupPopupShown");
      if (popupShown === "true") return;
    } catch {
      return;
    }

    // Show after 20 seconds
    const timer = setTimeout(() => {
      setShowPopup(true);
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("signupPopupShown", "true");
        }
      } catch {}
    }, 20000);

    // Show on scroll past half page
    const handleScroll = () => {
      try {
        const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem("signupPopupShown");
        if (
          window.scrollY > window.innerHeight * 0.5 &&
          alreadyShown !== "true"
        ) {
          setShowPopup(true);
          try {
            sessionStorage.setItem("signupPopupShown", "true");
          } catch {}
          window.removeEventListener("scroll", handleScroll);
        }
      } catch {
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isAuthenticated]);

  const handleClose = () => {
    setShowPopup(false);
  };

  // Don't show if authenticated or popup not triggered
  if (!showPopup || isAuthenticated) return null;

  return <SignupPopup onClose={handleClose} />;
}

