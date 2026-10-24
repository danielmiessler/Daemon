# Daemon

A personal "daemon": a VitePress dashboard plus a Cloudflare Worker that serves it,
strips expired data at the edge, and aggregates a public activity feed. See README.md
for the architecture (public framework repo + private instance repo).

## Layout

- `src/worker.ts` — Cloudflare Worker: `/daemon-data.json` (expired ephemera stripped),
  `/feed.json` (KV-cached feed, refreshed by a 30-min cron), everything else from static assets
- `cms/.vitepress/theme/` — custom VitePress theme (no default theme); the whole page is
  `components/DaemonDashboard.vue`, which fetches `/daemon-data.json` at runtime
- `instance-template/` — `DeployGate.ts` (pre-deploy safety gate) and `deploy.sh`, copied
  into the user's private instance repo
- `tests/` — `bun test` suites for the gate, the worker, and the hero state selector

## Commands

Use Bun for everything (`bun install`, `bun run <script>`, `bunx <tool>`).

- `bun run dev` — local site (needs `cms/public/daemon-data.json`; copy the example)
- `bun run build` — static build to `cms/.vitepress/dist`
- `bun test` / `bun run typecheck`
- `bunx wrangler deploy` — normally run via the instance's `deploy.sh`, never by hand with real data

## Invariants

- Never commit `cms/public/daemon-data.json` — it's personal data, injected at deploy time.
- Nothing time-bound may be baked into the static build: the page renders only what the
  Worker serves. Don't reintroduce a build-time import of `daemon-data.json`.
- TTL rules are enforced in three places that must stay consistent: `DeployGate.ts`,
  `stripEphemera` in the worker, and the client-side guards (`currentState.ts`, the dashboard).
- The worker reads only its own assets, its own KV, and public URLs listed in the data file.
