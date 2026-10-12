import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { Effect } from "effect";
import { defineConfig } from "vite-plus";

const readMigrations = Effect.promise(() =>
  readD1Migrations({ migrationsDir: "drizzle", migrationsPattern: "drizzle/*/migration.sql" }),
);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflareTest(() =>
      Effect.runPromise(
        readMigrations.pipe(
          Effect.map((migrations) => ({
            main: "./test/worker.ts",
            miniflare: {
              compatibilityDate: "2026-09-01",
              compatibilityFlags: ["nodejs_compat"],
              d1Databases: ["DB"],
              r2Buckets: ["SEARCH"],
              queueProducers: { INGEST: { queueName: "ingest" } },
              durableObjects: {
                GUILD_STORE: { className: "GuildStore", useSQLite: true },
                REQUEST_COUNTER: { className: "RequestCounter", useSQLite: true },
              },
              ai: { binding: "AI" },
              secretsStoreSecrets: { MASTER_KEY: { store_id: "test", secret_name: "master-key" } },
              bindings: {
                DISCORD_BOT_TOKEN: `${btoa("900")}.test.token`,
                TEST_MIGRATIONS: migrations,
              },
            },
          })),
        ),
      ),
    ),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
    deps: { optimizer: { ssr: { enabled: true, include: ["discord-api-types/v10"] } } },
  },
});
