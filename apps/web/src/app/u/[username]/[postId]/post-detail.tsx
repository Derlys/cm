"use client";

import { Button, buttonVariants } from "@cm/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cm/ui/components/card";
import { Input } from "@cm/ui/components/input";
import { Label } from "@cm/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function PostDetail({ postId, username }: { postId: string; username: string }) {
  const session = authClient.useSession();
  const post = useQuery(
    orpc.posts.byId.queryOptions({
      enabled: !!session.data?.user,
      input: { postId },
    }),
  );
  const [priceId, setPriceId] = useState("");
  const [signature, setSignature] = useState("");
  const createPayment = useMutation(
    orpc.payments.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Purchase registered");
        setSignature("");
        await queryClient.invalidateQueries();
      },
    }),
  );
  const selectedPriceId = priceId || post.data?.prices[0]?.id || "";

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/u/${username}` as Route}>
        Back to profile
      </Link>

      {!session.data?.user ? (
        <div className="border p-6 text-sm text-muted-foreground">Sign in to read and purchase this post.</div>
      ) : null}

      {post.data ? (
        <>
          <section className="border-b pb-5">
            <p className="font-mono text-xs text-muted-foreground">by @{post.data.author?.username ?? username}</p>
            <h1 className="text-3xl font-semibold tracking-normal">{post.data.title}</h1>
          </section>

          <article className="prose prose-sm max-w-none dark:prose-invert">
            {post.data.content ? (
              <p className="whitespace-pre-wrap text-sm leading-7">{post.data.content}</p>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Locked content</CardTitle>
                  <CardDescription>Register a payment signature to unlock this post.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createPayment.mutate({ postId, priceId: selectedPriceId, signature });
                    }}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price</Label>
                      <select
                        id="price"
                        className="h-8 border bg-background px-2 text-xs"
                        value={selectedPriceId}
                        onChange={(event) => setPriceId(event.target.value)}
                      >
                        {post.data.prices.map((price) => (
                          <option key={price.id} value={price.id}>
                            {price.amount} {price.token}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentSignature">Payment signature</Label>
                      <Input
                        id="paymentSignature"
                        value={signature}
                        onChange={(event) => setSignature(event.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={!selectedPriceId || !signature || createPayment.isPending}>
                      Unlock
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </article>
        </>
      ) : null}
    </main>
  );
}
