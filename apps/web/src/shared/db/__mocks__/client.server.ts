import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

import { authRelations } from "#/shared/auth/generated/auth.table";

const sqlite = drizzle(":memory:", { relations: authRelations });

migrate(sqlite, { migrationsFolder: new URL("../../../../drizzle", import.meta.url).pathname });

const db = Object.assign(sqlite, {
  batch: (statements: readonly Readonly<{ all: () => unknown }>[]) =>
    Promise.resolve(sqlite.transaction(() => statements.map((statement) => statement.all()))),
});

export { db };
