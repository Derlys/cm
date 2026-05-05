import { db } from "@cm/db";
import { post, price } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { createId, requireCanManageResource } from "./shared";

export type Token = "Bonk" | "Sol" | "Usdc";

export async function createPrice(
  userId: string,
  input: {
    amount: string;
    postId: string;
    token: Token;
  },
) {
  const found = await requirePostForPrice(input.postId);
  await requireCanManageResource(userId, found.authorId);

  const existing = await db.query.price.findFirst({
    where: (fields, operators) =>
      operators.and(operators.eq(fields.postId, input.postId), operators.eq(fields.token, input.token)),
  });

  if (existing) {
    throw new ORPCError("CONFLICT", { message: "This token already has a price for the post." });
  }

  return db
    .insert(price)
    .values({
      amount: input.amount,
      id: createId(),
      postId: input.postId,
      token: input.token,
    })
    .returning()
    .get();
}

export async function updatePrice(
  userId: string,
  priceId: string,
  input: {
    amount: string;
  },
) {
  const found = await requirePriceForUser(userId, priceId);
  const updated = await db
    .update(price)
    .set({ amount: input.amount })
    .where(eq(price.id, found.id))
    .returning()
    .get();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "Price not found." });
  }

  return updated;
}

export async function deletePrice(userId: string, priceId: string) {
  const found = await requirePriceForUser(userId, priceId);
  const deleted = await db.delete(price).where(eq(price.id, found.id)).returning().get();
  return !!deleted;
}

async function requirePriceForUser(userId: string, priceId: string) {
  const found = await db.query.price.findFirst({
    where: eq(price.id, priceId),
    with: {
      post: true,
    },
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Price not found." });
  }

  await requireCanManageResource(userId, found.post.authorId);
  return found;
}

async function requirePostForPrice(postId: string) {
  const found = await db.query.post.findFirst({
    where: eq(post.id, postId),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Post not found." });
  }

  return found;
}
