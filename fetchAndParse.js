require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const API_KEY = process.env.SCRAPERAPI_API_KEY;
const TARGET_URL = process.env.DEXSCREENER_SOLANA_ENDPOINT;
const BASE_DIR = path.join(__dirname, 'data');
const HTML_DIR = path.join(BASE_DIR, 'html');
const JSON_DIR = path.join(BASE_DIR, 'json');
const LATEST_JSON = path.join(BASE_DIR, 'latest.json');

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR);
if (!fs.existsSync(HTML_DIR)) fs.mkdirSync(HTML_DIR);
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR);

// 🧼 Parse values like "10.2M", "270K", etc.
function parseFormattedNumber(value) {
  if (typeof value !== 'string') return parseFloat(value) || 0;

  const multiplier = value.includes('M') ? 1_000_000 :
                     value.includes('K') ? 1_000 : 1;

  return parseFloat(value.replace(/[^\d.]/g, '')) * multiplier;
}

// ⏳ Convert "5m", "2h", "1d" to minutes
function parseAgeToMinutes(ageStr) {
  if (!ageStr) return 9999;
  if (ageStr.includes('m')) return parseInt(ageStr);
  if (ageStr.includes('h')) return parseInt(ageStr) * 60;
  if (ageStr.includes('d')) return parseInt(ageStr) * 1440;
  return 9999;
}

async function fetchAndParse() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const encodedUrl = encodeURIComponent(TARGET_URL);
  const endpoint = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodedUrl}&render=true`;

  const htmlPath = path.join(HTML_DIR, `dexscreener_${timestamp}.html`);
  const jsonPath = path.join(JSON_DIR, `dexscreener_${timestamp}.json`);

  const { data: html } = await axios.get(endpoint);
  fs.writeFileSync(htmlPath, html);

  const $ = cheerio.load(html);
  const rows = $('.ds-dex-table-row');

  const tokens = [];

  rows.each((_, row) => {
    const el = $(row);

    const rawPrice = el.find('.ds-dex-table-row-col-price').text().replace('$', '').trim();
    const rawAge = el.find('.ds-dex-table-row-col-pair-age').text().trim();
    const rawLiquidity = el.find('.ds-dex-table-row-col-liquidity').text().replace('$', '').trim();
    const rawVolume = el.find('.ds-dex-table-row-col-volume').text().replace('$', '').trim();
    const rawMcap = el.find('.ds-dex-table-row-col-market-cap').text().replace('$', '').trim();

    tokens.push({
      rank: el.find('.ds-dex-table-row-badge-pair-no').text().trim(),
      name: el.find('.ds-dex-table-row-base-token-symbol').text().trim(),
      fullName: el.find('.ds-dex-table-row-base-token-name-text').text().trim(),
      pair: `${el.find('.ds-dex-table-row-base-token-symbol').text().trim()}/${el.find('.ds-dex-table-row-quote-token-symbol').text().trim()}`,
      price: parseFloat(rawPrice),
      age: rawAge,
      ageMinutes: parseAgeToMinutes(rawAge),
      txns: el.find('.ds-dex-table-row-col-txns').text().trim(),
      volume: parseFormattedNumber(rawVolume),
      liquidity: parseFormattedNumber(rawLiquidity),
      mcap: parseFormattedNumber(rawMcap),
      makers: el.find('.ds-dex-table-row-col-makers').text().trim(),
      change5m: parseFloat(el.find('.ds-dex-table-row-col-price-change-m5').text().trim().replace('%', '')),
      change1h: parseFloat(el.find('.ds-dex-table-row-col-price-change-h1').text().trim().replace('%', '')),
      change6h: parseFloat(el.find('.ds-dex-table-row-col-price-change-h6').text().trim().replace('%', '')),
      change24h: parseFloat(el.find('.ds-dex-table-row-col-price-change-h24').text().trim().replace('%', '')),
      pairUrl: 'https://dexscreener.com' + el.attr('href')
    });
  });

/*    const tokens = [
    {
      name: 'XBT',
      fullName: 'Mock Token',
      pair: 'XBT/SOL',
      price: 0.0002,
      age: '5m',
      ageMinutes: 5,
      liquidity: 100000,
      volume: 500000,
      change1h: 120,
      change5m: 5,
      change6h: 300,
      change24h: 1000,
      txns: '1234',
      mcap: 5000000,
      makers: '600',
      pairUrl: 'https://dexscreener.com/solana/99D5oi479AxQpQcfVKkTK6E7r1Y8KJSKhaA9dUBws1vd'
    }
  ];*/

  fs.writeFileSync(jsonPath, JSON.stringify(tokens, null, 2));
  fs.writeFileSync(LATEST_JSON, JSON.stringify(tokens, null, 2));

  console.log(`✅ MOCKED: Injected 1 test token`);
  return tokens;

  fs.writeFileSync(jsonPath, JSON.stringify(tokens, null, 2));
  fs.writeFileSync(LATEST_JSON, JSON.stringify(tokens, null, 2));

  console.log(`✅ Parsed and saved ${tokens.length} tokens to ${jsonPath}`);
  return tokens;
}

module.exports = fetchAndParse;
