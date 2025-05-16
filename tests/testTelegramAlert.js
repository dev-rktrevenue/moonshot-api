require('dotenv').config();
const sendTelegramAlert = require('../utils/sendTelegramAlert'); // adjust path if needed

const mockToken = {
  name: 'TESTCOIN',
  price: 0.000123,
  liquidity: 85000,
  volume: 320000,
  change1h: 135.6,
  ageMinutes: 12
};

sendTelegramAlert(mockToken)
  .then(() => console.log('✅ Telegram alert sent!'))
  .catch(err => console.error('❌ Failed to send alert:', err.message));
