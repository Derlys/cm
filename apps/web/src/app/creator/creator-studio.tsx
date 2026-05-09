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
import { useI18n } from "@/lib/i18n";
import { abbreviateAddress, SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";
import { orpc, queryClient } from "@/utils/orpc";

const TOKENS = ["Sol"] as const;

export default function CreatorStudio() {
  const { locale } = useI18n();
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
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el nombre.");
      },
      onSuccess: async () => {
        toast.success(locale === "es" ? "Nombre guardado." : "Username saved.");
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

  const normalizedUsername = normalizeUsername(username);
  const isUsernameDirty = username.trim().length > 0;

  return (
    <main className="min-h-[calc(100svh-57px)]">
      <div className="cm-shell grid w-full gap-6">
        <section className="cm-hero p-5">
          <p className="font-mono text-xs uppercase text-[#ff9f1c]">
            {locale === "es" ? "Panel de creador" : "Creator Studio"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">
            {locale === "es" ? "Publica y vende en minutos" : "Publish and sell in minutes"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {locale === "es"
              ? `Activa tu perfil, conecta wallet y publica con precio SOL.`
              : `Set your profile, connect wallet, and publish with a SOL price.`}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MetaItem label={locale === "es" ? "Cuenta" : "Account"} value={user.email} />
            <MetaItem
              label={locale === "es" ? "Wallet" : "Wallet"}
              value={hasVerifiedWallet ? abbreviateAddress(profile.publicKey!) : locale === "es" ? "Falta configurar" : "Setup required"}
            />
            <MetaItem
              label={locale === "es" ? "Estado de venta" : "Sell status"}
              value={hasUsername && hasVerifiedWallet ? (locale === "es" ? "Lista para vender" : "Ready to sell") : locale === "es" ? "Falta configurar" : "Setup required"}
            />
          </div>
        </section>

      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-3">
          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>{locale === "es" ? "Configuracion inicial" : "Setup"}</CardTitle>
              <CardDescription>{locale === "es" ? "Checklist de lanzamiento" : "Launch checklist"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <SetupItem doneLabel={locale === "es" ? "Listo" : "Ready"} pendingLabel={locale === "es" ? "Pendiente" : "Pending"} done label={locale === "es" ? "Tu cuenta" : "Your account"} value={user.name} />
                <SetupItem
                  doneLabel={locale === "es" ? "Listo" : "Ready"}
                  pendingLabel={locale === "es" ? "Pendiente" : "Pending"}
                  done={hasUsername}
                  label={locale === "es" ? "Tu perfil visible" : "Your public profile"}
                  value={profile?.profileUrl ?? (locale === "es" ? "Requerido para publicar" : "Required before publishing")}
                />
                <SetupItem
                  doneLabel={locale === "es" ? "Listo" : "Ready"}
                  pendingLabel={locale === "es" ? "Pendiente" : "Pending"}
                  done={hasVerifiedWallet}
                  label={locale === "es" ? "Donde recibes pagos" : "Where you receive payments"}
                  value={profile?.publicKey ? abbreviateAddress(profile.publicKey) : (locale === "es" ? "Requerido para publicar" : "Required before publishing")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>{locale === "es" ? "Tu perfil publico" : "Your public profile"}</CardTitle>
              <CardDescription>
                {hasUsername
                  ? locale === "es"
                    ? "Este nombre sera tu enlace publico para que te encuentren."
                    : "This name becomes your public profile link."
                  : locale === "es"
                    ? "Elige un nombre simple (minusculas, numeros y guiones)."
                    : "Choose a simple name (lowercase, numbers, and hyphens)."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateProfile.mutate({
                    name: user.name,
                    username: normalizedUsername || profile?.username || undefined,
                  });
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="username">{locale === "es" ? "Nombre publico" : "Username"}</Label>
                  <Input
                    id="username"
                    placeholder={profile?.username ?? "tu-nombre"}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  {isUsernameDirty && normalizedUsername !== username ? (
                    <p className="text-xs text-muted-foreground">
                      {locale === "es"
                        ? `Se guardara como: ${normalizedUsername || "(vacio)"}.`
                        : `Will be saved as: ${normalizedUsername || "(empty)"}.`}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" disabled={updateProfile.isPending || (isUsernameDirty && normalizedUsername.length < 2)}>
                  {locale === "es" ? "Guardar nombre" : "Save username"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-card/80">
            <CardHeader>
              <CardTitle>{locale === "es" ? "Wallet de cobro" : "Payment wallet"}</CardTitle>
              <CardDescription>
                {hasVerifiedWallet
                  ? `${locale === "es" ? "Lista para cobrar en" : "Ready to receive on"} ${SOLANA_NETWORK_LABEL}: ${abbreviateAddress(profile.publicKey!)}`
                  : locale === "es"
                    ? "Conecta una wallet para recibir pagos."
                    : "Connect a wallet to receive payments."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <WalletActionPanel
                  actionLabel={locale === "es" ? "Lista para vender" : "Ready to sell"}
                  connectedLabel={locale === "es" ? "Wallet de cobro" : "Payment wallet"}
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
                <CardTitle>{locale === "es" ? "Nueva publicacion" : "New post"}</CardTitle>
                  <CardDescription>{locale === "es" ? "Crea el contenido y luego define precio SOL." : "Create content first, then set a SOL price."}</CardDescription>
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
                    <Button type="submit" size="lg" disabled={!title || !content || createPost.isPending}>
                      {locale === "es" ? "Crear borrador" : "Create draft"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg border border-white/10 bg-card/80">
              <CardHeader>
                <CardTitle>{locale === "es" ? "Completa tu configuracion para publicar" : "Finish setup to publish"}</CardTitle>
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
              <h2 className="text-2xl font-black tracking-normal">{locale === "es" ? "Mis publicaciones" : "My posts"}</h2>
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
                    <StatusBadge>{post.prices.length ? (locale === "es" ? "En vitrina" : "Live") : locale === "es" ? "Borrador" : "Draft"}</StatusBadge> · {post.id}
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
                    locale={locale}
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
  locale,
  onSubmit,
}: {
  locale: "en" | "es";
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
        {locale === "es" ? "Publicar precio" : "Set price"}
      </Button>
    </form>
  );
}

function SetupItem({
  done,
  doneLabel,
  label,
  pendingLabel,
  value,
}: {
  done: boolean;
  doneLabel: string;
  label: string;
  pendingLabel: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="break-all text-xs text-muted-foreground">{value}</p>
      </div>
      <StatusBadge>{done ? doneLabel : pendingLabel}</StatusBadge>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-card/60 px-3 py-2">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground">{value || "-"}</p>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-1 font-mono text-[11px] uppercase text-[#ffb24a]">{children}</span>;
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}
