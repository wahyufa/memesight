import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const dist = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

app.use(express.static(dist));

app.get('/api/calls', async (req, res) => {
  const base = process.env.CALL_SCANNER_BASE || 'http://localhost:3001';
  try {
    const upstream = await fetch(`${base}/api/calls`);
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch {
    res.status(503).json({ calls: [], stats: { total: 0, wins: 0, losses: 0, pending: 0, settled: 0, winRate: 0 } });
  }
});

app.get('/dashboard', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/signd', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/call', (req, res) => res.sendFile(join(dist, 'call.html')));
app.get('/token', (req, res) => res.sendFile(join(dist, 'token.html')));
app.get('/scanner-config.js', (req, res) => res.sendFile(join(dist, 'scanner-config.js')));
app.get('*', (req, res) => res.sendFile(join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
