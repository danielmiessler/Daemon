import { afterEach, expect, test } from 'bun:test'
import { parseFeed, refreshFeed, refreshFeedOnce, type Env } from '../src/worker'

// ─── Fakes: in-memory KV, assets serving a daemon-data.json, and a scripted fetch ───

function fakeEnv(feeds: any[], secrets: Partial<Env> = {}) {
  const kv = new Map<string, string>()
  const env = {
    ASSETS: { fetch: async () => Response.json({ feeds }) },
    FEED_KV: {
      get: async (k: string) => kv.get(k) ?? null,
      put: async (k: string, v: string) => { kv.set(k, v) },
      delete: async (k: string) => { kv.delete(k) },
    },
    ...secrets,
  } as unknown as Env
  return { env, kv }
}

const realFetch = globalThis.fetch
const calls: Array<{ url: string; init?: RequestInit }> = []
function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  calls.length = 0
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url
    calls.push({ url, init })
    return handler(url)
  }) as typeof fetch
}
afterEach(() => { globalThis.fetch = realFetch })

const rssItem = (title: string, link: string) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>Mon, 05 Jan 2026 10:00:00 GMT</pubDate></item>`

// ─── Parser ───

test('parseFeed decodes numeric entities and decodes &amp; only once', () => {
  const xml = `<rss>${rssItem('It&#8217;s here &#x2014; &amp;lt;b&amp;gt;', 'https://example.com/a')}</rss>`
  expect(parseFeed(xml, 'Blog', 5)[0]?.title).toBe('It’s here — &lt;b&gt;')
})

test('parseFeed picks the alternate Atom link over replies/edit links', () => {
  const xml = `<feed><entry><title>T</title>
    <link rel="replies" href="https://example.com/comments"/>
    <link rel='alternate' href='https://example.com/post'/>
    <updated>2026-01-01T00:00:00Z</updated></entry></feed>`
  expect(parseFeed(xml, 'Blog', 5)[0]?.url).toBe('https://example.com/post')
})

// ─── Aggregation ───

test('items with non-http(s) URLs are dropped from the feed', async () => {
  mockFetch(() => new Response(`<rss>${rssItem('ok', 'https://example.com/ok')}${rssItem('bad', 'javascript:alert(1)')}</rss>`))
  const { env } = fakeEnv([{ type: 'rss', name: 'Blog', url: 'https://example.com/feed' }])
  const payload = await refreshFeed(env)
  expect(payload.items.map(i => i.title)).toEqual(['ok'])
  expect(payload.sources).toEqual([{ name: 'Blog', ok: true, count: 1 }])
})

test('GitHub keeps only the latest push per repo, and skips events with bad dates', async () => {
  const push = (repo: string, n: number, at: string) =>
    ({ type: 'PushEvent', repo: { name: `ada/${repo}` }, payload: { size: n }, created_at: at })
  mockFetch(() => Response.json([
    push('daemon', 2, '2026-01-05T10:00:00Z'),
    push('daemon', 1, '2026-01-04T10:00:00Z'),
    push('other', 1, 'not a date'),
    push('other', 3, '2026-01-03T10:00:00Z'),
  ]))
  const { env } = fakeEnv([{ type: 'github', name: 'GitHub', user: 'ada' }])
  const payload = await refreshFeed(env)
  expect(payload.items.map(i => i.title)).toEqual(['Pushed 2 commits to daemon', 'Pushed 3 commits to other'])
})

test('X max_results is clamped to the API range', async () => {
  mockFetch(() => Response.json({ data: [] }))
  const { env } = fakeEnv([{ type: 'x', name: 'X', user_id: '1', username: 'ada', max: 500 }], { X_BEARER_TOKEN: 't' })
  await refreshFeed(env)
  expect(calls[0]?.url).toContain('max_results=100')
})

test('Beehiiv posts with a null publish_date are skipped, not dated 1970', async () => {
  mockFetch(() => Response.json({ data: [
    { title: 'Issue 2', web_url: 'https://news.example.com/2', publish_date: 1767607200 },
    { title: 'Draft-ish', web_url: 'https://news.example.com/x', publish_date: null },
  ] }))
  const { env } = fakeEnv([{ type: 'beehiiv', name: 'Newsletter', publication_id: 'pub_1' }], { BEEHIIV_API_KEY: 'k' })
  const payload = await refreshFeed(env)
  expect(payload.items.map(i => i.title)).toEqual(['Issue 2'])
})

// ─── Request-path refresh lock ───

test('refreshFeedOnce skips when another refresh holds the lock', async () => {
  mockFetch(() => new Response('<rss></rss>'))
  const { env, kv } = fakeEnv([{ type: 'rss', name: 'Blog', url: 'https://example.com/feed' }])
  kv.set('feed:refreshing', '1')
  expect(await refreshFeedOnce(env)).toBeNull()
  expect(calls).toHaveLength(0)
})

test('refreshFeedOnce refreshes and releases the lock', async () => {
  mockFetch(() => new Response('<rss></rss>'))
  const { env, kv } = fakeEnv([{ type: 'rss', name: 'Blog', url: 'https://example.com/feed' }])
  expect(await refreshFeedOnce(env)).not.toBeNull()
  expect(kv.has('feed:refreshing')).toBe(false)
  expect(kv.has('feed')).toBe(true)
})

// ─── LinkedIn (paid actor) ───

const linkedin = [{ type: 'linkedin', name: 'LinkedIn', profile_url: 'https://www.linkedin.com/in/ada' }]

test('LinkedIn sends the Apify token in a header, not the URL', async () => {
  mockFetch(() => Response.json([]))
  const { env } = fakeEnv(linkedin, { APIFY_API_KEY: 'secret-token' })
  await refreshFeed(env, true)
  expect(calls[0]?.url).not.toContain('secret-token')
  expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe('Bearer secret-token')
})

test('a failed LinkedIn run backs off instead of re-running on every cron', async () => {
  mockFetch(() => new Response('boom', { status: 502 }))
  const { env, kv } = fakeEnv(linkedin, { APIFY_API_KEY: 'k' })

  const first = await refreshFeed(env, true)
  expect(first.sources[0]?.ok).toBe(false)
  expect(kv.has('feed:linkedin:failed')).toBe(true)

  await refreshFeed(env, true) // next cron
  expect(calls).toHaveLength(1)
})

test('during back-off, stale LinkedIn items are still served', async () => {
  mockFetch(() => new Response('boom', { status: 502 }))
  const { env, kv } = fakeEnv(linkedin, { APIFY_API_KEY: 'k' })
  const old = { source: 'LinkedIn', type: 'linkedin', title: 'Old post', url: 'https://www.linkedin.com/p/1', date: '2026-01-01T00:00:00.000Z' }
  kv.set('feed:linkedin', JSON.stringify({ updated: '2020-01-01T00:00:00.000Z', items: [old] }))
  kv.set('feed:linkedin:failed', 'x')

  const payload = await refreshFeed(env, true)
  expect(payload.items.map(i => i.title)).toEqual(['Old post'])
  expect(calls).toHaveLength(0)
})
