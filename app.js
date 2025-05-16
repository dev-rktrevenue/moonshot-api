require('dotenv').config();
const express = require('express');
const { parse, Parser } = require('json2csv'); // install with npm i json2csv
const archiver = require('archiver');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const fetchAndParse = require('./fetchAndParse');
const getSettings = require('./utils/getSettings');
const runAnalysis = require('./runAnalysis');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const JSON_DIR = path.join(__dirname, 'data', 'json');
const LATEST_JSON_PATH = path.join(__dirname, 'data', 'latest.json');

app.get('/', (req, res) => {
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.startsWith('dexscreener_') && f.endsWith('.json'));

  const groupedByDay = {};

  files.forEach(file => {
    const match = file.match(/^dexscreener_(\d{4}-\d{2}-\d{2})T/);
    if (!match) return;

    const day = match[1]; // Extract just the YYYY-MM-DD
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(file);
  });

  const availableDates = Object.keys(groupedByDay)
    .sort()
    .reverse()
    .slice(0, 10); // Keep only the last 10 dates
    const selectedDate = req.query.date || availableDates[0]; // default to latest

  res.render('index', {
    files: groupedByDay[selectedDate] || [],
    availableDates,
    selectedDate
  });
});

app.get('/download-zip/:date', (req, res) => {
  const date = req.params.date;
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.startsWith(`dexscreener_${date}`) && f.endsWith('.json'));

  if (files.length === 0) return res.status(404).send('No files for selected date');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="moonshot_snapshots_${date}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  files.forEach(file => {
    const filePath = path.join(JSON_DIR, file);
    archive.file(filePath, { name: file });
  });

  archive.finalize();
});

app.get('/download-csv-zip/:date', (req, res) => {
  const date = req.params.date;
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.startsWith(`dexscreener_${date}`) && f.endsWith('.json'));

  if (files.length === 0) return res.status(404).send('No JSON files for that date');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="moonshot_csv_${date}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  files.forEach(file => {
    const filePath = path.join(JSON_DIR, file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Ensure it's always an array
    const data = Array.isArray(json) ? json : [json];
    const csv = new Parser().parse(data);
    const csvName = file.replace('.json', '.csv');

    archive.append(csv, { name: csvName });
  });

  archive.finalize();
});

const cleanupLogs = () => {
  const logDir = path.join(__dirname, 'logs');
  const files = fs.readdirSync(logDir)
    .filter(f => f.startsWith('system-') && f.endsWith('.log'))
    .sort()
    .reverse();

  const toDelete = files.slice(7); // keep only 7 newest
  toDelete.forEach(f => fs.unlinkSync(path.join(logDir, f)));
};

cleanupLogs(); // Run once on app start

app.get('/api/tokens/json/:filename', (req, res) => {
  const filePath = path.join(JSON_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const json = fs.readFileSync(filePath, 'utf8');
  res.header('Content-Type', 'application/json');
  res.send(json);
});

app.get('/download-json/:filename', (req, res) => {
  const filePath = path.join(JSON_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, req.params.filename);
});

app.get('/convert-csv/:filename', (req, res) => {
  const filePath = path.join(JSON_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const csv = parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment(req.params.filename.replace('.json', '.csv'));
  return res.send(csv);
});

app.get('/logs', (req, res) => {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) return res.send('No logs yet.');

  const files = fs.readdirSync(logDir)
    .filter(f => f.startsWith('system-') && f.endsWith('.log'))
    .sort()
    .reverse()
    .slice(0, 7); // last 7 log days

  const links = files.map(f => `<li><a href="/logs/${f}" class="text-blue-400 hover:underline">${f}</a></li>`).join('');

  res.send(`
    <html class="bg-gray-950 text-white">
      <head>
        <meta charset="UTF-8">
        <title>Moonshot Logs</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="p-6 bg-gray-900 text-white">
        <h1 class="text-2xl font-bold text-blue-400 mb-4">📁 System Logs (Last 7 Days)</h1>
        <a href="/" class="text-blue-300 hover:underline text-sm mb-6 inline-block">← Back to Home</a>
        <ul class="space-y-2">
          ${links}
        </ul>
      </body>
    </html>
  `);
});

app.get('/logs/:filename', (req, res) => {
  const file = req.params.filename;
  const filePath = path.join(__dirname, 'logs', file);
  if (!fs.existsSync(filePath)) return res.status(404).send('Log not found.');

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.get('/api/tokens/latest', (req, res) => {
  if (!fs.existsSync(LATEST_JSON_PATH)) {
    return res.status(404).json({ error: 'No data available yet' });
  }

  const data = JSON.parse(fs.readFileSync(LATEST_JSON_PATH, 'utf8'));
  res.json(data);
});

app.get('/api/tokens/list', (req, res) => {
  if (!fs.existsSync(JSON_DIR)) return res.json([]);

  const files = fs.readdirSync(JSON_DIR).filter(file => file.endsWith('.json'));
  const sorted = files.sort().reverse(); // Newest first

  res.json(sorted);
});

app.get('/api/tokens/json/:filename', (req, res) => {
  const filePath = path.join(JSON_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// Optional: trigger a fetch manually
app.get('/api/fetch', async (req, res) => {
  try {
    const result = await fetchAndParse();
    res.json({ message: 'Data fetched and parsed', tokens: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/settings/edit', (req, res) => {
  const settings = getSettings();
  res.render('edit-settings', { settings });
});

app.post('/settings/edit', express.urlencoded({ extended: true }), (req, res) => {
  const newSettings = {
    enabled: req.body.enabled === 'on',
    minLiquidity: parseFloat(req.body.minLiquidity),
    minVolume: parseFloat(req.body.minVolume),
    minChange1h: parseFloat(req.body.minChange1h),
    minTokenAgeMinutes: parseInt(req.body.minTokenAgeMinutes),
    maxTokenAgeMinutes: parseInt(req.body.maxTokenAgeMinutes)
  };

  fs.writeFileSync('./config/settings.json', JSON.stringify(newSettings, null, 2));
  res.redirect('/settings/edit');
});

// 🕒 Every 3 minutes
cron.schedule('*/3 * * * *', async () => {
  console.log('[CRON] Running Moonshot analysis...');
  await runAnalysis();
});

// 🧪 Every 3 minutes (for testing)
//cron.schedule('*/3 * * * *', async () => {
//  console.log('[CRON TEST] Running fast test...');
//  await runAnalysis();
//});

app.listen(PORT, () => {
  console.log(`🚀 Moonshot Analysis API running on http://localhost:${PORT}`);
});
