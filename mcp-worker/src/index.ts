// Update this URL to point to your deployed Pages site's daemon.md
const DAEMON_MD_URL = 'https://daemon.danielmiessler.com/daemon.md';

const EMPTY_SCHEMA = { type: 'object', properties: {} } as const;

const TOOLS = [
  { name: 'get_about',            description: 'Get basic information about this person',            inputSchema: EMPTY_SCHEMA },
  { name: 'get_mission',          description: 'Get current mission statement',                       inputSchema: EMPTY_SCHEMA },
  { name: 'get_telos',            description: 'Get complete TELOS framework',                        inputSchema: EMPTY_SCHEMA },
  { name: 'get_current_location', description: 'Get current location',                               inputSchema: EMPTY_SCHEMA },
  { name: 'get_favorite_books',   description: 'Get recommended reading list',                        inputSchema: EMPTY_SCHEMA },
  { name: 'get_favorite_movies',  description: 'Get movie recommendations',                           inputSchema: EMPTY_SCHEMA },
  { name: 'get_favorite_podcasts',description: 'Get podcast recommendations',                         inputSchema: EMPTY_SCHEMA },
  { name: 'get_preferences',      description: 'Get work style and preferences',                      inputSchema: EMPTY_SCHEMA },
  { name: 'get_predictions',      description: 'Get predictions about the future',                    inputSchema: EMPTY_SCHEMA },
  { name: 'get_currently_reading',description: 'Get current fiction/hobby reading',                  inputSchema: EMPTY_SCHEMA },
  { name: 'get_telos_structured', description: 'Get TELOS as structured JSON with sub-bullets per entry', inputSchema: EMPTY_SCHEMA },
  { name: 'get_all',              description: 'Get all available data as structured JSON',           inputSchema: EMPTY_SCHEMA },
  {
    name: 'get_section',
    description: 'Get a specific section by name',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Section name (e.g. ABOUT, MISSION, TELOS)' },
      },
      required: ['section'],
    },
  },
];

async function fetchDaemonMd(ctx: ExecutionContext): Promise<string> {
  const cacheKey = new Request(DAEMON_MD_URL);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached.text();

  const response = await fetch(DAEMON_MD_URL);
  if (!response.ok) throw new Error(`Failed to fetch daemon.md: ${response.status}`);
  const text = await response.text();

  ctx.waitUntil(
    cache.put(cacheKey, new Response(text, {
      headers: { 'Cache-Control': 'max-age=300', 'Content-Type': 'text/plain' }
    }))
  );

  return text;
}

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentSection: string | null = null;
  const currentContent: string[] = [];

  for (const line of content.split('\n')) {
    if (line.trim().startsWith('#')) continue; // skip comments

    const match = line.match(/^\[([A-Z_]+)\]$/);
    if (match) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = match[1];
      currentContent.length = 0;
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
  return sections;
}

function parseList(text: string): string[] {
  return text
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

// Extract P1/M1/G1-style items from the TELOS section for dashboard rendering
function parseTelosItems(text: string): string[] {
  return text
    .split('\n')
    .filter(line => line.trim().match(/^-\s+[PMG]\d+:/))
    .map(line => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

interface TelosEntry { id: string; title: string; bullets: string[] }
interface TelosStructured { problems: TelosEntry[]; missions: TelosEntry[]; goals: TelosEntry[] }

function parseTelosStructured(text: string): TelosStructured {
  const problems: TelosEntry[] = [];
  const missions: TelosEntry[] = [];
  const goals: TelosEntry[] = [];
  let current: TelosEntry | null = null;

  for (const line of text.split('\n')) {
    const top = line.match(/^-\s+([PMG])(\d+):\s*(.+)/);
    if (top) {
      const [, type, num, title] = top;
      current = { id: `${type}${num}`, title: title.trim(), bullets: [] };
      if (type === 'P') problems.push(current);
      else if (type === 'M') missions.push(current);
      else if (type === 'G') goals.push(current);
      continue;
    }
    const sub = line.match(/^\s{2,}-\s+(.+)/);
    if (sub && current) current.bullets.push(sub[1].trim());
  }

  return { problems, missions, goals };
}

function buildDaemonData(sections: Record<string, string>) {
  return {
    about: sections['ABOUT'],
    mission: sections['MISSION'],
    telos: sections['TELOS'] ? parseTelosItems(sections['TELOS']) : undefined,
    current_location: sections['CURRENT_LOCATION'],
    favorite_books: sections['FAVORITE_BOOKS'] ? parseList(sections['FAVORITE_BOOKS']) : undefined,
    favorite_movies: sections['FAVORITE_MOVIES'] ? parseList(sections['FAVORITE_MOVIES']) : undefined,
    favorite_podcasts: sections['FAVORITE_PODCASTS'] ? parseList(sections['FAVORITE_PODCASTS']) : undefined,
    preferences: sections['PREFERENCES'] ? parseList(sections['PREFERENCES']) : undefined,
    daily_routine: sections['DAILY_ROUTINE'] ? parseList(sections['DAILY_ROUTINE']) : undefined,
    predictions: sections['PREDICTIONS'] ? parseList(sections['PREDICTIONS']) : undefined,
    currently_reading: sections['CURRENTLY_READING'] ? parseList(sections['CURRENTLY_READING']) : undefined,
    last_updated: new Date().toISOString(),
  };
}

function callTool(name: string, sections: Record<string, string>, args?: Record<string, string>): string {
  switch (name) {
    case 'get_about':            return sections['ABOUT'] ?? 'Not available';
    case 'get_mission':          return sections['MISSION'] ?? 'Not available';
    case 'get_telos':            return sections['TELOS'] ?? 'Not available';
    case 'get_current_location': return sections['CURRENT_LOCATION'] ?? 'Not available';
    case 'get_favorite_books':   return sections['FAVORITE_BOOKS'] ?? 'Not available';
    case 'get_favorite_movies':  return sections['FAVORITE_MOVIES'] ?? 'Not available';
    case 'get_favorite_podcasts':return sections['FAVORITE_PODCASTS'] ?? 'Not available';
    case 'get_preferences':      return sections['PREFERENCES'] ?? 'Not available';
    case 'get_predictions':      return sections['PREDICTIONS'] ?? 'Not available';
    case 'get_currently_reading':return sections['CURRENTLY_READING'] ?? 'Not available';
    case 'get_telos_structured': return JSON.stringify(parseTelosStructured(sections['TELOS'] ?? ''));
    case 'get_all':              return JSON.stringify(buildDaemonData(sections));
    case 'get_section': {
      const key = args?.section?.toUpperCase();
      return key && sections[key] ? sections[key] : 'Section not found';
    }
    default: return 'Tool not found';
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Session-Id, MCP-Protocol-Version, Last-Event-ID',
};

function jsonRpcOk(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', result, id }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function jsonRpcErr(id: unknown, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id }), {
    status: 400,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // MCP Streamable HTTP spec: GET is not supported for server-push-less implementations
    if (request.method === 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    let body: { method?: string; params?: { name?: string; arguments?: Record<string, string> }; id?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonRpcErr(null, -32700, 'Parse error');
    }

    const { method, params, id } = body;

    // Notifications and responses have no id — return 202 Accepted per spec
    if (id === undefined || id === null) {
      return new Response(null, { status: 202, headers: CORS });
    }

    if (method === 'initialize') {
      return jsonRpcOk(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'daemon-mcp', version: '1.0.0' },
      });
    }

    if (method === 'tools/list') {
      return jsonRpcOk(id, { tools: TOOLS });
    }

    if (method === 'tools/call') {
      try {
        const content = await fetchDaemonMd(ctx);
        const sections = parseSections(content);
        const result = callTool(params?.name ?? '', sections, params?.arguments);
        return jsonRpcOk(id, { content: [{ type: 'text', text: result }] });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        return jsonRpcErr(id, -32603, message);
      }
    }

    return jsonRpcErr(id, -32601, 'Method not found');
  },
};
