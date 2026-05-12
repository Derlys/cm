"use client";
import { Button } from "@cm/ui/components/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChartColumn, LogOut, Menu, Store, UserRound, Wallet, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { abbreviateAddress, SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import LanguageToggle from "./language-toggle";

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
          router.push("/");
        },
      },
    });
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1460px] items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href="/" className="mr-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition hover:bg-muted">
            <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 rounded-md" />
            <span className="font-black">Connectamind</span>
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

        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-foreground transition hover:bg-muted md:hidden">
          <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 shrink-0 rounded-md" />
          <span className="truncate font-black">Connectamind</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <ModeToggle />
          <UserMenu />
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
              <MobileUserPanel
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
            ) : (
              <>
                <nav className="grid gap-1 text-sm font-medium">
                  <MobileNavLink href="/" onNavigate={closeMenu}>
                    {t("nav.explore")}
                  </MobileNavLink>
                </nav>
                <MobileNavLink href="/login" onNavigate={closeMenu}>
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

function MobileUserPanel({
  balanceLamports,
  balanceLoading,
  creatorLabel,
  exploreLabel,
  libraryLabel,
  locale,
  onNavigate,
  onSignOut,
  publicKey,
  userName,
}: {
  balanceLamports?: number;
  balanceLoading: boolean;
  creatorLabel: string;
  exploreLabel: string;
  libraryLabel: string;
  locale: "en" | "es";
  onNavigate: () => void;
  onSignOut: () => void;
  publicKey: string | null;
  userName: string;
}) {
  const balanceSol = typeof balanceLamports === "number" ? balanceLamports / LAMPORTS_PER_SOL : null;

  return (
    <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/15 text-[#ff9f1c]">
          <UserRound className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-foreground">{userName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {publicKey ? abbreviateAddress(publicKey) : locale === "es" ? "Wallet no conectada" : "Wallet not connected"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-md bg-background/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {locale === "es" ? "Saldo disponible" : "Available balance"}
            </p>
            <p className="mt-1 text-xl font-black tracking-normal text-foreground">
              {formatPanelBalance(balanceSol, balanceLoading, !!publicKey, locale)}
            </p>
          </div>
          <Wallet className="size-5 text-[#22c55e]" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>{locale === "es" ? "Red:" : "Network:"} {SOLANA_NETWORK_LABEL.replace("Solana ", "")}</span>
          <span className="size-2 rounded-full bg-[#22c55e]" />
        </div>
      </div>

      <nav className="grid gap-1 border-t border-border pt-3 text-sm font-medium">
        <MobilePanelLink href="/" icon={<Store className="size-4" />} onNavigate={onNavigate}>
          {exploreLabel}
        </MobilePanelLink>
        <MobilePanelLink href="/library" icon={<BookOpen className="size-4" />} onNavigate={onNavigate}>
          {libraryLabel}
        </MobilePanelLink>
        <MobilePanelLink href="/creator" icon={<ChartColumn className="size-4" />} onNavigate={onNavigate}>
          {creatorLabel}
        </MobilePanelLink>
      </nav>

      <Button className="justify-start text-sm" type="button" variant="destructive" onClick={onSignOut}>
        <LogOut className="size-4" />
        {locale === "es" ? "Cerrar sesion" : "Sign out"}
      </Button>
    </section>
  );
}

function MobilePanelLink({
  children,
  href,
  icon,
  onNavigate,
}: {
  children: React.ReactNode;
  href: Route | "/";
  icon: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-md px-2 py-2.5 text-foreground transition hover:bg-muted"
      href={href}
      onClick={onNavigate}
    >
      <span className="text-[#ff9f1c]">{icon}</span>
      <span>{children}</span>
    </Link>
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

function formatPanelBalance(balanceSol: number | null, loading: boolean, walletConnected: boolean, locale: "en" | "es") {
  if (!walletConnected) {
    return "0.00 SOL";
  }

  if (loading || balanceSol === null) {
    return locale === "es" ? "Cargando..." : "Loading...";
  }

  return `${balanceSol.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
  })} SOL`;
}
