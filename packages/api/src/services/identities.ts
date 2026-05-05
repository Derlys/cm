import { db } from "@cm/db";
import { account, identity, identityChallenge, user } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";

import { createId } from "./shared";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ED25519_PUBLIC_KEY_DER_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export async function linkSolanaIdentity(userId: string, providerId: string) {
  ensureValidSolanaPublicKey(providerId);

  const existing = await db.query.identity.findFirst({
    where: and(eq(identity.provider, "Solana"), eq(identity.providerId, providerId)),
  });

  if (existing) {
    throw new ORPCError("CONFLICT", { message: "Identity already linked." });
  }

  return db
    .insert(identity)
    .values({
      id: createId(),
      ownerId: userId,
      provider: "Solana",
      providerId,
    })
    .returning()
    .get();
}

export async function listIdentitiesByUsername(username: string) {
  const found = await db.query.user.findFirst({
    where: eq(user.username, username),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  return db.query.identity.findMany({
    orderBy: [asc(identity.provider), asc(identity.providerId)],
    where: eq(identity.ownerId, found.id),
  });
}

export async function deleteIdentity(userId: string, identityId: string) {
  const found = await db.query.identity.findFirst({
    where: and(eq(identity.id, identityId), eq(identity.ownerId, userId)),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Identity not found." });
  }

  const identities = await db.query.identity.findMany({
    where: eq(identity.ownerId, userId),
  });
  const accounts = await db.query.account.findMany({
    where: eq(account.userId, userId),
  });
  const hasPassword = accounts.some((item) => !!item.password);

  if (identities.length <= 1 && !hasPassword) {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot delete the last sign-in identity." });
  }

  const deleted = await db.delete(identity).where(eq(identity.id, found.id)).returning().get();
  return !!deleted;
}

export async function requestIdentityChallenge(userId: string, providerId: string, userAgent: string) {
  ensureValidSolanaPublicKey(providerId);
  const found = await requireOwnedSolanaIdentity(userId, providerId);
  const random = randomBytes(32).toString("hex");
  const digest = createHash("sha256")
    .update(`${random}-${userAgent}-${userId}-Solana-${providerId}`)
    .digest("hex");
  const challenge = `Approve this message to verify your wallet. #REF-${digest}`;

  return db
    .insert(identityChallenge)
    .values({
      challenge,
      id: createId(),
      identityId: found.id,
      ip: "0.0.0.0",
      provider: "Solana",
      providerId,
      userAgent,
    })
    .returning()
    .get();
}

export async function verifyIdentityChallenge(
  userId: string,
  input: {
    challenge: string;
    providerId: string;
    signature: string;
  },
  userAgent: string,
) {
  ensureValidSolanaPublicKey(input.providerId);
  const owned = await requireOwnedSolanaIdentity(userId, input.providerId);
  const found = await db.query.identityChallenge.findFirst({
    where: and(
      eq(identityChallenge.challenge, input.challenge),
      eq(identityChallenge.identityId, owned.id),
      eq(identityChallenge.provider, "Solana"),
      eq(identityChallenge.providerId, input.providerId),
    ),
  });

  if (!found || found.userAgent !== userAgent) {
    throw new ORPCError("NOT_FOUND", { message: "Identity challenge not found." });
  }

  const verified = verifySolanaSignature(input.challenge, input.providerId, input.signature);

  if (!verified) {
    throw new ORPCError("BAD_REQUEST", { message: "Identity challenge verification failed." });
  }

  await db.update(identity).set({ verified: true }).where(eq(identity.id, owned.id));

  const updated = await db
    .update(identityChallenge)
    .set({
      signature: input.signature,
      verified: true,
    })
    .where(eq(identityChallenge.id, found.id))
    .returning()
    .get();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "Identity challenge not found." });
  }

  return updated;
}

async function requireOwnedSolanaIdentity(userId: string, providerId: string) {
  const found = await db.query.identity.findFirst({
    where: and(
      eq(identity.ownerId, userId),
      eq(identity.provider, "Solana"),
      eq(identity.providerId, providerId),
    ),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Identity not found." });
  }

  return found;
}

function ensureValidSolanaPublicKey(providerId: string) {
  const decoded = decodeBase58(providerId);

  if (decoded.length !== 32) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid Solana public key." });
  }
}

function verifySolanaSignature(challenge: string, publicKey: string, signature: string) {
  const publicKeyBytes = decodeBase58(publicKey);
  const signatureBytes = decodeBase58(signature);

  if (publicKeyBytes.length !== 32 || signatureBytes.length !== 64) {
    return false;
  }

  const key = createPublicKey({
    format: "der",
    key: Buffer.concat([ED25519_PUBLIC_KEY_DER_PREFIX, Buffer.from(publicKeyBytes)]),
    type: "spki",
  });

  return verify(null, Buffer.from(challenge), key, Buffer.from(signatureBytes));
}

function decodeBase58(value: string) {
  const bytes = [0];

  for (const char of value) {
    const index = BASE58_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid base58 value." });
    }

    let carry = index;
    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      const next = bytes[byteIndex]! * 58 + carry;
      bytes[byteIndex] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char !== "1") {
      break;
    }
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}
