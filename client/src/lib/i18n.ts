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

import { create } from "zustand";
import { persist } from "zustand/middleware";

import enTranslations from "./translations/en.json";
import esTranslations from "./translations/es.json";
import frTranslations from "./translations/fr.json";
import deTranslations from "./translations/de.json";
import ptTranslations from "./translations/pt.json";
import arTranslations from "./translations/ar.json";
import hiTranslations from "./translations/hi.json";
import zhTranslations from "./translations/zh.json";

export interface LanguageConfig {
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flag: string;
}

const staticLanguages: Record<string, LanguageConfig> = {
  en: { name: "English", nativeName: "English", direction: "ltr", flag: "🇬🇧" },
  ar: { name: "العربية (السعودية)", nativeName: "العربية", direction: "rtl", flag: "🇸🇦" },
};

const staticTranslations: Record<string, any> = {
  en: enTranslations,
  ar: arTranslations,
};

interface I18nState {
  language: string;
  languages: Record<string, LanguageConfig>;
  translationsCache: Record<string, any>;
  isLoadingLanguages: boolean;
  setLanguage: (language: string) => Promise<void>;
  t: (path: string, variables?: Record<string, string | number>) => string;
  fetchEnabledLanguages: () => Promise<void>;
  loadTranslations: (code: string) => Promise<any>;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: "en",
      languages: { ...staticLanguages },
      translationsCache: { ...staticTranslations },
      isLoadingLanguages: false,

      fetchEnabledLanguages: async () => {
        try {
          set({ isLoadingLanguages: true });
          const response = await fetch("/api/languages/enabled");
          if (!response.ok) throw new Error("Failed to fetch languages");
          const data = await response.json();

          const dynamicLanguages: Record<string, LanguageConfig> = {
            en: { name: "English", nativeName: "English", direction: "ltr", flag: "🇬🇧" },
            ar: { name: "العربية (السعودية)", nativeName: "العربية", direction: "rtl", flag: "🇸🇦" },
          };

          if (Array.isArray(data)) {
            for (const lang of data) {
              if (lang && (lang.code === "en" || lang.code === "ar")) {
                dynamicLanguages[lang.code] = {
                  name: lang.code === "ar" ? "العربية (السعودية)" : (lang.name || "English"),
                  nativeName: lang.code === "ar" ? "العربية" : (lang.nativeName || "English"),
                  direction: lang.direction || (lang.code === "ar" ? "rtl" : "ltr"),
                  flag: lang.code === "ar" ? "🇸🇦" : (lang.icon || "🇬🇧"),
                };
              }
            }
          }

          const currentLang = get().language;
          const validLang = (currentLang === "ar" || currentLang === "en") ? currentLang : "en";

          set({ languages: dynamicLanguages, language: validLang, isLoadingLanguages: false });

          const langConfig = dynamicLanguages[validLang] || staticLanguages[validLang] || staticLanguages.en;
          if (langConfig && typeof document !== "undefined") {
            document.documentElement.dir = langConfig.direction;
            document.documentElement.lang = validLang;
          }
        } catch (error) {
          console.error("Failed to fetch languages, using static fallback:", error);
          const currentLang = get().language;
          const validLang = (currentLang === "ar" || currentLang === "en") ? currentLang : "en";
          set({ languages: { ...staticLanguages }, language: validLang, isLoadingLanguages: false });
        }
      },

      loadTranslations: async (code: string) => {
        const targetCode = (code === "ar" || code === "en") ? code : "en";
        const cache = get().translationsCache;
        if (cache[targetCode]) return cache[targetCode];

        try {
          const response = await fetch(`/api/languages/translations/${targetCode}`);
          if (!response.ok) throw new Error("Failed to fetch translations");
          const translations = await response.json();

          set((state) => ({
            translationsCache: { ...state.translationsCache, [targetCode]: translations },
          }));

          return translations;
        } catch (error) {
          console.error(`Failed to load translations for ${targetCode}:`, error);
          const fallback = staticTranslations[targetCode] || staticTranslations.en;
          set((state) => ({
            translationsCache: { ...state.translationsCache, [targetCode]: fallback },
          }));
          return fallback;
        }
      },

      setLanguage: async (language: string) => {
        const targetLang = (language === "ar" || language === "en") ? language : "en";
        const state = get();
        let translations = state.translationsCache[targetLang];

        if (!translations) {
          translations = await state.loadTranslations(targetLang);
        }

        set({ language: targetLang });

        const langConfig = state.languages[targetLang] || staticLanguages[targetLang] || staticLanguages.en;
        if (langConfig && typeof document !== "undefined") {
          document.documentElement.dir = langConfig.direction;
          document.documentElement.lang = targetLang;
        }
      },

      t: (path: string, variables?: Record<string, string | number>) => {
        const state = get();
        const activeLang = (state.language === "ar" || state.language === "en") ? state.language : "en";
        const currentTranslations =
          state.translationsCache[activeLang] ||
          staticTranslations[activeLang] ||
          staticTranslations.en;

        const keys = path.split(".");
        let value: any = currentTranslations;

        for (const key of keys) {
          value = value?.[key];
          if (value === undefined || value === null) break;
        }

        // Fallback to English if not found in active language
        if (value === undefined || value === null) {
          let enValue: any = staticTranslations.en;
          for (const key of keys) {
            enValue = enValue?.[key];
            if (enValue === undefined || enValue === null) break;
          }
          if (enValue !== undefined && enValue !== null) {
            value = enValue;
          }
        }

        let result = (value !== undefined && value !== null) ? value : path;

        if (variables && typeof result === "string") {
          Object.keys(variables).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            result = result.replace(regex, String(variables[key]));
          });
        }

        return result;
      },
    }),
    {
      name: "i18n-storage",
      partialize: (state) => ({ language: (state.language === "ar" || state.language === "en") ? state.language : "en" }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.language !== "ar" && state.language !== "en") {
            state.language = "en";
          }
          const langConfig = staticLanguages[state.language] || staticLanguages.en;
          if (typeof document !== "undefined") {
            document.documentElement.dir = langConfig.direction;
            document.documentElement.lang = state.language;
          }
        }
      },
    }
  )
);

export function useTranslation() {
  const { t, language, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages } = useI18n();
  const safeLang = (language === "ar" || language === "en") ? language : "en";
  return { t, language: safeLang, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages };
}

export type Language = string;

