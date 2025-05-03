const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const INPUT_FILE = path.join(__dirname, 'sample.html');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const OUTPUT_FILE = path.join(OUTPUT_DIR, `new_dexscreener_parsed_${timestamp}.json`);

const html = fs.readFileSync(INPUT_FILE, 'utf8');
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

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tokens, null, 2));
console.log(`✅ Parsed and saved ${tokens.length} tokens to ${OUTPUT_FILE}`);
