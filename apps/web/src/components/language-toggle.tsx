"use client";

import { Button } from "@cm/ui/components/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { switchLocalePath, type Locale } from "@/lib/locale-routing";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeLocale = (nextLocale: Locale) => {
    const queryString = searchParams.toString();
    const nextPath = switchLocalePath(pathname, nextLocale);

    setLocale(nextLocale);
    router.push(queryString ? `${nextPath}?${queryString}` : nextPath);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-white/10 bg-card/50 p-1">
      <Button
        size="sm"
        variant={locale === "es" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => changeLocale("es")}
      >
        ES
      </Button>
      <Button
        size="sm"
        variant={locale === "en" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => changeLocale("en")}
      >
        EN
      </Button>
    </div>
  );
}
