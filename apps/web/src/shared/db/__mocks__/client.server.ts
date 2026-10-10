import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

import { authRelations } from "#/shared/auth/generated/auth.table";

const db = drizzle(":memory:", { relations: authRelations });

migrate(db, { migrationsFolder: new URL("../../../../drizzle", import.meta.url).pathname });

export { db };
