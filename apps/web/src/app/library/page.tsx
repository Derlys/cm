"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { orpc } from "@/utils/orpc";

export default function LibraryPage() {
  const { locale, t } = useI18n();
  const session = authClient.useSession();
  const purchased = useQuery(
    orpc.posts.listPurchased.queryOptions({
      enabled: !!session.data?.user,
      input: { limit: 50, page: 1 },
    }),
  );

  return (
    <main className="min-h-[calc(100svh-57px)] bg-[radial-gradient(circle_at_top_right,rgba(255,159,28,0.1),transparent_32rem)]">
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6">
        <section className="rounded-lg border border-white/10 bg-card/70 p-5">
          <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Mi biblioteca" : "Library"}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-normal">{locale === "es" ? "Publicaciones compradas" : "Unlocked posts"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {locale === "es"
                  ? "Todo lo que compraste con tu wallet de Solana, listo para leer de nuevo."
                  : "Everything you have unlocked with your Solana wallet, ready to read again."}
              </p>
            </div>
            <Link className={buttonVariants({ variant: "outline" })} href="/">
              {locale === "es" ? "Volver al marketplace" : "Back to feed"}
            </Link>
          </div>
        </section>

        {!session.data?.user ? (
          <section className="rounded-lg border border-white/10 bg-card/80 p-6">
            <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Tu cuenta" : "Your account"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-normal">{locale === "es" ? "Inicia sesion para ver tu biblioteca" : "Sign in to see your library"}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {locale === "es"
                ? "Tus publicaciones compradas estan vinculadas a tu cuenta de Google."
                : "Your unlocked posts are tied to your Google account."}
            </p>
            <div className="mt-5">
              <Link className={buttonVariants()} href="/login">
                {t("common.continueWithGoogle")}
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-3">
            {purchased.isLoading ? <p className="text-sm text-muted-foreground">{locale === "es" ? "Cargando biblioteca..." : "Loading library..."}</p> : null}
            {purchased.data?.data.length === 0 ? (
              <section className="rounded-lg border border-white/10 bg-card/80 p-6">
                <p className="font-mono text-xs uppercase text-[#ff9f1c]">Nothing unlocked yet</p>
                <h2 className="mt-2 text-2xl font-black tracking-normal">{locale === "es" ? "Aun no compraste publicaciones" : "No unlocked posts yet"}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {locale === "es"
                    ? "Explora el marketplace, abre una publicacion premium y compra acceso para verla aqui."
                    : "Browse the feed, open a locked post, and pay with your Devnet wallet to add it here."}
                </p>
                <div className="mt-5">
                  <Link className={buttonVariants()} href="/">
                    {locale === "es" ? "Explorar marketplace" : "Browse feed"}
                  </Link>
                </div>
              </section>
            ) : null}
            {purchased.data?.data.map((post) => (
              <article key={post.id} className="rounded-lg border border-white/10 bg-card/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Link
                        href={(post.author?.username ? `/u/${post.author.username}` : "/") as Route}
                        className="font-medium text-foreground hover:text-[#ffb24a]"
                      >
                        {post.author?.username ? `@${post.author.username}` : "Unknown author"}
                      </Link>
                      <span className="rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-0.5 font-mono text-[11px] uppercase text-[#ffb24a]">
                        {locale === "es" ? "Comprada" : "Unlocked"}
                      </span>
                      <span>{formatPrices(post.prices)}</span>
                    </div>
                    <Link href={post.postUrl as Route} className="block">
                      <h2 className="text-2xl font-black tracking-normal hover:text-[#ffb24a]">{post.title}</h2>
                    </Link>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.content}</p>
                  </div>
                  <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                    {t("common.read")}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function formatPrices(prices: Array<{ amount: string; token: string }>) {
  if (!prices.length) {
    return "No price";
  }

  return prices.map((price) => `${price.amount} ${price.token}`).join(" / ");
}
