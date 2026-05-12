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
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import bs58 from "bs58";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { localizePath } from "@/lib/locale-routing";
import { orpc, queryClient } from "@/utils/orpc";

const TOKENS = ["Sol", "Usdc", "Bonk"] as const;

export default function Dashboard() {
  const router = useRouter();
  const { locale } = useI18n();
  const session = authClient.useSession();
  const wallet = useWallet();
  const walletModal = useWalletModal();
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

  if (session.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!session.data?.user) {
    router.replace(localizePath(locale, "/login"));
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
              {profile?.publicKey ? `Verified: ${profile.publicKey}` : "Connect a wallet and sign a challenge."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <WalletConnectionControl wallet={wallet} onSelectWallet={() => walletModal.setVisible(true)} />
              {wallet.publicKey ? (
                <p className="break-all font-mono text-xs text-muted-foreground">{wallet.publicKey.toBase58()}</p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={!wallet.publicKey || isVerifyingWallet}
                onClick={verifyConnectedWallet}
              >
                {isVerifyingWallet ? "Verifying..." : "Verify wallet"}
              </Button>
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
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={localizePath(locale, post.postUrl)}>
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

function WalletConnectionControl({
  onSelectWallet,
  wallet,
}: {
  onSelectWallet: () => void;
  wallet: ReturnType<typeof useWallet>;
}) {
  if (!wallet.wallet) {
    return (
      <Button type="button" variant="outline" onClick={onSelectWallet}>
        Select wallet
      </Button>
    );
  }

  if (!wallet.connected) {
    const canConnect =
      wallet.wallet.readyState === WalletReadyState.Installed || wallet.wallet.readyState === WalletReadyState.Loadable;

    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onSelectWallet}>
          Change wallet
        </Button>
        <Button type="button" disabled={!canConnect || wallet.connecting} onClick={() => wallet.connect()}>
          {wallet.connecting ? "Connecting..." : `Connect ${wallet.wallet.adapter.name}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onSelectWallet}>
        Change wallet
      </Button>
      <Button type="button" variant="outline" disabled={wallet.disconnecting} onClick={() => wallet.disconnect()}>
        {wallet.disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
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
