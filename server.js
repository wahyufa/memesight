import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const dist = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

app.use(express.static(dist));

const scannerBase = process.env.SCANNER_BASE || process.env.SCANNER_API_BASE || '';

const fallbackByPath = {
  '/api/calls': { calls: [], stats: { total: 0, wins: 0, losses: 0, pending: 0, settled: 0, winRate: 0 } },
  '/api/wins': { wins: [] },
  '/api/signals': { signals: [] },
  '/api/state': { calls: [], watchlist: [] },
  '/api/stats': { scans: 0, tokensSeen: 0, uptimeMs: 0 },
  '/api/misses': { misses: [] },
};

async function proxyJson(req, res, base, fallback) {
  if (!base) {
    res.status(503).json(fallback);
    return;
  }

  try {
    const upstreamUrl = new URL(req.originalUrl, base);
    const upstream = await fetch(upstreamUrl);
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch {
    res.status(503).json(fallback);
  }
}

app.get('/api/calls', async (req, res) => {
  const base = process.env.CALL_SCANNER_BASE || scannerBase || 'http://localhost:3001';
  await proxyJson(req, res, base, fallbackByPath['/api/calls']);
});

app.get(['/api/wins', '/api/signals', '/api/state', '/api/stats', '/api/misses'], async (req, res) => {
  await proxyJson(req, res, scannerBase, fallbackByPath[req.path] || {});
});

app.get('/dashboard', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/memesight', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/signd', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/call', (req, res) => res.sendFile(join(dist, 'call.html')));
app.get('/token', (req, res) => res.sendFile(join(dist, 'token.html')));
app.get('/docs', (req, res) => res.sendFile(join(dist, 'index.html')));
app.get('/brand-kit', (req, res) => res.sendFile(join(dist, 'index.html')));
app.get('/scanner-config.js', (req, res) => res.sendFile(join(dist, 'scanner-config.js')));
app.get('*', (req, res) => res.sendFile(join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
