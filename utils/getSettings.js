const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../config/settings.json');

function getSettings() {
  return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
}

module.exports = getSettings;