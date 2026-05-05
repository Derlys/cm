"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@cm/ui/components/card";
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
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <section className="border-b pb-5">
        <p className="font-mono text-xs text-muted-foreground">/u/{username}</p>
        <h1 className="text-2xl font-semibold tracking-normal">{user.data?.name ?? username}</h1>
        <p className="text-sm text-muted-foreground">
          {user.data?.publicKey ? `Verified Solana wallet ${user.data.publicKey}` : "Creator profile"}
        </p>
      </section>

      {!session.data?.user ? (
        <div className="border p-6 text-sm text-muted-foreground">Sign in to browse this creator's posts.</div>
      ) : (
        <section className="grid gap-3">
          {posts.data?.data.length === 0 ? (
            <p className="border p-6 text-sm text-muted-foreground">No published posts for this profile.</p>
          ) : null}
          {posts.data?.data.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                  {post.content ? "Unlocked" : "Locked"} · {post.prices.length} price option
                  {post.prices.length === 1 ? "" : "s"}
                </CardDescription>
                <CardAction>
                  <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                    Open
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {post.content ?? "Purchase required to read the full post."}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
