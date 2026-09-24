import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, countStatus, drawNext, filterContent, suggestAlternatives } from '../public/src/content/query.js';
import { sanitizeSettings } from '../public/src/content/meta.js';
import { loadAll, validate } from '../scripts/validate-content.mjs';

const items = await loadAll();
const S = (patch) => sanitizeSettings(patch);

test('content passes validation', () => {
  assert.deepEqual(validate(items), []);
});

test('filters by type, topic and list', () => {
  const s = S({ type: 'balance', topics: ['some'], list: 'hot', group: 'free' });
  const out = filterContent(items, s);
  assert.ok(out.length > 0);
  for (const i of out) {
    assert.equal(i.type, 'balance');
    assert.equal(i.topic, 'some');
    assert.ok(i.tags.includes('hot'));
  }
});

test('ALL contains every NEW and HOT card for the same conditions (overlap allowed)', () => {
  for (const type of ['balance', 'talk', 'psych']) {
    const all = new Set(filterContent(items, S({ type, list: 'all' })).map((i) => i.id));
    for (const list of ['new', 'hot']) for (const i of filterContent(items, S({ type, list }))) assert.ok(all.has(i.id));
    const both = items.filter((i) => i.type === type && i.tags.includes('new') && i.tags.includes('hot'));
    for (const i of both) {
      assert.ok(filterContent(items, S({ type, list: 'new' })).some((x) => x.id === i.id));
      assert.ok(filterContent(items, S({ type, list: 'hot' })).some((x) => x.id === i.id));
    }
  }
});

test('group excludes cards with fit 0 (couple-only questions never reach other groups)', () => {
  const coupleOnly = items.filter((i) => i.audience.couple === 2 && i.audience.solo === 0);
  assert.ok(coupleOnly.length > 0);
  for (const g of ['some', 'solo', 'friends', 'free']) {
    const ids = new Set(filterContent(items, S({ type: 'talk', group: g })).map((i) => i.id));
    for (const i of coupleOnly) assert.ok(!ids.has(i.id), `${i.id} leaked into ${g}`);
  }
});

test('deck puts best-fit (2) cards before fit-1 cards', () => {
  for (const group of ['couple', 'solo', 'some', 'friends']) {
    const deck = buildDeck(items, S({ type: 'talk', group }));
    const scores = deck.map((i) => i.audience[group]);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    assert.equal(scores[0], 2);
  }
});

test('no repeats until exhausted, then null', () => {
  const s = S({ type: 'psych', group: 'couple' });
  const seen = new Set();
  const total = filterContent(items, s).length;
  for (let n = 0; n < total; n++) {
    const next = drawNext(items, s, seen);
    assert.ok(next && !seen.has(next.id));
    seen.add(next.id);
  }
  assert.equal(drawNext(items, s, seen), null);
  assert.deepEqual(countStatus(items, s, seen), { total, seen: total, remaining: 0 });
});

test('suggests alternatives when nothing matches', () => {
  const fixture = items.filter((i) => !(i.type === 'psych' && i.topic === 'some' && i.tags.includes('new')));
  const c = S({ type: 'psych', topics: ['some'], list: 'new', group: 'solo' });
  assert.equal(filterContent(fixture, c).length, 0);
  const alts = suggestAlternatives(fixture, c);
  assert.ok(alts.length > 0);
  assert.deepEqual(alts[0].patch, { list: 'all' });
  for (const a of alts) assert.ok(filterContent(fixture, { ...c, ...a.patch }).length === a.count && a.count > 0);
});

test('every real type × topic × group combination has at least one card in ALL', () => {
  for (const type of ['balance', 'talk', 'psych']) for (const topic of ['first', 'some', 'values', 'conflict', 'date', 'future'])
    for (const group of ['couple', 'some', 'solo', 'friends', 'free'])
      assert.ok(filterContent(items, S({ type, topics: [topic], group })).length > 0, `${type}/${topic}/${group}`);
});

test('sanitizeSettings drops unknown values', () => {
  assert.deepEqual(S({ group: 'x', type: 'y', topics: ['first', 'nope', 'first'], list: 'z' }), { group: 'free', type: 'balance', topics: ['first'], list: 'all' });
});
