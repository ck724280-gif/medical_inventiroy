const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir('tests/tier1-feature-coverage');

console.log('[TIER 1] Building test files...');
