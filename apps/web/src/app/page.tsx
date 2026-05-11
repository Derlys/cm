"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { Input } from "@cm/ui/components/input";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChartColumn, ChevronRight, Library, Search, Store, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";
import { useI18n } from "@/lib/i18n";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const { locale, t } = useI18n();
  const session = authClient.useSession();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [search, setSearch] = useState("");
  const signedIn = !!session.data?.user;
  const publicKey = wallet.publicKey;
  const normalizedSearch = search.trim();

  const posts = useQuery(
    orpc.posts.listPublished.queryOptions({
      enabled: signedIn,
      input: { limit: 20, page: 1, search: normalizedSearch || undefined },
    }),
  );
  const balance = useQuery({
    enabled: signedIn && !!publicKey,
    queryFn: async () => {
      if (!publicKey) {
        return 0;
      }

      return connection.getBalance(publicKey);
    },
    queryKey: ["wallet-balance", publicKey?.toBase58()],
    refetchInterval: 30_000,
  });

  return (
    <main className="min-h-[calc(100svh-57px)] overflow-hidden">
      <div className="cm-home-shell">
        <FeedSidebar
          balanceLamports={balance.data}
          balanceLoading={balance.isLoading}
          isSignedIn={signedIn}
          locale={locale}
          userName={session.data?.user.name ?? null}
          walletConnected={!!publicKey}
        />

        <section className="grid min-w-0 content-start gap-5">
          <section className="cm-hero p-5 sm:p-7">
            <p className="font-mono text-xs font-semibold uppercase text-[#ff8a00]">Marketplace</p>
            <div className="mt-4 grid gap-5">
              <div>
                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl">
                  {locale === "es" ? "Descubre conocimiento que transforma" : "Discover knowledge that transforms"}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {locale === "es"
                    ? "Apoya a creadores independientes y accede a contenido premium de calidad."
                    : "Support independent creators and access high-quality premium content."}
                </p>
              </div>
              <label className="relative block max-w-3xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label={locale === "es" ? "Buscar publicaciones" : "Search listings"}
                  className="h-12 rounded-lg border-[#dfe3ea] bg-background pl-11 text-sm shadow-sm"
                  disabled={!signedIn}
                  placeholder={locale === "es" ? "Buscar publicaciones..." : "Search listings..."}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {!signedIn ? (
                <div>
                  <Link className={buttonVariants({ size: "lg" })} href="/login">
                    {t("common.continueWithGoogle")}
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          {!signedIn ? (
            <ReaderCard
              title={locale === "es" ? "Inicia sesion para comenzar a explorar" : "Sign in to start reading"}
              eyebrow={locale === "es" ? "Tu cuenta" : "Your account"}
              description={
                locale === "es"
                  ? "Accede con Google para comprar acceso, guardar tu biblioteca y publicar cuando quieras."
                  : "Sign in with Google to buy access, keep a library, and publish when ready."
              }
              action={
                <Link className={buttonVariants()} href="/login">
                  {t("common.continueWithGoogle")}
                </Link>
              }
            />
          ) : (
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-normal">
                  {locale === "es" ? "Publicaciones destacadas" : "Featured listings"}
                </h2>
                <Link className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-[#ff8a00]" href="/">
                  {locale === "es" ? "Ver todas" : "View all"}
                  <ChevronRight className="size-4" />
                </Link>
              </div>

              {posts.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
              {posts.data?.data.length === 0 ? (
                <ReaderCard
                  title={locale === "es" ? "No hay publicaciones todavia" : "No listings yet"}
                  eyebrow={locale === "es" ? "Marketplace nuevo" : "Fresh feed"}
                  description={
                    normalizedSearch
                      ? locale === "es"
                        ? "No encontramos publicaciones con esa busqueda."
                        : "No listings match that search."
                      : locale === "es"
                        ? "Las publicaciones en vitrina aparecen cuando el creador define precio y wallet verificada."
                        : "Live listings appear after creators set price and verified wallet."
                  }
                  action={
                    <Link className={buttonVariants({ variant: "outline" })} href="/creator">
                      {locale === "es" ? "Crear primera publicacion" : "Create first listing"}
                    </Link>
                  }
                />
              ) : null}
              {posts.data?.data.map((post) => (
                <article
                  key={post.id}
                  className="cm-surface group rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff8a00]/50 hover:shadow-md sm:p-6"
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Link
                          href={(post.author?.username ? `/u/${post.author.username}` : "/") as Route}
                          className="font-medium text-foreground hover:text-[#ff8a00]"
                        >
                          {post.author?.username ? `@${post.author.username}` : "Unknown author"}
                        </Link>
                        <StatusBadge tone={post.content ? "success" : "muted"}>
                          {post.content
                            ? locale === "es"
                              ? "Comprada"
                              : "Unlocked"
                            : locale === "es"
                              ? "De pago"
                              : "Premium"}
                        </StatusBadge>
                        <span>{formatPrices(post.prices, locale)}</span>
                      </div>
                      <Link href={post.postUrl as Route} className="block">
                        <h3 className="text-2xl font-black leading-tight tracking-normal transition group-hover:text-[#ff8a00]">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground sm:text-base">
                        {post.content ??
                          (locale === "es"
                            ? "Compra requerida para ver la publicacion completa."
                            : "Purchase required to read the full listing.")}
                      </p>
                    </div>
                    <Link
                      className={buttonVariants({
                        className: "cm-responsive-action h-10 rounded-md bg-[#ff7a00] px-4 text-sm text-white hover:bg-[#f06d00]",
                        size: "lg",
                      })}
                      href={post.postUrl as Route}
                    >
                      {post.content
                        ? locale === "es"
                          ? "Leer publicacion"
                          : "Read listing"
                        : locale === "es"
                          ? "Ver publicacion"
                          : "View listing"}
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}

          <MobileAccountSnapshot
            balanceLamports={balance.data}
            balanceLoading={balance.isLoading}
            isSignedIn={signedIn}
            locale={locale}
            userName={session.data?.user.name ?? null}
            walletConnected={!!publicKey}
          />
        </section>
      </div>
    </main>
  );
}

function FeedSidebar({
  balanceLamports,
  balanceLoading,
  isSignedIn,
  locale,
  userName,
  walletConnected,
}: {
  balanceLamports?: number;
  balanceLoading: boolean;
  isSignedIn: boolean;
  locale: "en" | "es";
  userName: string | null;
  walletConnected: boolean;
}) {
  return (
    <aside className="hidden content-start gap-5 lg:grid">
      <nav className="cm-card grid gap-2 p-5 text-base">
        <SidebarLink active href="/" icon={<Store className="size-5" />}>
          Marketplace
        </SidebarLink>
        {isSignedIn ? (
          <SidebarLink href="/library" icon={<BookOpen className="size-5" />}>
            {locale === "es" ? "Mi biblioteca" : "Library"}
          </SidebarLink>
        ) : null}
        {isSignedIn ? (
          <SidebarLink href="/creator" icon={<ChartColumn className="size-5" />}>
            {locale === "es" ? "Panel de creador" : "Creator Studio"}
          </SidebarLink>
        ) : (
          <SidebarLink href="/login" icon={<Library className="size-5" />}>
            {locale === "es" ? "Iniciar sesion" : "Sign in"}
          </SidebarLink>
        )}
      </nav>

      <BalanceCard
        balanceLamports={balanceLamports}
        balanceLoading={balanceLoading}
        locale={locale}
        walletConnected={walletConnected}
      />

      <AccountSummaryCard isSignedIn={isSignedIn} locale={locale} userName={userName} />
    </aside>
  );
}

function MobileAccountSnapshot({
  balanceLamports,
  balanceLoading,
  isSignedIn,
  locale,
  userName,
  walletConnected,
}: {
  balanceLamports?: number;
  balanceLoading: boolean;
  isSignedIn: boolean;
  locale: "en" | "es";
  userName: string | null;
  walletConnected: boolean;
}) {
  return (
    <section className="grid gap-3 lg:hidden sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
      <BalanceCard
        balanceLamports={balanceLamports}
        balanceLoading={balanceLoading}
        compact
        locale={locale}
        walletConnected={walletConnected}
      />
      <AccountSummaryCard compact isSignedIn={isSignedIn} locale={locale} userName={userName} />
    </section>
  );
}

function BalanceCard({
  balanceLamports,
  balanceLoading,
  compact,
  locale,
  walletConnected,
}: {
  balanceLamports?: number;
  balanceLoading: boolean;
  compact?: boolean;
  locale: "en" | "es";
  walletConnected: boolean;
}) {
  const balanceSol = typeof balanceLamports === "number" ? balanceLamports / LAMPORTS_PER_SOL : null;

  return (
    <section className="cm-card overflow-hidden">
      <div className={compact ? "p-4" : "p-5"}>
        <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>
          {locale === "es" ? "Saldo disponible" : "Available balance"}
        </p>
        <p className={compact ? "mt-2 text-2xl font-black tracking-normal text-foreground" : "mt-3 text-3xl font-black tracking-normal text-foreground"}>
          {formatBalance(balanceSol, balanceLoading, walletConnected, locale)}
        </p>
        <p className={compact ? "mt-1 text-xs text-muted-foreground" : "mt-2 text-sm text-muted-foreground"}>
          {walletConnected
            ? locale === "es"
              ? "Balance real de wallet"
              : "Live wallet balance"
            : locale === "es"
              ? "Conecta wallet para ver saldo"
              : "Connect wallet to view balance"}
        </p>
        <Link
          className={buttonVariants({
            className: compact
              ? "mt-4 h-9 w-full rounded-md bg-[#ff7a00] text-xs text-white hover:bg-[#f06d00]"
              : "mt-5 h-11 w-full rounded-md bg-[#ff7a00] text-sm text-white hover:bg-[#f06d00]",
            size: compact ? "default" : "lg",
          })}
          href="/creator"
        >
          {locale === "es" ? "Retirar fondos" : "Withdraw funds"}
        </Link>
      </div>
      <div className={compact ? "flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs" : "flex items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm"}>
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Wallet className={compact ? "size-4 text-[#22c55e]" : "size-5 text-[#22c55e]"} />
          {locale === "es" ? "Red:" : "Network:"} {SOLANA_NETWORK_LABEL.replace("Solana ", "")}
        </span>
        <span className="size-2 rounded-full bg-[#22c55e]" aria-label={locale === "es" ? "Red activa" : "Network active"} />
      </div>
    </section>
  );
}

function AccountSummaryCard({
  compact,
  isSignedIn,
  locale,
  userName,
}: {
  compact?: boolean;
  isSignedIn: boolean;
  locale: "en" | "es";
  userName: string | null;
}) {
  return (
    <section className={compact ? "cm-muted-surface rounded-lg border p-3 text-xs" : "cm-muted-surface rounded-lg border p-4 text-sm"}>
      <p className="font-semibold">
        {isSignedIn ? (locale === "es" ? "Cuenta activa" : "Active account") : locale === "es" ? "Primero explora" : "Explore first"}
      </p>
      <p className="mt-1 text-muted-foreground">
        {isSignedIn ? userName : locale === "es" ? "Compra primero, crea despues." : "Buy first, create later."}
      </p>
    </section>
  );
}

function SidebarLink({
  active,
  children,
  href,
  icon,
}: {
  active?: boolean;
  children: React.ReactNode;
  href: Route | "/";
  icon: React.ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "flex items-center gap-4 rounded-md px-3 py-3 font-bold text-[#ff7a00]"
          : "flex items-center gap-4 rounded-md px-3 py-3 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      }
      href={href}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function ReaderCard({
  action,
  description,
  eyebrow,
  title,
}: {
  action: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="cm-surface rounded-lg border p-6 shadow-sm">
      <p className="font-mono text-xs uppercase text-[#ff8a00]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-normal">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: "muted" | "success" }) {
  return (
    <span
      className={
        tone === "success"
          ? "rounded-full border border-[#ff8a00]/30 bg-[#ff8a00]/10 px-2.5 py-1 font-mono text-[11px] uppercase text-[#c56800]"
          : "rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] uppercase text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

function formatBalance(balanceSol: number | null, loading: boolean, walletConnected: boolean, locale: "en" | "es") {
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

function formatPrices(prices: Array<{ amount: string; token: string }>, locale: "en" | "es") {
  if (!prices.length) {
    return locale === "es" ? "Sin precio" : "No price";
  }

  return prices.map((price) => `${price.amount} ${price.token.toUpperCase()}`).join(" / ");
}
