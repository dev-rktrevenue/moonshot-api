const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BOT = process.env.TELEGRAM_API_KEY;
const CHAT = process.env.TELEGRAM_CHAT_ID;

module.exports = async function sendTelegramAlert(token) {
  const mintAddress = token.address || token.name; // fallback for dev/test

  const message = `
🚨 *New Token Match*: $${token.name}

*Price:* $${token.price}  
*Liquidity:* $${token.liquidity}  
*Volume:* $${token.volume}  
*1h Change:* ${token.change1h}%  
*Age:* ${token.ageMinutes} minutes

[🔁 Swap on Jupiter](https://jup.ag/swap/SOL-TO-${mintAddress})
`;

  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;

  await axios.post(url, {
    chat_id: CHAT,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
};