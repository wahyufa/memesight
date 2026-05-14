#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');

function loadRecords(name) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
    return Array.isArray(raw.records) ? raw.records : [];
  } catch {
    return [];
  }
}

function key(record) {
  return `${record.type || 'unknown'}:${record.address}`;
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

const candidates = loadRecords('candidates');
const wins = loadRecords('wins');
const misses = loadRecords('misses');

const labels = new Map();
for (const win of wins) labels.set(key(win), { label: 'win', record: win });
for (const miss of misses) {
  if (!labels.has(key(miss))) labels.set(key(miss), { label: 'loss', record: miss });
}

const labeled = candidates
  .filter(c => c.probability != null && labels.has(key(c)))
  .map(c => ({ ...c, label: labels.get(key(c)).label }));

console.log(`candidates: ${candidates.length}`);
console.log(`wins:       ${wins.length}`);
console.log(`misses:     ${misses.length}`);
console.log(`labeled:    ${labeled.length}`);

if (!labeled.length) {
  console.log('\nNo labeled candidates yet. Let scanner collect candidates first, then rerun:');
  console.log('  npm run backtest');
  process.exit(0);
}

console.log('\nthreshold  calls  wins  losses  win_rate  avg_prob');
for (let t = 0.30; t <= 0.801; t += 0.05) {
  const picked = labeled.filter(c => c.probability >= t);
  const winCount = picked.filter(c => c.label === 'win').length;
  const lossCount = picked.length - winCount;
  const avgProb = picked.length
    ? picked.reduce((sum, c) => sum + c.probability, 0) / picked.length
    : 0;
  const winRate = picked.length ? winCount / picked.length : 0;
  console.log(
    `${t.toFixed(2).padEnd(9)}  ${String(picked.length).padStart(5)}  ` +
    `${String(winCount).padStart(4)}  ${String(lossCount).padStart(6)}  ` +
    `${pct(winRate).padStart(8)}  ${avgProb.toFixed(3).padStart(8)}`
  );
}

const byType = new Map();
for (const row of labeled) {
  const bucket = byType.get(row.type) || { total: 0, wins: 0, probability: 0 };
  bucket.total++;
  if (row.label === 'win') bucket.wins++;
  bucket.probability += row.probability;
  byType.set(row.type, bucket);
}

console.log('\nby type');
for (const [type, bucket] of byType) {
  console.log(
    `${type.padEnd(16)} calls=${String(bucket.total).padStart(4)} ` +
    `win_rate=${pct(bucket.wins / bucket.total).padStart(8)} ` +
    `avg_prob=${(bucket.probability / bucket.total).toFixed(3)}`
  );
}
