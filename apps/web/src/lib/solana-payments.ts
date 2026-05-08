import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const SOLANA_NETWORK_LABEL = "Solana Devnet";

export function solToLamports(amount: string) {
  const normalized = amount.trim();

  if (!/^\d+(\.\d{1,9})?$/.test(normalized)) {
    throw new Error("Invalid SOL amount.");
  }

  const [whole = "0", decimal = ""] = normalized.split(".");
  const decimalLamports = decimal.padEnd(9, "0");
  const lamports = BigInt(whole) * BigInt(LAMPORTS_PER_SOL) + BigInt(decimalLamports || "0");

  if (lamports <= BigInt(0)) {
    throw new Error("Amount must be greater than zero.");
  }

  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Amount is too large for this MVP payment flow.");
  }

  return Number(lamports);
}

export function abbreviateAddress(value: string) {
  return `${value.slice(0, 5)}...${value.slice(-4)}`;
}
