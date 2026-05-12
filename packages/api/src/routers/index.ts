import type { RouterClient } from "@orpc/server";
import z from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
  deleteIdentity,
  linkSolanaIdentity,
  listIdentitiesByUsername,
  requestIdentityChallenge,
  verifyIdentityChallenge,
} from "../services/identities";
import { createPayment, listMyPayments } from "../services/payments";
import {
  createPost,
  deletePost,
  findPostById,
  listAuthoredPosts,
  listPublishedPosts,
  listPurchasedPosts,
  updatePost,
} from "../services/posts";
import { createPrice, deletePrice, updatePrice } from "../services/prices";
import { findUserByUsername, getMe, searchUsers, updateMe } from "../services/users";

const pagingInput = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  page: z.number().int().min(1).optional(),
  search: z.string().trim().optional(),
});

const tokenInput = z.enum(["Bonk", "Sol", "Usdc"]);

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  identities: {
    delete: protectedProcedure.input(z.object({ identityId: z.string().min(1) })).handler(({ context, input }) => {
      return deleteIdentity(context.session.user.id, input.identityId);
    }),
    linkSolana: protectedProcedure.input(z.object({ providerId: z.string().min(32) })).handler(({ context, input }) => {
      return linkSolanaIdentity(context.session.user.id, input.providerId);
    }),
    listByUsername: publicProcedure.input(z.object({ username: z.string().min(1) })).handler(({ input }) => {
      return listIdentitiesByUsername(input.username);
    }),
    requestChallenge: protectedProcedure
      .input(z.object({ providerId: z.string().min(32) }))
      .handler(({ context, input }) => {
        return requestIdentityChallenge(
          context.session.user.id,
          input.providerId,
          context.request.userAgent,
        );
      }),
    verifyChallenge: protectedProcedure
      .input(
        z.object({
          challenge: z.string().min(1),
          providerId: z.string().min(32),
          signature: z.string().min(1),
        }),
      )
      .handler(({ context, input }) => {
        return verifyIdentityChallenge(context.session.user.id, input, context.request.userAgent);
      }),
  },
  payments: {
    create: protectedProcedure
      .input(
        z.object({
          postId: z.string().min(1),
          priceId: z.string().min(1),
          signature: z.string().min(1),
        }),
      )
      .handler(({ context, input }) => {
        return createPayment(context.session.user.id, input);
      }),
    listMine: protectedProcedure.input(pagingInput).handler(({ context, input }) => {
      return listMyPayments(context.session.user.id, input);
    }),
  },
  posts: {
    byId: publicProcedure.input(z.object({ postId: z.string().min(1) })).handler(({ context, input }) => {
      return findPostById(context.session?.user.id, input.postId);
    }),
    create: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1),
          title: z.string().min(1),
        }),
      )
      .handler(({ context, input }) => {
        return createPost(context.session.user.id, input);
      }),
    delete: protectedProcedure.input(z.object({ postId: z.string().min(1) })).handler(({ context, input }) => {
      return deletePost(context.session.user.id, input.postId);
    }),
    listAuthored: protectedProcedure.input(pagingInput).handler(({ context, input }) => {
      return listAuthoredPosts(context.session.user.id, input);
    }),
    listPublished: publicProcedure
      .input(pagingInput.extend({ username: z.string().min(1).optional() }))
      .handler(({ context, input }) => {
        return listPublishedPosts(context.session?.user.id, input);
      }),
    listPurchased: protectedProcedure
      .input(pagingInput.extend({ username: z.string().min(1).optional() }))
      .handler(({ context, input }) => {
        return listPurchasedPosts(context.session.user.id, input);
      }),
    update: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).optional(),
          postId: z.string().min(1),
          title: z.string().min(1).optional(),
        }),
      )
      .handler(({ context, input }) => {
        return updatePost(context.session.user.id, input.postId, {
          content: input.content,
          title: input.title,
        });
      }),
  },
  prices: {
    create: protectedProcedure
      .input(
        z.object({
          amount: z.string().min(1),
          postId: z.string().min(1),
          token: tokenInput,
        }),
      )
      .handler(({ context, input }) => {
        return createPrice(context.session.user.id, input);
      }),
    delete: protectedProcedure.input(z.object({ priceId: z.string().min(1) })).handler(({ context, input }) => {
      return deletePrice(context.session.user.id, input.priceId);
    }),
    update: protectedProcedure
      .input(
        z.object({
          amount: z.string().min(1),
          priceId: z.string().min(1),
        }),
      )
      .handler(({ context, input }) => {
        return updatePrice(context.session.user.id, input.priceId, { amount: input.amount });
      }),
  },
  users: {
    byUsername: publicProcedure.input(z.object({ username: z.string().min(1) })).handler(({ input }) => {
      return findUserByUsername(input.username);
    }),
    me: protectedProcedure.handler(({ context }) => {
      return getMe(context.session.user.id);
    }),
    search: publicProcedure.input(pagingInput).handler(({ input }) => {
      return searchUsers(input);
    }),
    updateMe: protectedProcedure
      .input(
        z.object({
          avatarUrl: z.string().trim().nullable().optional(),
          developer: z.boolean().optional(),
          name: z.string().trim().nullable().optional(),
          username: z
            .string()
            .trim()
            .min(2)
            .regex(/^[a-z0-9-]+$/)
            .optional(),
        }),
      )
      .handler(({ context, input }) => {
        return updateMe(context.session.user.id, input);
      }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
