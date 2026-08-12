import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

// Runtime DB client — deliberately different from drizzle.config.ts's own
// connection setup. That file is drizzle-kit's (a separate CLI tool); this
// one is what the actual Elysia app imports. See ADR-020.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}

export const db = drizzle(databaseUrl, { schema });
