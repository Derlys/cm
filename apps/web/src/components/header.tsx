"use client";
import { Button } from "@cm/ui/components/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { localizePath } from "@/lib/locale-routing";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import LanguageToggle from "./language-toggle";
import UserAccountPanel from "./user-account-panel";

export default function Header() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { locale, t } = useI18n();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const publicKey = wallet.publicKey;
  const closeMenu = () => setMenuOpen(false);
  const balance = useQuery({
    enabled: !!session?.user && !!publicKey,
    queryFn: async () => {
      if (!publicKey) {
        return 0;
      }

      return connection.getBalance(publicKey);
    },
    queryKey: ["header-wallet-balance", publicKey?.toBase58()],
    refetchInterval: 30_000,
  });

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          closeMenu();
          router.push(localizePath(locale, "/"));
        },
      },
    });
  };

  const accountPanel = session ? (
    <UserAccountPanel
      balanceLamports={balance.data}
      balanceLoading={balance.isLoading}
      creatorLabel={t("nav.create")}
      exploreLabel={t("nav.explore")}
      libraryLabel={t("nav.library")}
      locale={locale}
      onNavigate={closeMenu}
      onSignOut={signOut}
      publicKey={publicKey?.toBase58() ?? null}
      userName={session.user.name}
    />
  ) : null;

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1460px] items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href={localizePath(locale, "/")} className="mr-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition hover:bg-muted">
            <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 rounded-md" />
            <span className="font-black">Connectamind</span>
          </Link>
          <Link href={localizePath(locale, "/")} className="whitespace-nowrap px-3 py-2 text-foreground transition hover:text-[#ff9f1c]">
            {t("nav.explore")}
          </Link>
          {session ? (
            <Link href={localizePath(locale, "/library")} className="whitespace-nowrap px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.library")}
            </Link>
          ) : null}
          {session ? (
            <Link href={localizePath(locale, "/creator")} className="whitespace-nowrap px-3 py-2 text-muted-foreground transition hover:text-foreground">
              {t("nav.create")}
            </Link>
          ) : null}
        </nav>

        <Link href={localizePath(locale, "/")} className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-foreground transition hover:bg-muted md:hidden">
          <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 shrink-0 rounded-md" />
          <span className="truncate font-black">Connectamind</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <ModeToggle />
          <UserMenu accountPanel={accountPanel} />
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <ModeToggle />
          <Button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 top-[57px] z-40 md:hidden">
          <button
            aria-label="Cerrar menu"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            type="button"
            onClick={closeMenu}
          />
          <aside
            aria-modal="true"
            className="absolute right-0 top-0 grid h-[calc(100svh-57px)] w-[min(22rem,calc(100vw-1.5rem))] content-start gap-5 overflow-y-auto border-l border-border bg-background p-4 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 shrink-0 rounded-md" />
                <span className="truncate font-black">Connectamind</span>
              </div>
              <Button aria-label="Cerrar menu" size="icon" type="button" variant="outline" onClick={closeMenu}>
                <X className="size-5" />
              </Button>
            </div>

            {session ? (
              accountPanel
            ) : (
              <>
                <nav className="grid gap-1 text-sm font-medium">
                  <MobileNavLink href={localizePath(locale, "/")} onNavigate={closeMenu}>
                    {t("nav.explore")}
                  </MobileNavLink>
                </nav>
                <MobileNavLink href={localizePath(locale, "/login")} onNavigate={closeMenu}>
                  {t("common.signIn")}
                </MobileNavLink>
              </>
            )}

            <div className="grid gap-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Preferencias</p>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageToggle />
                <ModeToggle />
              </div>
            </div>

            {!session ? (
              <div className="grid gap-3 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Cuenta</p>
                <div className="[&>a]:w-full [&_button]:min-w-0 [&_button]:w-full [&_button]:justify-center [&_button]:overflow-hidden [&_button]:text-ellipsis">
                  <UserMenu />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavLink({
  children,
  href,
  onNavigate,
}: {
  children: React.ReactNode;
  href: Route | "/";
  onNavigate: () => void;
}) {
  return (
    <Link
      className="rounded-md px-3 py-3 text-foreground transition hover:bg-muted"
      href={href}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}
