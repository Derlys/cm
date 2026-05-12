"use client";

import { buttonVariants } from "@cm/ui/components/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import bs58 from "bs58";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import WalletActionPanel from "@/components/wallet-action-panel";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { SOLANA_NETWORK_LABEL, solToLamports } from "@/lib/solana-payments";
import { orpc, queryClient } from "@/utils/orpc";

export default function PostDetail({ postId, username }: { postId: string; username: string }) {
  const { locale } = useI18n();
  const session = authClient.useSession();
  const wallet = useWallet();
  const { connection } = useConnection();
  const me = useQuery(orpc.users.me.queryOptions({ enabled: !!session.data?.user }));
  const author = useQuery(orpc.users.byUsername.queryOptions({ input: { username } }));
  const post = useQuery(
    orpc.posts.byId.queryOptions({
      input: { postId },
    }),
  );
  const [priceId, setPriceId] = useState("");
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [externalSignature, setExternalSignature] = useState("");
  const [isConfirmingExternalPayment, setIsConfirmingExternalPayment] = useState(false);
  const createPayment = useMutation(
    orpc.payments.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Post unlocked");
        await queryClient.invalidateQueries();
      },
    }),
  );
  const linkIdentity = useMutation(orpc.identities.linkSolana.mutationOptions());
  const requestChallenge = useMutation(orpc.identities.requestChallenge.mutationOptions());
  const verifyChallenge = useMutation(orpc.identities.verifyChallenge.mutationOptions());

  const solPrices = post.data?.prices.filter((price) => price.token === "Sol") ?? [];
  const selectedPrice = solPrices.find((price) => price.id === priceId) ?? solPrices[0] ?? null;
  const isUnlocked = !!post.data?.content;
  const connectedPublicKey = wallet.publicKey?.toBase58() ?? null;
  const verifiedBuyerWallet = me.data?.publicKey ?? null;
  const buyerWalletReady = !!connectedPublicKey && connectedPublicKey === verifiedBuyerWallet;
  const creatorWallet = author.data?.publicKey ?? null;
  const canPay = !!selectedPrice && !!creatorWallet && buyerWalletReady && !!wallet.publicKey;
  const hasSupportedBrowserWallet = wallet.wallets.some(
    (walletOption) =>
      walletOption.readyState === WalletReadyState.Installed || walletOption.readyState === WalletReadyState.Loadable,
  );

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
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet verification failed");
    } finally {
      setIsVerifyingWallet(false);
    }
  };

  const payWithWallet = async () => {
    if (!selectedPrice || !wallet.publicKey || !creatorWallet) {
      return;
    }

    setIsPaying(true);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          lamports: solToLamports(selectedPrice.amount),
          toPubkey: new PublicKey(creatorWallet),
        }),
      );
      const signature = await wallet.sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature,
        },
        "confirmed",
      );
      await createPayment.mutateAsync({ postId, priceId: selectedPrice.id, signature });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  const confirmExternalPayment = async () => {
    if (!selectedPrice) {
      toast.error("This post has no SOL price yet.");
      return;
    }

    if (!creatorWallet) {
      toast.error("This creator has no receiving wallet configured yet.");
      return;
    }

    if (!externalSignature.trim()) {
      toast.error("Enter a transaction signature.");
      return;
    }

    setIsConfirmingExternalPayment(true);
    try {
      await createPayment.mutateAsync({ postId, priceId: selectedPrice.id, signature: externalSignature.trim() });
      setExternalSignature("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm payment");
    } finally {
      setIsConfirmingExternalPayment(false);
    }
  };

  return (
    <main className="min-h-[calc(100svh-57px)]">
      <div className="cm-shell grid w-full max-w-5xl gap-6">
        <div>
          <Link className={buttonVariants({ className: "cm-responsive-action", size: "sm", variant: "ghost" })} href={`/u/${username}` as Route}>
            {locale === "es" ? `Volver a @${username}` : `Back to @${username}`}
          </Link>
        </div>

        {!session.data?.user ? (
          <section className="rounded-lg border border-white/10 bg-card/80 p-6">
            <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Tu cuenta" : "Your account"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">{locale === "es" ? "Inicia sesion para leer" : "Sign in to read"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {locale === "es"
                ? `Entra con Google para comprar acceso y leer publicaciones premium en ${SOLANA_NETWORK_LABEL}.`
                : `Sign in with Google to buy access and read premium listings on ${SOLANA_NETWORK_LABEL}.`}
            </p>
            <div className="mt-5">
              <Link className={buttonVariants({ className: "cm-responsive-action" })} href="/login">
                Continue with Google
              </Link>
            </div>
          </section>
        ) : null}

        {post.isLoading ? <p className="text-sm text-muted-foreground">Loading post...</p> : null}

        {post.data ? (
          <div className={isUnlocked ? "grid gap-5" : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"}>
            <article className="cm-card">
              <header className="border-b border-white/10 p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Link href={`/u/${post.data.author?.username ?? username}` as Route} className="font-medium text-foreground">
                    @{post.data.author?.username ?? username}
                  </Link>
                  <StatusBadge tone={isUnlocked ? "success" : "muted"}>
                    {isUnlocked ? (locale === "es" ? "Comprada" : "Unlocked") : locale === "es" ? "De pago" : "Premium"}
                  </StatusBadge>
                  <span>{formatPrices(post.data.prices)}</span>
                  <span className="rounded-full border border-[#ff9f1c]/30 bg-[#ff9f1c]/10 px-2 py-0.5 font-mono text-[11px] uppercase text-[#ffb24a]">
                    {SOLANA_NETWORK_LABEL}
                  </span>
                </div>
                <h1 className="max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">{post.data.title}</h1>
                {isUnlocked ? (
                  <div className="mt-5">
                    <Link className={buttonVariants({ className: "cm-responsive-action", size: "sm", variant: "outline" })} href="/library">
                      {locale === "es" ? "Ver en mi biblioteca" : "View in my library"}
                    </Link>
                  </div>
                ) : null}
              </header>

              {isUnlocked ? (
                <div className="p-6 sm:p-8">
                  <p className="max-w-none whitespace-pre-wrap text-base leading-8 text-foreground/90">{post.data.content}</p>
                </div>
              ) : (
                <div className="p-6">
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {locale === "es"
                      ? `Esta publicacion es premium. Conecta y verifica tu wallet para comprar acceso en ${SOLANA_NETWORK_LABEL}.`
                      : `This listing is premium. Connect and verify your wallet to buy access on ${SOLANA_NETWORK_LABEL}.`}
                  </p>
                </div>
              )}
            </article>

            {!isUnlocked && session.data?.user ? (
              <aside className="cm-card h-fit p-5 lg:sticky lg:top-20">
                <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Pago seguro" : "Secure payment"}</p>
                <h2 className="mt-2 text-xl font-black tracking-normal">{locale === "es" ? "Comprar acceso con SOL" : "Buy access with SOL"}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {locale === "es"
                    ? `Pago seguro en ${SOLANA_NETWORK_LABEL}. Guardamos el comprobante al confirmar.`
                    : `Secure payment on ${SOLANA_NETWORK_LABEL}. We save your proof after confirmation.`}
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="grid gap-2">
                    <label htmlFor="price" className="text-sm font-medium">
                      Price
                    </label>
                    <select
                      id="price"
                      className="h-9 rounded-md border border-white/10 bg-background px-2 text-sm"
                      value={selectedPrice?.id ?? ""}
                      onChange={(event) => setPriceId(event.target.value)}
                    >
                      {solPrices.map((price) => (
                        <option key={price.id} value={price.id}>
                          {price.amount} SOL
                        </option>
                      ))}
                    </select>
                    {post.data.prices.some((price) => price.token !== "Sol") ? (
                      <p className="text-xs text-muted-foreground">USDC and BONK payments are coming soon.</p>
                    ) : null}
                    {!selectedPrice ? <p className="text-xs text-destructive">This post has no SOL price yet.</p> : null}
                  </div>

                  <WalletPaymentSetup
                    locale={locale}
                    canPay={canPay}
                    creatorWallet={creatorWallet}
                    hasSupportedBrowserWallet={hasSupportedBrowserWallet}
                    isConfirmingExternalPayment={isConfirmingExternalPayment || createPayment.isPending}
                    externalSignature={externalSignature}
                    isVerifyingWallet={isVerifyingWallet}
                    isPaying={isPaying || createPayment.isPending}
                    onExternalSignatureChange={setExternalSignature}
                    onConfirmExternalPayment={confirmExternalPayment}
                    onPay={payWithWallet}
                    onVerifyWallet={verifyConnectedWallet}
                    selectedPrice={selectedPrice}
                    verifiedBuyerWallet={verifiedBuyerWallet}
                  />

                  {!creatorWallet ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      This post cannot receive payments yet. The creator needs to verify a receiving wallet.
                    </p>
                  ) : (
                    <p className="break-all rounded-md border border-white/10 bg-background/60 p-3 font-mono text-xs text-muted-foreground">
                      Creator wallet: {creatorWallet}
                    </p>
                  )}

                </div>
              </aside>
            ) : null}

            {!isUnlocked && !session.data?.user ? (
              <aside className="cm-card h-fit p-5 lg:sticky lg:top-20">
                <p className="font-mono text-xs uppercase text-[#ff9f1c]">{locale === "es" ? "Preview publica" : "Public preview"}</p>
                <h2 className="mt-2 text-xl font-black tracking-normal">{locale === "es" ? "Desbloquea con SOL" : "Unlock with SOL"}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {locale === "es"
                    ? "Inicia sesion para conectar tu wallet, comprar acceso y guardar esta publicacion en tu biblioteca."
                    : "Sign in to connect your wallet, buy access, and save this listing to your library."}
                </p>
                <div className="mt-5 grid gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-mono text-foreground/80">{selectedPrice ? `${selectedPrice.amount} SOL` : "No SOL price"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Network</span>
                    <span className="text-right font-mono text-foreground/80">{SOLANA_NETWORK_LABEL}</span>
                  </div>
                </div>
                <Link className={buttonVariants({ className: "cm-responsive-action mt-5 w-full" })} href="/login">
                  {locale === "es" ? "Iniciar sesion para comprar" : "Sign in to buy"}
                </Link>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function WalletPaymentSetup({
  locale,
  canPay,
  creatorWallet,
  hasSupportedBrowserWallet,
  isConfirmingExternalPayment,
  externalSignature,
  isPaying,
  isVerifyingWallet,
  onConfirmExternalPayment,
  onExternalSignatureChange,
  onPay,
  onVerifyWallet,
  selectedPrice,
  verifiedBuyerWallet,
}: {
  locale: "en" | "es";
  canPay: boolean;
  creatorWallet: string | null;
  hasSupportedBrowserWallet: boolean;
  isConfirmingExternalPayment: boolean;
  externalSignature: string;
  isPaying: boolean;
  isVerifyingWallet: boolean;
  onConfirmExternalPayment: () => void | Promise<void>;
  onExternalSignatureChange: (value: string) => void;
  onPay: () => void | Promise<void>;
  onVerifyWallet: () => void | Promise<void>;
  selectedPrice: { amount: string; id: string; token: string } | null;
  verifiedBuyerWallet: string | null;
}) {
  return (
    <div className="grid gap-3">
      <WalletActionPanel
        actionLabel={locale === "es" ? "Comprar acceso" : "Buy access"}
        unavailableWalletLabel={locale === "es" ? "Selecciona otra wallet" : "Select another wallet"}
        connectedLabel={locale === "es" ? "Wallet compradora" : "Buyer wallet"}
        disabled={!canPay}
        isActionPending={isPaying}
        isVerifyingWallet={isVerifyingWallet}
        onAction={onPay}
        onVerifyWallet={onVerifyWallet}
        verifiedWallet={verifiedBuyerWallet}
      />
      {!hasSupportedBrowserWallet ? (
        <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-xs">
          <p className="font-mono uppercase text-muted-foreground">Pay externally</p>
          <p className="text-muted-foreground">
            No browser wallet is available. Send Devnet SOL externally, then confirm with the transaction signature.
          </p>
          <input
            className="h-9 rounded-md border border-white/10 bg-background px-2 text-sm"
            placeholder="Transaction signature"
            value={externalSignature}
            onChange={(event) => onExternalSignatureChange(event.target.value)}
          />
          <button
            type="button"
            className={buttonVariants()}
            disabled={isConfirmingExternalPayment || !externalSignature.trim() || !selectedPrice || !creatorWallet}
            onClick={onConfirmExternalPayment}
          >
            {isConfirmingExternalPayment ? "Confirming..." : "Confirm unlock"}
          </button>
        </div>
      ) : null}
      <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-xs">
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Price</span>
          <span className="font-mono text-foreground/80">{selectedPrice ? `${selectedPrice.amount} SOL` : "No SOL price"}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Receiver</span>
          <span className="max-w-40 break-all text-right font-mono text-foreground/80">
            {creatorWallet ?? "Creator wallet missing"}
          </span>
        </div>
      </div>
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
