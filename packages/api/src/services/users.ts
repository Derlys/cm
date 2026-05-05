import { db } from "@cm/db";
import { identity, user } from "@cm/db/schema/index";
import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";

import { ensureProfile, matchesSearch, paginate, type PageInput } from "./shared";

export type PublicUser = {
  avatarUrl: string | null;
  developer: boolean;
  id: string;
  name: string | null;
  profileUrl: string | null;
  publicKey: string | null;
  role: "Admin" | "User";
  status: "Active" | "Created" | "Inactive";
  username: string | null;
};

export function toPublicUser(
  row: typeof user.$inferSelect,
  identities: Array<typeof identity.$inferSelect> = [],
): PublicUser {
  const publicKey = identities.find((item) => item.provider === "Solana" && item.verified)?.providerId ?? null;

  return {
    avatarUrl: row.avatarUrl || row.image || null,
    developer: row.developer,
    id: row.id,
    name: row.name || null,
    profileUrl: row.username ? `/u/${row.username}` : null,
    publicKey,
    role: row.role,
    status: row.status,
    username: row.username,
  };
}

export async function getMe(userId: string) {
  const found = await ensureProfile(userId);
  const identities = await db.query.identity.findMany({
    where: eq(identity.ownerId, userId),
  });

  return toPublicUser(found, identities);
}

export async function updateMe(
  userId: string,
  input: {
    avatarUrl?: string | null;
    developer?: boolean;
    name?: string | null;
    username?: string;
  },
) {
  await ensureProfile(userId);

  if (input.username) {
    const existing = await db.query.user.findFirst({
      where: eq(user.username, input.username),
    });

    if (existing && existing.id !== userId) {
      throw new ORPCError("CONFLICT", { message: "Username is already taken." });
    }
  }

  const updated = await db
    .update(user)
    .set({
      avatarUrl: input.avatarUrl,
      developer: input.developer,
      name: input.name ?? undefined,
      status: "Active",
      username: input.username,
    })
    .where(eq(user.id, userId))
    .returning()
    .get();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  return getMe(updated.id);
}

export async function findUserByUsername(username: string) {
  const found = await db.query.user.findFirst({
    where: eq(user.username, username),
  });

  if (!found || found.status === "Inactive") {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  const identities = await db.query.identity.findMany({
    where: eq(identity.ownerId, found.id),
  });

  return toPublicUser(found, identities);
}

export async function searchUsers(input: PageInput) {
  const users = await db.query.user.findMany({
    orderBy: [asc(user.username)],
  });
  const identities = await db.query.identity.findMany();

  const filtered = users
    .filter((item) => item.status === "Active")
    .filter((item) => matchesSearch(input.search, [item.id, item.name, item.username]))
    .map((item) =>
      toPublicUser(
        item,
        identities.filter((identityItem) => identityItem.ownerId === item.id),
      ),
    );

  return paginate(filtered, input);
}
