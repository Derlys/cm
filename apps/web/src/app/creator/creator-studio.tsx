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
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import bs58 from "bs58";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import WalletActionPanel from "@/components/wallet-action-panel";
import { authClient } from "@/lib/auth-client";
import { abbreviateAddress, SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";
import { orpc, queryClient } from "@/utils/orpc";

const TOKENS = ["Sol"] as const;

export default function CreatorStudio() {
  const router = useRouter();
  const session = authClient.useSession();
  const wallet = useWallet();
  const me = useQuery(orpc.users.me.queryOptions());
  const posts = useQuery(orpc.posts.listAuthored.queryOptions({ input: { limit: 50, page: 1 } }));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [username, setUsername] = useState("");
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);

  const refreshDomain = async () => {
    await queryClient.invalidateQueries();
  };

  const updateProfile = useMutation(
    orpc.users.updateMe.mutationOptions({
      onSuccess: async () => {
        toast.success("Profile updated");
        setUsername("");
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
  const linkIdentity = useMutation(orpc.identities.linkSolana.mutationOptions());
  const requestChallenge = useMutation(orpc.identities.requestChallenge.mutationOptions());
  const verifyChallenge = useMutation(orpc.identities.verifyChallenge.mutationOptions());

  const verifyConnectedWallet = async () => {
    const providerId = wallet.publicKey?.toBase58();

    if (!providerId) {
      toast.error("Connect a Solana wallet first.");
      return;
    }

    if (!wallet.signMessage) {
      toast.error("This wallet does not support message signing.");
      return;
    }

    setIsVerifyingWallet(true);

    try {
      await linkIdentity.mutateAsync({ providerId });
      const challenge = await requestChallenge.mutateAsync({ providerId });
      const signatureBytes = await wallet.signMessage(new TextEncoder().encode(challenge.challenge));
      await verifyChallenge.mutateAsync({
        challenge: challenge.challenge,
        providerId,
        signature: bs58.encode(signatureBytes),
      });
      toast.success("Wallet verified");
      await refreshDomain();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet verification failed");
    } finally {
      setIsVerifyingWallet(false);
    }
  };

  const profile = me.data;
  const hasUsername = !!profile?.username;
  const hasVerifiedWallet = !!profile?.publicKey;
  const canCreate = hasUsername && hasVerifiedWallet;

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace("/login");
    }
  }, [router, session.data?.user, session.isPending]);

  if (session.isPending) {
    return (
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading creator studio...</p>
      </main>
    );
  }

  if (!session.data?.user) {
    return null;
  }

  const user = session.data.user;

  return (
    <main className="min-h-[calc(100svh-57px)] bg-[radial-gradient(circle_at_top_left,rgba(255,159,28,0.1),transparent_34rem)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
        <section className="rounded-lg border border-white/10 bg-card/70 p-5">
          <p className="font-mono text-xs uppercase text-[#ff9f1c]">Creator Studio</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal">Create paid posts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Set up a public profile and verified Solana wallet before publishing content. Posts are only published and
            purchasable after a SOL price and verified receiving wallet are ready on {SOLANA_NETWORK_LABEL}.
          </p>
        </section>

      <section className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="grid content-start gap-3">
          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>Setup</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <SetupItem done label="Google account" value={user.name} />
                <SetupItem
                  done={hasUsername}
                  label="Public username"
                  value={profile?.profileUrl ?? "Required before publishing"}
                />
                <SetupItem
                  done={hasVerifiedWallet}
                  label="Payment wallet"
                  value={profile?.publicKey ? abbreviateAddress(profile.publicKey) : "Required before publishing"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>Public profile</CardTitle>
              <CardDescription>{hasUsername ? "Your creator URL is ready." : "Choose a handle."}</CardDescription>
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
                <Button type="submit" disabled={updateProfile.isPending}>
                  Save username
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>Payment wallet</CardTitle>
              <CardDescription>
                {hasVerifiedWallet ? `Verified on ${SOLANA_NETWORK_LABEL}: ${abbreviateAddress(profile.publicKey!)}` : "Connect a wallet to receive payments."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <WalletActionPanel
                  actionLabel="Wallet ready"
                  connectedLabel="Payment wallet"
                  disabled
                  isVerifyingWallet={isVerifyingWallet}
                  onAction={() => undefined}
                  onVerifyWallet={verifyConnectedWallet}
                  verifiedWallet={profile?.publicKey}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="grid content-start gap-3">
          {canCreate ? (
            <Card className="rounded-lg border border-white/10 bg-card/80">
              <CardHeader>
                <CardTitle>New post</CardTitle>
                  <CardDescription>Add a SOL price to make the post published and purchasable.</CardDescription>
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
                    className="min-h-52 rounded-md border border-white/10 bg-background p-3 text-sm leading-6 outline-none focus:border-[#ff9f1c]/60"
                    placeholder="Content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                  <div>
                    <Button type="submit" disabled={!title || !content || createPost.isPending}>
                      Create draft
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg border border-white/10 bg-card/80">
              <CardHeader>
                <CardTitle>Finish setup to create posts</CardTitle>
                <CardDescription>
                  Creators need a public username and verified wallet before publishing paid content on {SOLANA_NETWORK_LABEL}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  {!hasUsername ? <p>Choose a username so readers can find your profile.</p> : null}
                  {!hasVerifiedWallet ? <p>Connect and verify a Solana wallet to receive payments.</p> : null}
                </div>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black tracking-normal">My posts</h2>
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/">
                View feed
              </Link>
            </div>
            {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
            {posts.data?.data.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-card/80 p-6 text-sm text-muted-foreground">No posts yet.</p>
            ) : null}
            {posts.data?.data.map((post) => (
              <Card key={post.id} className="rounded-lg border border-white/10 bg-card/80 transition hover:border-[#ff9f1c]/40">
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription>
                    <StatusBadge>{post.prices.length ? "Published" : "Draft"}</StatusBadge> · {post.id}
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
        </section>
      </section>
      </div>
    </main>
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
        className="h-8 rounded-md border border-white/10 bg-background px-2 text-xs"
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

function SetupItem({ done, label, value }: { done: boolean; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="break-all text-xs text-muted-foreground">{value}</p>
      </div>
      <StatusBadge>{done ? "Ready" : "Todo"}</StatusBadge>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-1 font-mono text-[11px] uppercase text-[#ffb24a]">{children}</span>;
}
