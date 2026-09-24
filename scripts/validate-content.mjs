// Validates public/content/*.json. Run: npm run validate  (add --coverage for the matrix)
import { readFile } from 'node:fs/promises';
import { GROUPS, TOPICS, TYPES, TAGS } from '../public/src/content/meta.js';
import { coverage } from '../public/src/content/query.js';

const MIN = { balance: 20, talk: 20, psych: 15 };
const VISUAL_KINDS = new Set(['emoji', 'balloon', 'heartBalloon', 'balloonDog', 'door', 'umbrella', 'gift']);
const groupIds = GROUPS.map((g) => g.id);
const topicIds = new Set(TOPICS.map((t) => t.id));

const errors = [];
const err = (id, msg) => errors.push(`[${id}] ${msg}`);
const text = (v) => typeof v === 'string' && v.trim().length > 0;

export async function loadAll() {
  const lists = await Promise.all(
    TYPES.map(async (t) => JSON.parse(await readFile(new URL(`../public/content/${t.id}.json`, import.meta.url), 'utf8'))),
  );
  return lists.flat();
}

function checkVisual(id, v) {
  if (!v || !VISUAL_KINDS.has(v.kind)) return err(id, `알 수 없는 visual.kind: ${v?.kind}`);
  if (v.kind === 'emoji' && !text(v.value)) err(id, 'emoji visual에는 value가 필요해요');
  if (v.kind !== 'emoji' && !text(v.color)) err(id, `${v.kind} visual에는 color가 필요해요`);
}

export function validate(items) {
  const ids = new Set();
  for (const item of items) {
    const id = item.id ?? '(no id)';
    if (!text(item.id)) err(id, 'id 누락');
    if (ids.has(item.id)) err(id, 'id 중복');
    ids.add(item.id);
    if (!TYPES.some((t) => t.id === item.type)) err(id, `잘못된 type: ${item.type}`);
    if (!topicIds.has(item.topic)) err(id, `잘못된 topic: ${item.topic}`);
    if (!Array.isArray(item.tags) || item.tags.some((t) => !TAGS.includes(t))) err(id, 'tags는 ["new","hot"] 중에서만');
    if (!item.audience || groupIds.some((g) => ![0, 1, 2].includes(item.audience[g]))) err(id, `audience에 ${groupIds.join('/')} 모두 0|1|2로 지정`);
    else if (groupIds.every((g) => item.audience[g] === 0)) err(id, '모든 모임에서 제외되어 노출되지 않아요');
    if (!text(item.question)) err(id, 'question 누락');

    if (item.type === 'balance') {
      if (item.options?.length !== 2) err(id, '밸런스 게임은 선택지 2개');
      item.options?.forEach((o) => { if (!text(o.label)) err(id, '선택지 label 누락'); checkVisual(id, o.visual); });
      if (!text(item.followUp)) err(id, 'followUp(후속 질문) 누락');
    }
    if (item.type === 'talk') {
      if (!['light', 'deep'].includes(item.level)) err(id, 'level은 light|deep');
      if (!text(item.followUp)) err(id, 'followUp 누락');
    }
    if (item.type === 'psych') {
      if (!text(item.title)) err(id, 'title 누락');
      const n = item.options?.length ?? 0;
      if (n < 2 || n > 4) err(id, '심리테스트 선택지는 2~4개');
      const optIds = new Set();
      const bodies = new Set();
      item.options?.forEach((o) => {
        if (!text(o.id) || optIds.has(o.id)) err(id, `선택지 id 누락/중복: ${o.id}`);
        optIds.add(o.id);
        if (!text(o.label)) err(id, '선택지 label 누락');
        checkVisual(id, o.visual);
        const r = o.result;
        if (!r || !text(r.title) || !text(r.body) || !text(r.talk)) err(id, `선택지 "${o.label}"에 result {title, body, talk} 누락`);
        else {
          const sentences = r.body.split(/(?<=[.!?요])\s+/).filter(Boolean).length;
          if (sentences < 2 || sentences > 4) err(id, `"${o.label}" 해석은 2~3문장 권장 (현재 ${sentences})`);
          if (bodies.has(r.body) || bodies.has(r.title)) err(id, `"${o.label}" 결과가 다른 선택지와 중복`);
          bodies.add(r.body); bodies.add(r.title);
        }
      });
    }
  }
  for (const [type, min] of Object.entries(MIN)) {
    const n = items.filter((i) => i.type === type).length;
    if (n < min) errors.push(`[${type}] 최소 ${min}개 필요 (현재 ${n})`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const items = await loadAll();
  const problems = validate(items);
  const count = (t) => items.filter((i) => i.type === t).length;
  const psych = items.filter((i) => i.type === 'psych');
  const results = psych.reduce((n, p) => n + p.options.filter((o) => o.result).length, 0);
  const options = psych.reduce((n, p) => n + p.options.length, 0);
  console.log(`밸런스 게임 ${count('balance')} · 대화 질문 ${count('talk')} · 심리테스트 ${count('psych')} (선택지 ${options}개 / 결과 연결 ${results}개)`);
  console.log(`NEW ${items.filter((i) => i.tags.includes('new')).length} · HOT ${items.filter((i) => i.tags.includes('hot')).length} · 전체 ${items.length}`);
  if (process.argv.includes('--coverage')) console.table(coverage(items));
  if (problems.length) {
    console.error(`\n✗ ${problems.length}개 문제\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('✓ 콘텐츠 검증 통과');
}
