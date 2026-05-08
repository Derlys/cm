"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "es";

const STORAGE_KEY = "cm_locale";

const messages = {
  en: {
    nav: {
      create: "Creator Studio",
      explore: "Marketplace",
      library: "Library",
    },
    common: {
      continueWithGoogle: "Continue with Google",
      loading: "Loading...",
      noPrice: "No price",
      read: "Read",
      signIn: "Sign in",
    },
  },
  es: {
    nav: {
      create: "Panel de creador",
      explore: "Marketplace",
      library: "Mi biblioteca",
    },
    common: {
      continueWithGoogle: "Continuar con Google",
      loading: "Cargando...",
      noPrice: "Sin precio",
      read: "Leer",
      signIn: "Iniciar sesion",
    },
  },
} as const;

type MessageTree = (typeof messages)["en"];
type MessageKey = NestedKeyOf<MessageTree>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const t = (key: MessageKey) => resolveMessage(messages[locale], key);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & string];

function resolveMessage(tree: MessageTree, key: MessageKey) {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") {
      return undefined;
    }

    return (acc as Record<string, unknown>)[part];
  }, tree);

  if (typeof value !== "string") {
    return key;
  }

  return value;
}

