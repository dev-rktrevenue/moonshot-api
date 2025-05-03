const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://dexscreener.com/solana', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    const title = await page.title();
    console.log('✅ Page title:', title);
  } catch (err) {
    console.error('❌ Failed to load page:', err.message);
  } finally {
    await browser.close();
  }
})();