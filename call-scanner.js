#!/usr/bin/env node

/**
 * call-scanner.js — AI Signal Call Tracker
 * Scans GMGN (migration + new creation), assigns exit windows,
 * monitors peak MC during window, evaluates W/L verdict at close.
 * Serves /api/calls on port 3001. No Telegram.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRecordStore } from './src/lib/record-store.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const { execSync } = require('child_process');
const http = require('http');
const fs   = require('fs');
const os   = require('os');

// ─── Env ──────────────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  try {
    fs.readFileSync(filePath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch {}
}
loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(os.homedir(), '.config', 'gmgn', '.env'));

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT                  = process.env.CALL_PORT ? parseInt(process.env.CALL_PORT) : 3001;
const DATA_DIR              = path.join(__dirname, 'data');
const CALLS_FILE            = path.join(DATA_DIR, 'calls.json');
const MAX_CALLS             = 500;
const MIGRATION_INTERVAL_MS = 90_000;
const NEW_CREATION_INTERVAL = 60_000;
const MONITOR_INTERVAL_MS   = 60_000;
const recordStore           = createRecordStore();

// Score thresholds (migration)
const WATCH_THRESHOLD  = 3;
const STRONG_THRESHOLD = 18;
const SIGNAL_THRESHOLD = 10;

// Exit window durations per timeframe
const TF_DURATION_MS = {
  very_short:  10 * 60_000,
  short:       30 * 60_000,
  mid:    2 * 3_600_000,
  long:  12 * 3_600_000,
  very_long: 24 * 3_600_000,
};

// MC snapshot checkpoints (post-call trajectory)
const CHECKPOINTS = [
  { label: '+10m', ms:  10 * 60_000 },
  { label: '+30m', ms:  30 * 60_000 },
  { label: '+1h',  ms:   3_600_000  },
  { label: '+2h',  ms: 2*3_600_000  },
  { label: '+6h',  ms: 6*3_600_000  },
  { label: '+12h', ms:12*3_600_000  },
];

function buildSnapshots(callTs) {
  return CHECKPOINTS.map(cp => ({
    label:      cp.label,
    dueAt:      callTs + cp.ms,
    mc:         null,
    pct:        null,
    recordedAt: null,
  }));
}

// ─── Storage ──────────────────────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadCalls() {
  try { return JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8')); }
  catch { return { records: [] }; }
}

function saveCalls() {
  try { fs.writeFileSync(CALLS_FILE, JSON.stringify(db), 'utf8'); }
  catch (e) { console.error('[save]', e.message); }
  void recordStore.saveRecords('calls', db.records);
}

const db             = loadCalls();
db.records           = await recordStore.loadRecords('calls', db.records);
const seenAddresses  = new Set(db.records.map(r => r.address));

console.log(`[call-scanner] Loaded ${db.records.length} calls (${db.records.filter(r=>r.verdict==='pending').length} pending)`);

// ─── GMGN CLI ─────────────────────────────────────────────────────────────────
function gmgn(args) {
  try {
    const cli = process.platform === 'win32'
      ? 'node_modules\\.bin\\gmgn-cli'
      : 'node_modules/.bin/gmgn-cli';
    const out = execSync(`${cli} ${args} --raw`, { encoding: 'utf8', timeout: 30_000 });
    return JSON.parse(out.trim());
  } catch { return null; }
}

function fetchKline(address, sinceTs) {
  const now = Math.floor(Date.now() / 1000);
  return gmgn(`market kline --chain sol --address ${address} --resolution 1m --from ${sinceTs} --to ${now}`);
}

// ─── Signal + timeframe helpers ───────────────────────────────────────────────
function signalFromScore(score, maxScore) {
  if (score >= STRONG_THRESHOLD || score / maxScore >= STRONG_THRESHOLD / 42) return 'STRONG';
  if (score >= SIGNAL_THRESHOLD) return 'MEDIUM';
  return 'LOW';
}

function smQuality(count) {
  if (count > 12) return 'strong';
  if (count >= 6) return 'high';
  if (count >= 3) return 'solid';
  if (count >= 1) return 'moderate';
  return 'low';
}

// Timeframe per spec rules
function assignTimeframe(smCount, kolCount, gradMin, mcAtCall) {
  // Very short: fast grad <5min + low MC, or extreme SM/KOL density
  if (gradMin !== null && gradMin <= 5 && mcAtCall < 30_000) return 'very_short';
  if (smCount >= 10 && kolCount >= 3 && mcAtCall < 30_000)  return 'very_short';

  // Very long: exceptional all dimensions
  if (smCount >= 12 && kolCount >= 4) return 'very_long';

  // Long: slow grad >40min + high SM, or very high SM + multiple KOLs
  if (smCount >= 9 && kolCount >= 2)                        return 'long';
  if (gradMin !== null && gradMin > 40 && smCount >= 6)     return 'long';

  // Mid: grad 15-40min + solid SM 6+, or solid SM + any KOL
  if (gradMin !== null && gradMin >= 15 && gradMin <= 40 && smCount >= 6) return 'mid';
  if (smCount >= 6 && kolCount >= 1) return 'mid';

  return 'short';
}

// Est. profit table [low%, high%] per signal + timeframe
const EST_TABLE = {
  STRONG: { very_short:[15,60], short:[10,40], mid:[5,25],  long:[25,75],  very_long:[40,150] },
  MEDIUM: { very_short:[10,30], short:[5,20],  mid:[5,15],  long:[5,25],   very_long:[10,40]  },
  LOW:    { very_short:[2,15],  short:[2,10],  mid:[2,8],   long:[2,10],   very_long:[2,15]   },
};

function estProfit(signal, timeframe) {
  const [low, high] = EST_TABLE[signal]?.[timeframe] ?? [2, 10];
  return { estRange: `+${low}–${high}%`, estLow: low };
}

// Win threshold per spec: STRONG always 25%, MEDIUM/LOW use estLow
function calcWinThreshold(signal, estLow) {
  return signal === 'STRONG' ? 25 : estLow;
}

// ─── Create call entry ────────────────────────────────────────────────────────
function createCall({ address, symbol, name, type, mcAtCall, signal, timeframe, sm, kol, gradMin, reasons }) {
  if (seenAddresses.has(address)) return null;

  const { estRange, estLow } = estProfit(signal, timeframe);
  const winThreshold         = calcWinThreshold(signal, estLow);
  const now                  = Date.now();

  const record = {
    id:            `${address.slice(0,8)}-${now}`,
    ts:            now,
    address,
    symbol,
    name:          name || symbol,
    type,
    mcAtCall:      Math.round(mcAtCall),
    entryClose:    null,
    sinceTs:       Math.floor(now / 1000) - 60, // 1 min before call → kline start
    signal,
    estRange,
    estLow,
    winThreshold,
    timeframe,
    exitWindowEnd: now + TF_DURATION_MS[timeframe],
    sm:            sm   ?? null,
    kol:           kol  ?? null,
    gradMin:       gradMin != null ? parseFloat(gradMin.toFixed(1)) : null,
    reasons:       reasons ?? [],
    currentMC:     Math.round(mcAtCall),
    peakMC:        Math.round(mcAtCall),
    peakPct:       0,
    verdict:       'pending',
    settledAt:     null,
    snapshots:     buildSnapshots(now),
  };

  db.records.push(record);
  if (db.records.length > MAX_CALLS) db.records = db.records.slice(-MAX_CALLS);
  seenAddresses.add(address);
  saveCalls();

  return record;
}

// ─── MC update ────────────────────────────────────────────────────────────────
function updateMC(record, candidateMC) {
  record.currentMC = Math.round(candidateMC);
  if (candidateMC > record.peakMC) {
    record.peakMC  = Math.round(candidateMC);
    record.peakPct = parseFloat(((record.peakMC - record.mcAtCall) / record.mcAtCall * 100).toFixed(2));
  }
}

// ─── Settle verdict ───────────────────────────────────────────────────────────
function settle(record) {
  record.verdict   = record.peakPct >= record.winThreshold ? 'W' : 'L';
  record.settledAt = Date.now();
  console.log(`   [settle] $${record.symbol} → ${record.verdict} peak=${record.peakPct >= 0 ? '+' : ''}${record.peakPct}% (need ≥${record.winThreshold}%)`);
}

// Fill missed snapshots from kline candle history
function recoverSnapshots(call, candles) {
  if (!call.entryClose || !candles.length || !call.snapshots) return;
  for (const snap of call.snapshots) {
    if (snap.mc !== null) continue;
    const dueSec     = Math.floor(snap.dueAt / 1000);
    const candidates = candles.filter(c => parseInt(c.time) <= dueSec);
    if (!candidates.length) continue;
    const close = parseFloat(candidates[candidates.length - 1].close);
    if (!close) continue;
    snap.mc         = Math.round((close / call.entryClose) * call.mcAtCall);
    snap.pct        = parseFloat(((snap.mc - call.mcAtCall) / call.mcAtCall * 100).toFixed(2));
    snap.recordedAt = snap.dueAt;
  }
}

// ─── Settle stale pending calls on startup ────────────────────────────────────
async function settleStale() {
  const stale = db.records.filter(r => r.verdict === 'pending' && Date.now() > r.exitWindowEnd);
  if (!stale.length) { console.log('[startup] No stale pending calls.'); return; }
  console.log(`[startup] Settling ${stale.length} stale pending call(s) from kline history...`);

  for (const call of stale) {
    // Migrate: add snapshots for calls created before this feature
    if (!call.snapshots) call.snapshots = buildSnapshots(call.ts);

    const kline   = fetchKline(call.address, call.sinceTs);
    const candles = kline?.list ?? [];

    if (candles.length > 0) {
      if (!call.entryClose) {
        const first = parseFloat(candles[0]?.close ?? '0');
        if (first > 0) call.entryClose = first;
      }
      if (call.entryClose) {
        // Peak within exit window only
        const exitSec       = Math.floor(call.exitWindowEnd / 1000);
        const windowCandles = candles.filter(c => parseInt(c.time) <= exitSec);
        if (windowCandles.length) {
          const peakHigh = Math.max(...windowCandles.map(c => parseFloat(c.high) || 0));
          updateMC(call, (peakHigh / call.entryClose) * call.mcAtCall);
        }
        // Current MC from latest candle
        const lastClose = parseFloat(candles[candles.length - 1].close);
        if (lastClose) call.currentMC = Math.round((lastClose / call.entryClose) * call.mcAtCall);
        // Recover trajectory snapshots
        recoverSnapshots(call, candles);
      }
    }

    settle(call);
    await sleep(300);
  }

  saveCalls();
  console.log(`[startup] Stale settlement done.`);
}

// ─── Migration scanner ────────────────────────────────────────────────────────
async function scanMigration() {
  console.log(`\n[${ts()}] ── Migration Scan ──`);

  const data = gmgn(
    `market trenches --chain sol --type completed` +
    ` --launchpad-platform Pump.fun --launchpad-platform pump_mayhem` +
    ` --launchpad-platform pump_mayhem_agent --launchpad-platform pump_agent` +
    ` --launchpad-platform letsbonk --launchpad-platform bonkers --launchpad-platform bags` +
    ` --max-rug-ratio 0.40 --limit 80`
  );

  const tokens  = data?.completed ?? [];
  const nowSec  = Math.floor(Date.now() / 1000);
  const cutoff  = nowSec - 720 * 60; // ignore tokens migrated >12h ago
  let newCalls  = 0;

  for (const token of tokens) {
    const addr = token.address;
    if (seenAddresses.has(addr)) continue;

    const migratedAt = token.complete_timestamp ?? token.open_timestamp ?? 0;
    if (migratedAt < cutoff) continue;

    // Hard filters
    if ((token.rug_ratio        ?? 0) > 0.40) continue;
    if (token.is_wash_trading)                 continue;
    if ((token.top_10_holder_rate ?? 1) > 0.65) continue;
    if ((token.liquidity          ?? 0) < 500)  continue;

    // Score
    let score = 0;
    const reasons = [];
    if (token.creator_token_status !== 'creator_close') reasons.push('⚠️ creator holding');

    const smCount = token.smart_degen_count ?? 0;
    if      (smCount > 12) { score += 15; reasons.push(`SM ${smCount} (max tier)`); }
    else if (smCount >= 6) { score += 12; reasons.push(`SM ${smCount} (high)`); }
    else if (smCount >= 3) { score += 8;  reasons.push(`SM ${smCount} (solid)`); }
    else if (smCount >= 1) { score += 4;  reasons.push(`SM ${smCount} (low)`); }

    const kolCount = token.renowned_count ?? 0;
    if      (kolCount >= 5) { score += 8; reasons.push(`KOL ${kolCount} (strong)`); }
    else if (kolCount >= 2) { score += 5; reasons.push(`KOL ${kolCount}`); }
    else if (kolCount >= 1) { score += 3; reasons.push(`KOL ${kolCount}`); }

    const gradSec = token.complete_cost_time ?? 0;
    const gradMin = gradSec > 0 ? gradSec / 60 : null;
    if      (gradMin && gradMin <= 5)  { score += 5; reasons.push(`grad ${gradMin.toFixed(1)}min (ultra fast)`); }
    else if (gradMin && gradMin <= 15) { score += 4; reasons.push(`grad ${gradMin.toFixed(1)}min (fast)`); }
    else if (gradMin && gradMin <= 30) { score += 3; reasons.push(`grad ${gradMin.toFixed(1)}min`); }
    else if (gradMin && gradMin <= 60) { score += 2; reasons.push(`grad ${gradMin.toFixed(1)}min (slow)`); }

    if (token.cto_flag)                score += 3, reasons.push('CTO');
    if (token.dexscr_update_link)      score += 2, reasons.push('dexscr update');
    if (token.has_at_least_one_social) score += 1, reasons.push('social');
    if ((token.bundler_trader_amount_rate ?? 1) < 0.15) score += 2, reasons.push('organic buyers');
    if ((token.rug_ratio ?? 1) === 0)  score += 1, reasons.push('rug 0');
    if ((token.liquidity   ?? 0) > 10_000) score += 1, reasons.push(`liq $${Math.round(token.liquidity/1000)}K`);
    if ((token.volume_1h   ?? 0) > 10_000) score += 2, reasons.push(`vol1h $${Math.round(token.volume_1h/1000)}K`);
    if ((token.holder_count ?? 0) > 200)   score += 1, reasons.push(`holders ${token.holder_count}`);

    if (score < WATCH_THRESHOLD) continue;

    const signal    = signalFromScore(score, 42);
    const smObj     = smCount  > 0 ? { count: smCount,  quality: smQuality(smCount) } : null;
    const kolObj    = kolCount > 0 ? { count: kolCount } : null;
    const timeframe = assignTimeframe(smCount, kolCount, gradMin, token.usd_market_cap ?? 0);

    const call = createCall({
      address:   addr,
      symbol:    token.symbol,
      name:      token.name ?? token.symbol,
      type:      'completed',
      mcAtCall:  token.usd_market_cap ?? 0,
      signal,
      timeframe,
      sm:        smObj,
      kol:       kolObj,
      gradMin,
      reasons:   reasons.filter(r => !r.startsWith('⚠️')),
    });

    if (call) {
      console.log(`   ✅ $${token.symbol} ${signal} score=${score} tf=${timeframe} SM=${smCount} KOL=${kolCount} grad=${gradMin?.toFixed(1) ?? '?'}min`);
      newCalls++;
    }
  }

  console.log(`   ${tokens.length} scanned | ${newCalls} new calls`);
}

// ─── New creation scanner ─────────────────────────────────────────────────────
async function scanNewCreation() {
  console.log(`\n[${ts()}] ── New Creation Scan ──`);

  const data = gmgn(
    `market trenches --chain sol --type new_creation` +
    ` --launchpad-platform Pump.fun` +
    ` --max-marketcap 20000` +
    ` --min-creator-created-open-count 1` +
    ` --min-total-fee 0.5` +
    ` --max-created 10m` +
    ` --min-visiting-count 5` +
    ` --min-bundler-rate 0.15` +
    ` --max-rug-ratio 0.50` +
    ` --max-insider-ratio 0.60` +
    ` --limit 80`
  );

  const tokens = data?.new_creation ?? [];
  let newCalls = 0;

  for (const token of tokens) {
    const addr = token.address;
    if (seenAddresses.has(addr)) continue;

    const bundlerHold = token.bundler_mhr   ?? 0;
    const buys        = token.buys_24h      ?? 0;
    const sells       = token.sells_24h     ?? 0;
    const bsr         = sells > 0 ? buys / sells : buys;
    const swaps       = token.swaps_24h     ?? 0;

    if (bundlerHold < 0.20 || bundlerHold > 0.70) continue;
    if (buys  > 0 && bsr < 1.5) continue;
    if (sells > 0 && bsr > 8.0) continue;
    if (swaps < 3) continue;

    // Score (no SM/KOL/grad for new_creation)
    let score = 0;
    const reasons = [];
    if      (bsr >= 4) { score += 4; reasons.push(`buy/sell ${bsr.toFixed(1)}x`); }
    else if (bsr >= 2) { score += 2; reasons.push(`buy/sell ${bsr.toFixed(1)}x`); }
    if (bundlerHold < 0.30) { score += 2; reasons.push(`bundler ${Math.round(bundlerHold*100)}% hold`); }
    if ((token.creator_created_open_count ?? 0) >= 3) { score += 2; reasons.push(`creator ${token.creator_created_open_count} grads`); }
    if ((token.visiting_count ?? 0) >= 20) { score += 1; reasons.push(`views ${token.visiting_count}`); }
    if (token.twitter || token.telegram)   { score += 1; reasons.push('social'); }

    if (score < 2) continue;

    const mc        = token.usd_market_cap ?? 0;
    const signal    = signalFromScore(score, 10);
    // new_creation: timeframe derived from MC only (no SM/KOL/grad)
    const timeframe = mc < 15_000 ? 'very_short' : 'short';

    const call = createCall({
      address:  addr,
      symbol:   token.symbol,
      name:     token.name ?? token.symbol,
      type:     'new_creation',
      mcAtCall: mc,
      signal,
      timeframe,
      sm:       null,
      kol:      null,
      gradMin:  null,
      reasons,
    });

    if (call) {
      console.log(`   ✅ $${token.symbol} ${signal} score=${score}/10 tf=${timeframe} bsr=${bsr.toFixed(1)}x`);
      newCalls++;
    }
  }

  console.log(`   ${tokens.length} scanned | ${newCalls} new calls`);
}

// ─── Monitor loop ─────────────────────────────────────────────────────────────
async function monitorCalls() {
  const pending = db.records.filter(r => r.verdict === 'pending');
  if (!pending.length) return;

  console.log(`\n[${ts()}] ── Monitor: ${pending.length} pending ──`);
  const now     = Date.now();
  let updated   = 0;
  let settled   = 0;
  let snapped   = 0;
  let needsSave = false;

  for (const call of pending) {
    // Migrate: add snapshots for calls created before this feature
    if (!call.snapshots) call.snapshots = buildSnapshots(call.ts);

    const kline   = fetchKline(call.address, call.sinceTs);
    const candles = kline?.list ?? [];
    if (!candles.length) continue;

    // Set entry price on first successful kline fetch
    if (!call.entryClose) {
      const first = parseFloat(candles[0]?.close ?? '0');
      if (first > 0) call.entryClose = first;
    }
    if (!call.entryClose) continue;

    // Current MC + peak MC from price ratio × mcAtCall
    const lastClose  = parseFloat(candles[candles.length - 1].close);
    const peakHigh   = Math.max(...candles.map(c => parseFloat(c.high) || 0));
    const currentMC  = (lastClose / call.entryClose) * call.mcAtCall;
    const peakMCCand = (peakHigh  / call.entryClose) * call.mcAtCall;

    updateMC(call, currentMC);
    if (peakMCCand > call.peakMC) updateMC(call, peakMCCand);

    // Record due trajectory snapshots
    for (const snap of call.snapshots) {
      if (snap.mc !== null || now < snap.dueAt) continue;
      snap.mc         = Math.round(currentMC);
      snap.pct        = parseFloat(((snap.mc - call.mcAtCall) / call.mcAtCall * 100).toFixed(2));
      snap.recordedAt = now;
      snapped++;
    }

    updated++;
    needsSave = true;

    if (now >= call.exitWindowEnd) {
      // Fill any remaining unrecorded snapshots from kline before settling
      recoverSnapshots(call, candles);
      settle(call);
      settled++;
    }

    await sleep(300);
  }

  if (needsSave) saveCalls();
  console.log(`   Updated: ${updated} | Snapshots recorded: ${snapped} | Settled: ${settled}`);
}

// ─── HTTP server ──────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' };

  const url = req.url.split('?')[0];

  if (url === '/api/calls') {
    const wins    = db.records.filter(r => r.verdict === 'W').length;
    const losses  = db.records.filter(r => r.verdict === 'L').length;
    const pending = db.records.filter(r => r.verdict === 'pending').length;
    const settled = wins + losses;
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({
      calls: [...db.records].sort((a, b) => b.ts - a.ts),
      stats: { total: db.records.length, wins, losses, pending, settled, winRate: settled ? +(wins/settled*100).toFixed(1) : 0 },
      updatedAt: Date.now(),
    }));
    return;
  }

  // Serve static files
  const routes = { '/':'call.html', '/call':'call.html', '/call.html':'call.html' };
  const file = routes[url];
  if (file) {
    try {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'text/html' });
      res.end(fs.readFileSync(path.join(__dirname, file), 'utf8'));
    } catch {
      res.writeHead(404); res.end('not found');
    }
    return;
  }

  if (url.startsWith('/src/img/')) {
    const decoded = decodeURIComponent(url);
    const base = path.resolve(__dirname, 'src', 'img');
    const filePath = path.resolve(base, decoded.slice('/src/img/'.length));
    const relToBase = path.relative(base, filePath);
    const outside = relToBase === '..' || relToBase.startsWith(`..${path.sep}`) || path.isAbsolute(relToBase);
    if (outside) {
      res.writeHead(400); res.end('bad request');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
      return;
    }
    res.writeHead(404); res.end('not found');
    return;
  }

  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log(`[call-scanner] Listening on http://localhost:${PORT}`));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ts    = () => new Date().toLocaleTimeString();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await settleStale();    // fix any calls that expired while scanner was offline
  await monitorCalls();
  await scanMigration();
  await scanNewCreation();

  setInterval(monitorCalls,    MONITOR_INTERVAL_MS);
  setInterval(scanMigration,   MIGRATION_INTERVAL_MS);
  setInterval(scanNewCreation, NEW_CREATION_INTERVAL);
})();
