import LIBRARY from './data/library.json';
import SEED_COLLECTIONS from './data/collections.json';
import { IMAGES } from './data/images';
import { SPECTRUM } from './data/spectrum';
import { DUPLICATE_OF, RELATED_SUBJECTS, SUBJECT_BY_ID } from './data/subjects';
import { makeSearch } from './search';

export const LIB = LIBRARY;
export const byId = new Map(LIB.map((p) => [p.id, p]));
// Photos load from each owner's image server when they are on screen (expo-image keeps
// recently seen ones in a size-limited cache). Anything without a web address is bundled.
const source = (f) => (f && /^https?:/.test(f) ? { uri: f } : IMAGES[f]);
export const imageFor = (photo) => source(photo.file);
// The sharp image, for the photo screen; grids use the lighter tile above.
export const largeImageFor = (photo) => source(photo.large) || source(photo.file);
export const onboardingImage = (name) => IMAGES[`figma/${name}.jpg`];
export const spectrumImage = IMAGES['figma/spectrum.jpg'];
export const seedCollections = () => SEED_COLLECTIONS.map((c) => ({ ...c, photos: c.photos.slice() }));

export const MIN_YEAR = 1000;
export const MAX_YEAR = 2000;
export const FULL_RANGE = [MIN_YEAR, MAX_YEAR];
// The category chips, in row order. Documents gathers maps and trademark registrations.
export const CATEGORIES = [
  { label: 'Typography', width: 134, match: (p) => p.cat === 'Typography' },
  { label: 'Photography', width: 134, match: (p) => p.cat === 'Photography' },
  { label: 'Fine Art', width: 104, match: (p) => p.cat === 'Fine art' },
  { label: 'Documents', width: 119, match: (p) => p.cat === 'Maps' || /^trademark registration/i.test(p.title) },
  { label: 'Architecture', width: 134, match: (p) => p.cat === 'Architecture' },
];

const colorfulness = (p) => (p.hist || []).reduce((sum, n) => sum + n, 0);

// Share of pixels in cool hues, which tells truly colorful photos apart from sepia and beige ones.
const coolShare = (p) => (p.hist || []).slice(3, 11).reduce((sum, n) => sum + n, 0);
// Color strength times how evenly it spreads across hues.
function colorVariety(p) {
  const total = colorfulness(p);
  if (!total) return 0;
  return total * -(p.hist || []).reduce((sum, n) => (n > 0 ? sum + (n / total) * Math.log(n / total) : sum), 0);
}
const NOT_TYPE_LED = ['l187', 'l189', 'l190', 'l197']; // filed under posters, but people or comic art fill the frame
const TYPE_LEAD = ['l158', 'l160', 'l199', 'l198', 'l103', 'l104', 'l186', 'l185', 'l178', 'l117', 'l116', 'l191', 'l15', 'l7', 'l16', 'l93'];
const leadOrder = (p) => (TYPE_LEAD.includes(p.id) ? TYPE_LEAD.indexOf(p.id) : TYPE_LEAD.length);

// What each onboarding answer puts first on the home screen, in the order of the onboarding buttons.
export const REASON_RULES = [
  { match: (p) => p.cat === 'Typography' && !NOT_TYPE_LED.includes(p.id), rank: (a, b) => leadOrder(a) - leadOrder(b) }, // Finding design inspiration
  { match: (p) => p.year >= 1950 && p.year <= 1959, rest: (a, b) => Math.abs(a.year - 1955) - Math.abs(b.year - 1955) }, // Researching a time period
  { match: (p) => p.year < 1900, rank: (a, b) => (b.cat === 'Fine art') - (a.cat === 'Fine art') }, // Learning about art history
  { match: (p) => !p.bw && coolShare(p) >= 0.1 && colorVariety(p) >= 0.3, rank: (a, b) => colorVariety(b) - colorVariety(a) }, // Using it for school
];

export const DEFAULT_PICK = { x: 0.1, y: 0.2 };
export const newFilters = (reason = null, feed = null) => ({
  reason,
  feed, // home order recommended from the user's topics
  range: FULL_RANGE,
  mode: null, // 'bw' | 'color' | null
  pick: DEFAULT_PICK,
  value: 1, // shade from the value bar: 0 near-black, 1 the picked color
  rgb: colorAt(DEFAULT_PICK),
  cats: [], // several categories can be on at once; a photo needs to match any of them
  q: '',
});

export function colorAt({ x, y }) {
  const gx = Math.min(SPECTRUM[0].length - 1, Math.floor(x * SPECTRUM[0].length));
  const gy = Math.min(SPECTRUM.length - 1, Math.floor(y * SPECTRUM.length));
  return SPECTRUM[gy][gx];
}

// The value bar darkens the picked color toward black. Scaling every channel keeps the
// hue, so color matching (by hue) is unchanged; the bar's dark end matches the Figma (#241c14 for orange).
export const shade = (rgb, value) => rgb.map((c) => Math.round(c * (0.14 + 0.86 * value)));

function hueOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

// Share of a photo's pixels near the chosen hue; hist has one bin per 30°.
export function colorScore(photo, rgb) {
  if (!photo.hist) return 0;
  const bin = Math.floor(hueOf(rgb) / 30);
  return [-1, 0, 1].reduce((sum, o) => sum + photo.hist[(bin + o + 12) % 12] * (o ? 0.6 : 1), 0);
}

const COLOR_MIN = 0.12;

const search = makeSearch(LIB);
let lastQuery = null, lastHits = null;
const hitsFor = (q) => {
  if (q !== lastQuery) { lastQuery = q; lastHits = search(q); }
  return lastHits;
};
// True when a search found nothing close, so the grid is showing related photos instead.
export const searchIsRelated = (f) => !!(f.q.trim() && hitsFor(f.q.trim())?.related);

export function results(f) {
  const list = filtered(f);
  const hits = f.q.trim() && hitsFor(f.q.trim());
  // Best search matches first, unless a color or single year is deciding the order.
  if (!hits || f.mode === 'color' || f.range[0] === f.range[1]) return list;
  return list.slice().sort((a, b) => hits.scores.get(b.id) - hits.scores.get(a.id));
}

function filtered(f) {
  const q = f.q.trim();
  let list = LIB.filter((p) => !p.hideFromExplore);
  // A query of only filler words ("a", "the") has nothing to search for yet: show everything.
  const hits = q && hitsFor(q);
  if (hits) list = list.filter((p) => hits.scores.has(p.id));
  if (f.cats.length) {
    const on = CATEGORIES.filter((c) => f.cats.includes(c.label));
    list = list.filter((p) => on.some((c) => c.match(p)));
  }
  if (f.mode === 'bw') list = list.filter((p) => p.bw);
  if (f.mode === 'color') list = list.filter((p) => !p.bw && colorScore(p, f.rgb) >= COLOR_MIN);
  if (f.range[0] === f.range[1]) {
    // One year: the photos closest to it, widening until something turns up.
    const y = f.range[0];
    const near = (gap) => list.filter((p) => p.year && Math.abs(p.year - y) <= gap);
    const within = [0, 10, 25, 50, 100].map(near).find((l) => l.length >= 6) || near(100);
    return within.sort((a, b) => Math.abs(a.year - y) - Math.abs(b.year - y));
  }
  if (f.range[0] !== MIN_YEAR || f.range[1] !== MAX_YEAR) {
    list = list.filter((p) => p.year >= f.range[0] && p.year <= f.range[1]);
  }
  if (f.mode === 'color') return list.slice().sort((a, b) => colorScore(b, f.rgb) - colorScore(a, f.rgb));
  if (f.feed) {
    const position = new Map(f.feed.map((id, i) => [id, i]));
    return list.slice().sort((a, b) => position.get(a.id) - position.get(b.id));
  }
  const rule = REASON_RULES[f.reason];
  if (!rule) return list;
  const first = list.filter(rule.match);
  if (rule.rank) first.sort(rule.rank);
  const others = list.filter((p) => !rule.match(p));
  if (rule.rest) others.sort(rule.rest);
  return [...first, ...others];
}

export function subjectOf(photo) {
  if (SUBJECT_BY_ID[photo.id]) return SUBJECT_BY_ID[photo.id];
  if (photo.cat === 'Typography') return 'typography';
  if (photo.cat === 'Maps' || /^trademark registration/i.test(photo.title)) return 'documents';
  if (photo.cat === 'Architecture') return 'architecture';
  if (photo.cat === 'Fine art') return 'art';
  return 'people';
}

const yearGap = (a, b) => (a.year && b.year ? Math.abs(a.year - b.year) : 200);
const otherPhotos = (photo) => LIB.filter((o) => o.id !== photo.id && !o.hideFromExplore && DUPLICATE_OF[o.id] !== photo.id && DUPLICATE_OF[photo.id] !== o.id);

// Subject terms from each photo's catalogue record. Terms that only encode a date or a
// series ("Fashion in 1972", "DOCUMERICA photographs by …") are left out, so this list
// doesn't turn into another "same year" list. Rare terms count for more than common ones.
const DATEISH = /\b1[0-9]{3}s?\b|\b20[0-9]{2}\b|national archives|photographs (by|of)|documerica|century/i;
const TITLE_STOP = new Set('the and for with from that this into over under view views their of in on at to a an by de la le des du et'.split(' '));
const termsOf = (p) => {
  const subjects = ((p.ctx && p.ctx.subjects) || []).map((s) => s.toLowerCase().trim()).filter((s) => s && !DATEISH.test(s));
  const words = (p.title || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !TITLE_STOP.has(w)).map((w) => `w:${w}`);
  return [...new Set([...subjects, ...words])];
};
const TERMS = new Map(LIB.map((p) => [p.id, termsOf(p)]));
const DOC_FREQ = new Map();
TERMS.forEach((ts) => ts.forEach((term) => DOC_FREQ.set(term, (DOC_FREQ.get(term) || 0) + 1)));
// A term shared by only one photo can't link anything; one on most photos says little.
const termWeight = (term) => {
  const n = DOC_FREQ.get(term) || 0;
  if (n < 2) return 0;
  return Math.log(LIB.length / n) * (term.startsWith('w:') ? 0.25 : 1);
};
const sharedTerms = (a, b) => {
  const mine = new Set(TERMS.get(a.id));
  return (TERMS.get(b.id) || []).reduce((sum, term) => sum + (mine.has(term) ? termWeight(term) : 0), 0);
};

// What it shows, across all periods: shared subject terms lead, then the hand-tagged
// subject, then category. Photos from other eras get a small lift so this list reaches
// beyond the photo's own year, which "More from" already covers.
export function similarSubject(photo) {
  const subject = subjectOf(photo);
  const related = RELATED_SUBJECTS[subject] || [];
  const nearYear = new Set(sameTimePeriod(photo).slice(0, 12).map((o) => o.id));
  const score = (o) => {
    const theirs = subjectOf(o);
    let n = sharedTerms(photo, o) * 4;
    // Hand-tagged subjects (portrait, landscape, …) are a stronger signal than ones guessed from category.
    const tagged = SUBJECT_BY_ID[photo.id] && SUBJECT_BY_ID[o.id];
    if (theirs === subject) n += tagged ? 10 : 4;
    else if (related.includes(theirs)) n += tagged ? 5 : 2;
    if (photo.cat && o.cat === photo.cat) n += 2;
    n += Math.min(yearGap(photo, o), 150) / 75;
    if (nearYear.has(o.id)) n *= 0.5;
    return n;
  };
  return otherPhotos(photo).map((o) => [score(o), o]).sort((a, b) => b[0] - a[0]).map(([, o]) => o);
}

// When it was made: closest years first. Within the same year, photos that look least
// like this one lead, so this list shows the range of that moment rather than more of
// the same subject.
export function sameTimePeriod(photo) {
  const subject = subjectOf(photo);
  const likeness = (o) => sharedTerms(photo, o) + (subjectOf(o) === subject ? 1 : 0);
  return otherPhotos(photo)
    .map((o) => [yearGap(photo, o), likeness(o), o])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([, , o]) => o);
}

// "Keep Rummaging" on a folder: photos like the ones already in it. Each of the folder's
// most recent photos votes for its closest Similar Subject matches (closer = more votes),
// and anything already in the folder is left out. An empty folder gets the home mix.
const SUGGEST_FROM = 6; // recent photos considered (each costs one Similar Subject pass)
const SUGGEST_DEPTH = 30; // matches taken from each
export function suggestionsFor(photoIds, count = 24) {
  const inFolder = new Set(photoIds);
  const seeds = photoIds.map((id) => byId.get(id)).filter(Boolean).slice(0, SUGGEST_FROM);
  if (!seeds.length) return LIB.filter((p) => !p.hideFromExplore).slice(0, count);
  const votes = new Map();
  seeds.forEach((seed) => {
    similarSubject(seed).slice(0, SUGGEST_DEPTH).forEach((o, rank) => {
      if (!inFolder.has(o.id)) votes.set(o.id, (votes.get(o.id) || 0) + (SUGGEST_DEPTH - rank));
    });
  });
  return [...votes].sort((a, b) => b[1] - a[1]).slice(0, count).map(([id]) => byId.get(id));
}

// A fresh home mix for pull-to-refresh when there isn't enough history for a personal one:
// photos that suit the reason picked at onboarding come up three times as often as the rest,
// both shuffled, so each refresh deals a new spread.
export function shuffledMix(reason, random = Math.random) {
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pool = LIB.filter((p) => !p.hideFromExplore);
  const rule = REASON_RULES[reason];
  const suited = shuffle(rule ? pool.filter(rule.match) : pool);
  const rest = shuffle(rule ? pool.filter((p) => !rule.match(p)) : []);
  const order = [];
  while (suited.length || rest.length) {
    for (let k = 0; k < 3 && suited.length; k += 1) order.push(suited.pop().id);
    if (rest.length) order.push(rest.pop().id);
  }
  return order;
}
