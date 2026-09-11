import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Next dev reloads modules on every edit; without this the pool would be
 * recreated each time and Postgres would run out of connections.
 */
const globalForDb = globalThis as unknown as {
  __client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__client ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__client = client;
}

export const db = drizzle(client, { schema });
export { schema };
