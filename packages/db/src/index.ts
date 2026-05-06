import { env } from "@cm/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createDb() {
  const client = createClient({
    authToken: env.DATABASE_AUTH_TOKEN,
    url: env.DATABASE_URL,
  });

  return drizzle({ client, schema });
}

export const db = createDb();
