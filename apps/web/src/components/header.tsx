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
    <div className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-row items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="mr-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition hover:bg-white/5">
            <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 rounded-md" />
            <span className="hidden font-black sm:inline">Connectamind</span>
          </Link>
          <Link href="/" className="px-3 py-2 text-foreground transition hover:text-[#ff9f1c]">
            {t("nav.explore")}
          </Link>
          {session ? (
            <Link href="/library" className="px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.library")}
            </Link>
          ) : null}
          {session ? (
            <Link href="/creator" className="px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.create")}
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
