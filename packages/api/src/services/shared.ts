import { db } from "@cm/db";
import { user } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

export type PageInput = {
  limit?: number;
  page?: number;
  search?: string | undefined;
};

export type PagingMeta = {
  currentPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  nextPage: number | null;
  pageCount: number;
  previousPage: number | null;
  totalCount: number;
};

export type PagingResult<T> = {
  data: T[];
  meta: PagingMeta;
};

export function createId() {
  return crypto.randomUUID();
}

export function slugifyId(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "post";
}

export function paginate<T>(items: T[], input: PageInput): PagingResult<T> {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const currentPage = Math.max(1, input.page ?? 1);
  const totalCount = items.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / limit));
  const start = (currentPage - 1) * limit;
  const data = items.slice(start, start + limit);

  return {
    data,
    meta: {
      currentPage,
      isFirstPage: currentPage <= 1,
      isLastPage: currentPage >= pageCount,
      nextPage: currentPage < pageCount ? currentPage + 1 : null,
      pageCount,
      previousPage: currentPage > 1 ? currentPage - 1 : null,
      totalCount,
    },
  };
}

export function matchesSearch(search: string | undefined, values: Array<string | null | undefined>) {
  if (!search?.trim()) {
    return true;
  }

  const needle = search.trim().toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

export async function getDomainUser(userId: string) {
  const found = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  return found;
}

export async function ensureProfile(userId: string) {
  const found = await getDomainUser(userId);

  if (found.username) {
    return found;
  }

  const base = slugifyId(found.name || found.email.split("@")[0] || "user");
  const username = await findUniqueUsername(base);
  const updated = await db
    .update(user)
    .set({
      status: found.status === "Created" ? "Active" : found.status,
      username,
    })
    .where(eq(user.id, userId))
    .returning()
    .get();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  return updated;
}

export async function findUniqueUsername(base: string, suffix = ""): Promise<string> {
  const username = `${base}${suffix}`;
  const found = await db.query.user.findFirst({
    where: eq(user.username, username),
  });

  if (!found) {
    return username;
  }

  return findUniqueUsername(base, `-${Math.floor(Math.random() * 10000)}`);
}

export async function canManageResource(userId: string, ownerId: string) {
  if (userId === ownerId) {
    return true;
  }

  const found = await getDomainUser(userId);
  return found.role === "Admin";
}

export async function requireCanManageResource(userId: string, ownerId: string) {
  if (!(await canManageResource(userId, ownerId))) {
    throw new ORPCError("FORBIDDEN", { message: "You cannot manage this resource." });
  }
}
