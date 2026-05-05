import { db } from "@cm/db";
import { payment, price } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";

import { createId, matchesSearch, paginate, type PageInput } from "./shared";

export async function createPayment(
  userId: string,
  input: {
    postId: string;
    priceId: string;
    signature: string;
  },
) {
  const selectedPrice = await db.query.price.findFirst({
    where: eq(price.id, input.priceId),
  });

  if (!selectedPrice || selectedPrice.postId !== input.postId) {
    throw new ORPCError("BAD_REQUEST", { message: "Price does not belong to the post." });
  }

  const existing = await db.query.payment.findFirst({
    where: (fields, operators) =>
      operators.and(operators.eq(fields.postId, input.postId), operators.eq(fields.ownerId, userId)),
  });

  if (existing) {
    throw new ORPCError("CONFLICT", { message: "Post already purchased." });
  }

  return db
    .insert(payment)
    .values({
      id: createId(),
      ownerId: userId,
      postId: input.postId,
      priceId: input.priceId,
      signature: input.signature,
    })
    .returning()
    .get();
}

export async function listMyPayments(userId: string, input: PageInput) {
  const payments = await db.query.payment.findMany({
    orderBy: [desc(payment.createdAt)],
    where: eq(payment.ownerId, userId),
    with: {
      post: true,
      price: true,
    },
  });

  const filtered = payments.filter((item) =>
    matchesSearch(input.search, [item.id, item.signature, item.post?.title]),
  );

  return paginate(filtered, input);
}
