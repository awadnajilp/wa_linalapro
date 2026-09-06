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

    const popupShown = sessionStorage.getItem("signupPopupShown");
    if (popupShown === "true") return;

    // Show after 20 seconds
    const timer = setTimeout(() => {
      setShowPopup(true);
      sessionStorage.setItem("signupPopupShown", "true");
    }, 20000);

    // Show on scroll past half page
    const handleScroll = () => {
      const alreadyShown = sessionStorage.getItem("signupPopupShown");
      if (
        window.scrollY > window.innerHeight * 0.5 &&
        alreadyShown !== "true"
      ) {
        setShowPopup(true);
        sessionStorage.setItem("signupPopupShown", "true");
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);

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

