const fs   = require('fs');
const path = require('path');

function dedup(file, keepKey) {
  const raw    = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = raw.records.length;
  const map    = new Map();
  for (const r of raw.records) {
    const existing = map.get(r.address);
    if (!existing || keepKey(r) > keepKey(existing)) map.set(r.address, r);
  }
  raw.records    = [...map.values()].sort((a, b) => b.ts - a.ts);
  raw.updatedAt  = Date.now();
  fs.writeFileSync(file + '.bak', JSON.stringify({ records: raw.records }, null, 2));
  fs.writeFileSync(file, JSON.stringify(raw, null, 2));
  console.log(`${path.basename(file)}: ${before} → ${raw.records.length} (removed ${before - raw.records.length} duplicates)`);
}

const DATA = path.join(__dirname, 'data');
dedup(path.join(DATA, 'wins.json'),   r => r.gainMultiple ?? 0);
dedup(path.join(DATA, 'misses.json'), r => r.peakGainPct  ?? 0);
console.log('Backups saved as *.bak');
