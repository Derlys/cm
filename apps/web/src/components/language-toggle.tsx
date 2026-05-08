"use client";

import { Button } from "@cm/ui/components/button";

import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-md border border-white/10 bg-card/50 p-1">
      <Button
        size="sm"
        variant={locale === "es" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setLocale("es")}
      >
        ES
      </Button>
      <Button
        size="sm"
        variant={locale === "en" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
    </div>
  );
}

