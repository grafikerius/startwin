// StarTwin — Wikidata ingest. node networking is blocked here, curl isn't, and
// WDQS has a 60s timeout — so occupations are queried in small fast batches.
//   1) node scripts/ingest.mjs emit [minFame=60] [limitPerBatch=250]
//   2) for q in scripts/_query_*.rq: curl --data-urlencode query@$q -o _raw_$i.json
//   3) node scripts/ingest.mjs build   -> writes src/data/celebrities.json
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SDIR = resolve(ROOT, 'scripts');
const MODE = process.argv[2] ?? 'build';
const MIN_FAME = Number(process.argv[3] ?? 60);
const LIMIT = Number(process.argv[4] ?? 250);
const BATCH = Number(process.argv[5] ?? 4); // occupations per query — small batches stay under the 60s WDQS limit

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
function sunSign(iso) {
  const d = new Date(iso), m = d.getUTCMonth(), day = d.getUTCDate();
  return day <= LAST[m] ? SIGNS[m] : SIGNS[(m + 1) % 12];
}
function normHeight(raw) {
  const out = [];
  for (const v of raw.split(',').map(Number).filter((n) => n > 0)) {
    if (v >= 120 && v <= 230) out.push(v);
    else if (v > 1.2 && v < 2.4) out.push(v * 100);
    else if (v >= 47 && v <= 90) out.push(v * 2.54);
  }
  return out.length ? Math.round(out.sort((a, b) => a - b)[Math.floor(out.length / 2)]) : undefined;
}
const genderOf = (q) => (q === 'Q6581097' ? 'male' : q === 'Q6581072' ? 'female' : 'other');

function buildQuery(occQids) {
  const vals = occQids.map((q) => 'wd:' + q).join(' ');
  return `SELECT ?person ?nameEn ?nameTr ?fame
    (SAMPLE(?birth) AS ?bd) (SAMPLE(?gender) AS ?gq)
    (GROUP_CONCAT(DISTINCT ?occ;SEPARATOR=",") AS ?occs)
    (GROUP_CONCAT(DISTINCT ?h;SEPARATOR=",") AS ?heights)
    (GROUP_CONCAT(DISTINCT ?cit;SEPARATOR=",") AS ?cits)
    (SAMPLE(?img) AS ?image) WHERE {
    VALUES ?occEntity { ${vals} }
    ?person wdt:P106 ?occEntity ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?fame ; wdt:P569 ?birth .
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

if (MODE === 'emit') {
  const keys = Object.keys(FIELD_OF);
  let n = 0;
  for (let i = 0; i < keys.length; i += BATCH)
    writeFileSync(resolve(SDIR, `_query_${n++}.rq`), buildQuery(keys.slice(i, i + BATCH)));
  console.log(`Wrote ${n} query batches (minFame=${MIN_FAME}, limit=${LIMIT}/batch).`);
} else {
  const files = readdirSync(SDIR).filter((f) => /^_raw_\d+\.json$/.test(f));
  if (!files.length) throw new Error('No scripts/_raw_*.json found — run the curl step first.');
  const byId = new Map();
  let raw = 0;
  for (const f of files) {
    let parsed;
    try { parsed = JSON.parse(readFileSync(resolve(SDIR, f), 'utf8')); }
    catch { console.warn(`  ⚠ skip ${f} (not valid JSON — likely an HTTP error page)`); continue; }
    for (const r of parsed.results.bindings) {
      raw++;
      const name_en = r.nameEn?.value, name_tr = r.nameTr?.value;
      if (!name_en && !name_tr) continue;
      const birth = r.bd?.value?.slice(0, 10);
      const year = +(birth ?? '').slice(0, 4);
      if (!year || year < 1000 || Number.isNaN(new Date(birth).getTime())) continue;
      const id = r.person.value.split('/').pop();
      const fields = (r.occs?.value ?? '').split(',').map((q) => FIELD_OF[q]).filter(Boolean);
      const rec = {
        id, name_en: name_en ?? name_tr, name_tr: name_tr ?? name_en,
        gender: genderOf(r.gq?.value), birth_date: birth, sun_sign: sunSign(birth),
        height: normHeight(r.heights?.value ?? ''), fields: [...new Set(fields)],
        image_url: r.image?.value, fame: +r.fame.value,
        turkish: (r.cits?.value ?? '').split(',').includes('Q43'),
      };
      const prev = byId.get(id);
      if (prev) rec.fields = [...new Set([...prev.fields, ...rec.fields])]; // union across batches
      if (!prev || prev.fame <= rec.fame) byId.set(id, { ...rec });
      else prev.fields = rec.fields;
    }
  }
  const list = [...byId.values()].map((c) => ({ ...c, fields: c.fields.length ? c.fields : ['other'] }))
    .sort((a, b) => b.fame - a.fame);

  mkdirSync(resolve(ROOT, 'src/data'), { recursive: true });
  writeFileSync(resolve(ROOT, 'src/data/celebrities.json'), JSON.stringify(list));

  const byField = {};
  for (const c of list) for (const f of c.fields) byField[f] = (byField[f] ?? 0) + 1;
  console.log(`\n✓ src/data/celebrities.json — ${list.length} people (from ${raw} raw rows, ${files.length} batches)`);
  console.log(`  image: ${list.filter((c) => c.image_url).length}  height: ${list.filter((c) => c.height).length}  turkish: ${list.filter((c) => c.turkish).length}`);
  console.log('  fields:', byField);
  console.log('  top:', list.slice(0, 8).map((c) => `${c.name_en} (${c.sun_sign},${c.fields.join('/')})`).join(' · '));
}
