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

import { useEffect } from "react";
import { useLocation } from "wouter";

export function useGlobalNotifications(
  socket: any,
  unreadCount: number
) {
  const [location] = useLocation();

  // 🔔 Browser title update (ONLY on inbox or internal dashboard pages when unreadCount exists)
  useEffect(() => {
    // Do not override landing page or public pages title
    const isPublicPage =
      location === "/" ||
      location === "/pricing" ||
      location === "/features" ||
      location === "/use-cases" ||
      location === "/about" ||
      location === "/contact" ||
      location === "/careers" ||
      location === "/login" ||
      location === "/signup" ||
      location === "/terms" ||
      location === "/privacy-policy";

    if (isPublicPage) return;

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Team Inbox`;
    }
  }, [unreadCount, location]);

  // 🔔 Browser notification (Guarded safely against missing Notification API on mobile)
  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      try {
        const message =
          typeof data?.content === "string"
            ? data.content
            : "New message";

        const hasNotificationSupport =
          typeof window !== "undefined" &&
          "Notification" in window &&
          typeof window.Notification !== "undefined";

        if (!hasNotificationSupport) return;

        const shouldNotify =
          window.Notification.permission === "granted" &&
          typeof document !== "undefined" &&
          typeof document.hasFocus === "function" &&
          !document.hasFocus();

        if (shouldNotify) {
          new window.Notification("New WhatsApp Message", {
            body: message,
            icon: "/whatsapp-icon.png",
          });
        }
      } catch (err) {
        console.warn("Notification error ignored:", err);
      }
    };

    socket.on("new-message", handler);
    return () => {
      try {
        socket.off("new-message", handler);
      } catch {}
    };
  }, [socket, location]);
}
