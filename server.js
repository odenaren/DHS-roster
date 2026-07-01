const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JSONBin helpers
async function jsonbinRequest(method, binPath, body) {
  const headers = { 'Content-Type': 'application/json', 'X-Access-Key': JSONBIN_API_KEY, 'X-Bin-Private': 'false' };
  const res = await fetch(JSONBIN_BASE + binPath, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error('JSONBin error: ' + res.status);
  return res.json();
}

async function getPlayers() {
  const id = process.env.JSONBIN_PLAYERS_ID;
  if (!id) return [];
  const data = await jsonbinRequest('GET', '/b/' + id + '/latest');
  return (data.record && data.record.data) ? data.record.data : [];
}

async function getDraftPools() {
  const id = process.env.JSONBIN_DRAFTPOOLS_ID;
  if (!id) return [];
  const data = await jsonbinRequest('GET', '/b/' + id + '/latest');
  return (data.record && data.record.data) ? data.record.data : [];
}

async function setDraftPools(pools) {
  const id = process.env.JSONBIN_DRAFTPOOLS_ID;
  if (!id) throw new Error('JSONBIN_DRAFTPOOLS_ID not set');
  await jsonbinRequest('PUT', '/b/' + id, { data: pools });
}

// API routes
app.get('/api/players', async (req, res) => {
  try { res.json(await getPlayers()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/draftpools', async (req, res) => {
  try { res.json(await getDraftPools()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/draftpools/:name/heroes', async (req, res) => {
  try {
    let pools = await getDraftPools();
    let entry = pools.find(p => p.name === req.params.name);
    if (!entry) { entry = { name: req.params.name, heroes: [] }; pools.push(entry); }
    entry.heroes = req.body.heroes || [];
    await setDraftPools(pools);
    res.json(entry);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Serve pool.html on / and /pool
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pool.html')));
app.get('/pool', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pool.html')));

// Everything else → 404
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => console.log('Pool server running on port ' + PORT));
