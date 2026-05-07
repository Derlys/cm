"use client";

import { Button, buttonVariants } from "@cm/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cm/ui/components/card";
import { Input } from "@cm/ui/components/input";
import { Label } from "@cm/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const TOKENS = ["Sol", "Usdc", "Bonk"] as const;

export default function Dashboard() {
  const router = useRouter();
  const session = authClient.useSession();
  const me = useQuery(orpc.users.me.queryOptions());
  const posts = useQuery(orpc.posts.listAuthored.queryOptions({ input: { limit: 50, page: 1 } }));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [username, setUsername] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [challenge, setChallenge] = useState("");
  const [signature, setSignature] = useState("");

  const refreshDomain = async () => {
    await queryClient.invalidateQueries();
  };

  const updateProfile = useMutation(
    orpc.users.updateMe.mutationOptions({
      onSuccess: async () => {
        toast.success("Profile updated");
        await refreshDomain();
      },
    }),
  );
  const createPost = useMutation(
    orpc.posts.create.mutationOptions({
      onSuccess: async () => {
        setTitle("");
        setContent("");
        toast.success("Post created");
        await refreshDomain();
      },
    }),
  );
  const createPrice = useMutation(
    orpc.prices.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Price added");
        await refreshDomain();
      },
    }),
  );
  const linkIdentity = useMutation(
    orpc.identities.linkSolana.mutationOptions({
      onSuccess: async () => {
        toast.success("Wallet linked");
        await refreshDomain();
      },
    }),
  );
  const requestChallenge = useMutation(
    orpc.identities.requestChallenge.mutationOptions({
      onSuccess: (result) => {
        setChallenge(result.challenge);
        toast.success("Challenge created");
      },
    }),
  );
  const verifyChallenge = useMutation(
    orpc.identities.verifyChallenge.mutationOptions({
      onSuccess: async () => {
        toast.success("Wallet verified");
        setSignature("");
        await refreshDomain();
      },
    }),
  );

  const profile = me.data;

  if (session.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!session.data?.user) {
    router.replace("/login");
    return null;
  }

  const user = session.data.user;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <div className="border-b pb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome {user.name}</p>
      </div>
      <section className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateProfile.mutate({
                  name: user.name,
                  username: username || profile?.username || undefined,
                });
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder={profile?.username ?? "your-name"}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {profile?.profileUrl ? `Public profile: ${profile.profileUrl}` : "Create a public username."}
                </p>
                <Button type="submit" disabled={updateProfile.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solana identity</CardTitle>
            <CardDescription>
              {profile?.publicKey ? `Verified: ${profile.publicKey}` : "Link a wallet and paste a signed challenge."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="publicKey">Public key</Label>
                <Input
                  id="publicKey"
                  value={publicKey}
                  onChange={(event) => setPublicKey(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!publicKey || linkIdentity.isPending}
                  onClick={() => linkIdentity.mutate({ providerId: publicKey })}
                >
                  Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!publicKey || requestChallenge.isPending}
                  onClick={() => requestChallenge.mutate({ providerId: publicKey })}
                >
                  Challenge
                </Button>
              </div>
              {challenge ? (
                <div className="grid gap-2">
                  <Label htmlFor="challenge">Challenge</Label>
                  <textarea
                    id="challenge"
                    className="min-h-20 border bg-background p-2 font-mono text-xs"
                    readOnly
                    value={challenge}
                  />
                  <Label htmlFor="signature">Signature</Label>
                  <Input
                    id="signature"
                    value={signature}
                    onChange={(event) => setSignature(event.target.value)}
                  />
                  <Button
                    type="button"
                    disabled={!signature || verifyChallenge.isPending}
                    onClick={() =>
                      verifyChallenge.mutate({
                        challenge,
                        providerId: publicKey,
                        signature,
                      })
                    }
                  >
                    Verify
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create post</CardTitle>
          <CardDescription>Add prices after the post exists to publish it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              createPost.mutate({ content, title });
            }}
          >
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea
              className="min-h-36 border bg-background p-3 text-sm"
              placeholder="Content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div>
              <Button type="submit" disabled={!title || !content || createPost.isPending}>
                Publish draft
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        {posts.data?.data.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>
                {post.prices.length ? "Published" : "Draft"} · {post.id}
              </CardDescription>
              <CardAction>
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                  Open
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
              <PriceForm
                onSubmit={(input) =>
                  createPrice.mutate({
                    ...input,
                    postId: post.id,
                  })
                }
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {post.prices.map((price) => (
                  <span key={price.id} className="border px-2 py-1 font-mono text-xs">
                    {price.amount} {price.token}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function PriceForm({
  onSubmit,
}: {
  onSubmit: (input: { amount: string; token: (typeof TOKENS)[number] }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<(typeof TOKENS)[number]>("Sol");

  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ amount, token });
        setAmount("");
      }}
    >
      <Input placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <select
        className="h-8 border bg-background px-2 text-xs"
        value={token}
        onChange={(event) => setToken(event.target.value as (typeof TOKENS)[number])}
      >
        {TOKENS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" disabled={!amount}>
        Add price
      </Button>
    </form>
  );
}
