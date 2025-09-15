const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'; // exclude I,O,0,1 for clarity

export function shortId(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) {
    const r = Math.floor(Math.random() * ALPHABET.length);
    out += ALPHABET[r];
  }
  return out;
}

export function normalizeCode(s: string) {
  return (s || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
}

export function isValidCode(s: string, len = 6) {
  const n = normalizeCode(s);
  return n.length === len && /^[A-Z2-7]+$/.test(n);
}


