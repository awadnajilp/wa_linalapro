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

import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
  console.log = () => {};
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught application error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1e293b", textAlign: "center", background: "#f8fafc" }}>
          <div style={{ maxWidth: "420px", background: "#ffffff", padding: "2rem", borderRadius: "1.25rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "#0f172a" }}>Linala WhatsApp CRM</h2>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              The page encountered an unexpected issue while loading on this device.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{ width: "100%", padding: "0.75rem 1.25rem", background: "#9333ea", color: "#fff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 4px 12px rgba(147, 51, 234, 0.25)" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
