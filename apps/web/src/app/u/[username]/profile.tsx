"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Profile({ username }: { username: string }) {
  const session = authClient.useSession();
  const user = useQuery(orpc.users.byUsername.queryOptions({ input: { username } }));
  const posts = useQuery(
    orpc.posts.listPublished.queryOptions({
      enabled: !!session.data?.user,
      input: { limit: 20, page: 1, username },
    }),
  );

  return (
    <main className="min-h-[calc(100svh-57px)] bg-[radial-gradient(circle_at_top_left,rgba(255,159,28,0.1),transparent_34rem)]">
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6">
        <section className="rounded-lg border border-white/10 bg-card/80 p-6">
          <p className="font-mono text-xs uppercase text-[#ff9f1c]">/u/{username}</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal">{user.data?.name ?? username}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {user.data?.publicKey ? `Verified Solana wallet ${abbreviate(user.data.publicKey)}` : "Creator profile"}
          </p>
        </section>

        {!session.data?.user ? (
          <section className="rounded-lg border border-white/10 bg-card/80 p-6">
            <p className="font-mono text-xs uppercase text-[#ff9f1c]">Reader account</p>
            <h2 className="mt-2 text-2xl font-black tracking-normal">Sign in to browse this creator</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Published posts are available after Google sign in.
            </p>
            <div className="mt-5">
              <Link className={buttonVariants()} href="/login">
                Continue with Google
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-3">
            <h2 className="text-2xl font-black tracking-normal">Published posts</h2>
            {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
            {posts.data?.data.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-card/80 p-6 text-sm text-muted-foreground">
                No published posts for this profile.
              </p>
            ) : null}
            {posts.data?.data.map((post) => (
              <article key={post.id} className="rounded-lg border border-white/10 bg-card/80 p-5 transition hover:border-[#ff9f1c]/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge tone={post.content ? "success" : "muted"}>{post.content ? "Unlocked" : "Locked"}</StatusBadge>
                      <span>{formatPrices(post.prices)}</span>
                    </div>
                    <Link href={post.postUrl as Route} className="block">
                      <h3 className="text-2xl font-black tracking-normal hover:text-[#ffb24a]">{post.title}</h3>
                    </Link>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {post.content ?? "Purchase required to read the full post."}
                    </p>
                  </div>
                  <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                    Read
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

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: "muted" | "success" }) {
  return (
    <span
      className={
        tone === "success"
          ? "rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-0.5 font-mono text-[11px] uppercase text-[#ffb24a]"
          : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

function abbreviate(value: string) {
  return `${value.slice(0, 5)}...${value.slice(-4)}`;
}

function formatPrices(prices: Array<{ amount: string; token: string }>) {
  if (!prices.length) {
    return "No price";
  }

  return prices.map((price) => `${price.amount} ${price.token}`).join(" / ");
}
