import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Array, Record, pipe } from "effect";

const MIGRATION_FILES: Readonly<Record<string, string>> = import.meta.glob(
  "/drizzle-guild/*/migration.sql",
  { query: "?raw", import: "default", eager: true },
);

const FOLDER_FROM_END = -2;

const GUILD_MIGRATIONS: Readonly<Record<string, string>> = Record.fromEntries(
  pipe(
    Record.toEntries(MIGRATION_FILES),
    Array.map(([path, query]) => [path.split("/").at(FOLDER_FROM_END) ?? path, query]),
  ),
);

const migrateGuild = (db: DrizzleSqliteDODatabase): void => {
  migrate(db, { migrations: GUILD_MIGRATIONS });
};

export { migrateGuild };
