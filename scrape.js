// File: scrape.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const DATA_DIR = path.join(__dirname, 'data');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

async function scrapeDexScreener() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://dexscreener.com/solana', {
    waitUntil: 'domcontentloaded',
    timeout: 60000 // 60 seconds instead of 30
  });
  await page.waitForSelector('table tbody tr'); // wait for token table to load
  await page.waitForTimeout(7000); // optional bump

  // Screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `dexscreener_${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Extract data
  const data = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        name: cells[0]?.innerText.trim(),
        price: cells[1]?.innerText.trim(),
        change1h: cells[2]?.innerText.trim(),
        change6h: cells[3]?.innerText.trim(),
        change24h: cells[4]?.innerText.trim(),
        volume: cells[5]?.innerText.trim(),
        liquidity: cells[6]?.innerText.trim(),
        age: cells[7]?.innerText.trim(),
        buys: cells[8]?.innerText.trim(),
        sells: cells[9]?.innerText.trim(),
        base: cells[10]?.innerText.trim(),
        pairUrl: row.querySelector('a')?.href || ''
      };
    });
  });

  const jsonPath = path.join(DATA_DIR, `dexscreener_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

  console.log(`✅ Scraped ${data.length} tokens at ${timestamp}`);
  await browser.close();
}

scrapeDexScreener();
