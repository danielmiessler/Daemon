<template>
  <!-- HERO: crosshair-cornered instrument panels under a live telemetry command bar —
       the page reads like a satellite ground-station console for one human. -->
  <div class="d-root">
    <div class="d-vignette"></div>
    <div class="d-aurora"><i class="au au-1"></i><i class="au au-2"></i><i class="au au-3"></i></div>
    <div class="d-grid-bg"></div>

    <!-- ═══ Command bar ═══ -->
    <header class="cmd">
      <div class="cmd-scan"></div>
      <div class="cmd-inner">
        <div class="cmd-ident">
          <span class="cmd-wordmark">DAEMON</span>
          <span class="cmd-handle">://{{ ownerHandle }}</span>
          <span class="cmd-live"><span class="cmd-live-dot"></span>LIVE</span>
          <a class="cmd-fork" :href="forkUrl" target="_blank" rel="noopener">GET YOUR OWN ↗</a>
        </div>
        <div class="cmd-tele">
          <span class="tele-cell"><span class="tele-k">UTC</span><span class="tele-v">{{ currentDateTime.slice(11, 19) }}</span></span>
          <span class="tele-cell"><span class="tele-k">SYNC</span><span class="tele-v">{{ formatDate(daemonData.last_updated) }}</span></span>
          <span class="tele-cell"><span class="tele-k">SECT</span><span class="tele-v">{{ sectionCount }}</span></span>
          <span class="tele-cell tele-loc"><span class="tele-k">LOC</span><span class="tele-v">{{ daemonData.current_location }}</span></span>
        </div>
        <nav class="cmd-nav">
          <a href="#feed">FEED</a>
          <a href="#telos">TELOS</a>
          <a href="#exchange">EXCHANGE</a>
          <a href="#signal">SIGNAL</a>
        </nav>
      </div>
    </header>

    <!-- ═══ Identity band ═══ -->
    <section class="ident boot" style="--i: 0">
      <div class="ident-left">
        <h1 class="ident-title">DAEMON</h1>
        <p class="ident-sub">A live, machine-readable broadcast of what {{ ownerName }} is doing, building, and thinking.</p>
      </div>
      <div class="ident-right">
        <p class="ident-narrative">{{ daemonData.narrative }}</p>
        <div v-if="heroCurrentState" class="ident-now">
          <span class="now-prompt">&gt;</span>
          <span class="now-text">{{ heroCurrentState }}</span>
          <span class="now-cursor"></span>
        </div>
      </div>
    </section>

    <!-- ═══ Instrument grid ═══ -->
    <main class="dash">

      <!-- Row A: feed + right rail -->
      <section class="panel p-feed boot" id="feed" style="--i: 1">
        <div class="panel-head">
          <span class="panel-idx">01</span>
          <h2 class="panel-label">Live Feed</h2>
          <span class="panel-meta" v-if="feed">{{ feedItems.length }} shown · refreshed {{ relativeTime(feed.updated) }}</span>
        </div>
        <div class="feed-tabs" v-if="feed">
          <button
            v-for="tab in feedTabs"
            :key="tab"
            class="feed-tab"
            :class="{ active: activeFeedTab === tab }"
            @click="activeFeedTab = tab"
          >{{ tab === 'X' ? 'X / Twitter' : tab }}</button>
        </div>
        <div class="feed-list" v-if="feed">
          <a v-for="(item, i) in feedItems" :key="item.url + i" :href="item.url" target="_blank" rel="noopener" class="feed-item">
            <span class="feed-src">{{ item.source }}</span>
            <span class="feed-title">{{ item.title }}</span>
            <span class="feed-time">{{ relativeTime(item.date) }}</span>
          </a>
        </div>
        <div v-else class="feed-wait">ACQUIRING SIGNAL…</div>
      </section>

      <div class="rail">
        <section class="panel boot" style="--i: 2">
          <div class="panel-head">
            <span class="panel-idx">02</span>
            <h2 class="panel-label">Mission</h2>
          </div>
          <p class="mission-text">{{ daemonData.mission }}</p>
        </section>

        <section class="panel boot" id="telos" style="--i: 3">
          <div class="panel-head">
            <span class="panel-idx">03</span>
            <h2 class="panel-label">TELOS</h2>
            <span class="telos-info">
              <button class="telos-info-btn" type="button" aria-label="What is TELOS?" aria-describedby="telos-help">ⓘ</button>
              <span class="telos-info-pop" role="tooltip" id="telos-help">
                <span class="tip-head">TELOS <em>· purpose / end goal</em></span>
                <span class="tip-body">A machine-readable statement of purpose, from Daniel Miessler’s TELOS framework.</span>
                <span class="tip-legend">
                  <span class="tip-code"><b>P</b> Problem</span>
                  <span class="tip-code"><b>M</b> Mission</span>
                  <span class="tip-code"><b>N</b> Narrative</span>
                  <span class="tip-code"><b>G</b> Goal</span>
                  <span class="tip-code"><b>C</b> Challenge</span>
                  <span class="tip-code"><b>I</b> Idea</span>
                  <span class="tip-code"><b>K</b> Metric / KPI</span>
                </span>
                <span class="tip-note">Numbers are stable IDs, not a ranking — e.g. M1 answers P1.</span>
                <a class="tip-link" href="https://github.com/danielmiessler/Telos" target="_blank" rel="noopener">Open the TELOS framework →</a>
              </span>
            </span>
            <span class="panel-meta">{{ daemonData.telos?.length || 0 }}</span>
          </div>
          <div class="telos-list">
            <div v-for="(item, i) in daemonData.telos" :key="i" class="telos-row">
              <span class="telos-id" :title="telosCodeLabel(item)" :aria-label="telosAriaLabel(item)">{{ extractTelosId(item) }}</span>
              <span class="telos-text">{{ extractTelosText(item) }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Row B -->
      <section class="panel span-4 boot" id="predictions" style="--i: 4">
        <div class="panel-head">
          <span class="panel-idx">04</span>
          <h2 class="panel-label">Predictions</h2>
          <span class="panel-meta">{{ daemonData.predictions?.length || 0 }}</span>
        </div>
        <div class="pred-list">
          <div v-for="(pred, i) in daemonData.predictions" :key="i" class="pred-row">
            <span class="pred-text">{{ extractPredictionText(pred) }}</span>
            <span class="pred-conf" :class="getConfidenceClass(pred)">{{ extractConfidence(pred) }}</span>
          </div>
        </div>
      </section>

      <section class="panel span-4 boot" style="--i: 5">
        <div class="panel-head">
          <span class="panel-idx">05</span>
          <h2 class="panel-label">Projects</h2>
        </div>
        <div v-for="(category, key) in daemonData.projects" :key="key" class="proj-group">
          <h3 class="proj-cat">{{ key }}</h3>
          <div v-for="(project, i) in category" :key="i" class="proj-row">{{ extractProjectName(project) }}</div>
        </div>
      </section>

      <div class="rail" id="exchange">
        <section v-if="visibleOfferings.length" class="panel boot" style="--i: 6">
          <div class="panel-head">
            <span class="panel-idx">06</span>
            <h2 class="panel-label">Offering</h2>
            <span class="panel-meta">{{ visibleOfferings.length }}</span>
          </div>
          <div class="ex-list">
            <div v-for="(item, i) in visibleOfferings" :key="i" class="ex-item">
              <span class="ex-text">{{ item.title }}</span>
              <div class="ex-tags"><span v-for="(t, j) in item.tags" :key="j" class="ex-tag">{{ t }}</span></div>
            </div>
          </div>
        </section>

        <section v-if="visibleRequesting.length" class="panel boot" style="--i: 7">
          <div class="panel-head">
            <span class="panel-idx">07</span>
            <h2 class="panel-label">Requesting</h2>
            <span class="panel-meta">{{ visibleRequesting.length }}</span>
          </div>
          <div class="ex-list">
            <div v-for="(item, i) in visibleRequesting" :key="i" class="ex-item req">
              <span class="ex-text">{{ item.title }}</span>
              <div class="ex-tags"><span v-for="(t, j) in item.tags" :key="j" class="ex-tag">{{ t }}</span></div>
            </div>
          </div>
        </section>

        <section v-if="daemonData.resume?.length" class="panel boot" id="resume" style="--i: 7.5">
          <div class="panel-head">
            <span class="panel-idx">08</span>
            <h2 class="panel-label">Resume</h2>
            <span class="panel-meta">{{ daemonData.resume.length }}</span>
          </div>
          <div class="cv-list">
            <div v-for="(entry, i) in daemonData.resume" :key="i" class="cv-row">
              <span class="cv-period">{{ entry.period }}</span>
              <div class="cv-body">
                <span class="cv-role">{{ entry.role }}<template v-if="entry.org"> · {{ entry.org }}</template></span>
                <span v-if="entry.summary" class="cv-summary">{{ entry.summary }}</span>
              </div>
            </div>
          </div>
          <a v-if="daemonData.resume_link" class="cv-link" :href="daemonData.resume_link" target="_blank" rel="noopener">FULL RESUME ↗</a>
        </section>
      </div>

      <!-- Row C -->
      <section class="panel span-4 boot" style="--i: 8">
        <div class="panel-head">
          <span class="panel-idx">09</span>
          <h2 class="panel-label">Preferences</h2>
          <span class="panel-meta">{{ daemonData.preferences?.length || 0 }}</span>
        </div>
        <div class="line-list">
          <div v-for="(pref, i) in daemonData.preferences" :key="i" class="line-row">{{ pref }}</div>
        </div>
      </section>

      <section class="panel span-4 boot" style="--i: 9">
        <div class="panel-head">
          <span class="panel-idx">10</span>
          <h2 class="panel-label">Routine</h2>
        </div>
        <div class="line-list">
          <div v-for="(step, i) in daemonData.daily_routine" :key="i" class="line-row routine-row">
            <span class="routine-tick">{{ String(i + 1).padStart(2, '0') }}</span>
            <span>{{ step }}</span>
          </div>
        </div>
      </section>

      <section class="panel span-4 boot" style="--i: 10">
        <div class="panel-head">
          <span class="panel-idx">11</span>
          <h2 class="panel-label">Books</h2>
          <span class="panel-meta">{{ daemonData.favorite_books?.length || 0 }}</span>
        </div>
        <div class="line-list">
          <div v-for="(book, i) in daemonData.favorite_books" :key="i" class="line-row">{{ book }}</div>
        </div>
      </section>

      <!-- Row D -->
      <section class="panel span-4 boot" style="--i: 11">
        <div class="panel-head">
          <span class="panel-idx">12</span>
          <h2 class="panel-label">Movies</h2>
          <span class="panel-meta">{{ daemonData.favorite_movies?.length || 0 }}</span>
        </div>
        <div class="line-list">
          <div v-for="(movie, i) in daemonData.favorite_movies" :key="i" class="line-row">{{ movie }}</div>
        </div>
      </section>

      <section class="panel span-4 boot" style="--i: 12">
        <div class="panel-head">
          <span class="panel-idx">13</span>
          <h2 class="panel-label">Podcasts</h2>
          <span class="panel-meta">{{ daemonData.favorite_podcasts?.length || 0 }}</span>
        </div>
        <div class="line-list">
          <div v-for="(pod, i) in daemonData.favorite_podcasts" :key="i" class="line-row">{{ pod }}</div>
        </div>
      </section>

      <section class="panel span-4 boot" id="signal" style="--i: 13">
        <div class="panel-head">
          <span class="panel-idx">14</span>
          <h2 class="panel-label">Signal</h2>
          <span class="panel-meta">machine-readable</span>
        </div>
        <div class="sig-list">
          <a class="sig-row" :href="daemonData.daemon_endpoints?.profile_json" target="_blank" rel="noopener">
            <span class="sig-k">PROFILE</span><span class="sig-v">/daemon-data.json</span>
          </a>
          <a class="sig-row" :href="daemonData.daemon_endpoints?.feed_json" target="_blank" rel="noopener">
            <span class="sig-k">FEED</span><span class="sig-v">/feed.json</span>
          </a>
          <div class="sig-row"><span class="sig-k">CONSUMER</span><span class="sig-v">{{ daemonData.daemon_endpoints?.consumed_by || '—' }}</span></div>
          <p class="sig-note">Ephemeral fields carry an <span class="sig-code">expires</span> stamp and are stripped at the edge once stale. Agents welcome.</p>
        </div>
      </section>
    </main>

    <footer class="d-foot">
      <span>DAEMON://{{ ownerHandle }}</span>
      <span class="foot-sep">·</span>
      <span>{{ siteHost }}</span>
      <span class="foot-sep">·</span>
      <span>LAST SYNC {{ formatDate(daemonData.last_updated) }}</span>
      <span class="foot-sep">·</span>
      <a class="foot-fork" :href="forkUrl" target="_blank" rel="noopener">GET YOUR OWN ↗</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import daemonDataJson from '../../../public/daemon-data.json'
import { selectHeroCurrentState } from '../currentState'
import { extractTelosId, extractTelosText, telosCodeLabel, telosAriaLabel } from '../telosCodes'

const currentTime = ref(new Date())
const daemonData = ref<any>(daemonDataJson)
const feed = ref<any>(null)

let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)

  // Runtime fetch: the worker strips expired ephemera at the edge, so the
  // served payload wins over the build-time embed (which is dev fallback only).
  fetch('/daemon-data.json')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && !d.error) daemonData.value = d })
    .catch(() => {})

  fetch('/feed.json')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d?.items?.length) feed.value = d })
    .catch(() => {})
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const currentDateTime = computed(() => {
  return currentTime.value.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
})

const sectionCount = computed(() => {
  return Object.keys(daemonData.value).filter(k => !k.startsWith('_') && k !== 'last_updated' && k !== 'sync_status').length
})

// Identity comes from daemon-data.json so the framework stays fully generic
const ownerName = computed(() => daemonData.value.owner_name || 'the owner')
const ownerHandle = computed(() => (daemonData.value.owner_handle || 'DAEMON').toUpperCase())
const forkUrl = computed(() => daemonData.value.fork_url || 'https://github.com/danielmiessler/Daemon')
const siteHost = computed(() => {
  const u = daemonData.value.daemon_endpoints?.profile_json
  try { return u ? new URL(u).host : '' } catch { return '' }
})

// Client-side TTL guard — third enforcement layer after deploy gate and edge strip
function notExpired(item: any): boolean {
  if (!item?.expires) return true
  const t = Date.parse(item.expires)
  return Number.isNaN(t) || t > currentTime.value.getTime()
}

const heroCurrentState = computed(() => selectHeroCurrentState(daemonData.value, currentTime.value.getTime()))
const visibleOfferings = computed(() => (daemonData.value.offerings ?? []).filter(notExpired))
const visibleRequesting = computed(() => (daemonData.value.requesting ?? []).filter(notExpired))

const activeFeedTab = ref('All')

const feedTabs = computed(() => {
  const present = [...new Set((feed.value?.items ?? []).map((i: any) => i.source))]
  // Preferred order; anything unexpected appends at the end
  const order = ['X', 'LinkedIn', 'Blog', 'YouTube', 'Newsletter', 'GitHub']
  const sorted = order.filter(s => present.includes(s)).concat(present.filter((s: any) => !order.includes(s)))
  return ['All', ...sorted]
})

const feedItems = computed(() => {
  const items = feed.value?.items ?? []
  const filtered = activeFeedTab.value === 'All' ? items : items.filter((i: any) => i.source === activeFeedTab.value)
  return filtered.slice(0, 14)
})

function relativeTime(dateStr: string): string {
  const ms = currentTime.value.getTime() - Date.parse(dateStr)
  if (Number.isNaN(ms) || ms < 0) return ''
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(dateStr)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'UNKNOWN'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}



function extractConfidence(pred: string): string {
  const match = pred.match(/\(([^)]+)\)\s*$/)
  return match ? match[1] : 'Unrated'
}

function extractPredictionText(pred: string): string {
  return pred.replace(/\s*\([^)]+\)\s*$/, '')
}

function getConfidenceClass(pred: string): string {
  const conf = extractConfidence(pred).toLowerCase()
  if (conf.includes('certain')) return 'confidence-high'
  if (conf.includes('probable')) return 'confidence-mid'
  return 'confidence-low'
}

function extractProjectName(project: string): string {
  const match = project.match(/^([^—–\-]+)/)
  return match ? match[1].trim() : project
}
</script>

<style>
/* Butterick fonts — same families unsupervised-learning.com runs */
@font-face { font-family: 'valkyrie'; src: url('/fonts/valkyrie_a_regular.woff2') format('woff2'); font-weight: normal; font-display: swap; }
@font-face { font-family: 'valkyrie'; src: url('/fonts/valkyrie_a_bold.woff2') format('woff2'); font-weight: bold; font-display: swap; }
@font-face { font-family: 'valkyrie'; src: url('/fonts/valkyrie_a_italic.woff2') format('woff2'); font-style: italic; font-display: swap; }
@font-face { font-family: 'concourse-t3'; src: url('/fonts/concourse_t3_regular-webfont.woff') format('woff'); font-display: swap; }
@font-face { font-family: 'concourse-c3'; src: url('/fonts/concourse_c3_regular.woff') format('woff'); font-display: swap; }
@font-face { font-family: 'advocate'; src: url('/fonts/advocate_34_narr_reg.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'triplicate'; src: url('/fonts/triplicate_b_code_regular.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'triplicate'; src: url('/fonts/triplicate_b_code_bold.woff2') format('woff2'); font-weight: bold; font-display: swap; }

/* UL palette — extracted from unsupervised-learning.com CSS variables 2026-07-21 */
:root {
  --ul-bg: #0a0a0c;
  --ul-bg-2: #111114;
  --ul-bg-3: #18181c;
  --ul-text: #f5f5f7;
  --ul-text-2: #a1a1a6;
  --ul-text-3: #6b6b70;
  --ul-brand: #02349a;
  --ul-brand-light: #0a4bc4;
  --ul-brand-glow: #02349a66;
  --ul-ok: #10a37f;
  --ul-border: #ffffff14;
  --ul-border-2: #ffffff1f;
  --ul-border-3: #ffffff33;
}
</style>

<style scoped>
/* ═══════════════════════════════════════════════════════
   DAEMON — mission-control instrument panel
   Register: industrial/utilitarian · Palette: UL near-black + brand blue
   ═══════════════════════════════════════════════════════ */

* { box-sizing: border-box; margin: 0; padding: 0; }

.d-root {
  min-height: 100vh;
  background: var(--ul-bg);
  color: var(--ul-text-2);
  font-family: 'valkyrie', Georgia, serif;
  position: relative;
  overflow-x: hidden;
}

/* Blueprint grid + aurora + vignette atmosphere */
.d-grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(#0a4bc418 1px, transparent 1px),
    linear-gradient(90deg, #0a4bc418 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 0%, transparent 75%);
}
.d-vignette {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 100% 100% at 50% 120%, #000000cc, transparent 60%);
}
/* Aurora: three deep-blue blobs drifting on slow independent loops.
   Blue only — the single-accent rule holds even in the atmosphere. */
.d-aurora { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.au {
  position: absolute; border-radius: 50%; filter: blur(90px); display: block;
  will-change: transform;
}
.au-1 {
  width: 55vw; height: 42vh; left: 45%; top: -18%;
  background: radial-gradient(closest-side, #02349a59, transparent);
  animation: drift1 22s ease-in-out infinite alternate;
}
.au-2 {
  width: 38vw; height: 34vh; left: -12%; top: 4%;
  background: radial-gradient(closest-side, #0a4bc433, transparent);
  animation: drift2 28s ease-in-out infinite alternate;
}
.au-3 {
  width: 30vw; height: 40vh; left: 68%; top: 42%;
  background: radial-gradient(closest-side, #01256e4d, transparent);
  animation: drift3 34s ease-in-out infinite alternate;
}
@keyframes drift1 { from { transform: translate(0, 0) scale(1); } to { transform: translate(-9vw, 6vh) scale(1.18); } }
@keyframes drift2 { from { transform: translate(0, 0) scale(1.1); } to { transform: translate(7vw, 9vh) scale(0.92); } }
@keyframes drift3 { from { transform: translate(0, 0) scale(0.95); } to { transform: translate(-6vw, -8vh) scale(1.15); } }

/* ═══ Command bar ═══ */
.cmd {
  position: sticky; top: 0; z-index: 10;
  background: #0a0a0cf2;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--ul-border-2);
  overflow: hidden;
}
.cmd-scan {
  position: absolute; top: 0; bottom: 0; width: 120px;
  background: linear-gradient(90deg, transparent, #0a4bc433, transparent);
  animation: scan 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s 1 both;
  pointer-events: none;
}
@keyframes scan { from { left: -15%; } to { left: 115%; } }
.cmd-inner {
  max-width: 1480px; margin: 0 auto; padding: 0.7rem 1.5rem;
  display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;
}
.cmd-ident { display: flex; align-items: center; gap: 0.65rem; }
.cmd-wordmark {
  font-family: 'advocate', 'triplicate', sans-serif;
  font-size: 1.5rem; line-height: 1; letter-spacing: 0.04em;
  background: linear-gradient(105deg, #5b8bf0 0%, var(--ul-brand-light) 55%, #2660d6 100%);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 14px var(--ul-brand-glow)) drop-shadow(0 0 3px #0a4bc455);
}
.cmd-handle {
  font-family: 'triplicate', monospace; font-weight: bold;
  font-size: 0.72rem; letter-spacing: 0.08em; color: var(--ul-text-3);
}
.cmd-fork {
  font-family: 'triplicate', monospace; font-size: 0.6rem; letter-spacing: 0.1em;
  color: var(--ul-brand-light); text-decoration: none;
  border: 1px solid #0a4bc455; border-radius: 2px; padding: 0.18rem 0.55rem;
  transition: color 0.15s ease-out, border-color 0.15s ease-out, background 0.15s ease-out;
  white-space: nowrap;
}
.cmd-fork:hover { color: var(--ul-text); background: var(--ul-brand); border-color: var(--ul-brand-light); }
.cmd-fork:focus-visible { outline: 1px solid var(--ul-brand-light); outline-offset: 2px; }
.cmd-live {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: 'triplicate', monospace; font-size: 0.6rem; letter-spacing: 0.12em;
  color: var(--ul-ok); border: 1px solid #10a37f44; border-radius: 2px;
  padding: 0.14rem 0.5rem;
}
.cmd-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ul-ok);
  box-shadow: 0 0 6px var(--ul-ok);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.cmd-tele { display: flex; gap: 1.4rem; flex: 1; flex-wrap: wrap; }
.tele-cell { display: inline-flex; align-items: baseline; gap: 0.45rem; white-space: nowrap; }
.tele-k {
  font-family: 'concourse-c3', sans-serif; font-size: 0.62rem;
  letter-spacing: 0.14em; color: var(--ul-text-3);
}
.tele-v { font-family: 'triplicate', monospace; font-size: 0.72rem; color: var(--ul-text-2); }
.cmd-nav { display: flex; gap: 1.1rem; }
.cmd-nav a {
  font-family: 'concourse-c3', sans-serif; font-size: 0.66rem; letter-spacing: 0.14em;
  color: var(--ul-text-3); text-decoration: none;
  transition: color 0.15s ease-out;
}
.cmd-nav a:hover, .cmd-nav a:focus-visible { color: var(--ul-brand-light); }
.cmd-nav a:focus-visible { outline: 1px solid var(--ul-brand-light); outline-offset: 3px; }

/* ═══ Identity band — asymmetric, no centered hero ═══ */
.ident {
  position: relative; z-index: 1;
  max-width: 1480px; margin: 0 auto;
  padding: 3.2rem 1.5rem 2.4rem;
  display: grid; grid-template-columns: minmax(280px, 5fr) 7fr; gap: 3rem;
  align-items: end;
  border-bottom: 1px solid var(--ul-border);
}
.ident-title {
  font-family: 'advocate', 'triplicate', sans-serif;
  font-size: clamp(4rem, 9vw, 7.5rem);
  line-height: 0.9; letter-spacing: 0.01em;
  color: var(--ul-text);
  text-shadow: 0 0 80px var(--ul-brand-glow);
}
.ident-sub {
  margin-top: 1rem; font-size: 0.95rem; line-height: 1.5; color: var(--ul-text-3);
  max-width: 34ch;
}
.ident-narrative {
  font-size: 1.06rem; line-height: 1.65; color: var(--ul-text-2);
  border-left: 2px solid var(--ul-brand); padding-left: 1.2rem;
}
.ident-now {
  margin-top: 1.4rem;
  display: flex; align-items: center; gap: 0.6rem;
  font-family: 'triplicate', monospace; font-size: 0.86rem;
  color: var(--ul-text);
  background: var(--ul-bg-2);
  border: 1px solid var(--ul-border-2);
  padding: 0.7rem 1rem;
}
.now-prompt { color: var(--ul-brand-light); font-weight: bold; }
.now-cursor {
  width: 8px; height: 1.05em; background: var(--ul-brand-light);
  animation: blink 1.1s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }

/* ═══ Instrument grid ═══ */
.dash {
  position: relative; z-index: 1;
  max-width: 1480px; margin: 0 auto;
  padding: 1.6rem 1.5rem 3rem;
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem;
}
.p-feed { grid-column: span 8; }
.rail { grid-column: span 4; display: flex; flex-direction: column; gap: 1rem; }
.span-4 { grid-column: span 4; }

/* Panels: crosshair corner ticks drawn with background gradients
   (real backgrounds, not pseudo-content — survives DOM-render capture) */
.panel {
  background:
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 0 0 / 12px 1px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 0 0 / 1px 12px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 100% 0 / 12px 1px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 100% 0 / 1px 12px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 0 100% / 12px 1px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 0 100% / 1px 12px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 100% 100% / 12px 1px,
    linear-gradient(var(--ul-brand-light), var(--ul-brand-light)) 100% 100% / 1px 12px,
    var(--ul-bg-2);
  background-repeat: no-repeat;
  border: 1px solid var(--ul-border);
  padding: 1.1rem 1.2rem 1.2rem;
  transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
}
.panel:hover {
  border-color: var(--ul-border-2);
  box-shadow: 0 0 24px -8px var(--ul-brand-glow);
}
.panel-head {
  display: flex; align-items: baseline; gap: 0.7rem;
  padding-bottom: 0.7rem; margin-bottom: 0.8rem;
  border-bottom: 1px solid var(--ul-border);
}
.panel-idx { font-family: 'triplicate', monospace; font-size: 0.62rem; color: var(--ul-brand-light); }
.panel-label {
  font-family: 'concourse-c3', sans-serif; font-weight: normal;
  font-size: 0.8rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ul-text); flex: 1;
}
.panel-meta { font-family: 'triplicate', monospace; font-size: 0.62rem; color: var(--ul-text-3); }
.telos-info { position: relative; display: inline-flex; }
.telos-info-btn { font-family: 'triplicate', monospace; font-size: 0.7rem; line-height: 1; color: var(--ul-text-3); background: none; border: none; padding: 0; margin: 0 0.2rem; cursor: help; transition: color .15s; }
.telos-info-btn:hover, .telos-info:focus-within .telos-info-btn { color: var(--ul-brand-light); }
.telos-info-pop { position: absolute; top: calc(100% + 9px); left: 0; z-index: 40; width: min(320px, 78vw); display: flex; flex-direction: column; gap: 0.5rem; padding: 0.85rem 0.95rem; background: var(--ul-bg-3); border: 1px solid var(--ul-border-3); box-shadow: 0 12px 34px #00000080, 0 0 0 1px var(--ul-brand-glow); opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(-4px); transition: opacity .16s ease, transform .16s ease; text-align: left; max-height: min(68vh, 460px); overflow-y: auto; }
.telos-info:hover .telos-info-pop, .telos-info:focus-within .telos-info-pop { opacity: 1; visibility: visible; pointer-events: auto; transform: translateY(0); }
.telos-info-pop::before { content: ''; position: absolute; bottom: 100%; left: 12px; border: 6px solid transparent; border-bottom-color: var(--ul-bg-3); }
.tip-head { font-family: 'triplicate', monospace; font-size: 0.72rem; letter-spacing: 0.08em; color: var(--ul-text); text-transform: uppercase; }
.tip-head em { color: var(--ul-text-3); font-style: normal; text-transform: none; letter-spacing: 0; }
.tip-body { font-size: 0.8rem; line-height: 1.5; color: var(--ul-text-2); }
.tip-note { font-size: 0.72rem; line-height: 1.45; color: var(--ul-text-3); font-style: italic; }
.tip-legend { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.45rem 0; border-top: 1px solid var(--ul-border); border-bottom: 1px solid var(--ul-border); }
.tip-code { font-size: 0.78rem; color: var(--ul-text-2); display: flex; gap: 0.55rem; align-items: baseline; }
.tip-code b { font-family: 'triplicate', monospace; color: var(--ul-brand-light); min-width: 1.1em; }
.tip-link { font-family: 'triplicate', monospace; font-size: 0.72rem; color: var(--ul-brand-light); text-decoration: none; align-self: flex-start; }
.tip-link:hover { text-decoration: underline; }

/* Boot cascade */
.boot { animation: boot 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 70ms); }
@keyframes boot { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* ═══ Feed ═══ */
.feed-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.9rem; }
.feed-tab {
  font-family: 'triplicate', monospace; font-size: 0.62rem; letter-spacing: 0.08em;
  text-transform: uppercase; white-space: nowrap;
  padding: 0.32rem 0.75rem;
  background: transparent; color: var(--ul-text-3);
  border: 1px solid var(--ul-border); border-radius: 2px;
  cursor: pointer;
  transition: color 0.15s ease-out, border-color 0.15s ease-out, background 0.15s ease-out;
}
.feed-tab:hover { color: var(--ul-text-2); border-color: var(--ul-border-3); }
.feed-tab:focus-visible { outline: 1px solid var(--ul-brand-light); outline-offset: 2px; }
.feed-tab.active {
  color: var(--ul-text); background: var(--ul-brand);
  border-color: var(--ul-brand-light);
}
.feed-list { display: flex; flex-direction: column; }
.feed-item {
  display: flex; align-items: baseline; gap: 0.9rem;
  padding: 0.55rem 0.4rem;
  border-bottom: 1px solid var(--ul-border);
  border-left: 2px solid transparent;
  text-decoration: none;
  transition: background 0.15s ease-out, border-left-color 0.15s ease-out;
}
.feed-item:last-child { border-bottom: none; }
.feed-item:hover { background: var(--ul-bg-3); border-left-color: var(--ul-brand-light); }
.feed-item:focus-visible { outline: 1px solid var(--ul-brand-light); outline-offset: -1px; }
.feed-src {
  font-family: 'triplicate', monospace; font-size: 0.58rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ul-brand-light);
  min-width: 5.4rem; flex-shrink: 0;
}
.feed-title {
  color: var(--ul-text-2); font-size: 0.92rem; line-height: 1.45; flex: 1;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.feed-item:hover .feed-title { color: var(--ul-text); }
.feed-time { font-family: 'triplicate', monospace; font-size: 0.62rem; color: var(--ul-text-3); flex-shrink: 0; }
.feed-wait {
  font-family: 'triplicate', monospace; font-size: 0.72rem; letter-spacing: 0.14em;
  color: var(--ul-text-3); padding: 2rem 0; text-align: center;
}

/* ═══ Rail sections ═══ */
.mission-text { font-size: 0.92rem; line-height: 1.6; color: var(--ul-text-2); }
.telos-list { display: flex; flex-direction: column; gap: 0.55rem; }
.telos-row { display: flex; gap: 0.7rem; align-items: baseline; }
.telos-id {
  font-family: 'triplicate', monospace; font-size: 0.62rem; font-weight: bold;
  color: var(--ul-brand-light); min-width: 1.8rem;
}
.telos-text { font-size: 0.85rem; line-height: 1.5; color: var(--ul-text-2); }

/* ═══ Predictions ═══ */
.pred-list { display: flex; flex-direction: column; }
.pred-row {
  display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
  padding: 0.45rem 0; border-bottom: 1px solid var(--ul-border);
}
.pred-row:last-child { border-bottom: none; }
.pred-text { font-size: 0.85rem; line-height: 1.45; color: var(--ul-text-2); }
.pred-conf {
  font-family: 'triplicate', monospace; font-size: 0.56rem; letter-spacing: 0.06em;
  text-transform: uppercase; white-space: nowrap; padding: 0.1rem 0.4rem;
  border: 1px solid var(--ul-border-2); border-radius: 2px; color: var(--ul-text-3);
}
.confidence-high { color: var(--ul-ok); border-color: #10a37f44; }
.confidence-mid { color: var(--ul-brand-light); border-color: #0a4bc444; }

/* ═══ Projects ═══ */
.proj-group { margin-bottom: 0.9rem; }
.proj-group:last-child { margin-bottom: 0; }
.proj-cat {
  font-family: 'concourse-c3', sans-serif; font-weight: normal;
  font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ul-brand-light); margin-bottom: 0.35rem;
}
.proj-row { font-size: 0.85rem; line-height: 1.6; color: var(--ul-text-2); }

/* ═══ Exchange ═══ */
.ex-list { display: flex; flex-direction: column; gap: 0.8rem; }
.ex-item { border-left: 2px solid var(--ul-brand); padding-left: 0.8rem; }
.ex-item.req { border-left-color: var(--ul-ok); }
.ex-text { font-size: 0.85rem; line-height: 1.5; color: var(--ul-text-2); display: block; }
.ex-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem; }
.ex-tag {
  font-family: 'triplicate', monospace; font-size: 0.56rem; letter-spacing: 0.04em;
  color: var(--ul-text-3); background: var(--ul-bg-3); padding: 0.08rem 0.4rem; border-radius: 2px;
}

/* ═══ Resume ═══ */
.cv-list { display: flex; flex-direction: column; gap: 0.65rem; }
.cv-row { display: grid; grid-template-columns: 6.2rem 1fr; gap: 0.7rem; align-items: start; }
.cv-period { font-family: 'triplicate', monospace; font-size: 0.62rem; color: var(--ul-brand-light); line-height: 1.9; white-space: nowrap; }
.cv-body { display: flex; flex-direction: column; gap: 0.1rem; }
.cv-role { font-size: 0.85rem; color: var(--ul-text); line-height: 1.45; }
.cv-summary { font-size: 0.78rem; color: var(--ul-text-3); line-height: 1.45; }

.cv-link {
  display: inline-block; margin-top: 0.8rem;
  font-family: 'triplicate', monospace; font-size: 0.6rem; letter-spacing: 0.1em;
  color: var(--ul-brand-light); text-decoration: none;
  border: 1px solid #0a4bc455; border-radius: 2px; padding: 0.22rem 0.6rem;
  transition: color 0.15s ease-out, background 0.15s ease-out;
}
.cv-link:hover { color: var(--ul-text); background: var(--ul-brand); }

/* ═══ Simple line lists ═══ */
.line-list { display: flex; flex-direction: column; }
.line-row {
  font-size: 0.85rem; line-height: 1.5; color: var(--ul-text-2);
  padding: 0.32rem 0; border-bottom: 1px solid var(--ul-border);
}
.line-row:last-child { border-bottom: none; }
.routine-row { display: grid; grid-template-columns: 1.4rem 1fr; gap: 0.5rem; align-items: start; }
.routine-tick { font-family: 'triplicate', monospace; font-size: 0.62rem; color: var(--ul-brand-light); line-height: 1.9; }

/* ═══ Signal ═══ */
.sig-list { display: flex; flex-direction: column; gap: 0.5rem; }
.sig-row {
  display: flex; gap: 0.9rem; align-items: baseline; text-decoration: none;
  padding: 0.2rem 0;
}
.sig-k {
  font-family: 'concourse-c3', sans-serif; font-size: 0.6rem; letter-spacing: 0.14em;
  color: var(--ul-text-3); min-width: 5.4rem;
}
.sig-v { font-family: 'triplicate', monospace; font-size: 0.76rem; color: var(--ul-brand-light); }
a.sig-row:hover .sig-v { text-decoration: underline; color: var(--ul-text); }
.sig-note { font-size: 0.78rem; line-height: 1.5; color: var(--ul-text-3); margin-top: 0.5rem; }
.sig-code { font-family: 'triplicate', monospace; font-size: 0.7rem; color: var(--ul-text-2); }

/* ═══ Footer ═══ */
.d-foot {
  position: relative; z-index: 1;
  border-top: 1px solid var(--ul-border);
  max-width: 1480px; margin: 0 auto;
  padding: 1.2rem 1.5rem 2rem;
  display: flex; gap: 0.8rem; flex-wrap: wrap;
  font-family: 'triplicate', monospace; font-size: 0.62rem; letter-spacing: 0.08em;
  color: var(--ul-text-3);
}
.foot-sep { color: var(--ul-brand-light); }
.foot-fork { color: var(--ul-brand-light); text-decoration: none; }
.foot-fork:hover { color: var(--ul-text); text-decoration: underline; }

/* ═══ Responsive ═══ */
@media (max-width: 1080px) {
  .p-feed, .rail, .span-4 { grid-column: span 12; }
  .ident { grid-template-columns: 1fr; gap: 1.6rem; }
}
@media (max-width: 640px) {
  .cmd-tele { display: none; }
  .ident-title { font-size: 3.4rem; }
}

/* ═══ Reduced motion ═══ */
@media (prefers-reduced-motion: reduce) {
  .boot { animation: none; }
  .cmd-scan { animation: none; opacity: 0; }
  .now-cursor { animation: none; }
  .cmd-live-dot { animation: none; }
  .au { animation: none; }
  * { transition: none !important; }
}
@media (max-width: 760px) {
  .cmd-fork { display: none; }
}
</style>
