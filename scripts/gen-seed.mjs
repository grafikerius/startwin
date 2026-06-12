// Generate supabase/seed_celebrities.sql from src/data/celebrities.json.
// Run AFTER refreshing data:  node scripts/gen-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(readFileSync(resolve(ROOT, 'src/data/celebrities.json'), 'utf8'));

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `'{${(a ?? []).map((x) => `"${x}"`).join(',')}}'`;
const num = (n) => (n == null || Number.isNaN(Number(n)) ? 'NULL' : String(n));

const COLS = '(id, name_en, name_tr, gender, birth_date, sun_sign, height, fields, image_url, fame, turkish)';
const row = (c) =>
  `(${q(c.id)}, ${q(c.name_en)}, ${q(c.name_tr)}, ${q(c.gender)}, ${q(c.birth_date)}, ${q(c.sun_sign)}, ` +
  `${num(c.height)}, ${arr(c.fields)}, ${c.image_url ? q(c.image_url) : 'NULL'}, ${num(c.fame)}, ${c.turkish ? 'true' : 'false'})`;

const BATCH = 500;
let sql = '-- StarTwin seed — generated from src/data/celebrities.json by scripts/gen-seed.mjs\n';
sql += '-- Run AFTER supabase/schema.sql in the Supabase SQL Editor.\n\n';
for (let i = 0; i < list.length; i += BATCH) {
  sql += `insert into public.celebrities ${COLS} values\n`;
  sql += list.slice(i, i + BATCH).map(row).join(',\n');
  sql += '\non conflict (id) do nothing;\n\n';
}
writeFileSync(resolve(ROOT, 'supabase/seed_celebrities.sql'), sql);
console.log(`✓ supabase/seed_celebrities.sql — ${list.length} rows, ${Math.ceil(list.length / BATCH)} batches`);
