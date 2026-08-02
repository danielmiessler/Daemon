import { expect, test } from 'bun:test'
import { extractTelosId, extractTelosText, telosCodeLabel, telosAriaLabel } from '../cms/.vitepress/theme/telosCodes'

test('telosCodeLabel maps every known TELOS code to its section name', () => {
  expect(telosCodeLabel('P1: a problem')).toBe('Problem')
  expect(telosCodeLabel('M2: a mission')).toBe('Mission')
  expect(telosCodeLabel('N1: a narrative')).toBe('Narrative')
  expect(telosCodeLabel('G3: a goal')).toBe('Goal')
  expect(telosCodeLabel('C4: a challenge')).toBe('Challenge')
  expect(telosCodeLabel('I1: an idea')).toBe('Idea')
  expect(telosCodeLabel('K2: a metric')).toBe('Metric (KPI)')
})

test('telosCodeLabel is case-insensitive on the code letter', () => {
  expect(telosCodeLabel('p1: lowercase code')).toBe('Problem')
})

test('telosCodeLabel returns an empty string for unknown or missing codes', () => {
  expect(telosCodeLabel('Z9: unrecognised code')).toBe('')
  expect(telosCodeLabel('freeform entry, no code')).toBe('')
})

test('extractTelosId returns the id (uppercased) only for a known TELOS code', () => {
  expect(extractTelosId('P1: a problem')).toBe('P1')
  expect(extractTelosId('K12: a metric')).toBe('K12')
  expect(extractTelosId('p1: lowercase')).toBe('P1')
  expect(extractTelosId('Z9: unknown code')).toBe('---')
  expect(extractTelosId('COVID19: not a code')).toBe('---')
  expect(extractTelosId('freeform entry')).toBe('---')
})

test('extractTelosText strips only a recognised "<code>: " prefix', () => {
  expect(extractTelosText('M1: Own the system')).toBe('Own the system')
  expect(extractTelosText('Z9: unknown code stays')).toBe('Z9: unknown code stays')
  expect(extractTelosText('freeform entry')).toBe('freeform entry')
})

test('telosAriaLabel combines the id and section name, or falls back to the id', () => {
  expect(telosAriaLabel('P1: a problem')).toBe('P1, Problem')
  expect(telosAriaLabel('M2: a mission')).toBe('M2, Mission')
  expect(telosAriaLabel('Z9: unknown')).toBe('---')
})
