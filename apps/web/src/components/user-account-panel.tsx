"use client";

import { Button } from "@cm/ui/components/button";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BookOpen, ChartColumn, LogOut, Store, UserRound, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { Locale } from "@/lib/locale-routing";
import { localizePath } from "@/lib/locale-routing";
import { abbreviateAddress, SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";

export default function UserAccountPanel({
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
  locale: Locale;
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
          <span>
            {locale === "es" ? "Red:" : "Network:"} {SOLANA_NETWORK_LABEL.replace("Solana ", "")}
          </span>
          <span className="size-2 rounded-full bg-[#22c55e]" />
        </div>
      </div>

      <nav className="grid gap-1 border-t border-border pt-3 text-sm font-medium">
        <PanelLink href={localizePath(locale, "/")} icon={<Store className="size-4" />} onNavigate={onNavigate}>
          {exploreLabel}
        </PanelLink>
        <PanelLink href={localizePath(locale, "/library")} icon={<BookOpen className="size-4" />} onNavigate={onNavigate}>
          {libraryLabel}
        </PanelLink>
        <PanelLink href={localizePath(locale, "/creator")} icon={<ChartColumn className="size-4" />} onNavigate={onNavigate}>
          {creatorLabel}
        </PanelLink>
      </nav>

      <Button className="justify-start text-sm" type="button" variant="destructive" onClick={onSignOut}>
        <LogOut className="size-4" />
        {locale === "es" ? "Cerrar sesion" : "Sign out"}
      </Button>
    </section>
  );
}

function PanelLink({
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

function formatPanelBalance(balanceSol: number | null, loading: boolean, walletConnected: boolean, locale: Locale) {
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
