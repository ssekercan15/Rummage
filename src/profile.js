import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIB, subjectOf } from './library';

const KEY = 'rummage.profile.v1';
const OPEN_WEIGHT = 1;
const SAVE_WEIGHT = 3;
const CATEGORY_WEIGHT = 1;
const REASON_WEIGHT = 2;
const MIN_ACTIONS_TO_RECOMMEND = 3;
const SEEN_LIMIT = 40;
const SURPRISE_EVERY = 4; // every 4th tile comes from outside the user's usual topics

export const SUBJECT_LABELS = {
  portrait: 'Portraits',
  people: 'People',
  landscape: 'Landscapes',
  interiors: 'Interiors',
  architecture: 'Architecture',
  art: 'Fine art',
  typography: 'Typography',
  documents: 'Documents',
};

const CATEGORY_TOPICS = { Typography: 'typography', 'Fine Art': 'art', Documents: 'documents', Architecture: 'architecture' };
const REASON_TOPICS = [{ subject: 'typography' }, { era: '1950s' }, { subject: 'art' }, {}];

export const emptyProfile = () => ({ onboarded: false, reason: null, subjects: {}, eras: {}, seen: [], actions: 0 });

export async function loadProfile() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    return saved ? { ...emptyProfile(), ...JSON.parse(saved) } : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile) {
  AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => {});
}

export function clearProfile() {
  AsyncStorage.removeItem(KEY).catch(() => {});
}

const eraOf = (photo) => (photo.year ? `${Math.floor(photo.year / 10) * 10}s` : null);
const bump = (counts, key, by) => (key ? { ...counts, [key]: (counts[key] || 0) + by } : counts);

function addPhoto(profile, photo, weight) {
  return {
    ...profile,
    subjects: bump(profile.subjects, subjectOf(photo), weight),
    eras: bump(profile.eras, eraOf(photo), weight),
    actions: profile.actions + 1,
  };
}

export function recordOpen(profile, photo) {
  const next = addPhoto(profile, photo, OPEN_WEIGHT);
  return { ...next, seen: [photo.id, ...profile.seen.filter((id) => id !== photo.id)].slice(0, SEEN_LIMIT) };
}

export const recordSave = (profile, photo) => addPhoto(profile, photo, SAVE_WEIGHT);

export function recordCategory(profile, label) {
  const subject = CATEGORY_TOPICS[label];
  if (!subject) return profile;
  return { ...profile, subjects: bump(profile.subjects, subject, CATEGORY_WEIGHT), actions: profile.actions + 1 };
}

export function recordReason(profile, reason) {
  const seed = REASON_TOPICS[reason] || {};
  return {
    ...profile,
    onboarded: true,
    reason,
    subjects: bump(profile.subjects, seed.subject, REASON_WEIGHT),
    eras: bump(profile.eras, seed.era, REASON_WEIGHT),
  };
}

// The user's topics, strongest first, for the profile sheet.
export function topTopics(profile, limit = 8) {
  const subjects = Object.entries(profile.subjects).map(([key, n]) => ({ label: SUBJECT_LABELS[key] || key, n }));
  const eras = Object.entries(profile.eras).map(([key, n]) => ({ label: key, n }));
  return [...subjects, ...eras].sort((a, b) => b.n - a.n).slice(0, limit);
}

function pickWeighted(items, weightOf, random) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// The order of the home grid for this launch, or null until there's enough to go on.
// Favorite topics are drawn at random in proportion to how much the user likes them,
// so every reload differs, and every 4th tile is a surprise from their least-used topics.
export function buildForYou(profile, random = Math.random) {
  if (profile.actions < MIN_ACTIONS_TO_RECOMMEND) return null;
  const seen = new Set(profile.seen);
  const affinity = (photo) => (profile.subjects[subjectOf(photo)] || 0) + 0.6 * (profile.eras[eraOf(photo)] || 0);
  const weight = (photo) => (affinity(photo) + 0.05) ** 1.5 * (seen.has(photo.id) ? 0.2 : 1);

  const pool = LIB.filter((p) => !p.hideFromExplore);
  const median = pool.map(affinity).sort((a, b) => a - b)[Math.floor(pool.length / 2)];
  const order = [];
  while (pool.length) {
    const surprises = pool.filter((p) => affinity(p) <= median && !seen.has(p.id));
    const wantSurprise = order.length % SURPRISE_EVERY === SURPRISE_EVERY - 1 && surprises.length > 0;
    const pick = wantSurprise ? surprises[Math.floor(random() * surprises.length)] : pickWeighted(pool, weight, random);
    order.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return order;
}
