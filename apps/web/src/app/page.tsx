"use client";

import { buttonVariants } from "@cm/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cm/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const session = authClient.useSession();
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const posts = useQuery(
    orpc.posts.listPublished.queryOptions({
      enabled: !!session.data?.user,
      input: { limit: 20, page: 1 },
    }),
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">API {healthCheck.data ?? "..."}</p>
          <h1 className="text-2xl font-semibold tracking-normal">Connectamind</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Publica contenido, define precios y desbloquea lecturas con comprobantes de pago.
          </p>
        </div>
        <Link className={buttonVariants()} href={session.data?.user ? "/dashboard" : "/login"}>
          {session.data?.user ? "Open dashboard" : "Sign in"}
        </Link>
      </section>

      {!session.data?.user ? (
        <div className="border p-6 text-sm text-muted-foreground">
          Sign in to browse published posts and test the paid-content flow.
        </div>
      ) : (
        <section className="grid gap-3">
          {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
          {posts.data?.data.length === 0 ? (
            <p className="border p-6 text-sm text-muted-foreground">No published posts yet.</p>
          ) : null}
          {posts.data?.data.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                  {post.author?.username ? `by @${post.author.username}` : "Unknown author"} ·{" "}
                  {post.prices.length} price option{post.prices.length === 1 ? "" : "s"}
                </CardDescription>
                <CardAction>
                  <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                    Read
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {post.content ?? "Locked until you register a purchase signature."}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
