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

    tokens.push({
      rank: el.find('.ds-dex-table-row-badge-pair-no').text().trim(),
      name: el.find('.ds-dex-table-row-base-token-symbol').text().trim(),
      fullName: el.find('.ds-dex-table-row-base-token-name-text').text().trim(),
      pair: `${el.find('.ds-dex-table-row-base-token-symbol').text().trim()}/${el.find('.ds-dex-table-row-quote-token-symbol').text().trim()}`,
      price: el.find('.ds-dex-table-row-col-price').text().replace('$', '').trim(),
      age: el.find('.ds-dex-table-row-col-pair-age').text().trim(),
      txns: el.find('.ds-dex-table-row-col-txns').text().trim(),
      volume: el.find('.ds-dex-table-row-col-volume').text().replace('$', '').trim(),
      makers: el.find('.ds-dex-table-row-col-makers').text().trim(),
      change5m: el.find('.ds-dex-table-row-col-price-change-m5').text().trim(),
      change1h: el.find('.ds-dex-table-row-col-price-change-h1').text().trim(),
      change6h: el.find('.ds-dex-table-row-col-price-change-h6').text().trim(),
      change24h: el.find('.ds-dex-table-row-col-price-change-h24').text().trim(),
      liquidity: el.find('.ds-dex-table-row-col-liquidity').text().replace('$', '').trim(),
      mcap: el.find('.ds-dex-table-row-col-market-cap').text().replace('$', '').trim(),
      pairUrl: 'https://dexscreener.com' + el.attr('href')
    });
  });

  fs.writeFileSync(jsonPath, JSON.stringify(tokens, null, 2));
  fs.writeFileSync(LATEST_JSON, JSON.stringify(tokens, null, 2));

  console.log(`✅ Parsed and saved ${tokens.length} tokens to ${jsonPath}`);
  return tokens;
}

module.exports = fetchAndParse;