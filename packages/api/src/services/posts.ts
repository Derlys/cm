import { db } from "@cm/db";
import { identity, payment, post, price } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";

import { toPublicUser, type PublicUser } from "./users";
import {
  ensureProfile,
  matchesSearch,
  paginate,
  requireCanManageResource,
  slugifyId,
  type PageInput,
} from "./shared";

type AuthorRow = Parameters<typeof toPublicUser>[0];
type PriceRow = typeof price.$inferSelect;
type PaymentRow = typeof payment.$inferSelect;
type PostRow = typeof post.$inferSelect;
type PostRecord = PostRow & {
  author: AuthorRow | null;
  payments: PaymentRow[];
  prices: PriceRow[];
};

export type PostView = {
  author: PublicUser | null;
  authorId: string;
  content: string | null;
  createdAt: Date;
  id: string;
  payment: PaymentRow | null;
  payments: PaymentRow[];
  postUrl: string;
  prices: PriceRow[];
  title: string;
  updatedAt: Date;
};

export async function createPost(
  userId: string,
  input: {
    content: string;
    title: string;
  },
) {
  await ensureProfile(userId);
  const id = await findUniquePostId(slugifyId(input.title));
  const created = await db
    .insert(post)
    .values({
      authorId: userId,
      content: input.content,
      id,
      title: input.title,
    })
    .returning()
    .get();

  return findPostById(userId, created.id);
}

export async function updatePost(
  userId: string,
  postId: string,
  input: {
    content?: string;
    title?: string;
  },
) {
  const found = await requirePost(postId);
  await requireCanManageResource(userId, found.authorId);

  await db
    .update(post)
    .set({
      content: input.content,
      title: input.title,
    })
    .where(eq(post.id, postId));

  return findPostById(userId, postId);
}

export async function deletePost(userId: string, postId: string) {
  const found = await requirePost(postId);
  await requireCanManageResource(userId, found.authorId);
  const deleted = await db.delete(post).where(eq(post.id, postId)).returning().get();
  return !!deleted;
}

export async function listAuthoredPosts(userId: string, input: PageInput) {
  const posts = await loadPostsForUser(userId);
  const filtered = posts
    .filter((item) => item.authorId === userId)
    .filter((item) => matchesSearch(input.search, [item.id, item.title, item.content]));

  return mapPagedPosts(filtered, userId, input);
}

export async function listPublishedPosts(userId: string, input: PageInput & { username?: string }) {
  const posts = await loadPostsForUser(userId);
  const verifiedSolanaOwners = await loadVerifiedSolanaOwnerIds();
  const filtered = posts
    .filter((item) => item.prices.some((postPrice) => postPrice.token === "Sol"))
    .filter((item) => verifiedSolanaOwners.has(item.authorId))
    .filter((item) => !input.username || item.author?.username === input.username)
    .filter((item) => matchesSearch(input.search, [item.id, item.title, item.content]));

  return mapPagedPosts(filtered, userId, input);
}

export async function listPurchasedPosts(userId: string, input: PageInput & { username?: string }) {
  const posts = await loadPostsForUser(userId);
  const filtered = posts
    .filter((item) => item.payments.length > 0)
    .filter((item) => !input.username || item.author?.username === input.username)
    .filter((item) => matchesSearch(input.search, [item.id, item.title, item.content]));

  return mapPagedPosts(filtered, userId, input);
}

export async function findPostById(userId: string, postId: string) {
  const found = await db.query.post.findFirst({
    where: eq(post.id, postId),
    with: {
      author: true,
      payments: {
        where: eq(payment.ownerId, userId),
      },
      prices: {
        orderBy: [price.token],
      },
    },
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Post not found." });
  }

  return toPostView(found, userId);
}

async function requirePost(postId: string) {
  const found = await db.query.post.findFirst({
    where: eq(post.id, postId),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Post not found." });
  }

  return found;
}

async function loadPostsForUser(userId: string): Promise<PostRecord[]> {
  return db.query.post.findMany({
    orderBy: [desc(post.createdAt)],
    with: {
      author: true,
      payments: {
        where: eq(payment.ownerId, userId),
      },
      prices: {
        orderBy: [price.token],
      },
    },
  });
}

async function loadVerifiedSolanaOwnerIds() {
  const verifiedIdentities = await db.query.identity.findMany({
    where: and(eq(identity.provider, "Solana"), eq(identity.verified, true)),
  });

  return new Set(verifiedIdentities.map((item) => item.ownerId));
}

function mapPagedPosts(posts: PostRecord[], userId: string, input: PageInput) {
  return paginate(
    posts.map((item) => toPostView(item, userId)),
    input,
  );
}

function toPostView(row: PostRecord, userId: string): PostView {
  const paymentForViewer = row.payments[0] ?? null;
  const isOwner = row.authorId === userId;
  const author = row.author ? toPublicUser(row.author) : null;

  return {
    author,
    authorId: row.authorId,
    content: isOwner || paymentForViewer ? row.content : null,
    createdAt: row.createdAt,
    id: row.id,
    payment: paymentForViewer,
    payments: row.payments,
    postUrl: author?.username ? `/u/${author.username}/${row.id}` : `/posts/${row.id}`,
    prices: row.prices,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}

async function findUniquePostId(base: string, suffix = ""): Promise<string> {
  const id = `${base}${suffix}`;
  const found = await db.query.post.findFirst({
    where: eq(post.id, id),
  });

  if (!found) {
    return id;
  }

  return findUniquePostId(base, `-${Math.floor(Math.random() * 10000)}`);
}
