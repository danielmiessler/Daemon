# MCP Server Setup

This guide walks you through deploying the Daemon MCP Worker — a Cloudflare Worker that exposes your `daemon.md` data as a queryable [Model Context Protocol](https://modelcontextprotocol.io) endpoint.

Once deployed, AI assistants (Claude, Cursor, etc.) can query your daemon directly.

## Prerequisites

- A deployed Daemon Pages site (your `daemon.md` is publicly accessible at `https://your-daemon-domain.com/daemon.md`)
- A [Cloudflare account](https://cloudflare.com) (free tier works)
- [Bun](https://bun.sh) installed
- Wrangler authenticated: `bunx wrangler login`

## 1. Update the daemon URL

In `mcp-worker/src/index.ts`, update the first line to point to your deployed Pages site:

```typescript
const DAEMON_MD_URL = 'https://your-daemon-domain.com/daemon.md';
```

## 2. Configure the Worker

Edit `mcp-worker/wrangler.toml`:

```toml
name = "yourname-daemon-mcp"   # unique Worker name in your Cloudflare account
main = "src/index.ts"
compatibility_date = "2025-08-20"
workers_dev = true

# Optional: add a custom domain (e.g. mcp.daemon.yourdomain.com)
# See step 4 for custom domain setup.
# routes = [{ pattern = "mcp.daemon.yourdomain.com", custom_domain = true }]

[observability]
enabled = false
```

> **Important:** If you add a `routes` field, it must appear **before** any `[section]` headers in the file. TOML parses keys as part of the nearest preceding section — a `routes` field inside `[observability]` will be silently ignored and your custom domain will not be registered.

## 3. Deploy

```bash
cd mcp-worker
bun install
bun run deploy
```

Wrangler will print your Worker URL:

```
Deployed daemon-mcp triggers
  https://yourname-daemon-mcp.your-account.workers.dev
```

Your MCP endpoint is now live at that URL. Test it:

```bash
curl -s -X POST https://yourname-daemon-mcp.your-account.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python3 -m json.tool
```

You should see a list of 13 tools, each with an `inputSchema` field.

## 4. Custom domain (optional)

To use a custom subdomain like `mcp.daemon.yourdomain.com`:

1. Make sure `yourdomain.com` is managed by Cloudflare (nameservers pointed at Cloudflare).
2. Uncomment and update the `routes` line in `wrangler.toml` **before** the `[observability]` section:

```toml
routes = [{ pattern = "mcp.daemon.yourdomain.com", custom_domain = true }]

[observability]
enabled = false
```

3. Run `bun run deploy` again. Cloudflare will provision the DNS record and TLS certificate automatically.

DNS propagation to upstream resolvers can take up to 24 hours. You can verify it's live on Cloudflare's resolver immediately:

```bash
dig @1.1.1.1 mcp.daemon.yourdomain.com
```

## 5. Connect to Claude Code

### Project-scoped (recommended)

Add to `~/.claude.json` in your project root. This makes the MCP server available only when working in this project:

```json
{
  "mcpServers": {
    "daemon": {
      "type": "http",
      "url": "https://yourname-daemon-mcp.your-account.workers.dev"
    }
  }
}
```

### Global (all Claude Code sessions)

Add to `~/.claude/settings.json` to make it available everywhere:

```json
{
  "mcpServers": {
    "daemon": {
      "type": "http",
      "url": "https://yourname-daemon-mcp.your-account.workers.dev"
    }
  }
}
```

After adding either config, run `/mcp` in Claude Code to verify the connection. You should see the server listed as connected with 13 tools available.

## How it works

The Worker:

1. Receives JSON-RPC requests from MCP clients
2. Fetches `daemon.md` from your Pages site (cached at the edge for 5 minutes)
3. Parses the section-based format and routes tool calls to the appropriate section
4. Returns results as MCP `text` content

The Worker implements the [MCP Streamable HTTP transport](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http):

- `POST /` — handles all JSON-RPC requests
- `GET /` — returns `405 Method Not Allowed` (server-push SSE not supported)
- `OPTIONS /` — CORS preflight
- Requests without an `id` (notifications) return `202 Accepted` with no body
- All tool definitions include `inputSchema` — required by MCP clients for validation

## Available tools

| Tool | Description |
|------|-------------|
| `get_about` | Basic information |
| `get_mission` | Mission statement |
| `get_telos` | Full TELOS framework (raw text) |
| `get_telos_structured` | TELOS as structured JSON with sub-bullets |
| `get_current_location` | Current location |
| `get_favorite_books` | Reading list |
| `get_currently_reading` | Current fiction/hobby reading |
| `get_favorite_movies` | Movie recommendations |
| `get_favorite_podcasts` | Podcast recommendations |
| `get_preferences` | Work style and preferences |
| `get_predictions` | Predictions about the future |
| `get_all` | Everything as structured JSON |
| `get_section` | Any section by name (e.g. `ABOUT`, `TELOS`) |
