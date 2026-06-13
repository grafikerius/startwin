// Built around fields that actually exist in Wikidata: sun sign (derived from
// birth date), field/vibe, generation, height. MBTI & moon are optional bonuses.

// @ts-ignore
import ephemeris from 'ephemeris';

export type Sign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';

export type Field =
  | 'acting' | 'music' | 'film' | 'art' | 'writing'
  | 'science' | 'sports' | 'business' | 'politics' | 'other';

export type Gender = 'male' | 'female' | 'other';

export interface Celebrity {
  id: string;
  name_en: string;
  name_tr: string;
  gender: Gender;
  birth_date: string;     // ISO yyyy-mm-dd
  sun_sign: Sign;
  height?: number;        // cm, often missing
  weight?: number;        // kg
  fields: Field[];
  image_url?: string;
  fame: number;           // wiki sitelink count — popularity
  turkish?: boolean;
  moon_sign?: Sign;       // optional bonus (absent in Wikidata)
  mbti_type?: string;     // core or optional
}

export interface UserInput {
  name?: string;
  gender?: Gender;
  birth_date: string;
  birth_time?: string;
  birth_city?: string;
  lat?: number;
  lon?: number;
  height?: number;
  weight?: number;
  fields: Field[];                 // chosen vibes (>= 1)
  match_gender?: Gender | 'any';
  moon_sign?: Sign;
  mbti_type?: string;
  avatar_url?: string;
}

export interface SubScores {
  vibe: number;        // field affinity
  astrology: number;   // sun/moon chemistry
  mbti: number;        // mbti compatibility
  era: number;         // generational proximity
  physical: number;    // height/weight
}

export interface MatchResult { overall: number; sub: SubScores; }

export interface CocktailSlice {
  celebrity: Celebrity;
  result: MatchResult;
  share: number;       // % of the cocktail (slices sum to 100)
}

export const WEIGHTS = { vibe: 0.2, astrology: 0.25, mbti: 0.2, physical: 0.15, era: 0.2 } as const;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

// ---- Accurate Zodiac from ephemeris (Sun & Moon) ----
const ORDER: Sign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export interface FullChart {
  sun: Sign;
  moon: Sign;
  mercury: Sign;
  venus: Sign;
  mars: Sign;
}

export function calculateSigns(isoDate: string, time?: string, lat = 0, lon = 0): FullChart {
  let datetime = isoDate;
  if (time) {
    datetime = `${isoDate}T${time}:00Z`;
  } else {
    datetime = `${isoDate}T12:00:00Z`; // default to noon UTC if no time provided
  }
  
  const d = new Date(datetime);
  // Fallback to simple calculation if date is invalid or ephemeris fails
  if (isNaN(d.getTime())) {
    return { sun: 'Aries', moon: 'Aries', mercury: 'Aries', venus: 'Aries', mars: 'Aries' };
  }

  try {
    const result = ephemeris.getAllPlanets(d, lon, lat, 0);
    const sunLon = result.observed.sun.apparentLongitudeDd;
    const moonLon = result.observed.moon.apparentLongitudeDd;
    const mercLon = result.observed.mercury.apparentLongitudeDd;
    const venusLon = result.observed.venus.apparentLongitudeDd;
    const marsLon = result.observed.mars.apparentLongitudeDd;
    
    return {
      sun: ORDER[Math.floor(sunLon / 30)] || 'Aries',
      moon: ORDER[Math.floor(moonLon / 30)] || 'Aries',
      mercury: ORDER[Math.floor(mercLon / 30)] || 'Aries',
      venus: ORDER[Math.floor(venusLon / 30)] || 'Aries',
      mars: ORDER[Math.floor(marsLon / 30)] || 'Aries',
    };
  } catch (e) {
    console.error("Ephemeris error:", e);
    // Simple fallback for sun sign
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const SIMPLE_ORDER: Sign[] = ['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'];
    const LAST = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
    const simpleSun = day <= LAST[m] ? SIMPLE_ORDER[m] : SIMPLE_ORDER[(m + 1) % 12];
    return { sun: simpleSun, moon: simpleSun, mercury: simpleSun, venus: simpleSun, mars: simpleSun };
  }
}

// ---- Astrology ----
const ELEMENT: Record<Sign, Element> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};
const COMPLEMENT: Record<Element, Element> = { Fire: 'Air', Air: 'Fire', Earth: 'Water', Water: 'Earth' };

function signScore(a: Sign, b: Sign): number {
  if (a === b) return 100;
  const ea = ELEMENT[a], eb = ELEMENT[b];
  if (ea === eb) return 88;
  if (COMPLEMENT[ea] === eb) return 74;
  return 46;
}

// ---- Field / vibe affinity ----
// Soft credit when fields sit in the same creative cluster.
const CLUSTERS: Field[][] = [
  ['acting', 'film', 'music'],
  ['art', 'writing', 'music'],
  ['science', 'writing'],
  ['politics', 'business'],
  ['sports'],
];
const related = (a: Field, b: Field) => CLUSTERS.some((c) => c.includes(a) && c.includes(b));

function fieldScore(user: Field[], celeb: Field[]): number {
  if (!user.length) return 60;
  if (celeb.some((f) => user.includes(f))) return 100;
  if (celeb.some((cf) => user.some((uf) => related(uf, cf)))) return 70;
  return 38;
}

// ---- Generation ----
const yearsBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (365.25 * 864e5);
// Softer than the demo (~62yr to bottom out) so historical icons still score.
const timingScore = (u: string, c: string) => clamp(100 - yearsBetween(u, c) * 1.6);

// ---- Physical (height & weight) ----
function physicalScore(uh?: number, ch?: number, uw?: number, cw?: number): number {
  let score = 60;
  let checks = 0;
  if (uh && ch) {
    score += clamp(100 - Math.abs(uh - ch) * 2.5);
    checks++;
  }
  if (uw && cw) {
    score += clamp(100 - Math.abs(uw - cw) * 3);
    checks++;
  }
  if (checks === 0) return 60; // neutral
  return clamp((score - 60) / checks);
}

// ---- Optional MBTI bonus (inert unless both sides supply a type) ----
const AXIS = [
  { same: 70, diff: 100 }, { same: 100, diff: 42 },
  { same: 76, diff: 90 }, { same: 80, diff: 86 },
];
function mbtiScore(u: string, c: string): number {
  const a = u.toUpperCase(), b = c.toUpperCase();
  if (a.length !== 4 || b.length !== 4) return 50;
  let t = 0;
  for (let i = 0; i < 4; i++) t += a[i] === b[i] ? AXIS[i].same : AXIS[i].diff;
  return clamp(t / 4);
}

export function calculateMatch(user: UserInput, celeb: Celebrity): MatchResult {
  const safeUserBirth = user.birth_date || '2000-01-01';
  const safeCelebBirth = celeb.birth_date || '2000-01-01';
  const { sun: userSun, moon: userMoon } = calculateSigns(safeUserBirth, user.birth_time, user.lat, user.lon);
  const vibe = fieldScore(user.fields || [], celeb.fields || []);
  const era = timingScore(safeUserBirth, safeCelebBirth);
  const physical = physicalScore(user.height, celeb.height, user.weight, celeb.weight);
  
  // Astro score combines Sun (major) and Moon (minor) if available
  let astrology = signScore(userSun, celeb.sun_sign);
  if (userMoon && celeb.moon_sign) {
    astrology = astrology * 0.7 + signScore(userMoon, celeb.moon_sign) * 0.3;
  }

  // MBTI score
  const mbti = (user.mbti_type && celeb.mbti_type) ? mbtiScore(user.mbti_type, celeb.mbti_type) : 60;

  const overall = vibe * WEIGHTS.vibe + astrology * WEIGHTS.astrology + mbti * WEIGHTS.mbti + physical * WEIGHTS.physical + era * WEIGHTS.era;

  return {
    overall: round(clamp(overall)),
    sub: { vibe: round(vibe), astrology: round(astrology), mbti: round(mbti), era: round(era), physical: round(physical) },
  };
}

// "Celebrity Cocktail" — optionally filter by who you want to match with, rank,
// then normalise the top `take` into shares that sum to exactly 100%.
export function mixCocktail(user: UserInput, celebs: Celebrity[], take = 3): CocktailSlice[] {
  const pool = user.match_gender && user.match_gender !== 'any'
    ? celebs.filter((c) => c.gender === user.match_gender)
    : celebs;

  const ranked = pool
    .map((celebrity) => ({ celebrity, result: calculateMatch(user, celebrity) }))
    .sort((a, b) => b.result.overall - a.result.overall || b.celebrity.fame - a.celebrity.fame)
    .slice(0, take);
  if (!ranked.length) return [];

  const sum = ranked.reduce((s, r) => s + r.result.overall, 0) || 1;
  const raw = ranked.map((r) => ({ ...r, exact: (r.result.overall / sum) * 100 }));
  const floors = raw.map((r) => ({ ...r, share: Math.floor(r.exact), rem: r.exact % 1 }));
  let left = 100 - floors.reduce((s, r) => s + r.share, 0);
  floors.sort((a, b) => b.rem - a.rem);
  for (let i = 0; left > 0 && i < floors.length; i++, left--) floors[i].share++;

  return floors
    .sort((a, b) => b.result.overall - a.result.overall)
    .map(({ celebrity, result, share }) => ({ celebrity, result, share }));
}
