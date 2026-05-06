import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const dist = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

app.use(express.static(dist));

app.get('/dashboard', (req, res) => res.sendFile(join(dist, 'memesight.html')));
app.get('/token', (req, res) => res.sendFile(join(dist, 'token.html')));
app.get('/scanner-config.js', (req, res) => res.sendFile(join(dist, 'scanner-config.js')));
app.get('*', (req, res) => res.sendFile(join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
