"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "es";
type MessageSchema = {
  common: {
    continueWithGoogle: string;
    loading: string;
    noPrice: string;
    read: string;
    signIn: string;
  };
  marketing: {
    heroTitle: string;
    heroSubtitle: string;
  };
  library: {
    nothingUnlockedEyebrow: string;
    nothingUnlockedTitle: string;
  };
  creator: {
    yourAccount: string;
    yourPublicProfile: string;
    receivingWallet: string;
    ready: string;
    pending: string;
  };
  nav: {
    create: string;
    explore: string;
    library: string;
  };
};

const STORAGE_KEY = "cm_locale";

const messages: Record<Locale, MessageSchema> = {
  en: {
    marketing: {
      heroTitle: "Connectamind: think, connect, and create",
      heroSubtitle: "Discover creators, unlock premium ideas, and turn your knowledge into income.",
    },
    library: {
      nothingUnlockedEyebrow: "Nothing unlocked yet",
      nothingUnlockedTitle: "No unlocked posts yet",
    },
    creator: {
      yourAccount: "Your account",
      yourPublicProfile: "Your public profile",
      receivingWallet: "Where you receive payments",
      ready: "Ready",
      pending: "Pending",
    },
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
    marketing: {
      heroTitle: "Connectamind: piensa, conecta y crea",
      heroSubtitle: "Descubre creadores, desbloquea ideas premium y convierte tu conocimiento en ingresos.",
    },
    library: {
      nothingUnlockedEyebrow: "Sin compras aun",
      nothingUnlockedTitle: "Aun no compraste publicaciones",
    },
    creator: {
      yourAccount: "Tu cuenta",
      yourPublicProfile: "Tu perfil visible",
      receivingWallet: "Donde recibes pagos",
      ready: "Listo",
      pending: "Pendiente",
    },
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
};

type MessageTree = MessageSchema;
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
