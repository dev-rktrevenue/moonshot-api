const fs = require('fs');
const path = require('path');


const LOG_DIR = path.join(__dirname, '../logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function logEvent(message, type = 'info') {
  const timestamp = new Date();
  const iso = timestamp.toISOString();
  const dateStr = iso.split('T')[0]; // YYYY-MM-DD

  const formatted = `[${iso}] [${type.toUpperCase()}] ${message}`;
  console.log(formatted);

  // Write to the daily log file
  const dailyLogPath = path.join(LOG_DIR, `system-${dateStr}.log`);
  fs.appendFileSync(dailyLogPath, formatted + '\n');

  // Also write to system.log (latest)
  const latestLogPath = path.join(LOG_DIR, 'system.log');
  fs.appendFileSync(latestLogPath, formatted + '\n');
}

module.exports = { logEvent };