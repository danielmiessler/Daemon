#!/usr/bin/env bun
/**
 * DeployGate — deterministic pre-deploy gate for daemon-data.json.
 *
 * Runs on EVERY deploy (wired into deploy.sh) regardless of how the data was
 * edited — by an aggregator, by your AI, or by hand. Pure pattern matching, no
 * LLM. Fails closed: any violation blocks the deploy.
 *
 * What it enforces:
 *   1. TTL discipline — status requires `expires`; `now` requires
 *      now_meta.expires; offerings/requesting items with temporal language
 *      require `expires`; nothing already-expired ships (strip it instead).
 *   2. Location granularity — no street addresses, ZIP codes, coordinates,
 *      or home-area strings in ANY string anywhere in the payload; a
 *      current_location other than location_default (or with no default
 *      at all) requires location_meta.expires.
 *   3. Real-time presence — "tonight / right now / I'm at" phrasing in
 *      status, now, location, or offerings requires an explicit
 *      realtime_approved: true on that item (deliberate, per-item opt-in).
 *   4. Credential patterns — API keys/tokens never ship.
 *   5. Feed sources — https public URLs only (no localhost / RFC1918).
 *
 * Usage (from your instance dir, next to daemon-data.json):
 *   bun DeployGate.ts                    # gate ./daemon-data.json
 *   bun DeployGate.ts --fixture <file>   # gate an alternate file (tests)
 *   bun DeployGate.ts --check            # same checks, softer exit label
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Deterministic rule patterns ───

const STREET_ADDRESS = [
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Ter|Terrace)\b\.?/,
  // Lowercase form ("123 main st") — abbreviated suffixes only, so prose like "3 days on the road" passes
  /\b\d{1,5}\s+(?:[a-z]+\s+){1,3}(?:st|ave|rd|blvd|dr|ln|ct|pl|ter)\b\.?/i,
];
// Any US ZIP(+4). Skips money and decimals ("$10000", "1.50000"); not applied to URLs, whose numeric IDs would false-positive.
const US_ZIP = /(?<![\d$.,])\b\d{5}(?:-\d{4})?\b(?![.,]\d)/;
const COORDINATES = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;
// Home-area strings — put YOUR street/neighborhood/home-city here (this file lives in your PRIVATE instance repo).
const HOME_AREA = /\b(?:YOUR_STREET_NAME|YOUR_HOME_CITY)\b/i; // EDIT: your street/neighborhood/city strings
const REALTIME = /\b(?:tonight|right\s+now|currently\s+at|i'?m\s+at|today\s+at|on[-\s]site\s+at|this\s+evening)\b/i;
const TEMPORAL = /\b(?:tonight|today|tomorrow|this\s+(?:week|weekend|month|evening)|next\s+(?:week|weekend|month|two\s+weeks)|right\s+now)\b/i;

const CREDENTIALS = [
  /sk-[a-zA-Z0-9_-]{20,}/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /\b[A-Z_]+_(?:API_KEY|TOKEN|SECRET)\s*[=:]\s*\S+/,
];

const PRIVATE_URL = /(?:localhost|127\.0\.0\.1|\b10\.\d+\.\d+\.\d+|\b192\.168\.|\b172\.(?:1[6-9]|2\d|3[01])\.)/;

// ─── Gate ───

interface Violation {
  rule: string;
  where: string;
  detail: string;
}

function expired(expires: unknown, now: number): boolean {
  if (typeof expires !== "string") return false;
  const t = Date.parse(expires);
  return !Number.isNaN(t) && t < now;
}

function validExpiry(expires: unknown): boolean {
  return typeof expires === "string" && !Number.isNaN(Date.parse(expires));
}

/** Every string in the payload with a readable path, e.g. ["resume[0].summary", "..."]. */
function strings(value: unknown, path: string, out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, x] of Object.entries(value)) strings(x, path ? `${path}.${k}` : k, out);
  }
  return out;
}

export function gate(data: Record<string, any>, nowMs = Date.now()): Violation[] {
  const v: Violation[] = [];
  const push = (rule: string, where: string, detail: string) => v.push({ rule, where, detail });

  // 1. TTL discipline
  if (data.status) {
    if (!validExpiry(data.status.expires)) push("ttl", "status", "status requires a parseable `expires`");
    else if (expired(data.status.expires, nowMs)) push("ttl", "status", `status expired ${data.status.expires} — remove or refresh it`);
  }
  if (data.now) {
    if (!validExpiry(data.now_meta?.expires)) push("ttl", "now", "`now` requires now_meta.expires");
    else if (expired(data.now_meta.expires, nowMs)) push("ttl", "now", `\`now\` expired ${data.now_meta.expires}`);
  }
  for (const key of ["offerings", "requesting"]) {
    for (const [i, item] of (data[key] ?? []).entries()) {
      const text = `${item.title ?? ""} ${item.description ?? ""}`;
      if (TEMPORAL.test(text) && !validExpiry(item.expires)) {
        push("ttl", `${key}[${i}]`, `time-bound language ("${text.match(TEMPORAL)?.[0]}") requires \`expires\``);
      }
      if (expired(item.expires, nowMs)) push("ttl", `${key}[${i}]`, `expired ${item.expires} — remove it`);
    }
  }

  // Location TTL — with no location_default there is nothing to fall back to, so any location must expire
  if (typeof data.current_location === "string" && data.current_location !== data.location_default) {
    if (!validExpiry(data.location_meta?.expires)) {
      push("ttl", "current_location", data.location_default
        ? "non-default location requires location_meta.expires"
        : "location without a location_default requires location_meta.expires (or set location_default to it if it's permanent)");
    } else if (expired(data.location_meta.expires, nowMs)) {
      push("ttl", "current_location", `location expired ${data.location_meta.expires} — remove or refresh it`);
    }
  }

  // 2. Location granularity — every string in the payload, not just the location fields
  for (const [where, text] of strings(data, "")) {
    const street = STREET_ADDRESS.map((p) => text.match(p)?.[0]).find(Boolean);
    if (street) push("location", where, `street address pattern: "${street}"`);
    if (!/^https?:\/\//.test(text) && US_ZIP.test(text)) push("location", where, `ZIP code pattern: "${text.match(US_ZIP)?.[0]}"`);
    if (COORDINATES.test(text)) push("location", where, "coordinate pattern");
    if (HOME_AREA.test(text)) push("location", where, `home-area string: "${text.match(HOME_AREA)?.[0]}"`);
  }

  // 3. Real-time presence — opt-in per item
  const scanRealtime = (text: string, where: string, holder: any) => {
    if (REALTIME.test(text) && holder?.realtime_approved !== true) {
      push("realtime", where, `real-time presence phrasing ("${text.match(REALTIME)?.[0]}") without realtime_approved: true`);
    }
  };
  if (typeof data.current_location === "string") scanRealtime(data.current_location, "current_location", data.location_meta);
  if (data.status) scanRealtime(`${data.status.headline ?? ""} ${data.status.detail ?? ""}`, "status", data.status);
  if (typeof data.now === "string") scanRealtime(data.now, "now", data.now_meta);
  for (const key of ["offerings", "requesting"]) {
    for (const [i, item] of (data[key] ?? []).entries()) {
      scanRealtime(`${item.title ?? ""} ${item.description ?? ""}`, `${key}[${i}]`, item);
    }
  }

  // 4. Credentials — whole payload
  const whole = JSON.stringify(data);
  for (const pattern of CREDENTIALS) {
    const m = whole.match(pattern);
    if (m) push("credential", "payload", `credential pattern: "${m[0].slice(0, 12)}…"`);
  }

  // 5. Feed sources
  for (const [i, src] of (data.feeds ?? []).entries()) {
    for (const u of [src.url, src.profile_url]) {
      if (u && (!u.startsWith("https://") || PRIVATE_URL.test(u))) {
        push("feeds", `feeds[${i}]`, `source URL must be public https: ${u}`);
      }
    }
  }

  return v;
}

// ─── CLI ───

if (import.meta.main) {
  const args = process.argv.slice(2);
  const fixtureIdx = args.indexOf("--fixture");
  const here = dirname(fileURLToPath(import.meta.url));
  const fixture = fixtureIdx !== -1 ? args[fixtureIdx + 1] : undefined;
  // DeployGate.ts sits next to daemon-data.json in the instance dir (see deploy.sh)
  const file = fixture ?? join(here, "daemon-data.json");

  const data = JSON.parse(readFileSync(file, "utf-8"));
  const violations = gate(data);

  if (violations.length === 0) {
    console.log(`DeployGate PASS — ${file}`);
    process.exit(0);
  }

  console.error(`DeployGate FAIL — ${violations.length} violation(s) in ${file}:\n`);
  for (const { rule, where, detail } of violations) {
    console.error(`  [${rule}] ${where}: ${detail}`);
  }
  console.error(args.includes("--check") ? "\nStale/unsafe data detected." : "\nDeploy blocked. Fix the data and re-run.");
  process.exit(1);
}
