const axios = require('axios');

/**
 * Fetch token details from Dexscreener using a pair URL
 * @param {string} pairUrl - e.g. "https://dexscreener.com/solana/<pairId>"
 * @returns {Promise<{ address: string, name: string, symbol: string }>}
 */
async function fetchTokenInfoFromDexscreener(pairUrl) {
  try {
    const pairId = pairUrl.split('/').pop(); // Get last segment
    const url = `https://api.dexscreener.com/latest/dex/pairs/solana/${pairId}`;

    const res = await axios.get(url);
    const base = res.data?.pair?.baseToken;

    if (!base) {
      throw new Error('Base token info not found');
    }

    const tokenInfo = {
      address: base.address,
      name: base.name,
      symbol: base.symbol
    };

    console.log('✅ Dexscreener Token Info:', tokenInfo);
    return tokenInfo;

  } catch (err) {
    console.error('❌ Dexscreener fetch failed:', err.message);
    return null;
  }
}

module.exports = {
  fetchTokenInfoFromDexscreener
};