import { auth } from "@cm/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    auth: null,
    request: {
      userAgent: context.req.header("user-agent") ?? "unknown",
    },
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
