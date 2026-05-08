"use client";

import { Button } from "@cm/ui/components/button";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet, type WalletContextState } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { abbreviateAddress, SOLANA_NETWORK_LABEL } from "@/lib/solana-payments";

type WalletActionPanelProps = {
  actionLabel: string;
  unavailableWalletLabel?: string;
  connectedLabel?: string;
  disabled?: boolean;
  isActionPending?: boolean;
  isVerifyingWallet?: boolean;
  onAction: () => void | Promise<void>;
  onVerifyWallet: () => void | Promise<void>;
  verifiedWallet?: string | null;
};

export default function WalletActionPanel({
  actionLabel,
  unavailableWalletLabel = "Select another wallet",
  connectedLabel = "Connected wallet",
  disabled,
  isActionPending,
  isVerifyingWallet,
  onAction,
  onVerifyWallet,
  verifiedWallet,
}: WalletActionPanelProps) {
  const wallet = useWallet();
  const walletModal = useWalletModal();
  const connectedPublicKey = wallet.publicKey?.toBase58() ?? null;
  const selectedWalletName = wallet.wallet?.adapter.name ?? "wallet";
  const isVerifiedConnectedWallet = !!connectedPublicKey && connectedPublicKey === verifiedWallet;
  const canConnect =
    wallet.wallet?.readyState === WalletReadyState.Installed || wallet.wallet?.readyState === WalletReadyState.Loadable;

  const statusItems = [
    { label: "Network", value: SOLANA_NETWORK_LABEL },
    { label: connectedLabel, value: connectedPublicKey ? abbreviateAddress(connectedPublicKey) : "Not connected" },
    { label: "Verified wallet", value: verifiedWallet ? abbreviateAddress(verifiedWallet) : "Not verified" },
  ];

  const handlePrimaryAction = async () => {
    if (!wallet.wallet) {
      walletModal.setVisible(true);
      return;
    }

    if (!canConnect && !wallet.connected) {
      walletModal.setVisible(true);
      return;
    }

    if (!wallet.connected) {
      await wallet.connect();
      return;
    }

    if (!isVerifiedConnectedWallet) {
      await onVerifyWallet();
      return;
    }

    await onAction();
  };

  const primaryLabel = getPrimaryLabel({
    actionLabel,
    isActionPending,
    isVerifiedConnectedWallet,
    isVerifyingWallet,
    selectedWalletName,
    unavailableWalletLabel,
    canConnect,
    wallet,
  });
  const primaryDisabled =
    !!isActionPending ||
    !!isVerifyingWallet ||
    (!!wallet.wallet && !wallet.connected && !canConnect) ||
    (!!wallet.connected && isVerifiedConnectedWallet && !!disabled);

  return (
    <div className="grid gap-3">
      <Button type="button" disabled={primaryDisabled} onClick={handlePrimaryAction}>
        {primaryLabel}
      </Button>

      {wallet.wallet ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => walletModal.setVisible(true)}>
            Change wallet
          </Button>
          {wallet.connected ? (
            <Button type="button" size="sm" variant="outline" disabled={wallet.disconnecting} onClick={() => wallet.disconnect()}>
              {wallet.disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {wallet.wallet && !wallet.connected && !canConnect ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {selectedWalletName} is not available in this browser. Try Solflare or choose another wallet.
        </p>
      ) : null}

      {wallet.connected && !isVerifiedConnectedWallet ? (
        <p className="text-xs text-[#ffb24a]">Verify this wallet to continue.</p>
      ) : null}

      <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-xs">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="break-all text-right font-mono text-foreground/80">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPrimaryLabel({
  actionLabel,
  isActionPending,
  isVerifiedConnectedWallet,
  isVerifyingWallet,
  selectedWalletName,
  unavailableWalletLabel,
  canConnect,
  wallet,
}: {
  actionLabel: string;
  isActionPending?: boolean;
  isVerifiedConnectedWallet: boolean;
  isVerifyingWallet?: boolean;
  selectedWalletName: string;
  unavailableWalletLabel: string;
  canConnect: boolean;
  wallet: WalletContextState;
}) {
  if (isActionPending) {
    return "Confirming...";
  }

  if (!wallet.wallet) {
    return "Select wallet";
  }

  if (!wallet.connected) {
    if (!canConnect) {
      return unavailableWalletLabel;
    }
    return wallet.connecting ? "Connecting..." : `Connect ${selectedWalletName}`;
  }

  if (!isVerifiedConnectedWallet) {
    return isVerifyingWallet ? "Verifying wallet..." : "Verify wallet";
  }

  return actionLabel;
}
