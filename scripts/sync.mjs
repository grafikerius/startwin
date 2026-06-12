// StarTwin — one-command sync: Wikidata → Supabase (idempotent UPSERT on id).
// Re-running never duplicates; it updates existing rows and adds new ones, so
// the count only grows. Runs on your machine (normal network).
//
//   node scripts/sync.mjs                              # global top (fame > 80)
//   node scripts/sync.mjs --country Q43 --min-fame 12  # Turkish celebrities
//   node scripts/sync.mjs --min-fame 60 --limit 400
//   node scripts/sync.mjs --country Q43 --dry-run      # fetch only, don't write
//
// .env needs:  VITE_SUPABASE_URL (or SUPABASE_URL)  +  SUPABASE_SERVICE_ROLE_KEY
// (service_role key bypasses RLS for writes — keep it secret, never client-side.)
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(resolve(ROOT, '.env')); } catch { /* no .env — rely on real env */ }

// ---- args ----
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);
const COUNTRY = flag('country', null);            // Wikidata QID, e.g. Q43 (Turkey)
const MIN_FAME = Number(flag('min-fame', COUNTRY ? 12 : 80));
const LIMIT = Number(flag('limit', 400));
const DRY = has('dry-run');

const SUPA_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const UA = 'StarTwin-sync/0.1 (celebrity matchmaking; contact dev@example.com)';

// ---- shared Wikidata mapping (occupation → field, sun sign, height) ----
const FIELD_OF = {
  Q33999: 'acting', Q10800557: 'acting', Q10798782: 'acting', Q2259451: 'acting', Q2405480: 'acting',
  Q177220: 'music', Q639669: 'music', Q36834: 'music', Q753110: 'music', Q855091: 'music', Q486748: 'music', Q2252262: 'music', Q488205: 'music',
  Q901: 'science', Q169470: 'science', Q170790: 'science', Q593644: 'science', Q864503: 'science', Q11063: 'science', Q205375: 'science', Q81096: 'science', Q82594: 'science', Q11631: 'science',
  Q937857: 'sports', Q3665646: 'sports', Q10833314: 'sports', Q2066131: 'sports', Q11338576: 'sports', Q10841764: 'sports', Q10843402: 'sports', Q19204627: 'sports', Q10871364: 'sports', Q12299841: 'sports', Q11774891: 'sports', Q11303721: 'sports',
  Q1028181: 'art', Q1281618: 'art', Q3391743: 'art', Q33231: 'art', Q483501: 'art', Q3501317: 'art',
  Q2526255: 'film', Q1414443: 'film', Q28389: 'film', Q3282637: 'film', Q578109: 'film',
  Q43845: 'business', Q131524: 'business', Q2304668: 'business', Q484876: 'business',
  Q82955: 'politics', Q372436: 'politics', Q193391: 'politics', Q116: 'politics', Q30461: 'politics', Q189290: 'politics',
  Q36180: 'writing', Q49757: 'writing', Q6625963: 'writing', Q482980: 'writing', Q1930187: 'writing', Q4964182: 'writing', Q214917: 'writing',
};
const SIGNS = ['Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius'];
const LAST = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
const sunSign = (iso) => { const d = new Date(iso), m = d.getUTCMonth(); return d.getUTCDate() <= LAST[m] ? SIGNS[m] : SIGNS[(m + 1) % 12]; };
function normHeight(raw) {
  const out = [];
  for (const v of (raw || '').split(',').map(Number).filter((n) => n > 0)) {
    if (v >= 120 && v <= 230) out.push(v);
    else if (v > 1.2 && v < 2.4) out.push(v * 100);
    else if (v >= 47 && v <= 90) out.push(v * 2.54);
  }
  return out.length ? Math.round(out.sort((a, b) => a - b)[Math.floor(out.length / 2)]) : null;
}
const genderOf = (q) => (q === 'Q6581097' ? 'male' : q === 'Q6581072' ? 'female' : 'other');
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function buildQuery(occQids) {
  const vals = occQids.map((q) => 'wd:' + q).join(' ');
  const countryLine = COUNTRY ? `?person wdt:P27 wd:${COUNTRY} .` : '';
  return `SELECT ?person ?nameEn ?nameTr ?fame
    (SAMPLE(?birth) AS ?bd) (SAMPLE(?gender) AS ?gq)
    (GROUP_CONCAT(DISTINCT ?occ;SEPARATOR=",") AS ?occs)
    (GROUP_CONCAT(DISTINCT ?h;SEPARATOR=",") AS ?heights)
    (GROUP_CONCAT(DISTINCT ?cit;SEPARATOR=",") AS ?cits)
    (SAMPLE(?img) AS ?image) WHERE {
    VALUES ?occEntity { ${vals} }
    ?person wdt:P106 ?occEntity ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?fame ; wdt:P569 ?birth .
    ${countryLine}
    FILTER(?fame > ${MIN_FAME})
    BIND(STRAFTER(STR(?occEntity),"entity/") AS ?occ)
    OPTIONAL { ?person wdt:P21 ?gRaw . BIND(STRAFTER(STR(?gRaw),"entity/") AS ?gender) }
    OPTIONAL { ?person wdt:P2048 ?h . }
    OPTIONAL { ?person wdt:P18 ?img . }
    OPTIONAL { ?person wdt:P27 ?citRaw . BIND(STRAFTER(STR(?citRaw),"entity/") AS ?cit) }
    OPTIONAL { ?person rdfs:label ?nameEn . FILTER(LANG(?nameEn)="en") }
    OPTIONAL { ?person rdfs:label ?nameTr . FILTER(LANG(?nameTr)="tr") }
  }
  GROUP BY ?person ?nameEn ?nameTr ?fame
  ORDER BY DESC(?fame)
  LIMIT ${LIMIT}`;
}

async function wikidata(query) {
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': UA },
    body: new URLSearchParams({ query, format: 'json' }),
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results.bindings;
}

function toRecord(r) {
  const name_en = r.nameEn?.value, name_tr = r.nameTr?.value;
  if (!name_en && !name_tr) return null;
  const birth = r.bd?.value?.slice(0, 10);
  const year = +(birth ?? '').slice(0, 4);
  if (!year || year < 1000 || Number.isNaN(new Date(birth).getTime())) return null;
  const fields = [...new Set((r.occs?.value ?? '').split(',').map((q) => FIELD_OF[q]).filter(Boolean))];
  return {
    id: r.person.value.split('/').pop(),
    name_en: name_en ?? name_tr,
    name_tr: name_tr ?? name_en,
    gender: genderOf(r.gq?.value),
    birth_date: birth,
    sun_sign: sunSign(birth),
    height: normHeight(r.heights?.value),
    fields: fields.length ? fields : ['other'],
    image_url: r.image?.value ?? null,
    fame: +r.fame.value,
    turkish: (r.cits?.value ?? '').split(',').includes('Q43'),
  };
}

async function upsert(rows) {
  for (const part of chunk(rows, 500)) {
    const res = await fetch(`${SUPA_URL}/rest/v1/celebrities?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(part),
    });
    if (!res.ok) throw new Error(`Supabase upsert HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function count() {
  const res = await fetch(`${SUPA_URL}/rest/v1/celebrities?select=id`, {
    method: 'HEAD',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' },
  });
  return res.headers.get('content-range')?.split('/')?.[1] ?? '?';
}

async function main() {
  console.log(`Sync: ${COUNTRY ? `country=${COUNTRY}` : 'global'}, minFame>${MIN_FAME}, limit=${LIMIT}/batch${DRY ? ' (dry-run)' : ''}`);
  const keys = Object.keys(FIELD_OF);
  // Batch occupations so each query stays under the WDQS 60s limit. A country
  // filter is selective, so it tolerates larger batches; global mode needs small ones.
  const batches = chunk(keys, COUNTRY ? 12 : 4);

  const byId = new Map();
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  batch ${i + 1}/${batches.length}… `);
    const rows = await wikidata(buildQuery(batches[i]));
    let added = 0;
    for (const r of rows) {
      const rec = toRecord(r);
      if (!rec) continue;
      const prev = byId.get(rec.id);
      if (prev) rec.fields = [...new Set([...prev.fields, ...rec.fields])];
      byId.set(rec.id, rec);
      added++;
    }
    console.log(`${rows.length} rows`);
  }
  const list = [...byId.values()].sort((a, b) => b.fame - a.fame);
  console.log(`Fetched ${list.length} unique people. Turkish: ${list.filter((c) => c.turkish).length}`);
  console.log('  sample:', list.slice(0, 8).map((c) => c.name_tr).join(' · '));

  if (DRY) { console.log('Dry run — not writing.'); return; }
  if (!SUPA_URL || !SERVICE_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — cannot write.');
  }
  const before = await count();
  await upsert(list);
  const after = await count();
  console.log(`✓ Upserted ${list.length} rows. celebrities table: ${before} → ${after}`);
}

main().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
