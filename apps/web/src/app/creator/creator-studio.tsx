"use client";

import { Button, buttonVariants } from "@cm/ui/components/button";
import {
  Card,
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
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Wallet } from "lucide-react";
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
  const deletePostMutation = useMutation(
    orpc.posts.delete.mutationOptions({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar la publicacion.");
      },
      onSuccess: async () => {
        toast.success(locale === "es" ? "Publicacion eliminada." : "Post deleted.");
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
  const postsCount = posts.data?.data.length ?? 0;
  const setupCta = !hasUsername
    ? locale === "es"
      ? "Completa tu perfil publico"
      : "Complete your public profile"
    : !hasVerifiedWallet
      ? locale === "es"
        ? "Verifica tu wallet de cobro"
        : "Verify your payment wallet"
      : locale === "es"
        ? "Crear nueva publicacion"
        : "Create a new post";

  return (
    <main className="min-h-[calc(100svh-57px)]">
      <div className="cm-shell grid w-full gap-6">
        <section className="cm-hero p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-[#ff9f1c]">
                {locale === "es" ? "Panel de creador" : "Creator Studio"}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-normal sm:text-3xl">
                {locale === "es" ? "Tu flujo para publicar y vender" : "Your workflow to publish and sell"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {canCreate
                  ? locale === "es"
                    ? "Todo esta listo. Crea contenido, define precio y gestiona tus publicaciones desde aqui."
                    : "Everything is ready. Create content, set prices, and manage posts from here."
                  : locale === "es"
                    ? "Completa lo pendiente una vez y despues usa esta pagina como tu mesa de trabajo."
                    : "Finish the missing setup once, then use this page as your working desk."}
              </p>
            </div>
            <a
              className={buttonVariants({ className: "cm-responsive-action", size: "lg" })}
              href={canCreate ? "#new-post" : "#creator-setup"}
            >
              {setupCta}
              <ArrowRight className="size-4" />
            </a>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <MetaItem
              done={hasUsername}
              icon={<FileText className="size-4" />}
              label={locale === "es" ? "Perfil" : "Profile"}
              value={profile?.profileUrl ?? (locale === "es" ? "Falta nombre publico" : "Username needed")}
            />
            <MetaItem
              done={hasVerifiedWallet}
              icon={<Wallet className="size-4" />}
              label={locale === "es" ? "Wallet" : "Wallet"}
              value={
                hasVerifiedWallet
                  ? abbreviateAddress(profile.publicKey!)
                  : locale === "es"
                    ? "Falta verificar"
                    : "Verification needed"
              }
            />
            <MetaItem
              done={canCreate}
              icon={<CheckCircle2 className="size-4" />}
              label={locale === "es" ? "Venta" : "Selling"}
              value={
                canCreate
                  ? locale === "es"
                    ? "Lista para vender"
                    : "Ready to sell"
                  : locale === "es"
                    ? "Setup pendiente"
                    : "Setup pending"
              }
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="grid min-w-0 content-start gap-4">
            {canCreate ? (
              <Card
                id="new-post"
                className="rounded-lg border border-[#ff9f1c]/30 bg-card/90 shadow-sm shadow-[#ff9f1c]/5"
              >
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">{locale === "es" ? "Nueva publicacion" : "New post"}</CardTitle>
                  <CardDescription>
                    {locale === "es"
                      ? "Escribe el borrador ahora. El precio se define despues de crearlo."
                      : "Write the draft now. You will set the price after creating it."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createPost.mutate({ content, title });
                    }}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="post-title">{locale === "es" ? "Titulo" : "Title"}</Label>
                      <Input
                        id="post-title"
                        className="h-10"
                        placeholder={locale === "es" ? "Idea principal de la publicacion" : "Main idea of the post"}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="post-content">{locale === "es" ? "Contenido" : "Content"}</Label>
                      <textarea
                        id="post-content"
                        className="min-h-64 resize-y rounded-md border border-white/10 bg-background p-3 text-sm leading-6 outline-none transition focus:border-[#ff9f1c]/60"
                        placeholder={
                          locale === "es"
                            ? "Escribe el contenido que tus lectores desbloquearan..."
                            : "Write the content readers will unlock..."
                        }
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {locale === "es"
                          ? "Despues del borrador podras publicar un precio en SOL."
                          : "After the draft, you can publish a SOL price."}
                      </p>
                      <Button
                        className="cm-responsive-action"
                        type="submit"
                        size="lg"
                        disabled={!title || !content || createPost.isPending}
                      >
                        {locale === "es" ? "Crear borrador" : "Create draft"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card id="new-post" className="rounded-lg border border-[#ff9f1c]/25 bg-card/90">
                <CardHeader>
                  <CardTitle>{locale === "es" ? "Completa tu configuracion para publicar" : "Finish setup to publish"}</CardTitle>
                  <CardDescription>
                    {locale === "es"
                      ? `Necesitas nombre publico y wallet verificada antes de publicar contenido pago en ${SOLANA_NETWORK_LABEL}.`
                      : `Creators need a public username and verified wallet before publishing paid content on ${SOLANA_NETWORK_LABEL}.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {!hasUsername ? (
                      <p>
                        {locale === "es"
                          ? "Elige un nombre para que tus lectores encuentren tu perfil."
                          : "Choose a username so readers can find your profile."}
                      </p>
                    ) : null}
                    {!hasVerifiedWallet ? (
                      <p>
                        {locale === "es"
                          ? "Conecta y verifica una wallet Solana para recibir pagos."
                          : "Connect and verify a Solana wallet to receive payments."}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            <section className="grid gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-normal">{locale === "es" ? "Mis publicaciones" : "My posts"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {locale === "es" ? `${postsCount} publicaciones en tu estudio.` : `${postsCount} posts in your studio.`}
                  </p>
                </div>
                <Link className={buttonVariants({ className: "cm-responsive-action", size: "sm", variant: "outline" })} href="/">
                  {locale === "es" ? "Ver marketplace" : "View marketplace"}
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
              {posts.isLoading ? (
                <p className="text-sm text-muted-foreground">{locale === "es" ? "Cargando publicaciones..." : "Loading listings..."}</p>
              ) : null}
              {posts.data?.data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-card/70 p-6">
                  <h3 className="text-base font-semibold">{locale === "es" ? "Todavia no tienes publicaciones" : "No posts yet"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {canCreate
                      ? locale === "es"
                        ? "Crea tu primer borrador arriba y luego agrega precio para ponerlo en vitrina."
                        : "Create your first draft above, then add a price to make it live."
                      : locale === "es"
                        ? "Cuando termines el setup, este sera el lugar para gestionar tus posts."
                        : "Once setup is done, this will be the place to manage your posts."}
                  </p>
                  <a
                    className={buttonVariants({
                      className: "mt-4 cm-responsive-action",
                      variant: canCreate ? "default" : "outline",
                    })}
                    href={canCreate ? "#new-post" : "#creator-setup"}
                  >
                    {setupCta}
                  </a>
                </div>
              ) : null}
            {posts.data?.data.map((post) => {
              const isLive = post.prices.length > 0;

              return (
                <Card key={post.id} className="rounded-lg border border-white/10 bg-card/80 transition hover:border-[#ff9f1c]/40">
                  <CardHeader className="gap-2">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{post.title}</CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge>{isLive ? (locale === "es" ? "En vitrina" : "Live") : locale === "es" ? "Borrador" : "Draft"}</StatusBadge>
                          <span className="break-all font-mono">{post.id}</span>
                        </CardDescription>
                      </div>
                      <div className="cm-responsive-actions sm:justify-end">
                        <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={post.postUrl as Route}>
                          {locale === "es" ? "Abrir" : "Open"}
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletePostMutation.isPending}
                          onClick={() => {
                            deletePostMutation.mutate({ postId: post.id });
                          }}
                        >
                          {locale === "es" ? "Retirar" : "Archive"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{locale === "es" ? "Precio" : "Price"}</span>
                      {post.prices.length ? (
                        post.prices.map((price) => (
                          <span key={price.id} className="rounded-md border border-white/10 bg-background px-2 py-1 font-mono text-xs">
                            {price.amount} {price.token}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">{locale === "es" ? "Sin precio publicado" : "No price published"}</span>
                      )}
                    </div>
                    <PriceForm
                      locale={locale}
                      onSubmit={(input) =>
                        createPrice.mutate({
                          ...input,
                          postId: post.id,
                        })
                      }
                    />
                  </CardContent>
                </Card>
              );
            })}
            </section>
          </section>

          <aside id="creator-setup" className="grid content-start gap-3 lg:sticky lg:top-20">
            <Card className="rounded-lg border border-white/10 bg-card/80" size={canCreate ? "sm" : "default"}>
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

          <Card className="rounded-lg border border-white/10 bg-card/80" size={canCreate ? "sm" : "default"}>
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

          <Card className="rounded-lg border border-white/10 bg-card/80" size={canCreate ? "sm" : "default"}>
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
      className="grid gap-2 sm:grid-cols-[1fr_140px_auto] [&_button]:w-full sm:[&_button]:w-auto"
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

function MetaItem({
  done,
  icon,
  label,
  value,
}: {
  done: boolean;
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-md border border-white/10 bg-card/60 px-3 py-2">
      <span className={done ? "mt-0.5 text-[#ffb24a]" : "mt-0.5 text-muted-foreground"}>{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm text-foreground">{value || "-"}</p>
      </div>
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
