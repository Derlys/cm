"use client";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import LanguageToggle from "./language-toggle";

export default function Header() {
  const { data: session } = authClient.useSession();
  const { t } = useI18n();

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1460px] flex-wrap items-center justify-between gap-2 px-3 py-3.5 sm:px-4">
        <nav className="order-2 flex w-full items-center gap-1 overflow-x-auto text-sm font-medium sm:order-1 sm:w-auto">
          <Link href="/" className="mr-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition hover:bg-muted">
            <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 rounded-md" />
            <span className="hidden font-black sm:inline">Connectamind</span>
          </Link>
          <Link href="/" className="whitespace-nowrap px-3 py-2 text-foreground transition hover:text-[#ff9f1c]">
            {t("nav.explore")}
          </Link>
          {session ? (
            <Link href="/library" className="whitespace-nowrap px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.library")}
            </Link>
          ) : null}
          {session ? (
            <Link href="/creator" className="whitespace-nowrap px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.create")}
            </Link>
          ) : null}
        </nav>
        <div className="order-1 ml-auto flex items-center gap-2 sm:order-2">
          <LanguageToggle />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
