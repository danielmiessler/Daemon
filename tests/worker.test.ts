import { expect, test } from 'bun:test'
import { parseFeed, stripEphemera } from '../src/worker'

const NOW = Date.parse('2026-08-01T12:00:00.000Z')
const PAST = '2026-07-01T00:00:00.000Z'
const FUTURE = '2026-09-01T00:00:00.000Z'

test('expired status and now are nulled; unexpired ones are kept', () => {
  const d = stripEphemera({
    status: { headline: 'Old', expires: PAST },
    now: 'Old now',
    now_meta: { expires: PAST },
  }, NOW)
  expect(d.status).toBeNull()
  expect(d.now).toBeNull()
  expect(d.now_meta).toBeNull()

  const kept = stripEphemera({ status: { headline: 'Fresh', expires: FUTURE } }, NOW)
  expect(kept.status.headline).toBe('Fresh')
})

test('expired offerings and requesting items are filtered out', () => {
  const d = stripEphemera({
    offerings: [{ title: 'Gone', expires: PAST }, { title: 'Evergreen' }],
    requesting: [{ title: 'Soon', expires: FUTURE }, { title: 'Gone', expires: PAST }],
  }, NOW)
  expect(d.offerings.map((o: any) => o.title)).toEqual(['Evergreen'])
  expect(d.requesting.map((o: any) => o.title)).toEqual(['Soon'])
})

test('expired location falls back to location_default', () => {
  const d = stripEphemera({
    current_location: 'Lisbon',
    location_default: 'Pacific Northwest',
    location_meta: { expires: PAST },
  }, NOW)
  expect(d.current_location).toBe('Pacific Northwest')
  expect(d.location_meta).toBeNull()
})

test('expired location with no default is dropped, not kept', () => {
  const d = stripEphemera({ current_location: 'Lisbon', location_meta: { expires: PAST } }, NOW)
  expect(d.current_location).toBeNull()
})

test('unexpired location is kept', () => {
  const d = stripEphemera({ current_location: 'Lisbon', location_meta: { expires: FUTURE } }, NOW)
  expect(d.current_location).toBe('Lisbon')
})

test('served_at is stamped and the input is not mutated', () => {
  const input = { status: { headline: 'Old', expires: PAST } }
  const d = stripEphemera(input, NOW)
  expect(d.served_at).toBe('2026-08-01T12:00:00.000Z')
  expect(input.status).not.toBeNull()
})

test('parseFeed reads RSS 2.0 items', () => {
  const xml = `<rss><channel>
    <item><title><![CDATA[Hello & welcome]]></title><link>https://example.com/a</link><pubDate>Mon, 05 Jan 2026 10:00:00 GMT</pubDate></item>
    <item><title>Second</title><link>https://example.com/b</link><pubDate>Sun, 04 Jan 2026 10:00:00 GMT</pubDate></item>
  </channel></rss>`
  expect(parseFeed(xml, 'Blog', 8)).toEqual([
    { source: 'Blog', type: 'rss', title: 'Hello & welcome', url: 'https://example.com/a', date: '2026-01-05T10:00:00.000Z' },
    { source: 'Blog', type: 'rss', title: 'Second', url: 'https://example.com/b', date: '2026-01-04T10:00:00.000Z' },
  ])
})

test('parseFeed reads Atom entries', () => {
  const xml = `<feed><entry><title>Video</title><link rel="alternate" href="https://example.com/v"/><published>2026-01-05T10:00:00+00:00</published></entry></feed>`
  expect(parseFeed(xml, 'YouTube', 8)).toEqual([
    { source: 'YouTube', type: 'rss', title: 'Video', url: 'https://example.com/v', date: '2026-01-05T10:00:00.000Z' },
  ])
})

test('parseFeed respects max and skips items missing a title, link, or date', () => {
  const item = (t: string) => `<item><title>${t}</title><link>https://example.com/${t}</link><pubDate>Mon, 05 Jan 2026 10:00:00 GMT</pubDate></item>`
  const broken = '<item><title>No date</title><link>https://example.com/x</link></item>'
  expect(parseFeed(`<rss>${item('a')}${broken}${item('b')}${item('c')}</rss>`, 'Blog', 3).map(i => i.title)).toEqual(['a', 'b'])
})
