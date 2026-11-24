// TELOS entry codes.
//
// Entries in the `telos` array are written as "<Code><number>: text" — e.g.
// "P1: Not enough people understand ...". The letter is the TELOS section; the
// number is a stable identifier (M1 answers P1), NOT a priority ranking.
//
// Framework: https://github.com/danielmiessler/Telos
const TELOS_CODE_LABELS: Record<string, string> = {
  P: 'Problem',
  M: 'Mission',
  N: 'Narrative',
  G: 'Goal',
  C: 'Challenge',
  I: 'Idea',
  K: 'Metric (KPI)',
}

// Only the recognised TELOS code letters are treated as codes — derived from the
// map above so the parser, the labels, and the popover legend can never drift.
const CODES = Object.keys(TELOS_CODE_LABELS).join('') // 'PMNGCIK'
const ID_RE = new RegExp(`^([${CODES}])(\\d+)`, 'i')
const PREFIX_RE = new RegExp(`^[${CODES}]\\d+:\\s*`, 'i')
const CODE_RE = new RegExp(`^([${CODES}])\\d+`, 'i')

/** The "<code><number>" id at the start of a telos entry (e.g. "P1"), uppercased; '---' when the leading code isn't a known TELOS code. */
export function extractTelosId(item: string): string {
  const m = item.match(ID_RE)
  return m ? m[1].toUpperCase() + m[2] : '---'
}

/** The entry text with a recognised "<code><number>: " prefix removed. */
export function extractTelosText(item: string): string {
  return item.replace(PREFIX_RE, '')
}

/** Friendly section name for a telos entry's code, or '' when the code isn't a known TELOS code. */
export function telosCodeLabel(item: string): string {
  const m = item.match(CODE_RE)
  return m ? TELOS_CODE_LABELS[m[1].toUpperCase()] : ''
}

/** Accessible label for the id cell: the id plus its section name when known (e.g. "P1, Problem"). */
export function telosAriaLabel(item: string): string {
  const id = extractTelosId(item)
  const label = telosCodeLabel(item)
  return label ? `${id}, ${label}` : id
}
