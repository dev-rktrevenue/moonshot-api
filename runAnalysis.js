const fetchAndParse = require('./fetchAndParse');
const getSettings = require('./utils/getSettings');
const { logEvent } = require('./utils/logger');
const { fetchTokenInfoFromDexscreener } = require('./utils/fetchTokenInfoFromDexscreener');
const sendTelegramAlert = require('./utils/sendTelegramAlert');

async function runAnalysis() {
  const settings = getSettings();
  const timestamp = new Date().toLocaleTimeString();

  logEvent(`🟡 [${timestamp}] Starting Moonshot analysis...`);

  if (!settings.enabled) {
    logEvent('🚫 Alert logic is disabled via settings.json', 'warn');
    return;
  }

  let tokens = [];
  try {
    tokens = await fetchAndParse();
    logEvent(`📥 Fetched ${tokens.length} tokens from DexScreener`, 'info');
  } catch (err) {
    logEvent(`❌ fetchAndParse failed: ${err.message}`, 'error');
    return;
  }

  const filtered = tokens.filter(token => {
    return (
      token.liquidity >= settings.minLiquidity &&
      token.volume >= settings.minVolume &&
      token.change1h >= settings.minChange1h &&
      token.ageMinutes >= settings.minTokenAgeMinutes &&
      token.ageMinutes <= settings.maxTokenAgeMinutes
    );
  });

  logEvent(`🔍 Found ${filtered.length} qualifying tokens`, 'info');

  for (const token of filtered) {
    try {
      const tokenInfo = await fetchTokenInfoFromDexscreener(token.pairUrl);

      if (!tokenInfo || !tokenInfo.address) {
        logEvent(`⚠️ Skipping alert for ${token.name} — token address could not be retrieved`, 'warn');
        continue;
      }

      token.address = tokenInfo.address;

      logEvent(`📡 Sending alert for ${token.name} — $${token.price}`, 'info');
      await sendTelegramAlert(token);
    } catch (err) {
      logEvent(`❌ Telegram alert failed for ${token.name}: ${err.message}`, 'error');
    }
  }

  logEvent(`✅ Analysis completed at ${new Date().toLocaleTimeString()}`, 'info');
}

module.exports = runAnalysis;