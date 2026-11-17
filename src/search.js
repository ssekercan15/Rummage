// Forgiving search over the library. Shared by the Expo app and the web app
// (source/sync_search.py copies this file into the web page).
//
// A query is split into words. Each word matches a photo's catalogue words when it is:
//   - the same word, or the same once plurals and endings are trimmed ("churches" ~ "church")
//   - the start of a longer word ("archi" ~ "architecture")
//   - a near-spelling ("cathedrel" ~ "cathedral")
//   - a related word from the list below ("car" ~ "automobile")
//   - a word that often appears alongside it in the archive's own subject terms
// Better matches and rarer words count for more, and title and subject matches count
// for more than matches in a long description. Photos that match every word lead.
// When nothing matches closely, related photos are shown instead of an empty grid.

const RELATED = [
  'cat cats kitten kittens kitty feline',
  'dog dogs puppy hound',
  'horse horses pony equestrian rider riding',
  'bird birds avian fowl',
  'fish fishes fishing angler',
  'car cars automobile automobiles motorcar vehicle',
  'train trains railway railroad locomotive',
  'boat boats ship ships sailing sailboat vessel yacht maritime',
  'plane airplane aircraft aviation flight',
  'church churches cathedral chapel abbey basilica',
  'house houses home homes dwelling residence villa',
  'city cities town street urban',
  'garden gardens park parks',
  'flower flowers floral botanical blossom bloom',
  'tree trees forest woods',
  'mountain mountains alps peak hills',
  'sea ocean seaside coast beach shore',
  'river rivers stream lake',
  'sky clouds cloud weather storm',
  'moon lunar apollo space astronaut spaceship spacecraft rocket',
  'star stars astronomy celestial planet',
  'map maps cartography atlas chart',
  'book books manuscript illuminated codex',
  'letter letters lettering typography type font alphabet calligraphy',
  'poster posters advertisement advertising ad',
  'portrait portraits face faces sitter',
  'woman women female lady ladies',
  'man men male gentleman',
  'child children kid kids boy girl infant',
  'dress dresses clothing fashion costume garment textile',
  'jewelry jewellery necklace bracelet ring brooch',
  'gold golden gilt gilded',
  'food meal cooking kitchen fruit',
  'music musician musical instrument song',
  'war battle soldier soldiers army military',
  'king kings queen royal crown',
  'saint saints holy',
  'christ jesus',
  'mary virgin madonna',
  'angel angels',
  'death skeleton skull',
  'snake serpent dragon',
  'lion lions',
  'sport sports game athlete baseball football',
  'school education student students classroom',
  'medicine medical doctor hospital anatomy',
  'science scientific microscope experiment',
  'building buildings architecture architectural',
  'bridge bridges',
  'window windows stained glass',
  'sculpture statue relief carving carved',
  'painting paintings painted',
  'photo photograph photographs photography',
  'ancient antique antiquity',
  'medieval middle ages gothic romanesque',
];

// Broad families: a specific word with no match of its own still finds its family
// ("zebra" finds animals). Unlike the groups above, members aren't linked to each other.
const FAMILIES = {
  animal: 'animals beast beasts creature creatures wildlife zoo zebra giraffe elephant tiger bear monkey ape deer stag rabbit hare fox wolf camel goat sheep cow cattle pig mouse rat squirrel owl eagle swan duck insect butterfly bee beetle spider frog turtle whale dolphin shark octopus crab',
  plant: 'plants herb herbs flora vegetation leaf leaves rose lily tulip fern mushroom fungus vine grape wheat',
  vehicle: 'vehicles transport transportation bus truck tram bicycle bike wagon carriage cart motorcycle',
  building: 'buildings architecture tower castle palace temple mosque synagogue skyscraper barn hut cottage',
  person: 'people figure figures crowd family couple worker workers farmer soldier nun monk priest bishop',
  landscape: 'landscapes scenery view vista valley field meadow desert canyon cliff island',
  weapon: 'weapons arms armor armour sword shield spear helmet',
  vessel: 'bowl cup jar vase pot pitcher ewer chalice goblet plate dish teapot kettle jug bottle',
};

const STOP = new Set('a an the and or of in on at to for with from by as is are was be de la le les des du et'.split(' '));

// Trim accents and common endings so related forms meet.
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  return w;
}
const words = (s) => fold(String(s || '')).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));

// Edit distance, stopping early once it is past the limit.
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

const FIELDS = [
  // [weight, how to read it from a photo]
  [3, (p) => p.title],
  [3, (p) => (p.ctx && p.ctx.subjects || []).join(' ')],
  [2, (p) => [p.who, p.cat, p.ctx && p.ctx.place, p.ctx && p.ctx.medium].join(' ')],
  [1, (p) => p.source],
  [0.6, (p) => p.ctx && p.ctx.about],
];

export function makeSearch(lib) {
  // Per photo: best field weight for each stem. Across the library: how many photos have it.
  const docs = lib.map((p) => {
    const m = new Map();
    FIELDS.forEach(([w, get]) => words(get(p)).forEach((t) => {
      const s = stem(t);
      if ((m.get(s) || 0) < w) m.set(s, w);
    }));
    return m;
  });
  const df = new Map();
  docs.forEach((m) => m.forEach((_, s) => df.set(s, (df.get(s) || 0) + 1)));
  const vocab = [...df.keys()];
  const idf = (s) => Math.log(1 + lib.length / (df.get(s) || 1));

  const related = new Map();
  RELATED.forEach((line) => {
    const group = line.split(' ').map(stem);
    group.forEach((s) => related.set(s, [...new Set([...(related.get(s) || []), ...group.filter((g) => g !== s)])]));
  });
  // Family members reach the family words, but not each other.
  const family = new Map();
  Object.entries(FAMILIES).forEach(([head, list]) => {
    const heads = [head, ...list.split(' ').slice(0, 3)].map(stem);
    list.split(' ').map(stem).forEach((m) => family.set(m, [...new Set([...(family.get(m) || []), ...heads])]));
  });

  // Words that keep company with s in the subject terms, most telling first.
  const subjectStems = lib.map((p) => new Set(words((p.ctx && p.ctx.subjects || []).join(' ') + ' ' + p.title).map(stem)));
  function neighbours(s) {
    const counts = new Map();
    let n = 0;
    subjectStems.forEach((set) => {
      if (!set.has(s)) return;
      n += 1;
      set.forEach((o) => { if (o !== s) counts.set(o, (counts.get(o) || 0) + 1); });
    });
    if (n < 2) return [];
    return [...counts]
      .filter(([o, c]) => c >= 2 && (df.get(o) || 0) < lib.length * 0.25)
      .map(([o, c]) => [o, (c / n) * Math.log(lib.length / (df.get(o) || 1))])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([o]) => o);
  }

  // Every library word a query word can stand for, with how close the match is (0–1).
  const cache = new Map();
  function expand(raw) {
    if (cache.has(raw)) return cache.get(raw);
    const s = stem(raw);
    const out = new Map();
    const add = (t, q) => { if (df.has(t) && (out.get(t) || 0) < q) out.set(t, q); };
    add(s, 1);
    add(raw, 1);
    // Short words ("car", "cat") only match whole words: as prefixes or near-spellings they hit too much.
    if (raw.length >= 4) vocab.forEach((t) => { if (t.length > raw.length && t.startsWith(raw)) add(t, 0.75); });
    if (raw.length >= 5) {
      const max = raw.length >= 8 ? 2 : 1;
      vocab.forEach((t) => { if (!out.has(t) && t[0] === s[0] && within(s, t, max)) add(t, 0.6); });
    }
    const close = [...out.keys()];
    [s, ...close].forEach((t) => (related.get(t) || []).forEach((r) => add(r, 0.45)));
    (family.get(s) || []).forEach((r) => add(r, 0.3));
    close.slice(0, 3).forEach((t) => neighbours(t).forEach((r) => add(r, 0.25)));
    const result = [...out];
    cache.set(raw, result);
    return result;
  }

  // Returns { scores: Map(photo id -> score), related: true when nothing matched closely }.
  return function search(query) {
    const terms = [...new Set(words(query))];
    if (!terms.length) return null;
    const year = terms.find((t) => /^\d{3,4}s?$/.test(t));
    const scores = new Map();
    let strong = 0;
    lib.forEach((p, i) => {
      const doc = docs[i];
      let total = 0, hit = 0;
      terms.forEach((t) => {
        if (t === year) {
          const y = parseInt(t, 10);
          const span = t.endsWith('s') ? 10 : 1;
          if (p.year >= y && p.year < y + span) { total += 4; hit += 1; }
          else if (Math.abs(p.year - y) <= 10) total += 1;
          return;
        }
        let top = 0, q = 0;
        expand(t).forEach(([v, closeness]) => {
          const w = doc.get(v);
          if (w) {
            const sc = w * closeness * idf(v);
            if (sc > top) { top = sc; q = closeness; }
          }
        });
        if (top) { total += top; if (q >= 0.6) hit += 1; }
      });
      if (!total) return;
      // Photos matching every word closely lead the list.
      if (hit === terms.length) { total *= 3; strong += 1; }
      scores.set(p.id, total);
    });
    // Drop the long tail of faint matches.
    const top = Math.max(0, ...scores.values());
    scores.forEach((v, k) => { if (v < top * 0.12) scores.delete(k); });
    return { scores, related: strong === 0 && scores.size > 0 };
  };
}
