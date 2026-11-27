# web

This workspace is the mirucord web Worker on Cloudflare. It serves the dashboard and the OAuth flow, ingests the jobs that `apps/gateway` posts, and serves the read-only MCP servers at `/mcp`. Production runs at `https://mirucord.masseater.dev`.

Migrations are in `drizzle/` and `drizzle-guild/`. Nothing is in real operation yet, so a migration may rebuild a database instead of carrying data over.

`src/app/routeTree.gen.ts` is generated. Do not edit it.
