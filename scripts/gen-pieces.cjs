/*
 Generate src/chess/pieces.generated.ts from assets/chess/sets/*.
 Looks for PNGs named wK.png, wQ.png, wR.png, wB.png, wN.png, wP.png and black variants bK..., in light/ and dark/.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const setsDir = path.join(ROOT, 'assets', 'chess', 'sets');
const outFile = path.join(ROOT, 'src', 'chess', 'pieces.generated.ts');

const codes = ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'];

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

const registry = {};
if (exists(setsDir)) {
  for (const setName of fs.readdirSync(setsDir)) {
    const setPath = path.join(setsDir, setName);
    if (!fs.statSync(setPath).isDirectory()) continue;
    registry[setName] = { light: {}, dark: {} };
    for (const theme of ['light','dark']) {
      for (const code of codes) {
        const png = path.join(setPath, theme, `${code}.png`);
        if (exists(png)) {
          const rel = path.relative(path.join(ROOT, 'src', 'chess'), png).replace(/\\/g, '/');
          registry[setName][theme][code] = `require('${rel}')`;
        }
      }
    }
  }
}

const header = `// GENERATED FILE - do not edit by hand\nexport const PIECES_GENERATED: any = ${JSON.stringify(registry, null, 2)
  .replace(/"require\((.*?)\)"/g, 'require($1)')};\n`;
fs.writeFileSync(outFile, header);
console.log('Wrote', outFile);


