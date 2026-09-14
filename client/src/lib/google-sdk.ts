/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Google Identity Services (GSI) Loader & Auth Helper
 * ============================================================
 */

declare global {
  interface Window {
    google?: any;
  }
}

let googleSdkPromise: Promise<void> | null = null;

export function loadGoogleSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not defined"));
  }

  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleSdkPromise) {
    return googleSdkPromise;
  }

  googleSdkPromise = new Promise<void>((resolve, reject) => {
    const scriptId = "google-gsi-client";
    if (document.getElementById(scriptId)) {
      if (window.google?.accounts) {
        return resolve();
      }
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      googleSdkPromise = null;
      reject(new Error("Failed to load Google Identity Services SDK"));
    };

    document.head.appendChild(script);
  });

  return googleSdkPromise;
}

export async function loginWithGooglePopup(clientId: string): Promise<{ credential?: string; accessToken?: string }> {
  await loadGoogleSdk();

  return new Promise<{ credential?: string; accessToken?: string }>((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error("Google Identity SDK is not available"));
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || "Google login failed"));
          } else if (response.access_token) {
            resolve({
              accessToken: response.access_token,
            });
          } else {
            reject(new Error("No access token received from Google"));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "Google login was cancelled or closed"));
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err: any) {
      reject(err);
    }
  });
}
