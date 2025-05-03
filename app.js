require('dotenv').config();
const express = require('express');
const { parse } = require('json2csv'); // install with npm i json2csv
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const fetchAndParse = require('./fetchAndParse');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const JSON_DIR = path.join(__dirname, 'data', 'json');
const LATEST_JSON_PATH = path.join(__dirname, 'data', 'latest.json');

app.get('/', (req, res) => {
  const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json')).sort().reverse();

  const groupedByDate = {};

  files.forEach(file => {
    const date = file.split('_')[1].split('-').slice(0, 3).join('-'); // Extract YYYY-MM-DD
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(file);
  });

  const selectedDate = req.query.date || Object.keys(groupedByDate)[0]; // Default to most recent day
  const filesToShow = groupedByDate[selectedDate] || [];

  res.render('index', {
    files: filesToShow,
    availableDates: Object.keys(groupedByDate),
    selectedDate
  });
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

// 🕒 Every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[CRON] Running 30-minute scraper...');
  await fetchAndParse();
});

// 🧪 Every 3 minutes (for testing)
//cron.schedule('*/3 * * * *', async () => {
//  console.log('[CRON TEST] Running 3-minute test scraper...');
//  await fetchAndParse();
//});

app.listen(PORT, () => {
  console.log(`🚀 Moonshot Analysis API running on http://localhost:${PORT}`);
});