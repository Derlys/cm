import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const post = sqliteTable(
  "post",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("post_authorId_idx").on(table.authorId),
    index("post_createdAt_idx").on(table.createdAt),
  ],
);

export const price = sqliteTable(
  "price",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    token: text("token", { enum: ["Bonk", "Sol", "Usdc"] }).notNull(),
    amount: text("amount").notNull(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("price_postId_idx").on(table.postId),
    uniqueIndex("price_postId_token_unique").on(table.postId, table.token),
  ],
);

export const payment = sqliteTable(
  "payment",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    signature: text("signature").notNull(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    priceId: text("price_id")
      .notNull()
      .references(() => price.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("payment_ownerId_idx").on(table.ownerId),
    index("payment_postId_idx").on(table.postId),
    uniqueIndex("payment_postId_ownerId_unique").on(table.postId, table.ownerId),
  ],
);

export const identity = sqliteTable(
  "identity",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    provider: text("provider", { enum: ["Solana"] }).notNull(),
    providerId: text("provider_id").notNull(),
    name: text("name"),
    profile: text("profile", { mode: "json" }).$type<Record<string, unknown> | null>(),
    verified: integer("verified", { mode: "boolean" }).default(false).notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("identity_ownerId_idx").on(table.ownerId),
    uniqueIndex("identity_provider_providerId_unique").on(table.provider, table.providerId),
  ],
);

export const identityChallenge = sqliteTable(
  "identity_challenge",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    challenge: text("challenge").notNull().unique(),
    signature: text("signature"),
    ip: text("ip").notNull(),
    userAgent: text("user_agent").notNull(),
    verified: integer("verified", { mode: "boolean" }).default(false).notNull(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["Solana"] }).notNull(),
    providerId: text("provider_id").notNull(),
  },
  (table) => [
    index("identityChallenge_identityId_idx").on(table.identityId),
    index("identityChallenge_provider_providerId_idx").on(table.provider, table.providerId),
  ],
);

export const postRelations = relations(post, ({ many, one }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
  payments: many(payment),
  prices: many(price),
}));

export const priceRelations = relations(price, ({ many, one }) => ({
  payments: many(payment),
  post: one(post, {
    fields: [price.postId],
    references: [post.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  owner: one(user, {
    fields: [payment.ownerId],
    references: [user.id],
  }),
  post: one(post, {
    fields: [payment.postId],
    references: [post.id],
  }),
  price: one(price, {
    fields: [payment.priceId],
    references: [price.id],
  }),
}));

export const identityRelations = relations(identity, ({ many, one }) => ({
  challenges: many(identityChallenge),
  owner: one(user, {
    fields: [identity.ownerId],
    references: [user.id],
  }),
}));

export const identityChallengeRelations = relations(identityChallenge, ({ one }) => ({
  identity: one(identity, {
    fields: [identityChallenge.identityId],
    references: [identity.id],
  }),
}));
