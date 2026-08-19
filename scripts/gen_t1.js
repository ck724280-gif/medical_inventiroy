const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir('tests/tier1-feature-coverage');

const tests1 = `
// R1 TEST
export function unwrapApiResponse(response) {
  if (!response) return [];
  const body = response.data !== undefined ? response.data : response;
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  if (body && Array.isArray(body.items)) return body.items;
  return [];
}
`;
fs.writeFileSync('tests/r1_sample.ts', tests1, 'utf8');
console.log('Sample rw success');
