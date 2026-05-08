"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const session = authClient.useSession();
  const posts = useQuery(
    orpc.posts.listPublished.queryOptions({
      enabled: !!session.data?.user,
      input: { limit: 20, page: 1 },
    }),
  );

  return (
    <main className="min-h-[calc(100svh-57px)] bg-[radial-gradient(circle_at_top_left,rgba(255,159,28,0.1),transparent_34rem)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <FeedSidebar isSignedIn={!!session.data?.user} userName={session.data?.user.name ?? null} />

        <section className="grid content-start gap-4">
          <div className="rounded-lg border border-white/10 bg-card/70 p-5 shadow-sm">
            <p className="font-mono text-xs uppercase text-[#ff9f1c]">Feed</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-normal">Latest posts</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Read independent creators, unlock paid posts with your Solana wallet, and keep your purchased posts
                  in your library.
                </p>
              </div>
              {!session.data?.user ? (
                <Link className={buttonVariants({ size: "lg" })} href="/login">
                  Continue with Google
                </Link>
              ) : null}
            </div>
          </div>

          {!session.data?.user ? (
            <ReaderCard
              title="Sign in to start reading"
              eyebrow="Reader account"
              description="Google sign in lets you unlock posts, keep a library, and publish later if you decide to create."
              action={
                <Link className={buttonVariants()} href="/login">
                  Continue with Google
                </Link>
              }
            />
          ) : (
            <section className="grid gap-3">
              {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
              {posts.data?.data.length === 0 ? (
                <ReaderCard
                  title="No posts yet"
                  eyebrow="Fresh feed"
                  description="Published posts will appear here once creators add at least one price."
                  action={
                    <Link className={buttonVariants({ variant: "outline" })} href="/creator">
                      Create the first post
                    </Link>
                  }
                />
              ) : null}
              {posts.data?.data.map((post) => (
                <article
                  key={post.id}
                  className="group rounded-lg border border-white/10 bg-card/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff9f1c]/50 hover:bg-card"
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
                          {post.content ? "Unlocked" : "Locked"}
                        </StatusBadge>
                        <span>{formatPrices(post.prices)}</span>
                      </div>
                      <Link href={post.postUrl as Route} className="block">
                        <h2 className="text-2xl font-black tracking-normal transition group-hover:text-[#ffb24a]">
                          {post.title}
                        </h2>
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
        </section>
      </div>
    </main>
  );
}

function FeedSidebar({ isSignedIn, userName }: { isSignedIn: boolean; userName: string | null }) {
  return (
    <aside className="hidden content-start gap-3 lg:grid">
      <div className="rounded-lg border border-white/10 bg-card/70 p-4">
        <h2 className="text-xl font-black tracking-normal">Connectamind</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Paid writing for independent creators.</p>
      </div>
      <nav className="grid gap-1 rounded-lg border border-white/10 bg-card/70 p-2 text-sm">
        <Link className="rounded-md px-3 py-2 text-foreground hover:bg-white/5" href="/">
          Reading feed
        </Link>
        {isSignedIn ? (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground" href="/library">
            My library
          </Link>
        ) : null}
        {isSignedIn ? (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground" href="/creator">
            Creator Studio
          </Link>
        ) : (
          <Link className="rounded-md px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground" href="/login">
            Sign in
          </Link>
        )}
      </nav>
      <div className="rounded-lg border border-white/10 bg-card/70 p-4 text-sm">
        <p className="font-medium">{isSignedIn ? "Signed in" : "Reader first"}</p>
        <p className="mt-1 text-muted-foreground">{isSignedIn ? userName : "Browse first. Create later."}</p>
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
    <div className="rounded-lg border border-white/10 bg-card/80 p-6">
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
          : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase text-muted-foreground"
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
