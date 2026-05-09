"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const { locale, t } = useI18n();
  const session = authClient.useSession();
  const posts = useQuery(
    orpc.posts.listPublished.queryOptions({
      enabled: !!session.data?.user,
      input: { limit: 20, page: 1 },
    }),
  );

  return (
    <main className="min-h-[calc(100svh-57px)]">
      <div className="cm-shell grid w-full gap-7 lg:grid-cols-[250px_minmax(0,1fr)_320px]">
        <FeedSidebar isSignedIn={!!session.data?.user} locale={locale} userName={session.data?.user.name ?? null} />

        <section className="grid content-start gap-4">
          <div className="cm-hero p-7">
            <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Marketplace" : "Marketplace"}</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-5xl font-black tracking-tight sm:text-6xl">{t("marketing.heroTitle")}</h1>
                <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {t("marketing.heroSubtitle")}
                </p>
              </div>
              {!session.data?.user ? (
                <Link className={buttonVariants({ size: "lg" })} href="/login">
                  {t("common.continueWithGoogle")}
                </Link>
              ) : null}
            </div>
          </div>

          {!session.data?.user ? (
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
              {posts.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
              {posts.data?.data.length === 0 ? (
                <ReaderCard
                  title={locale === "es" ? "No hay publicaciones todavia" : "No listings yet"}
                  eyebrow={locale === "es" ? "Marketplace nuevo" : "Fresh feed"}
                  description={
                    locale === "es"
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
                  className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff9f1c]/50"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Link
                          href={(post.author?.username ? `/u/${post.author.username}` : "/") as Route}
                          className="font-medium text-foreground hover:text-[#ffb24a]"
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
                        <span>{formatPrices(post.prices)}</span>
                      </div>
                      <Link href={post.postUrl as Route} className="block">
                      <h2 className="text-3xl font-black tracking-tight transition group-hover:text-[#ff9f1c]">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="mt-3 line-clamp-3 text-base leading-7 text-muted-foreground">
                        {post.content ??
                          (locale === "es"
                            ? "Compra requerida para ver la publicacion completa."
                            : "Purchase required to read the full listing.")}
                      </p>
                    </div>
                    <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                      {locale === "es" ? "Ver publicacion" : "View listing"}
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
        <aside className="hidden lg:block">
          <section className="cm-card">
            <header className="border-b border-border px-6 py-5">
              <h2 className="text-3xl font-black tracking-tight">{locale === "es" ? "Conversaciones activas" : "Active discussions"}</h2>
            </header>
            <div className="divide-y divide-border">
              {[
                locale === "es" ? "Como elegir una buena automatizacion AI" : "How to choose a reliable AI workflow",
                locale === "es" ? "Que monetiza mejor: acceso unico o suscripcion" : "What sells better: single access or subscription",
                locale === "es" ? "Errores comunes al vender contenido premium" : "Common mistakes selling premium content",
              ].map((item) => (
                <article key={item} className="px-6 py-5">
                  <p className="text-lg leading-8 text-foreground">{item}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{locale === "es" ? "Comunidad" : "Community"}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function FeedSidebar({ isSignedIn, locale, userName }: { isSignedIn: boolean; locale: "en" | "es"; userName: string | null }) {
  return (
    <aside className="hidden content-start gap-3 lg:grid">
      <div className="cm-card p-5">
        <h2 className="text-xl font-black tracking-normal">Connectamind</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {locale === "es" ? "Publicaciones premium de creadores independientes." : "Premium creator listings."}
        </p>
      </div>
      <nav className="cm-card grid gap-1 p-3 text-sm">
        <Link className="rounded-md px-3 py-2 text-foreground hover:bg-muted" href="/">
          {locale === "es" ? "Marketplace" : "Marketplace"}
        </Link>
        {isSignedIn ? (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/library">
            {locale === "es" ? "Mi biblioteca" : "Library"}
          </Link>
        ) : null}
        {isSignedIn ? (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/creator">
            {locale === "es" ? "Panel de creador" : "Creator Studio"}
          </Link>
        ) : (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground" href="/login">
            {locale === "es" ? "Iniciar sesion" : "Sign in"}
          </Link>
        )}
      </nav>
      <div className="cm-card p-4 text-sm">
        <p className="font-medium">{isSignedIn ? (locale === "es" ? "Activa" : "Active") : locale === "es" ? "Primero explora" : "Explore first"}</p>
        <p className="mt-1 text-muted-foreground">
          {isSignedIn ? userName : locale === "es" ? "Compra primero, crea despues." : "Buy first, create later."}
        </p>
      </div>
    </aside>
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
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="font-mono text-xs uppercase text-[#ff9f1c]">{eyebrow}</p>
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
          ? "rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-0.5 font-mono text-[11px] uppercase text-[#ffb24a]"
          : "rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[11px] uppercase text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

function formatPrices(prices: Array<{ amount: string; token: string }>) {
  if (!prices.length) {
    return "No price";
  }

  return prices.map((price) => `${price.amount} ${price.token}`).join(" / ");
}
