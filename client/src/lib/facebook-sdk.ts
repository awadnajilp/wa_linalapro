/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * Facebook JavaScript SDK Loader & Auth Helper
 * ============================================================
 */

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

let fbSdkPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not defined"));
  }

  if (window.FB) {
    return Promise.resolve();
  }

  if (fbSdkPromise) {
    return fbSdkPromise;
  }

  fbSdkPromise = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: "v20.0",
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    const scriptId = "facebook-jssdk";
    if (document.getElementById(scriptId)) {
      return;
    }

    const js = document.createElement("script");
    js.id = scriptId;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.async = true;
    js.defer = true;
    js.onerror = (e) => {
      fbSdkPromise = null;
      reject(new Error("Failed to load Facebook SDK"));
    };

    document.head.appendChild(js);
  });

  return fbSdkPromise;
}

export async function loginWithFacebook(appId: string, configId?: string): Promise<{ accessToken: string }> {
  await loadFacebookSdk(appId);

  return new Promise<{ accessToken: string }>((resolve, reject) => {
    if (!window.FB) {
      return reject(new Error("Facebook SDK failed to initialize"));
    }

    const loginOptions: any = {
      return_scopes: true,
    };

    if (configId && configId.trim().length > 0) {
      loginOptions.config_id = configId.trim();
      loginOptions.response_type = "token";
    } else {
      loginOptions.scope = "public_profile,email";
    }

    window.FB.login(
      (response: any) => {
        if (response.authResponse && response.authResponse.accessToken) {
          resolve({
            accessToken: response.authResponse.accessToken,
          });
        } else if (response.status === "not_authorized") {
          reject(new Error("Facebook login was not authorized"));
        } else {
          reject(new Error(response.error?.message || "Facebook login was cancelled or closed"));
        }
      },
      loginOptions
    );
  });
}
