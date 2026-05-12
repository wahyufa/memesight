#!/usr/bin/env node

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRecordStore } from './src/lib/record-store.js';

/**
 * Pump.fun 2x Scanner Bot
 * Polls GMGN new_creation every 60s, tracks tokens, alerts via Telegram on 2x gain.
 * Commands: /stats /wins /open
 */

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { execSync } = require('child_process');
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const os    = require('os');

// ─── Env loader ──────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  try {
    fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
        if (m && !process.env[m[1]])
          process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      });
  } catch {}
}

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(os.homedir(), '.config', 'gmgn', '.env'));

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG = {
  scanIntervalMs:      60_000,
  minGainPct:          50,      // alert at 1.5x

  // Step 1 — server-side filters (sent to GMGN API)
  maxMarketCap:        20000,   // raised: catch tokens that already moved from $6k to $12k
  minCreatorOpenCount: 1,       // creator must have launched at least 1 graduated token before
  minTotalFee:         0.5,     // min 0.5 SOL fees (lower threshold for fresh tokens)
  maxTokenAge:         '10m',   // token must be created within last 10 minutes
  minVisitingCount:    5,       // min 5 views on GMGN
  minBundlerRate:      0.15,    // require bundler activity (they're buying)
  maxRugRatio:         0.50,
  maxInsiderRatio:     0.60,

  // Step 2 — bundler accumulation (post-process)
  minBundlerHoldRate:  0.20,    // bundler_mhr min — must be accumulating
  maxBundlerHoldRate:  0.70,    // bundler_mhr max — >70% = flash pump trap (COCO pattern)
  minBuySellRatio:     1.5,     // buys / sells min — need real buy pressure
  maxBuySellRatio:     8.0,     // buys / sells max — >8x = artificial, no organic buyers
  minSwaps24h:         3,       // min swaps in 24h — swaps_1m not available for new_creation

  // Step 3 — kline flash pump detection
  flashPumpThreshold:  0.80,    // skip if first candle high = 80%+ of all-time high (spike-and-dump)

  // Watchlist
  maxWatchlistSize:    10,           // max tokens tracked at once
  maxWatchlistAgeMs:   30 * 60_000,
  klineDelayMs:        300,
};

// ─── Session state ────────────────────────────────────────────────────────────
const watchlist = new Map(); // Map<address, { token, addedAt, firstOpen }>
const alerted   = new Set();
const wins      = [];        // { token, gainPct, gainMultiple, alertedAt }
const rejected  = { noFee: 0, lowBundler: 0, bundlerDumping: 0, noActivity: 0 };
const session   = { startedAt: Date.now(), scanCount: 0, totalSeen: 0 };
let   lastUpdateId = 0;

// ─── Persistent storage ───────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const WINS_FILE   = path.join(DATA_DIR, 'wins.json');
const MISSES_FILE = path.join(DATA_DIR, 'misses.json');
const CALLS_FILE  = path.join(DATA_DIR, 'calls.json');
const MAX_RECORDS = 2000;
const recordStore = createRecordStore();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { records: [] }; }
}

function saveJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data), 'utf8'); } catch (e) { console.error('save error:', e.message); }
}

function saveRecords(scope, file, data) {
  saveJSON(file, data);
  void recordStore.saveRecords(scope, data.records);
}

// ─── Dedup on startup ─────────────────────────────────────────────────────────
function dedupRecords(raw, keepKey) {
  if (!raw.records?.length) return false;

  const map = new Map();
  for (const r of raw.records) {
    const existing = map.get(r.address);
    if (!existing || keepKey(r) > keepKey(existing)) map.set(r.address, r);
  }

  const before = raw.records.length;
  raw.records = [...map.values()].sort((a, b) => b.ts - a.ts);
  if (raw.records.length >= before) return false;

  raw.updatedAt = Date.now();
  return true;
}

function dedupFile(file, keepKey) {
  try {
    const raw = loadJSON(file);
    if (!raw.records?.length) return;
    const map = new Map();
    for (const r of raw.records) {
      const existing = map.get(r.address);
      if (!existing || keepKey(r) > keepKey(existing)) map.set(r.address, r);
    }
    const before = raw.records.length;
    raw.records = [...map.values()].sort((a, b) => b.ts - a.ts);
    if (raw.records.length < before) {
      raw.updatedAt = Date.now();
      saveJSON(file, raw);
      console.log(`[dedup] ${path.basename(file)}: ${before} → ${raw.records.length}`);
    }
  } catch {}
}

const db = {
  wins:   loadJSON(WINS_FILE),
  misses: loadJSON(MISSES_FILE),
};

db.wins.records = await recordStore.loadRecords('wins', db.wins.records);
db.misses.records = await recordStore.loadRecords('misses', db.misses.records);

dedupFile(WINS_FILE,   r => r.gainMultiple ?? 0);
dedupFile(MISSES_FILE, r => r.peakGainPct  ?? 0);
if (dedupRecords(db.wins, r => r.gainMultiple ?? 0)) saveRecords('wins', WINS_FILE, db.wins);
if (dedupRecords(db.misses, r => r.peakGainPct ?? 0)) saveRecords('misses', MISSES_FILE, db.misses);

function signalTier(score, maxScore) {
  const n = (score ?? 0) / (maxScore || 10);
  if (n >= 0.55) return 'STRONG';
  if (n >= 0.35) return 'MEDIUM';
  return 'LOW';
}

function persistWin(entry, type, gainPct, gainMultiple, entryPrice, currentPrice) {
  const mc    = entry.entryMC ?? entry.token.usd_market_cap ?? 0;
  const curMC = entryPrice > 0 ? (currentPrice / entryPrice) * mc : mc;

  const existing = db.wins.records.find(r => r.address === entry.token.address);
  if (existing) {
    existing.peakMC       = Math.round(curMC);
    existing.gainPct      = parseFloat(gainPct.toFixed(2));
    existing.gainMultiple = parseFloat(gainMultiple);
    existing.updatedAt    = Date.now();
  } else {
    db.wins.records.push({
      ts:           Date.now(),
      address:      entry.token.address,
      symbol:       entry.token.symbol,
      name:         entry.token.name ?? entry.token.symbol,
      twitter:      entry.token.twitter  ?? null,
      telegram:     entry.token.telegram ?? null,
      website:      entry.token.website  ?? null,
      type,
      signal:       signalTier(entry.score, entry.maxScore ?? (type === 'completed' ? 42 : type === 'near_completion' ? 38 : 10)),
      entryMC:      mc,
      peakMC:       Math.round(curMC),
      gainPct:      parseFloat(gainPct.toFixed(2)),
      gainMultiple: parseFloat(gainMultiple),
      score:        entry.score ?? null,
      maxScore:     entry.maxScore ?? null,
      durationMs:   Date.now() - entry.addedAt,
    });
    if (db.wins.records.length > MAX_RECORDS) db.wins.records = db.wins.records.slice(-MAX_RECORDS);
  }

  db.wins.updatedAt = Date.now();
  saveRecords('wins', WINS_FILE, db.wins);
}

function persistMiss(entry, type) {
  const gainPct = entry.firstOpen && entry.currentClose
    ? ((entry.currentClose - entry.firstOpen) / entry.firstOpen) * 100 : 0;
  const record = {
    ts:         Date.now(),
    address:    entry.token.address,
    symbol:     entry.token.symbol,
    type,
    signal:     signalTier(entry.score, entry.maxScore ?? (type === 'completed' ? 42 : type === 'near_completion' ? 38 : 10)),
    entryMC:    entry.token.usd_market_cap ?? 0,
    peakGainPct: parseFloat(gainPct.toFixed(2)),
    score:      entry.score ?? null,
    maxScore:   entry.maxScore ?? null,
    durationMs: Date.now() - entry.addedAt,
  };
  db.misses.records.push(record);
  if (db.misses.records.length > MAX_RECORDS) db.misses.records = db.misses.records.slice(-MAX_RECORDS);
  db.misses.updatedAt = Date.now();
  saveRecords('misses', MISSES_FILE, db.misses);
}

function computeStats() {
  const all    = [...db.wins.records, ...db.misses.records];
  const tiers  = ['STRONG', 'MEDIUM', 'LOW'];
  const types  = ['new_creation', 'near_completion', 'completed'];

  const bucket = (arr) => {
    const wins = arr.filter(r => db.wins.records.includes(r)).length;
    return { wins, total: arr.length, rate: arr.length ? +(wins / arr.length * 100).toFixed(1) : 0 };
  };

  // Separate wins/misses sets for bucketing
  const wSet = new Set(db.wins.records);
  const bucketSets = (wArr, mArr) => {
    const wins = wArr.length, total = wArr.length + mArr.length;
    const avgGain = wArr.length ? +(wArr.reduce((s, r) => s + r.gainPct, 0) / wArr.length).toFixed(1) : 0;
    const avgMult = wArr.length ? +(wArr.reduce((s, r) => s + r.gainMultiple, 0) / wArr.length).toFixed(2) : 0;
    return { wins, total, rate: total ? +(wins / total * 100).toFixed(1) : 0, avgGain, avgMult };
  };

  const bySignal = {};
  for (const t of tiers) {
    bySignal[t] = bucketSets(
      db.wins.records.filter(r => r.signal === t),
      db.misses.records.filter(r => r.signal === t)
    );
  }

  const byType = {};
  for (const t of types) {
    byType[t] = bucketSets(
      db.wins.records.filter(r => r.type === t),
      db.misses.records.filter(r => r.type === t)
    );
  }

  const overall = bucketSets(db.wins.records, db.misses.records);

  // ROI across ALL calls: wins use gainPct/gainMultiple, misses use peakGainPct
  const allGainPcts = [
    ...db.wins.records.map(r => r.gainPct ?? 0),
    ...db.misses.records.map(r => r.peakGainPct ?? 0),
  ];
  const allMults = [
    ...db.wins.records.map(r => r.gainMultiple ?? 1),
    ...db.misses.records.map(r => 1 + (r.peakGainPct ?? 0) / 100),
  ];
  const avgROIAll = allGainPcts.length ? {
    pct:  +(allGainPcts.reduce((s, v) => s + v, 0) / allGainPcts.length).toFixed(1),
    mult: +(allMults.reduce((s, v) => s + v, 0) / allMults.length).toFixed(2),
  } : null;

  return {
    overall,
    bySignal,
    byType,
    avgROIAll,
    totalWins:   db.wins.records.length,
    totalMisses: db.misses.records.length,
    recentWins:  db.wins.records.slice(-20).reverse(),
    recentMisses: db.misses.records.slice(-10).reverse(),
  };
}

// ─── GMGN CLI ────────────────────────────────────────────────────────────────
function gmgn(args) {
  try {
    const cli = process.platform === 'win32' ? 'node_modules\\.bin\\gmgn-cli' : 'node_modules/.bin/gmgn-cli';
    const out = execSync(`${cli} ${args} --raw`, { encoding: 'utf8', timeout: 30_000 });
    return JSON.parse(out.trim());
  } catch {
    return null;
  }
}

function fetchTrenches() {
  return gmgn(
    `market trenches --chain sol --type new_creation` +
    ` --launchpad-platform Pump.fun` +
    ` --max-marketcap ${CONFIG.maxMarketCap}` +
    ` --min-creator-created-open-count ${CONFIG.minCreatorOpenCount}` +
    ` --min-total-fee ${CONFIG.minTotalFee}` +
    ` --max-created ${CONFIG.maxTokenAge}` +
    ` --min-visiting-count ${CONFIG.minVisitingCount}` +
    ` --min-bundler-rate ${CONFIG.minBundlerRate}` +
    ` --max-rug-ratio ${CONFIG.maxRugRatio}` +
    ` --max-insider-ratio ${CONFIG.maxInsiderRatio}` +
    ` --limit 80`
  );
}

function fetchKline(address, fromTs) {
  const now = Math.floor(Date.now() / 1000);
  return gmgn(
    `market kline --chain sol --address ${address}` +
    ` --resolution 1m --from ${fromTs} --to ${now}`
  );
}

// ─── Telegram ────────────────────────────────────────────────────────────────
function tgRequest(method, body) {
  return new Promise(resolve => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: 'api.telegram.org',
      path:     `/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

function sendTelegram(text, chatId) {
  return tgRequest('sendMessage', {
    chat_id:                  chatId ?? process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode:               'HTML',
    disable_web_page_preview: true,
  });
}

// ─── Step 2: bundler accumulation filter ─────────────────────────────────────
function isBundlerAccumulating(token) {
  const bundlerHold = token.bundler_mhr ?? 0;
  const buys        = token.buys_24h   ?? 0;
  const sells       = token.sells_24h  ?? 0;
  const swaps24h    = token.swaps_24h  ?? 0;  // swaps_1m not available for new_creation
  const buySellRatio = sells > 0 ? buys / sells : buys;

  // Bundler hold rate too low — not accumulating
  if (bundlerHold < CONFIG.minBundlerHoldRate) {
    rejected.bundlerDumping++;
    return { pass: false, reason: `bundler_mhr ${pct(bundlerHold)} < min ${pct(CONFIG.minBundlerHoldRate)}` };
  }

  // Bundler hold rate too high — flash pump trap (COCO pattern: 88% hold = all bundled at launch)
  if (bundlerHold > CONFIG.maxBundlerHoldRate) {
    rejected.bundlerDumping++;
    return { pass: false, reason: `bundler_mhr ${pct(bundlerHold)} > max ${pct(CONFIG.maxBundlerHoldRate)} (flash pump risk)` };
  }

  // Buy/sell ratio too low — no real buy pressure
  if (buys > 0 && buySellRatio < CONFIG.minBuySellRatio) {
    rejected.bundlerDumping++;
    return { pass: false, reason: `buy/sell ratio ${buySellRatio.toFixed(1)}x < min ${CONFIG.minBuySellRatio}x` };
  }

  // Buy/sell ratio too high — no organic sellers, artificial only
  if (sells > 0 && buySellRatio > CONFIG.maxBuySellRatio) {
    rejected.bundlerDumping++;
    return { pass: false, reason: `buy/sell ratio ${buySellRatio.toFixed(1)}x > max ${CONFIG.maxBuySellRatio}x (artificial)` };
  }

  // Needs some trading activity
  if (swaps24h < CONFIG.minSwaps24h) {
    rejected.noActivity++;
    return { pass: false, reason: `swaps_24h ${swaps24h} < min ${CONFIG.minSwaps24h}` };
  }

  return { pass: true };
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatAge(unixTs) {
  const diff = Date.now() - unixTs * 1000;
  const m    = Math.floor(diff / 60_000);
  const s    = Math.floor((diff % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function fmtUSD(val) {
  if (!val || isNaN(val)) return '—';
  if (val >= 1_000_000)   return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)       return `$${(val / 1_000).toFixed(1)}K`;
  return `$${Number(val).toFixed(0)}`;
}

function pct(val) {
  return val != null ? `${(val * 100).toFixed(0)}%` : '—';
}

function fmtUptime() {
  const ms = Date.now() - session.startedAt;
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Message builders ────────────────────────────────────────────────────────
function buildWatchlistEntry(token, buySellRatio) {
  const social = [
    token.twitter  ? `<a href="${token.twitter}">Twitter</a>`   : null,
    token.telegram ? `<a href="${token.telegram}">Telegram</a>` : null,
    token.website  ? `<a href="${token.website}">Website</a>`   : null,
  ].filter(Boolean).join(' · ') || '—';

  return [
    `👁 <b>WATCHING — $${token.symbol}</b>  <i>${token.name}</i>`,
    ``,
    `💰 Market Cap:  ${fmtUSD(token.usd_market_cap)}`,
    `💧 Liquidity:   ${fmtUSD(token.liquidity)}`,
    `⏱ Age:          ${formatAge(token.created_timestamp)}`,
    `👀 Views:        ${token.visiting_count ?? 0}`,
    `👨‍💻 Creator:      ${token.creator_created_open_count ?? 0} graduated / ${token.creator_created_count ?? 0} total`,
    ``,
    `🤖 Bundler rate: ${pct(token.bundler_trader_amount_rate)}  hold: ${pct(token.bundler_mhr)}`,
    `📊 Buy/Sell:     ${buySellRatio}x  (${token.buys_24h ?? 0}B / ${token.sells_24h ?? 0}S)  swaps24h: ${token.swaps_24h ?? 0}`,
    `📣 Social:       ${social}`,
    ``,
    `🔗 <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>  ·  <a href="https://pump.fun/${token.address}">Pump.fun</a>`,
    `📋 <code>${token.address}</code>`,
  ].join('\n');
}

function buildAlert(token, gainPct, gainMultiple, entryPrice, currentPrice) {
  const social = [
    token.twitter  ? `<a href="${token.twitter}">Twitter</a>`   : null,
    token.telegram ? `<a href="${token.telegram}">Telegram</a>` : null,
    token.website  ? `<a href="${token.website}">Website</a>`   : null,
  ].filter(Boolean).join(' · ') || '—';

  const bundlerSignal = [
    `Rate ${pct(token.bundler_trader_amount_rate)}`,
    `Hold ${pct(token.bundler_mhr)}`,
    `Buys ${token.buys_24h ?? 0} / Sells ${token.sells_24h ?? 0}`,
  ].join(' | ');

  const safety = [
    token.renounced_mint           === true ? '✅ Mint'   : '⚠️ Mint',
    token.renounced_freeze_account === true ? '✅ Freeze' : '⚠️ Freeze',
    !token.is_wash_trading                  ? '✅ Clean'  : '❌ Wash',
    `Rug ${pct(token.rug_ratio)}`,
    `Insider ${pct(token.rat_trader_amount_rate)}`,
  ].join(' | ');

  return [
    `🚀 <b>2X ALERT — $${token.symbol}</b>  <i>${token.name}</i>`,
    ``,
    `📈 Gain:          +${gainPct.toFixed(0)}%  (${gainMultiple}x)`,
    `📌 Entry price:   $${entryPrice.toExponential(4)}`,
    `💵 Current price: $${currentPrice.toExponential(4)}`,
    `💰 Market Cap:    ${fmtUSD(token.usd_market_cap)}`,
    `💧 Liquidity:     ${fmtUSD(token.liquidity)}`,
    `⏱ Age:            ${formatAge(token.created_timestamp)}`,
    `👥 Holders:       ${token.holder_count ?? '—'}`,
    `🧠 Smart Money:   ${token.smart_degen_count ?? 0}`,
    `📣 Social:        ${social}`,
    ``,
    `🤖 Bundler:       ${bundlerSignal}`,
    `🛡 Safety:        ${safety}`,
    ``,
    `🔗 <a href="https://pump.fun/${token.address}">Pump.fun</a>  ·  <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>`,
    `<code>${token.address}</code>`,
  ].join('\n');
}

function buildMilestoneAlert(token, gainPct, gainMultiple, currentPrice, estimatedMC) {
  return [
    `📈 <b>${gainMultiple}x — $${token.symbol}</b>  <i>${token.name}</i>`,
    ``,
    `+${gainPct.toFixed(0)}%  |  MC ~${fmtUSD(estimatedMC)}  |  $${currentPrice.toExponential(4)}`,
    ``,
    `🔗 <a href="https://pump.fun/${token.address}">Pump.fun</a>  ·  <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>`,
  ].join('\n');
}

function buildScanReport(newAdded, filtered) {
  return [
    `🔍 <b>Scan #${session.scanCount}</b>  <code>${new Date().toLocaleTimeString('en-US', { hour12: false })}</code>`,
    ``,
    `📡 From API: ${session.totalSeen > 0 ? filtered.fromApi : '—'}  →  passed: ${newAdded}`,
    `👁 Watching: ${watchlist.size} tokens`,
    `🎯 Total wins: ${wins.length}  (since bot start)`,
    `⏱ Uptime: ${fmtUptime()}`,
  ].join('\n');
}

// ─── Telegram command handlers ───────────────────────────────────────────────
function handleStats(chatId) {
  return sendTelegram([
    `📊 <b>Scanner Stats</b>`,
    ``,
    `⏱ Uptime:       ${fmtUptime()}`,
    `🔁 Scans:        ${session.scanCount}`,
    `👁 Tokens seen:  ${session.totalSeen}`,
    `👁 Watching:     ${watchlist.size}`,
    `🎯 Total wins:   ${wins.length}`,
    ``,
    `⚙️ Active Filters`,
    `   Max market cap:   $${CONFIG.maxMarketCap.toLocaleString()}`,
    `   Min creator grads:${CONFIG.minCreatorOpenCount}`,
    `   Min fee:          ${CONFIG.minTotalFee} SOL`,
    `   Max token age:    ${CONFIG.maxTokenAge}`,
    `   Min views:        ${CONFIG.minVisitingCount}`,
    `   Min bundler rate: ${CONFIG.minBundlerRate * 100}%`,
    `   Bundler hold:     ${CONFIG.minBundlerHoldRate * 100}%–${CONFIG.maxBundlerHoldRate * 100}%`,
    `   Buy/sell ratio:   ${CONFIG.minBuySellRatio}x–${CONFIG.maxBuySellRatio}x`,
    `   Min swaps (24h):  ${CONFIG.minSwaps24h}`,
    `   Flash pump:       skip if candle0 ≥ ${CONFIG.flashPumpThreshold * 100}% ATH`,
    `   Max rug:          ${CONFIG.maxRugRatio}`,
    `   Min gain:         ${CONFIG.minGainPct}% (1.5x)`,
  ].join('\n'), chatId);
}

function handleWins(chatId) {
  if (wins.length === 0) return sendTelegram('🎯 No wins yet this session.', chatId);
  const lines = [`🏆 <b>Wins (${wins.length})</b>`, ``];
  wins.slice(-20).forEach((w, i) => {
    lines.push(
      `${i + 1}. <b>$${w.token.symbol}</b>  +${w.gainPct.toFixed(0)}% (${w.gainMultiple}x)` +
      `  <a href="https://pump.fun/${w.token.address}">↗</a>`
    );
  });
  return sendTelegram(lines.join('\n'), chatId);
}

function handleOpen(chatId) {
  if (watchlist.size === 0) return sendTelegram('👁 Watchlist is empty.', chatId);
  const lines = [`👁 <b>Watching (${watchlist.size})</b>`, ``];
  let i = 1;
  for (const [addr, entry] of watchlist) {
    const gain = entry.firstOpen
      ? ` | ${(((parseFloat(entry.currentClose ?? entry.firstOpen) / entry.firstOpen) - 1) * 100).toFixed(0)}%`
      : '';
    lines.push(
      `${i++}. <b>$${entry.token.symbol}</b>  ${formatAge(entry.token.created_timestamp)}${gain}` +
      `  <a href="https://pump.fun/${addr}">↗</a>`
    );
    if (i > 20) { lines.push(`  …and ${watchlist.size - 20} more`); break; }
  }
  return sendTelegram(lines.join('\n'), chatId);
}

// ─── Telegram command polling ────────────────────────────────────────────────
async function pollCommands() {
  const res = await tgRequest('getUpdates', { offset: lastUpdateId + 1, timeout: 10 });
  if (!res?.result?.length) return;
  for (const update of res.result) {
    lastUpdateId = update.update_id;
    const msg = update.message;
    if (!msg?.text) continue;
    const cmd    = msg.text.split(' ')[0].toLowerCase().replace(/@.+$/, '');
    const chatId = String(msg.chat.id);
    console.log(`[cmd] ${cmd}`);
    if      (cmd === '/stats') await handleStats(chatId);
    else if (cmd === '/wins')  await handleWins(chatId);
    else if (cmd === '/open')  await handleOpen(chatId);
  }
}

// ─── Main scan ───────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scan() {
  const now = Date.now();
  session.scanCount++;
  console.log(`\n[${new Date().toLocaleTimeString()}] ── Scan #${session.scanCount} ──`);

  // Expire old watchlist entries
  for (const [addr, entry] of watchlist) {
    if (now - entry.addedAt > CONFIG.maxWatchlistAgeMs) {
      if (!alerted.has(addr)) persistMiss(entry, 'new_creation');
      watchlist.delete(addr);
      console.log(`   ⏰ Expired: $${entry.token.symbol}`);
    }
  }

  // Step 1 — fetch from GMGN (server-side filtered)
  const data   = fetchTrenches();
  const tokens = data?.new_creation ?? [];
  session.totalSeen += tokens.length;

  // Step 2 — add all server-side filtered tokens to watchlist
  let newAdded = 0;
  let bundlerRejected = 0; // kept for report compat
  for (const token of tokens) {
    if (alerted.has(token.address) || watchlist.has(token.address)) continue;

    if (watchlist.size >= CONFIG.maxWatchlistSize) {
      console.log(`   🔒 Watchlist full (${CONFIG.maxWatchlistSize}), skipping $${token.symbol}`);
      continue;
    }

    watchlist.set(token.address, { token, entryMC: token.usd_market_cap ?? 0, addedAt: now, firstOpen: null, currentClose: null, peakClose: null, peakHigh: null });
    newAdded++;
    const bsr = (token.sells_24h > 0 ? token.buys_24h / token.sells_24h : token.buys_24h).toFixed(1);
    console.log(
      `   ➕ $${token.symbol.padEnd(10)} bundler ${pct(token.bundler_trader_amount_rate)} ` +
      `hold ${pct(token.bundler_mhr)} buy/sell ${bsr}x swaps24h ${token.swaps_24h ?? 0}`
    );

    // Notify Telegram immediately when token enters watchlist
    await sendTelegram(buildWatchlistEntry(token, bsr));
  }

  console.log(`   API: ${tokens.length} | passed: ${newAdded} | rejected: ${bundlerRejected} | watching: ${watchlist.size}`);

  // Step 3 — check watchlist for 2x via kline
  for (const [addr, entry] of watchlist) {
    await sleep(CONFIG.klineDelayMs);

    const kline   = fetchKline(addr, entry.token.created_timestamp);
    const candles = kline?.list ?? [];
    if (candles.length === 0) continue;

    // Capture entry price at watchlist-add time (not token launch)
    if (!entry.firstOpen) {
      if (alerted.has(addr)) continue; // flash pump already marked

      // Flash pump detection stays based on first candle (token launch)
      const athHigh  = Math.max(...candles.map(c => parseFloat(c.high)));
      const c0High   = parseFloat(candles[0].high);
      const c0AthPct = c0High / athHigh;
      if (candles.length >= 2 && c0AthPct >= CONFIG.flashPumpThreshold) {
        alerted.add(addr);
        watchlist.delete(addr);
        console.log(`   ⚡ $${entry.token.symbol} flash pump (candle0 = ${(c0AthPct*100).toFixed(0)}% of ATH) — skip`);
        continue;
      }

      // Entry price = close of latest candle at detection time (matches watchlist-add MC)
      const lastCandle = candles[candles.length - 1];
      const close = parseFloat(lastCandle.close);
      if (!close || close <= 0) continue;

      entry.firstOpen = close;
      console.log(`   📌 $${entry.token.symbol} entry $${close.toExponential(4)}  ATH ratio ${(c0AthPct*100).toFixed(0)}%`);
    }

    const currentClose = parseFloat(candles[candles.length - 1].close);
    entry.currentClose = currentClose;
    if (!entry.peakClose || currentClose > entry.peakClose) entry.peakClose = currentClose;
    // Track true peak using candle highs (not just close), covering intraday wicks
    const batchPeakHigh = Math.max(...candles.map(c => parseFloat(c.high) || 0));
    if (!entry.peakHigh || batchPeakHigh > entry.peakHigh) entry.peakHigh = batchPeakHigh;
    const gainPct      = ((currentClose - entry.firstOpen) / entry.firstOpen) * 100;
    const gainMultiple = (currentClose / entry.firstOpen).toFixed(2);

    // Estimate current MC based on price ratio vs initial MC
    const estimatedMC = entry.entryMC
      ? (currentClose / entry.firstOpen) * entry.entryMC
      : 0;

    // Post-2x monitoring: if MC drops below 4k, drop silently
    if (entry.hitAt && estimatedMC > 0 && estimatedMC < 4000) {
      watchlist.delete(addr);
      console.log(`   💀 $${entry.token.symbol} MC ~${fmtUSD(estimatedMC)} < $4k, dropping`);
      continue;
    }

    if (gainPct >= CONFIG.minGainPct) {
      if (!entry.hitAt) {
        // First 2x hit — alert and keep monitoring
        entry.hitAt = { gainPct, gainMultiple, alertedAt: Date.now() };
        entry.lastAlertedMultiple = parseFloat(gainMultiple);
        alerted.add(addr);
        wins.push({ token: entry.token, gainPct, gainMultiple, alertedAt: Date.now(), entryPrice: entry.firstOpen, currentPrice: currentClose });
        persistWin(entry, 'new_creation', gainPct, parseFloat(gainMultiple), entry.firstOpen, currentClose);
        await sendTelegram(buildAlert(entry.token, gainPct, gainMultiple, entry.firstOpen, currentClose));
        console.log(`   🚀 HIT: $${entry.token.symbol} +${gainPct.toFixed(0)}% — still watching`);
      } else {
        // Already alerted — check for next integer milestone (3x, 4x, 5x…)
        const newMultiple = parseFloat(gainMultiple);
        const nextMilestone = Math.floor(entry.lastAlertedMultiple) + 1;
        if (newMultiple >= nextMilestone) {
          entry.lastAlertedMultiple = newMultiple;
          await sendTelegram(buildMilestoneAlert(entry.token, gainPct, gainMultiple, currentClose, estimatedMC));
          console.log(`   📈 MILESTONE: $${entry.token.symbol} ${gainMultiple}x`);
        }
      }
    }
  }

  // Step 4 — always report to Telegram
  await sendTelegram(buildScanReport(newAdded, {
    fromApi: tokens.length,
    bundlerRejected,
  }));
}

// ─── Migration Scanner Config ─────────────────────────────────────────────────
// Scans `market trenches --type completed` for tokens that just graduated from
// Pump.fun bonding curve. Derived from Gooner + SOCK pump pattern analysis.
//
// Key finding: smart_degen_count and graduation_speed are the two strongest
// predictors of post-migration pump magnitude. SOCK (13 SM, 4.25min grad) pumped
// 4x further than Gooner (3 SM, 31min grad).
const MIGRATION_CONFIG = {
  intervalMs:        90_000,   // poll every 90s
  maxAgeMinutes:     720,      // ignore tokens migrated >12 hours ago
  maxWatchMinutes:   720,      // stop tracking after 12 hours

  // Hard filters — any fail = skip immediately
  maxRugRatio:       0.40,
  maxTop10Holder:    0.65,
  minLiquidity:      500,

  // Scoring thresholds (lowered — this is analysis, not buy advice)
  watchThreshold:    3,        // score ≥ 3 → 🟡 WATCH
  signalThreshold:   10,       // score ≥ 10 → 🟠 SIGNAL
  strongThreshold:   18,       // score ≥ 18 → 🟢 STRONG BUY

  // Kline monitoring
  klineDelayMs:      400,
  gainAlertPct:      50,       // alert at 1.5x
};

// ─── Migration scanner state ──────────────────────────────────────────────────
const seenMigrated    = new Set();              // addresses already processed
const migratedWatch   = new Map();              // Map<address, MigratedEntry>
const migratedWins    = [];
let   migrationScanN  = 0;

// ─── Scoring formula (derived from Gooner/SOCK pattern analysis) ──────────────
//
// Signal weights based on observed correlation with pump magnitude:
//   smart_degen_count  — strongest predictor (4x more SM = 4x further pump)
//   graduation_speed   — fast grad = strong demand = more upside
//   renowned_count     — secondary, adds social distribution
//   cto_flag           — community narrative = organic FOMO
//   dexscr_update_link — active marketing before pump
//   bundler_rate       — lower = more organic buyers (SOCK 10.5% > Gooner 20%)
//
function scoreMigratedToken(token) {
  const reasons = [];
  let score = 0;

  // Hard filter check
  if ((token.rug_ratio ?? 0) > MIGRATION_CONFIG.maxRugRatio)           return { score: -1, reasons: ['rug_ratio too high'] };
  if (token.is_wash_trading)                                             return { score: -1, reasons: ['wash trading detected'] };
  if ((token.top_10_holder_rate ?? 1) > MIGRATION_CONFIG.maxTop10Holder) return { score: -1, reasons: ['top10 holder concentrated'] };
  if ((token.liquidity ?? 0) < MIGRATION_CONFIG.minLiquidity)           return { score: -1, reasons: ['liquidity too low'] };
  // creator still holding → not a hard reject, penalise score instead

  // ── Creator risk flag (penalty only, not rejection) ────────────────────────
  if (token.creator_token_status !== 'creator_close') {
    reasons.push('⚠️ creator holding');
  }

  // ── Smart money (0-15 pts) ──────────────────────────────────────────────────
  const sm = token.smart_degen_count ?? 0;
  if      (sm > 12) { score += 15; reasons.push(`SM ${sm} (max tier)`); }
  else if (sm >= 6) { score += 12; reasons.push(`SM ${sm} (high)`); }
  else if (sm >= 3) { score += 8;  reasons.push(`SM ${sm} (solid)`); }
  else if (sm >= 1) { score += 4;  reasons.push(`SM ${sm} (low)`); }

  // ── KOL wallets (0-8 pts) ───────────────────────────────────────────────────
  const kol = token.renowned_count ?? 0;
  if      (kol >= 5) { score += 8; reasons.push(`KOL ${kol} (strong)`); }
  else if (kol >= 2) { score += 5; reasons.push(`KOL ${kol}`); }
  else if (kol >= 1) { score += 3; reasons.push(`KOL ${kol}`); }

  // ── Graduation speed (0-5 pts) ──────────────────────────────────────────────
  // complete_cost_time = seconds from creation to bonding curve completion
  const gradSec = token.complete_cost_time ?? 0;
  const gradMin = gradSec / 60;
  if      (gradMin <= 5)  { score += 5; reasons.push(`grad ${gradMin.toFixed(1)}min (ultra fast)`); }
  else if (gradMin <= 15) { score += 4; reasons.push(`grad ${gradMin.toFixed(1)}min (fast)`); }
  else if (gradMin <= 30) { score += 3; reasons.push(`grad ${gradMin.toFixed(1)}min`); }
  else if (gradMin <= 60) { score += 2; reasons.push(`grad ${gradMin.toFixed(1)}min (slow)`); }
  else if (gradSec === 0) { score += 1; reasons.push('grad speed unknown'); }

  // ── CTO flag (+3 pts) ───────────────────────────────────────────────────────
  if (token.cto_flag) { score += 3; reasons.push('CTO'); }

  // ── Dexscreener social update (+2 pts) ──────────────────────────────────────
  if (token.dexscr_update_link) { score += 2; reasons.push('dexscr update'); }

  // ── Has social (+1 pt) ──────────────────────────────────────────────────────
  if (token.has_at_least_one_social) { score += 1; reasons.push('social'); }

  // ── Organic buy pressure: low bundler rate (+2 pts) ─────────────────────────
  // SOCK had 10.5% (organic) vs Gooner 20% (semi-bundled) — SOCK pumped 4x further
  const bundlerRate = token.bundler_trader_amount_rate ?? 1;
  if (bundlerRate < 0.15) { score += 2; reasons.push(`organic (bundler ${pct(bundlerRate)})`); }

  // ── Perfect rug score (+1 pt) ────────────────────────────────────────────────
  if ((token.rug_ratio ?? 1) === 0) { score += 1; reasons.push('rug 0'); }

  // ── Liquidity depth bonus (+1 pt) ────────────────────────────────────────────
  if ((token.liquidity ?? 0) > 10_000) { score += 1; reasons.push(`liq ${fmtUSD(token.liquidity)}`); }

  // ── Volume momentum (+2 pts) ─────────────────────────────────────────────────
  if ((token.volume_1h ?? 0) > 10_000) { score += 2; reasons.push(`vol1h ${fmtUSD(token.volume_1h)}`); }
  else if ((token.volume_24h ?? 0) > 5_000) { score += 1; reasons.push(`vol24h ${fmtUSD(token.volume_24h)}`); }

  // ── Holder count (+1 pt) ─────────────────────────────────────────────────────
  if ((token.holder_count ?? 0) > 200) { score += 1; reasons.push(`holders ${token.holder_count}`); }

  return { score, reasons };
}

// ─── Migration alert builders ─────────────────────────────────────────────────
function migratedTier(score) {
  if (score >= MIGRATION_CONFIG.strongThreshold) return '🟢 STRONG';
  if (score >= MIGRATION_CONFIG.signalThreshold) return '🟠 SIGNAL';
  return '🟡 WATCH';
}

function buildMigrationAlert(token, score, reasons, gradMin) {
  const tier = migratedTier(score);
  const mc   = token.usd_market_cap ?? 0;
  const social = [
    token.twitter   ? `<a href="${token.twitter}">Twitter</a>`   : null,
    token.telegram  ? `<a href="${token.telegram}">Telegram</a>` : null,
    token.website   ? `<a href="${token.website}">Website</a>`   : null,
  ].filter(Boolean).join(' · ') || '—';

  // Minutes since migration
  const now = Math.floor(Date.now() / 1000);
  const migratedAgoMin = ((now - (token.complete_timestamp ?? token.open_timestamp ?? now)) / 60).toFixed(0);

  return [
    `${tier} — <b>$${token.symbol}</b>  <i>${token.name}</i>`,
    `Score: ${score}/42  |  migrated ${migratedAgoMin}m ago`,
    ``,
    `💰 MC:       ${fmtUSD(mc)}`,
    `💧 Liq:      ${fmtUSD(token.liquidity)}`,
    `⚡ Grad:     ${gradMin}min  |  ${token.launchpad_platform ?? 'pump.fun'}`,
    `👥 Holders:  ${token.holder_count ?? '—'}`,
    `🧠 SM:       ${token.smart_degen_count ?? 0}  KOL: ${token.renowned_count ?? 0}`,
    `🔥 Vol 1h:   ${fmtUSD(token.volume_1h)}  Swaps: ${token.swaps_1h ?? 0}`,
    `🤖 Bundler:  ${pct(token.bundler_trader_amount_rate)}  Rug: ${pct(token.rug_ratio)}`,
    `${token.cto_flag ? '🏴 CTO  ' : ''}${token.dexscr_update_link ? '📣 DexUpdated' : ''}`,
    `📝 Signals:  ${reasons.join(', ')}`,
    `📣 Social:   ${social}`,
    ``,
    `🔗 <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>  ·  <a href="https://pump.fun/${token.address}">Pump.fun</a>`,
    `<code>${token.address}</code>`,
  ].join('\n');
}

function buildMigratedGainAlert(token, gainPct, gainMultiple, entryPrice, currentPrice) {
  const mc = token.usd_market_cap
    ? fmtUSD((currentPrice / entryPrice) * token.usd_market_cap)
    : '—';
  return [
    `🚀 <b>MIGRATED ${gainMultiple}x — $${token.symbol}</b>`,
    ``,
    `+${gainPct.toFixed(0)}%  |  MC ~${mc}  |  $${currentPrice.toExponential(4)}`,
    `SM: ${token.smart_degen_count ?? 0}  KOL: ${token.renowned_count ?? 0}`,
    ``,
    `🔗 <a href="https://pump.fun/${token.address}">Pump.fun</a>  ·  <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>`,
  ].join('\n');
}

// ─── Migration scan ───────────────────────────────────────────────────────────
async function scanMigrated() {
  migrationScanN++;
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - MIGRATION_CONFIG.maxAgeMinutes * 60;
  console.log(`\n[${new Date().toLocaleTimeString()}] ── Migration Scan #${migrationScanN} ──`);

  // Expire old watchlist entries
  for (const [addr, entry] of migratedWatch) {
    if (Date.now() - entry.addedAt > MIGRATION_CONFIG.maxWatchMinutes * 60_000) {
      if (entry.lastMultiple <= 1) persistMiss(entry, 'completed');
      migratedWatch.delete(addr);
      console.log(`   ⏰ Expired migrated: $${entry.token.symbol}`);
    }
  }

  // Fetch recently graduated tokens from all major SOL launchpads
  const data = gmgn(
    `market trenches --chain sol --type completed` +
    ` --launchpad-platform Pump.fun --launchpad-platform pump_mayhem` +
    ` --launchpad-platform pump_mayhem_agent --launchpad-platform pump_agent` +
    ` --launchpad-platform letsbonk --launchpad-platform bonkers --launchpad-platform bags` +
    ` --max-rug-ratio ${MIGRATION_CONFIG.maxRugRatio}` +
    ` --limit 80`
  );

  const tokens = data?.completed ?? [];
  let newAlerted = 0;

  for (const token of tokens) {
    const addr = token.address;

    // Skip stale tokens
    const migratedAt = token.complete_timestamp ?? token.open_timestamp ?? 0;
    if (migratedAt < cutoff) continue;

    // Skip already seen
    if (seenMigrated.has(addr)) continue;
    seenMigrated.add(addr);

    // Score it
    const { score, reasons } = scoreMigratedToken(token);
    if (score < 0) {
      console.log(`   ✗ $${token.symbol} filtered: ${reasons[0]}`);
      continue;
    }

    if (score < MIGRATION_CONFIG.watchThreshold) {
      console.log(`   · $${token.symbol} score ${score} (below threshold)`);
      continue;
    }

    const gradMin = token.complete_cost_time
      ? (token.complete_cost_time / 60).toFixed(1)
      : '?';

    console.log(`   ${migratedTier(score)} $${token.symbol} score=${score} SM=${token.smart_degen_count} KOL=${token.renowned_count} grad=${gradMin}min`);

    // Alert Telegram
    await sendTelegram(buildMigrationAlert(token, score, reasons, gradMin));
    newAlerted++;

    // Add to kline watchlist for 2x tracking
    migratedWatch.set(addr, {
      token,
      entryMC:      token.usd_market_cap ?? 0,
      addedAt:      Date.now(),
      firstOpen:    null,
      peakHigh:     null,
      lastMultiple: 1,
      score,
      reasons,
    });
  }

  // Monitor migratedWatch for 2x gains
  for (const [addr, entry] of migratedWatch) {
    await sleep(MIGRATION_CONFIG.klineDelayMs);

    const sinceTs = entry.token.created_timestamp ?? (Math.floor(Date.now() / 1000) - 7200);
    const kline   = fetchKline(addr, sinceTs);
    const candles = kline?.list ?? [];
    if (candles.length === 0) continue;

    if (!entry.firstOpen) {
      const last = candles[candles.length - 1];
      const close = parseFloat(last.close);
      if (!close || close <= 0) continue;
      entry.firstOpen = close;
    }

    const currentClose  = parseFloat(candles[candles.length - 1].close);
    entry.currentClose  = currentClose;
    if (!entry.peakClose || currentClose > entry.peakClose) entry.peakClose = currentClose;
    const batchPeakHighM = Math.max(...candles.map(c => parseFloat(c.high) || 0));
    if (!entry.peakHigh || batchPeakHighM > entry.peakHigh) entry.peakHigh = batchPeakHighM;
    const gainPct       = ((currentClose - entry.firstOpen) / entry.firstOpen) * 100;
    const gainMultiple  = (currentClose / entry.firstOpen).toFixed(2);
    const newMultiple   = parseFloat(gainMultiple);

    if (gainPct >= MIGRATION_CONFIG.gainAlertPct) {
      const nextMilestone = Math.floor(entry.lastMultiple) + 1;
      if (newMultiple >= nextMilestone) {
        entry.lastMultiple = newMultiple;
        migratedWins.push({ token: entry.token, gainPct, gainMultiple, alertedAt: Date.now() });
        if (newMultiple >= 2) persistWin(entry, 'completed', gainPct, newMultiple, entry.firstOpen, currentClose);
        await sendTelegram(buildMigratedGainAlert(entry.token, gainPct, gainMultiple, entry.firstOpen, currentClose));
        console.log(`   🚀 MIGRATED HIT: $${entry.token.symbol} ${gainMultiple}x`);
      }
    }
  }

  console.log(`   Scanned: ${tokens.length} | new alerts: ${newAlerted} | watching: ${migratedWatch.size}`);
}

// ─── Near Completion Scanner Config ──────────────────────────────────────────
// Targets tokens at 80–99% of bonding curve (~$30–60k MC).
// Strategy: buy before migration pump. SM presence = strongest signal.
const NEAR_COMPLETION_CONFIG = {
  intervalMs:      120_000,  // poll every 2 minutes
  maxWatchMinutes: 720,      // stop tracking after 12 hours

  // Hard filters (relaxed — analysis tool, not buy signal)
  maxRugRatio:     0.40,
  maxTop10Holder:  0.65,
  maxInsiderRatio: 0.75,

  // Score thresholds (max 38)
  watchThreshold:  3,
  signalThreshold: 10,
  strongThreshold: 18,

  klineDelayMs:    400,
  gainAlertPct:    50,         // alert at 1.5x
};

const NEAR_COMPL_MAX_SCORE = 38;

// ─── Near Completion state ────────────────────────────────────────────────────
const seenNearCompl  = new Set();
const nearComplWatch = new Map();
const nearComplWins  = [];
let   nearComplScanN = 0;

// ─── Shared action helper (used by all scanners + dashboard) ──────────────────
function getAction(score, maxScore) {
  const n = score / maxScore;
  if (n >= 0.55) return { label: 'BUY',   icon: '🚀', tier: 'strong' };
  if (n >= 0.35) return { label: 'WATCH',  icon: '👀', tier: 'signal' };
  if (n >= 0.20) return { label: 'WAIT',   icon: '⏳', tier: 'watch'  };
  return               { label: 'SKIP',   icon: '⏭',  tier: 'low'    };
}

// ─── Near Completion scoring ──────────────────────────────────────────────────
function scoreNearCompletionToken(token) {
  const reasons = [];
  let score = 0;

  if ((token.rug_ratio ?? 0) > NEAR_COMPLETION_CONFIG.maxRugRatio)
    return { score: -1, reasons: ['rug_ratio too high'] };
  if (token.is_wash_trading)
    return { score: -1, reasons: ['wash trading'] };
  if ((token.top_10_holder_rate ?? 1) > NEAR_COMPLETION_CONFIG.maxTop10Holder)
    return { score: -1, reasons: ['top10 concentrated'] };
  // insider ratio — flag in reasons but don't hard reject
  if ((token.rat_trader_amount_rate ?? 0) > NEAR_COMPLETION_CONFIG.maxInsiderRatio)
    return { score: -1, reasons: ['insider ratio too high'] };
  // warn if elevated but below threshold
  if ((token.rat_trader_amount_rate ?? 0) > 0.30) {
    reasons.push(`⚠️ insider ${pct(token.rat_trader_amount_rate)}`);
  }

  // Smart money — strongest predictor (0–15)
  const sm = token.smart_degen_count ?? 0;
  if      (sm > 10) { score += 15; reasons.push(`SM ${sm} (max tier)`); }
  else if (sm >= 5) { score += 12; reasons.push(`SM ${sm} (high)`); }
  else if (sm >= 3) { score += 8;  reasons.push(`SM ${sm} (solid)`); }
  else if (sm >= 1) { score += 4;  reasons.push(`SM ${sm}`); }

  // KOL wallets (0–6)
  const kol = token.renowned_count ?? 0;
  if      (kol >= 3) { score += 6; reasons.push(`KOL ${kol} (strong)`); }
  else if (kol >= 1) { score += 3; reasons.push(`KOL ${kol}`); }

  // Buy pressure (0–5)
  const bsr = (token.sells_24h > 0) ? token.buys_24h / token.sells_24h : (token.buys_24h ?? 0);
  if      (bsr >= 5)   { score += 5; reasons.push(`B/S ${bsr.toFixed(1)}x (strong)`); }
  else if (bsr >= 2.5) { score += 3; reasons.push(`B/S ${bsr.toFixed(1)}x`); }
  else if (bsr >= 1.5) { score += 1; reasons.push(`B/S ${bsr.toFixed(1)}x`); }

  // Visit count / social buzz (0–4)
  const visits = token.visiting_count ?? 0;
  if      (visits > 500) { score += 4; reasons.push(`${visits} views`); }
  else if (visits > 200) { score += 3; reasons.push(`${visits} views`); }
  else if (visits > 100) { score += 2; reasons.push(`${visits} views`); }
  else if (visits > 50)  { score += 1; reasons.push(`${visits} views`); }

  // Social links (0–2)
  if (token.twitter && token.telegram) { score += 2; reasons.push('full social'); }
  else if (token.twitter || token.telegram) { score += 1; reasons.push('social'); }

  // Organic buyers: low bundler rate (0–3)
  const br = token.bundler_trader_amount_rate ?? 1;
  if      (br < 0.10) { score += 3; reasons.push(`organic (bundler ${pct(br)})`); }
  else if (br < 0.20) { score += 2; reasons.push(`bundler ${pct(br)}`); }
  else if (br < 0.35) { score += 1; reasons.push(`bundler ${pct(br)}`); }

  // Clean rug (0–1)
  if ((token.rug_ratio ?? 1) < 0.05) { score += 1; reasons.push('rug 0'); }

  // Volume (0–2)
  if ((token.volume_1h ?? 0) > 20_000) { score += 2; reasons.push(`vol1h ${fmtUSD(token.volume_1h)}`); }
  else if ((token.volume_24h ?? 0) > 10_000) { score += 1; reasons.push(`vol24h ${fmtUSD(token.volume_24h)}`); }

  return { score: Math.min(score, NEAR_COMPL_MAX_SCORE), reasons };
}

function nearComplTier(score) {
  if (score >= NEAR_COMPLETION_CONFIG.strongThreshold) return '🟢 STRONG';
  if (score >= NEAR_COMPLETION_CONFIG.signalThreshold) return '🟠 SIGNAL';
  return '🟡 WATCH';
}

// ─── Near Completion alert builders ──────────────────────────────────────────
function buildNearCompletionAlert(token, score, reasons) {
  const tier   = nearComplTier(score);
  const action = getAction(score, NEAR_COMPL_MAX_SCORE);
  const social = [
    token.twitter  ? `<a href="${token.twitter}">Twitter</a>`   : null,
    token.telegram ? `<a href="${token.telegram}">Telegram</a>` : null,
    token.website  ? `<a href="${token.website}">Website</a>`   : null,
  ].filter(Boolean).join(' · ') || '—';
  const bsr = (token.sells_24h > 0) ? (token.buys_24h / token.sells_24h).toFixed(1) : '—';

  return [
    `${tier} <b>NEAR GRAD — $${token.symbol}</b>  <i>${token.name}</i>`,
    ``,
    `${action.icon} <b>Action: ${action.label}</b>  |  Score: ${score}/${NEAR_COMPL_MAX_SCORE}`,
    `<i>⚠️ Not financial advice. DYOR.</i>`,
    ``,
    `💰 MC:       ${fmtUSD(token.usd_market_cap)}`,
    `💧 Liq:      ${fmtUSD(token.liquidity)}`,
    `👥 Holders:  ${token.holder_count ?? '—'}`,
    `🧠 SM:       ${token.smart_degen_count ?? 0}  KOL: ${token.renowned_count ?? 0}`,
    `📊 B/S:      ${bsr}x  (${token.buys_24h ?? 0}B / ${token.sells_24h ?? 0}S)`,
    `👀 Views:    ${token.visiting_count ?? 0}`,
    `🤖 Bundler:  ${pct(token.bundler_trader_amount_rate)}  Rug: ${pct(token.rug_ratio)}`,
    `📝 Signals:  ${reasons.join(', ')}`,
    `📣 Social:   ${social}`,
    ``,
    `🔗 <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>  ·  <a href="https://pump.fun/${token.address}">Pump.fun</a>`,
    `<code>${token.address}</code>`,
  ].join('\n');
}

function buildNearComplGainAlert(token, gainPct, gainMultiple, entry, current) {
  return [
    `🚀 <b>NEAR-COMPL ${gainMultiple}x — $${token.symbol}</b>`,
    ``,
    `+${gainPct.toFixed(0)}%  |  MC ~${fmtUSD((current / entry) * (token.usd_market_cap ?? 0))}  |  $${current.toExponential(4)}`,
    `SM: ${token.smart_degen_count ?? 0}  KOL: ${token.renowned_count ?? 0}`,
    ``,
    `🔗 <a href="https://pump.fun/${token.address}">Pump.fun</a>  ·  <a href="https://gmgn.ai/sol/token/${token.address}">GMGN</a>`,
  ].join('\n');
}

// ─── Near Completion scan ─────────────────────────────────────────────────────
async function scanNearCompletion() {
  nearComplScanN++;
  console.log(`\n[${new Date().toLocaleTimeString()}] ── Near Completion Scan #${nearComplScanN} ──`);

  // Expire old entries
  for (const [addr, entry] of nearComplWatch) {
    if (Date.now() - entry.addedAt > NEAR_COMPLETION_CONFIG.maxWatchMinutes * 60_000) {
      if (entry.lastMultiple <= 1) persistMiss(entry, 'near_completion');
      nearComplWatch.delete(addr);
      console.log(`   ⏰ Expired near-compl: $${entry.token.symbol}`);
    }
  }

  const data = gmgn(
    `market trenches --chain sol --type near_completion` +
    ` --launchpad-platform Pump.fun` +
    ` --max-rug-ratio ${NEAR_COMPLETION_CONFIG.maxRugRatio}` +
    ` --max-insider-ratio ${NEAR_COMPLETION_CONFIG.maxInsiderRatio}` +
    ` --limit 80`
  );

  const tokens = data?.near_completion ?? [];
  let newAlerted = 0;

  for (const token of tokens) {
    const addr = token.address;
    if (seenNearCompl.has(addr)) continue;
    seenNearCompl.add(addr);

    const { score, reasons } = scoreNearCompletionToken(token);
    if (score < 0) {
      console.log(`   ✗ $${token.symbol} filtered: ${reasons[0]}`);
      continue;
    }
    if (score < NEAR_COMPLETION_CONFIG.watchThreshold) {
      console.log(`   · $${token.symbol} score ${score} (below threshold)`);
      continue;
    }

    const action = getAction(score, NEAR_COMPL_MAX_SCORE);
    console.log(`   ${nearComplTier(score)} $${token.symbol} score=${score} SM=${token.smart_degen_count ?? 0} KOL=${token.renowned_count ?? 0} → ${action.icon} ${action.label}`);

    await sendTelegram(buildNearCompletionAlert(token, score, reasons));
    newAlerted++;

    nearComplWatch.set(addr, {
      token,
      entryMC:      token.usd_market_cap ?? 0,
      addedAt:      Date.now(),
      firstOpen:    null,
      peakHigh:     null,
      lastMultiple: 1,
      score,
      reasons,
    });
  }

  // Monitor for gains
  for (const [addr, entry] of nearComplWatch) {
    await sleep(NEAR_COMPLETION_CONFIG.klineDelayMs);

    const sinceTs = entry.token.created_timestamp ?? (Math.floor(Date.now() / 1000) - 7200);
    const kline   = fetchKline(addr, sinceTs);
    const candles = kline?.list ?? [];
    if (!candles.length) continue;

    if (!entry.firstOpen) {
      const close = parseFloat(candles[candles.length - 1].close);
      if (!close || close <= 0) continue;
      entry.firstOpen = close;
    }

    const current      = parseFloat(candles[candles.length - 1].close);
    entry.currentClose = current;
    if (!entry.peakClose || current > entry.peakClose) entry.peakClose = current;
    const batchPeakHighN = Math.max(...candles.map(c => parseFloat(c.high) || 0));
    if (!entry.peakHigh || batchPeakHighN > entry.peakHigh) entry.peakHigh = batchPeakHighN;
    const gainPct      = ((current - entry.firstOpen) / entry.firstOpen) * 100;
    const gainMultiple = (current / entry.firstOpen).toFixed(2);
    const newMult      = parseFloat(gainMultiple);

    if (gainPct >= NEAR_COMPLETION_CONFIG.gainAlertPct) {
      const next = Math.floor(entry.lastMultiple) + 1;
      if (newMult >= next) {
        entry.lastMultiple = newMult;
        nearComplWins.push({ token: entry.token, gainPct, gainMultiple, alertedAt: Date.now(), entryPrice: entry.firstOpen, currentPrice: current });
        if (newMult >= 2) persistWin(entry, 'near_completion', gainPct, newMult, entry.firstOpen, current);
        await sendTelegram(buildNearComplGainAlert(entry.token, gainPct, gainMultiple, entry.firstOpen, current));
        console.log(`   🚀 NEAR-COMPL HIT: $${entry.token.symbol} ${gainMultiple}x`);
      }
    }
  }

  console.log(`   Scanned: ${tokens.length} | new alerts: ${newAlerted} | watching: ${nearComplWatch.size}`);
}

// ─── Dashboard HTTP server ────────────────────────────────────────────────────
const DASHBOARD_PORT = parseInt(process.env.PORT || process.env.DASHBOARD_PORT || '3000');

function serializeWatchlistEntry(address, entry) {
  const gainPct = entry.firstOpen && entry.currentClose
    ? ((entry.currentClose - entry.firstOpen) / entry.firstOpen) * 100
    : null;
  // Client-side rating score (simplified mirror of dashboard logic, max 10)
  const t  = entry.token;
  const br = t.bundler_trader_amount_rate ?? 1;
  const bh = t.bundler_mhr ?? 0;
  const bsr = (t.sells_24h > 0) ? t.buys_24h / t.sells_24h : (t.buys_24h ?? 0);
  const rug = t.rug_ratio ?? 1;
  const sm  = t.smart_degen_count ?? 0;
  let s = 0;
  if (br >= 0.15 && br <= 0.50) s += 2;
  if (bh >= 0.20 && bh <= 0.70) s += 2;
  if (bsr >= 1.5  && bsr <= 8)  s += 2;
  if (rug < 0.10) s += 2; else if (rug < 0.25) s += 1;
  s += Math.min(sm, 2);
  const score = Math.min(s, 10);
  const action = getAction(score, 10);

  return {
    address,
    symbol:       t.symbol,
    name:         t.name,
    marketCap:    t.usd_market_cap,
    liquidity:    t.liquidity,
    createdAt:    t.created_timestamp,
    addedAt:      entry.addedAt,
    firstOpen:    entry.firstOpen,
    currentClose: entry.currentClose ?? null,
    gainPct:      gainPct !== null ? parseFloat(gainPct.toFixed(2)) : null,
    peakMC:       entry.peakHigh && entry.firstOpen && entry.entryMC
                    ? Math.round((entry.peakHigh / entry.firstOpen) * entry.entryMC)
                    : null,
    hitAt:        entry.hitAt ?? null,
    bundlerRate:  t.bundler_trader_amount_rate,
    bundlerHold:  t.bundler_mhr,
    buys:         t.buys_24h,
    sells:        t.sells_24h,
    smartMoney:   t.smart_degen_count,
    rugRatio:     t.rug_ratio,
    score,
    action:       action.label,
    actionIcon:   action.icon,
    actionTier:   action.tier,
    twitter:      t.twitter  ?? null,
    telegram:     t.telegram ?? null,
    website:      t.website  ?? null,
  };
}

function serializeWatchlist(map) {
  const out = [];
  for (const [address, entry] of map) out.push(serializeWatchlistEntry(address, entry));
  return out;
}

function serializeGraduationEntry(address, entry, type) {
  const gainPct = entry.firstOpen && entry.currentClose
    ? ((entry.currentClose - entry.firstOpen) / entry.firstOpen) * 100
    : null;
  const score     = entry.score ?? 0;
  const maxScore  = type === 'near_completion' ? NEAR_COMPL_MAX_SCORE : 42;
  const action    = getAction(score, maxScore);
  return {
    address,
    type,
    symbol:       entry.token.symbol,
    name:         entry.token.name,
    marketCap:    entry.token.usd_market_cap,
    liquidity:    entry.token.liquidity,
    createdAt:    entry.token.created_timestamp,
    addedAt:      entry.addedAt,
    firstOpen:    entry.firstOpen,
    currentClose: entry.currentClose ?? null,
    gainPct:      gainPct !== null ? parseFloat(gainPct.toFixed(2)) : null,
    peakMC:       entry.peakHigh && entry.firstOpen && entry.entryMC
                    ? Math.round((entry.peakHigh / entry.firstOpen) * entry.entryMC)
                    : null,
    lastMultiple: entry.lastMultiple,
    score,
    maxScore,
    reasons:      entry.reasons ?? [],
    action:       action.label,
    actionIcon:   action.icon,
    actionTier:   action.tier,
    smartMoney:   entry.token.smart_degen_count,
    kol:          entry.token.renowned_count,
    gradMin:      entry.token.complete_cost_time ? (entry.token.complete_cost_time / 60).toFixed(1) : null,
    rugRatio:     entry.token.rug_ratio,
    bundlerRate:  entry.token.bundler_trader_amount_rate ?? null,
    visits:       entry.token.visiting_count ?? null,
    buys:         entry.token.buys_24h ?? null,
    sells:        entry.token.sells_24h ?? null,
    twitter:      entry.token.twitter  ?? null,
    telegram:     entry.token.telegram ?? null,
    website:      entry.token.website  ?? null,
  };
}

function serializeGraduationWatch() {
  const out = [];
  for (const [addr, entry] of nearComplWatch) out.push(serializeGraduationEntry(addr, entry, 'near_completion'));
  for (const [addr, entry] of migratedWatch)  out.push(serializeGraduationEntry(addr, entry, 'completed'));
  return out;
}

const dashServer = http.createServer(async (req, res) => {
  // Allow cross-origin requests from Vercel-hosted frontend
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  if (url === '/api/state') {
    const payload = JSON.stringify({
      session: {
        startedAt: session.startedAt,
        scanCount: session.scanCount,
        totalSeen: session.totalSeen,
        uptime:    fmtUptime(),
      },
      watchlist:    serializeWatchlist(watchlist),
      wins:         wins.slice(-50).map(w => ({
        symbol:       w.token.symbol,
        name:         w.token.name,
        address:      w.token.address,
        gainPct:      parseFloat(w.gainPct.toFixed(2)),
        gainMultiple: w.gainMultiple,
        alertedAt:    w.alertedAt,
        entryPrice:   w.entryPrice,
        currentPrice: w.currentPrice,
      })),
      graduationWatch: serializeGraduationWatch(),
      graduationWins: [
        ...migratedWins.map(w => ({ ...w, type: 'completed' })),
        ...nearComplWins.map(w => ({ ...w, type: 'near_completion' })),
      ].sort((a, b) => b.alertedAt - a.alertedAt).slice(0, 50).map(w => ({
        type:         w.type,
        symbol:       w.token.symbol,
        name:         w.token.name,
        address:      w.token.address,
        gainPct:      parseFloat(w.gainPct.toFixed(2)),
        gainMultiple: w.gainMultiple,
        alertedAt:    w.alertedAt,
        entryPrice:   w.entryPrice ?? null,
        currentPrice: w.currentPrice ?? null,
      })),
    });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(payload);
    return;
  }

  if (url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(computeStats()));
    return;
  }

  if (url === '/api/wins') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ wins: db.wins.records.slice(-100).reverse(), misses: db.misses.records.slice(-100).reverse() }));
    return;
  }

  if (url === '/api/misses') {
    // Near-misses: tokens that expired without hitting target, sorted by peakGainPct desc
    const nearMisses = [...db.misses.records]
      .filter(r => r.peakGainPct != null)
      .sort((a, b) => b.peakGainPct - a.peakGainPct)
      .slice(0, 100);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ misses: nearMisses }));
    return;
  }

  if (url === '/api/calls') {
    const calls = await recordStore.loadRecords('calls', loadJSON(CALLS_FILE).records);
    const wins = calls.filter(r => r.verdict === 'W').length;
    const losses = calls.filter(r => r.verdict === 'L').length;
    const pending = calls.filter(r => r.verdict === 'pending').length;
    const settled = wins + losses;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      calls: [...calls].sort((a, b) => b.ts - a.ts),
      stats: {
        total: calls.length,
        wins,
        losses,
        pending,
        settled,
        winRate: settled ? +(wins / settled * 100).toFixed(1) : 0,
      },
      updatedAt: Date.now(),
    }));
    return;
  }

  if (url === '/api/export') {
    // Full data export — all wins + misses, no limit
    const wins   = [...db.wins.records].sort((a, b) => b.ts - a.ts);
    const misses = [...db.misses.records].sort((a, b) => b.ts - a.ts);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ wins, misses, exportedAt: Date.now() }));
    return;
  }

  if (url === '/api/export.csv') {
    const winCols  = ['ts','symbol','name','type','signal','entryMC','peakMC','gainPct','gainMultiple','durationMs','score','maxScore'];
    const missCols = ['ts','symbol','type','signal','entryMC','peakGainPct','score','maxScore'];
    const esc = v => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const toRow = (cols, r) => cols.map(c => esc(r[c])).join(',');
    const lines = [
      '=== WINS ===',
      winCols.join(','),
      ...db.wins.records.map(r => toRow(winCols, r)),
      '',
      '=== MISSES ===',
      missCols.join(','),
      ...db.misses.records.map(r => toRow(missCols, r)),
    ];
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="signd-export-${new Date().toISOString().slice(0,10)}.csv"`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(lines.join('\n'));
    return;
  }

  const staticContentTypes = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.css':  'text/css',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico':  'image/x-icon',
  };

  if (url.startsWith('/assets/') || url.startsWith('/src/img/')) {
    const decoded = decodeURIComponent(url);
    const isImg   = decoded.startsWith('/src/img/');
    const base    = isImg ? path.resolve(__dirname, 'src', 'img') : path.resolve(__dirname, 'dist', 'assets');
    const rel     = isImg ? decoded.slice('/src/img/'.length) : decoded.slice('/assets/'.length);
    const filePath = path.resolve(base, rel);
    const relToBase = path.relative(base, filePath);
    const outside = relToBase === '..' || relToBase.startsWith(`..${path.sep}`) || path.isAbsolute(relToBase);
    if (outside) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    try {
      res.writeHead(200, { 'Content-Type': staticContentTypes[path.extname(filePath)] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (['/','index.html','/dashboard','/dashboard.html','/signd','/signd.html','/memesight','/memesight.html','/call','/call.html','/token','/token.html','/scanner-config.js'].some(p => url === p || url === '/'+p)) {
    const map = {
      '/':                  path.join('dist', 'index.html'),
      '/index.html':        path.join('dist', 'index.html'),
      '/dashboard':         'memesight.html',
      '/dashboard.html':    'memesight.html',
      '/signd':             'memesight.html',
      '/signd.html':        'memesight.html',
      '/memesight':         'memesight.html',
      '/memesight.html':    'memesight.html',
      '/call':              'call.html',
      '/call.html':         'call.html',
      '/token':             'token.html',
      '/token.html':        'token.html',
      '/scanner-config.js': 'scanner-config.js',
    };
    const file = map[url];
    try {
      res.writeHead(200, { 'Content-Type': staticContentTypes[path.extname(file)] || 'text/html' });
      res.end(fs.readFileSync(path.join(__dirname, file), 'utf8'));
    } catch {
      res.writeHead(404);
      res.end(file + ' not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

dashServer.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  Port ${DASHBOARD_PORT} already in use — dashboard disabled. Set DASHBOARD_PORT= to use another port.`);
  } else {
    console.error('Dashboard server error:', err.message);
  }
});

dashServer.listen(DASHBOARD_PORT, () => {
  console.log(`🖥  Dashboard: http://localhost:${DASHBOARD_PORT}`);
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  console.error('❌  Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in D:\\claude\\gmgn\\.env');
  process.exit(1);
}

console.log('🤖 Pump.fun 2x Scanner Bot');
console.log(`   Interval:        ${CONFIG.scanIntervalMs / 1000}s`);
console.log(`   Min fee:         ${CONFIG.minTotalFee} SOL`);
console.log(`   Min bundler buy: ${CONFIG.minBundlerRate * 100}%`);
console.log(`   Min bundler hold:${CONFIG.minBundlerHoldRate * 100}%`);
console.log(`   Min gain:        ${CONFIG.minGainPct}% (1.5x)`);
console.log(`   Commands:        /stats  /wins  /open`);
console.log(`\n🔍 Migration Scanner (Gooner/SOCK pattern)`);
console.log(`   Interval:        ${MIGRATION_CONFIG.intervalMs / 1000}s`);
console.log(`   Watch threshold: score ≥ ${MIGRATION_CONFIG.watchThreshold}`);
console.log(`   Signal:          score ≥ ${MIGRATION_CONFIG.signalThreshold}`);
console.log(`   Strong:          score ≥ ${MIGRATION_CONFIG.strongThreshold}`);

console.log(`\n📈 Near Completion Scanner`);
console.log(`   Interval:        ${NEAR_COMPLETION_CONFIG.intervalMs / 1000}s`);
console.log(`   Watch threshold: score ≥ ${NEAR_COMPLETION_CONFIG.watchThreshold}`);
console.log(`   Signal:          score ≥ ${NEAR_COMPLETION_CONFIG.signalThreshold}`);
console.log(`   Strong:          score ≥ ${NEAR_COMPLETION_CONFIG.strongThreshold}`);

setInterval(() => pollCommands().catch(() => {}), 3_000);
scan().catch(console.error);
setInterval(() => scan().catch(console.error), CONFIG.scanIntervalMs);
scanMigrated().catch(console.error);
setInterval(() => scanMigrated().catch(console.error), MIGRATION_CONFIG.intervalMs);
scanNearCompletion().catch(console.error);
setInterval(() => scanNearCompletion().catch(console.error), NEAR_COMPLETION_CONFIG.intervalMs);
