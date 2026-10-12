const MIGRATION_FILES: Readonly<Record<string, string>> = import.meta.glob(
  "/drizzle-guild/*/migration.sql",
  { query: "?raw", import: "default", eager: true },
);

const FOLDER_FROM_END = -2;

const GUILD_MIGRATIONS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MIGRATION_FILES).map(([path, query]) => [
    path.split("/").at(FOLDER_FROM_END) ?? path,
    query,
  ]),
);

export { GUILD_MIGRATIONS };
