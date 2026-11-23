# mirucord

Follow `masseater-ecosystem`, a skill in masseater/skills that says which skills to load in each situation. `vp install` puts the skills in `.agents/skills/`.

mirucord is a hosted service providing read-only MCP servers for Discord servers. Production runs at `https://mirucord.masseater.dev`.

## Tech stack

The base stack is TypeScript 7, Effect, Alchemy and Cloudflare.

## Commands

- To run one test, run `vp exec vp test run <file>` in that workspace.

## Rules

### Way of working

- Write upcoming work and open questions in docs/roadmap.md. Screens and wording follow DESIGN.md.
- Nothing is in real operation or released yet (as of 2026-10-12). Destroying the database or rebuilding the architecture is fine.
- Report to the user only results, and operations only the user can do.
- Do not ask the user to do anything on their own machine. Finish everything in the cloud session.
- When you get one comment on wording or design, review every screen of the app by the same standard.
- Read a workspace's AGENTS.md before changing that workspace.
- The Discord Gateway connection and the HTTP Worker are separate workspaces, and main's CI deploys both.
- Do not land parts ahead of their users; put them in the same PR as the code that uses them.

### Expected scale and performance requirements

Base designs, load estimates and cost estimates on the next scale, not the current one.

| Item | Assumption |
| --- | --- |
| Servers | 500 |
| Members per server | 200 on average, 1,000 at most |
| Daily users | Half the members of each server |

| Item | Requirement |
| --- | --- |
| Concurrent requests per server | 1,000 |
| Total requests | 1,000 per second |
| Ingested messages | 2,000 per server per day |
| Response time | Handle the load above in parallel and answer each request within 3 minutes of the Worker receiving it. Within that, lower response time and cost are better. Do not rely on the MCP tasks extension |

- Take the per-server member counts, post counts, request counts, and DO row counts, sizes and wall time used in estimates from production through the Cloudflare GraphQL Analytics API and the Discord API, and write the values and the date into the estimate.
- `作業配信` is the name of a server, not a streamer's server.

### Cloudflare and Alchemy

- The free allowances included in Paid, such as D1, Queues, Workers AI and Durable Objects, may be used. Do not bring up the Free plan's limits.
- Do not pull domains, repository names or strings used to derive keys into constants.
- Keep `APP_NAME` separate from `SERVICE_NAME`.
- Changing `APP_NAME` or a stack name recreates the resources, including Random values. Before renaming a stack, copy its state to the new stack name.
- Work that needs the GitHub Actions Secrets API and the Cloudflare Global API Key, such as applying the `mirucord-ci` stack, is done through Remote Control on the user's PC.

### Docs and template

- Do not add new files under docs/. Update existing files and remove finished plans and history.
- When you change the scaffolding (hooks, lint, CI), make the same change in masseater/typescript-template and release it there.
