/*
 Sort raw PNG chess pieces dropped in assets/chess/ into the canonical folder structure
 and generate the static require map. Run:
   node scripts/sort-pieces.cjs

 Accepts flexible filenames, e.g.:
   white-king.png, wK.png, king_white.png, black_knight.png, bN.png, horse_white.png
*/
const fs = require('fs');
const path = require('path');
const child = require('child_process');

const ROOT = process.cwd();
const rawDir = path.join(ROOT, 'assets', 'chess');
const setsRoot = path.join(rawDir, 'sets');

const DESTS = [
  path.join(setsRoot, 'default', 'light'),
  path.join(setsRoot, 'default', 'dark'),
  path.join(setsRoot, 'native', 'light'),
  path.join(setsRoot, 'native', 'dark')
];

for (const d of DESTS) fs.mkdirSync(d, { recursive: true });

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => path.join(dir, f));
}

function detectCode(filename) {
  const base = path.basename(filename).toLowerCase().replace(/\.(png|jpg|jpeg)$/i, '');
  const tokens = base.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/);
  let color = null;
  for (const t of tokens) {
    if (['white', 'w'].includes(t)) color = 'w';
    if (['black', 'b'].includes(t)) color = 'b';
  }
  if (!color) {
    if (/^w[a-z]/.test(base)) color = 'w';
    if (/^b[a-z]/.test(base)) color = 'b';
  }
  let piece = null;
  for (const t of tokens) {
    if (['king', 'k'].includes(t)) piece = 'K';
    if (['queen', 'q'].includes(t)) piece = 'Q';
    if (['rook', 'r'].includes(t)) piece = 'R';
    if (['bishop', 'b'].includes(t)) piece = 'B';
    if (['knight', 'horse', 'n'].includes(t)) piece = 'N';
    if (['pawn', 'p'].includes(t)) piece = 'P';
  }
  if (!piece) {
    const m = base.match(/[kqr bnp]/i);
    if (m) piece = m[0].toUpperCase();
  }
  if (!color || !piece) return null;
  return `${color}${piece}`;
}

const moved = [];
for (const file of listPngs(rawDir)) {
  // skip sets/ children if user accidentally put PNGs there
  if (file.includes(`${path.sep}sets${path.sep}`)) continue;
  const code = detectCode(file);
  if (!code) continue;
  for (const dest of DESTS) {
    const out = path.join(dest, `${code}.png`);
    try {
      fs.copyFileSync(file, out);
      moved.push(out);
    } catch {}
  }
}

try {
  child.execSync('node scripts/gen-pieces.cjs', { stdio: 'inherit' });
} catch (e) {
  console.warn('Failed to run gen-pieces:', e.message);
}

console.log('Pieces synchronized:', moved.length);


