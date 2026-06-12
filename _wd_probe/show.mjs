import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./out.json', import.meta.url)));
const rows = data.results.bindings;

// Sun sign purely from birth date — 100% reliable, no extra data needed.
const CUSP = [
  [1, 20, 'Capricorn'], [2, 19, 'Aquarius'], [3, 21, 'Pisces'], [4, 20, 'Aries'],
  [5, 21, 'Taurus'], [6, 21, 'Gemini'], [7, 23, 'Cancer'], [8, 23, 'Leo'],
  [9, 23, 'Virgo'], [10, 23, 'Libra'], [11, 22, 'Scorpio'], [12, 22, 'Sagittarius'],
];
const sunSign = (iso) => {
  const d = new Date(iso), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const [, lim, sign] = CUSP[m - 1];
  return day <= lim ? sign : (CUSP[m % 12][2]);
};

let withGender = 0, withHeight = 0, withImage = 0;
console.log('NAME'.padEnd(24), 'BORN'.padEnd(11), 'SUN'.padEnd(12), 'GENDER'.padEnd(8), 'H(cm)'.padEnd(6), 'IMG  WIKI-LINKS');
console.log('-'.repeat(82));
for (const r of rows) {
  const name = r.personLabel?.value ?? '?';
  const birth = (r.birth?.value ?? '').slice(0, 10);
  const gender = r.genderLabel?.value ?? '—';
  const height = r.height?.value ? Math.round(+r.height.value) : '—';
  const img = r.image ? 'yes' : 'no';
  if (r.genderLabel) withGender++;
  if (r.height) withHeight++;
  if (r.image) withImage++;
  console.log(
    name.padEnd(24), birth.padEnd(11), sunSign(birth).padEnd(12),
    String(gender).padEnd(8), String(height).padEnd(6), img.padEnd(4), r.fame.value,
  );
}
const n = rows.length;
console.log('-'.repeat(82));
console.log(`Coverage of ${n} rows →  gender: ${withGender}/${n}  height: ${withHeight}/${n}  image: ${withImage}/${n}`);
console.log('NOTE: moon sign, MBTI, weight(kg) are NOT in Wikidata for anyone above.');
