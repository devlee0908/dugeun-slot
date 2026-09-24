// Pure content-selection logic. No DOM, no storage — shared by the UI, tests and any future API layer.
import { GROUPS, TOPICS, TYPES, TYPE_BY_ID, TOPIC_BY_ID } from './meta.js';

/** Suitability of an item for a group: 2 = 우선 추천, 1 = 가능, 0 = 제외 */
export const fitScore = (item, group) => Number(item.audience?.[group] ?? 0);

export function matches(item, s) {
  if (item.type !== s.type) return false;
  if (s.topics.length && !s.topics.includes(item.topic)) return false;
  if (s.list !== 'all' && !item.tags.includes(s.list)) return false;
  return fitScore(item, s.group) > 0;
}

export const filterContent = (items, s) => items.filter((item) => matches(item, s));

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Remaining cards for the settings, best-fit cards first (shuffled within each fit tier). */
export function buildDeck(items, s, seen = new Set(), rng = Math.random) {
  const pool = filterContent(items, s).filter((item) => !seen.has(item.id));
  const tiers = new Map();
  for (const item of pool) {
    const score = fitScore(item, s.group);
    if (!tiers.has(score)) tiers.set(score, []);
    tiers.get(score).push(item);
  }
  return [...tiers.keys()].sort((a, b) => b - a).flatMap((k) => shuffle(tiers.get(k), rng));
}

export const drawNext = (items, s, seen, rng) => buildDeck(items, s, seen, rng)[0] ?? null;

export function countStatus(items, s, seen = new Set()) {
  const matched = filterContent(items, s);
  const seenCount = matched.filter((i) => seen.has(i.id)).length;
  return { total: matched.length, seen: seenCount, remaining: matched.length - seenCount };
}

/** When nothing matches, propose nearby settings that do have cards. */
export function suggestAlternatives(items, s) {
  const out = [];
  const seenKeys = new Set();
  const push = (label, patch) => {
    const next = { ...s, ...patch };
    const key = JSON.stringify(next);
    if (seenKeys.has(key) || key === JSON.stringify(s)) return;
    const count = filterContent(items, next).length;
    if (count > 0) {
      seenKeys.add(key);
      out.push({ label, patch, count });
    }
  };
  if (s.list !== 'all') push('ALL 목록으로 보기', { list: 'all' });
  if (s.topics.length) push('모든 주제로 넓히기', { topics: [] });
  if (s.topics.length && s.list !== 'all') push('모든 주제 + ALL', { topics: [], list: 'all' });
  for (const t of TOPICS) {
    if (!s.topics.includes(t.id)) push(`${t.emoji} ${t.label} 주제`, { topics: [t.id] });
  }
  for (const t of TYPES) {
    if (t.id !== s.type) push(`${t.emoji} ${t.label}로 바꾸기`, { type: t.id });
  }
  if (s.group !== 'free') push('🎈 자유롭게(모든 모임)', { group: 'free' });
  return out.slice(0, 4);
}

/** Content-coverage matrix for operators: counts per type × group × topic. */
export function coverage(items) {
  const rows = [];
  for (const type of TYPES) {
    for (const group of GROUPS) {
      const row = { type: TYPE_BY_ID[type.id].label, group: group.label };
      for (const topic of TOPICS) {
        row[TOPIC_BY_ID[topic.id].label] = filterContent(items, { type: type.id, group: group.id, topics: [topic.id], list: 'all' }).length;
      }
      rows.push(row);
    }
  }
  return rows;
}
