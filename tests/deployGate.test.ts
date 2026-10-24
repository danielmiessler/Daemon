import { expect, test } from 'bun:test'
import { gate } from '../instance-template/DeployGate'
import example from '../cms/public/daemon-data.example.json'

const NOW = Date.parse('2026-08-01T12:00:00.000Z')
const PAST = '2026-07-01T00:00:00.000Z'
const FUTURE = '2026-09-01T00:00:00.000Z'

const rules = (data: Record<string, any>) => gate(data, NOW).map(v => `${v.rule}:${v.where}`)

test('the shipped example passes', () => {
  expect(gate(example, NOW)).toEqual([])
})

test('status needs a parseable, unexpired expires', () => {
  expect(rules({ status: { headline: 'Building' } })).toEqual(['ttl:status'])
  expect(rules({ status: { headline: 'Building', expires: PAST } })).toEqual(['ttl:status'])
  expect(rules({ status: { headline: 'Building', expires: FUTURE } })).toEqual([])
})

test('now needs now_meta.expires', () => {
  expect(rules({ now: 'Shipping' })).toEqual(['ttl:now'])
  expect(rules({ now: 'Shipping', now_meta: { expires: FUTURE } })).toEqual([])
})

test('offerings with temporal language need expires; expired ones are blocked', () => {
  expect(rules({ offerings: [{ title: 'Office hours this week' }] })).toEqual(['ttl:offerings[0]'])
  expect(rules({ offerings: [{ title: 'Office hours this week', expires: FUTURE }] })).toEqual([])
  expect(rules({ requesting: [{ title: 'Reviewers', expires: PAST }] })).toEqual(['ttl:requesting[0]'])
})

test('location different from the default needs an unexpired location_meta.expires', () => {
  const base = { location_default: 'Pacific Northwest' }
  expect(rules({ ...base, current_location: 'Pacific Northwest' })).toEqual([])
  expect(rules({ ...base, current_location: 'Lisbon' })).toEqual(['ttl:current_location'])
  expect(rules({ ...base, current_location: 'Lisbon', location_meta: { expires: FUTURE } })).toEqual([])
  expect(rules({ ...base, current_location: 'Lisbon', location_meta: { expires: PAST } })).toEqual(['ttl:current_location'])
})

test('location with no default at all needs expires', () => {
  expect(rules({ current_location: 'Lisbon' })).toEqual(['ttl:current_location'])
  expect(rules({ current_location: 'Lisbon', location_meta: { expires: FUTURE } })).toEqual([])
})

test('location patterns are caught in any field, not just location fields', () => {
  expect(rules({ narrative: 'Home base is 47.6062, -122.3321' })).toEqual(['location:narrative'])
  expect(rules({ resume: [{ summary: 'Office at 500 Market Street' }] })).toEqual(['location:resume[0].summary'])
  expect(rules({ projects: { personal: ['Garden at 12 elm st'] } })).toEqual(['location:projects.personal[0]'])
})

test('ZIP codes from any state are caught', () => {
  expect(rules({ about: 'Based near 10001' })).toEqual(['location:about'])
  expect(rules({ about: 'Based near 94110-1234' })).toEqual(['location:about'])
})

test('ZIP check ignores money, decimals, and URLs', () => {
  expect(rules({ about: 'Raised $25000 for the project' })).toEqual([])
  expect(rules({ about: 'Accuracy 0.12345 on the benchmark' })).toEqual([])
  expect(rules({ resume_link: 'https://example.com/posts/12345' })).toEqual([])
})

test('lowercase prose without a street abbreviation is not an address', () => {
  expect(rules({ about: 'Spent 3 days on the road' })).toEqual([])
})

test('real-time presence phrasing requires realtime_approved', () => {
  const status = { headline: "I'm at the conference", expires: FUTURE }
  expect(rules({ status })).toEqual(['realtime:status'])
  expect(rules({ status: { ...status, realtime_approved: true } })).toEqual([])
})

test('credentials anywhere in the payload are blocked', () => {
  expect(rules({ preferences: ['key sk-abcdefghijklmnopqrstuvwxyz'] })).toEqual(['credential:payload'])
})

test('feed sources must be public https', () => {
  expect(rules({ feeds: [{ type: 'rss', url: 'http://example.com/feed' }] })).toEqual(['feeds:feeds[0]'])
  expect(rules({ feeds: [{ type: 'rss', url: 'https://192.168.1.5/feed' }] })).toEqual(['feeds:feeds[0]'])
  expect(rules({ feeds: [{ type: 'rss', url: 'https://example.com/feed' }] })).toEqual([])
})
