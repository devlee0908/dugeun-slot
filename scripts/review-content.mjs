// Tone/repetition report for editors (not a pass/fail check). Run: npm run review
// Flags near-duplicate questions and result titles, overused sentence endings,
// psych results without hedged wording, and words that deserve a second look.
import { loadAll } from './validate-content.mjs';

const items = await loadAll();
const grams = (s, n = 3) => {
  const t = s.replace(/\s+/g, '');
  const g = new Set();
  for (let i = 0; i + n <= t.length; i++) g.add(t.slice(i, i + n));
  return g;
};
const jaccard = (a, b) => {
  let x = 0;
  for (const v of a) if (b.has(v)) x++;
  return x / (a.size + b.size - x || 1);
};

const entries = [];
for (const i of items) {
  entries.push({ id: i.id, kind: 'question', t: i.question });
  if (i.followUp) entries.push({ id: i.id, kind: 'followUp', t: i.followUp });
  for (const o of i.options || []) {
    if (!o.result) continue;
    entries.push({ id: `${i.id}/${o.id}`, kind: 'result.title', t: o.result.title });
    entries.push({ id: `${i.id}/${o.id}`, kind: 'result.body', t: o.result.body });
    entries.push({ id: `${i.id}/${o.id}`, kind: 'result.talk', t: o.result.talk });
  }
}

function similarPairs(list, threshold, n) {
  const out = [];
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const s = jaccard(grams(list[a].t, n), grams(list[b].t, n));
      if (s >= threshold) out.push([s, list[a], list[b]]);
    }
  }
  return out.sort((x, y) => y[0] - x[0]);
}

const section = (title, lines) => {
  console.log(`\n## ${title} (${lines.length})`);
  lines.forEach((l) => console.log(`  ${l}`));
};

const questions = entries.filter((e) => ['question', 'followUp', 'result.talk'].includes(e.kind));
section('비슷한 질문 · 후속 질문', similarPairs(questions, 0.5, 3).map(([s, a, b]) => `${s.toFixed(2)} ${a.id} "${a.t}" ↔ ${b.id} "${b.t}"`));
section('비슷한 결과 제목', similarPairs(entries.filter((e) => e.kind === 'result.title'), 0.55, 2).map(([s, a, b]) => `${s.toFixed(2)} ${a.id} "${a.t}" ↔ ${b.id} "${b.t}"`));

const bodies = entries.filter((e) => e.kind === 'result.body');
const endings = {};
for (const b of bodies) {
  for (const sentence of b.t.split(/(?<=[.!?])\s+/)) {
    const m = sentence.match(/(\S+\s\S+)[.!?]$/);
    if (m) endings[m[1]] = (endings[m[1]] || 0) + 1;
  }
}
section(`자주 쓰인 문장 끝맺음 (결과 ${bodies.length}개 기준, 상위 10)`, Object.entries(endings).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${v}× …${k}`));

const HEDGE = /수 있어요|몰라요|같아요|보여요|싶어요|짐작|듯해요|일까요/;
section('단정적으로 읽힐 수 있는 해석 (완곡 표현 없음)', bodies.filter((b) => !HEDGE.test(b.t)).map((b) => `${b.id} ${b.t}`));

const repeatedEnding = bodies.filter((b) => {
  const ends = b.t.split(/(?<=[.!?])\s+/).map((s) => s.match(/(\S+)[.!?]$/)?.[1]);
  return new Set(ends).size !== ends.length;
});
section('한 결과 안에서 같은 끝맺음 반복', repeatedEnding.map((b) => `${b.id} ${b.t}`));

const SENSITIVE = /이성|남자|여자|남친|여친|술자리|음주|스킨십|키스|몸매|연봉|집안|전 연인|전애인|이별|결혼/;
section('다시 한번 볼 단어 (모임 적합도 확인용)', entries.filter((e) => SENSITIVE.test(e.t)).map((e) => {
  const item = items.find((i) => e.id.startsWith(i.id));
  const aud = Object.entries(item.audience).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ');
  return `${e.id} [${e.t.match(SENSITIVE)[0]}] "${e.t}" (${aud})`;
}));
