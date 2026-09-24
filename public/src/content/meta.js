export const GROUPS = [
  { id: 'couple', label: '커플', emoji: '💞', hint: '서로의 경험을 나눠요' },
  { id: 'some', label: '썸 타는 사이', emoji: '💌', hint: '부담 없이 알아가요' },
  { id: 'solo', label: '솔로 모임', emoji: '🍀', hint: '취향과 연애관 토크' },
  { id: 'friends', label: '친구끼리', emoji: '🙌', hint: '편하게 웃으며 수다' },
  { id: 'free', label: '자유롭게', emoji: '🎈', hint: '누구와도 무난하게' },
];

export const TYPES = [
  { id: 'balance', label: '밸런스 게임', emoji: '⚖️', hint: '둘 중 하나만 골라요', unit: '게임' },
  { id: 'talk', label: '대화 질문', emoji: '💬', hint: '돌아가며 답해요', unit: '질문' },
  { id: 'psych', label: '심리테스트', emoji: '🔮', hint: '고르면 바로 결과', unit: '테스트' },
];

export const TOPICS = [
  { id: 'first', label: '첫인상·호감', emoji: '👀' },
  { id: 'some', label: '썸·연락', emoji: '📱' },
  { id: 'values', label: '연애 가치관', emoji: '💎' },
  { id: 'conflict', label: '갈등·소통', emoji: '🤝' },
  { id: 'date', label: '데이트', emoji: '🎡' },
  { id: 'future', label: '미래', emoji: '🌱' },
];

export const LISTS = [
  { id: 'new', label: 'NEW', hint: '새로 들어온 카드' },
  { id: 'hot', label: 'HOT', hint: '운영자 추천 카드' },
  { id: 'all', label: 'ALL', hint: '조건에 맞는 전체' },
];

export const TAGS = ['new', 'hot'];

export const DEFAULT_SETTINGS = Object.freeze({ group: 'free', type: 'balance', topics: [], list: 'all' });

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const GROUP_BY_ID = byId(GROUPS);
export const TYPE_BY_ID = byId(TYPES);
export const TOPIC_BY_ID = byId(TOPICS);
export const LIST_BY_ID = byId(LISTS);

export function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  return {
    group: GROUP_BY_ID[s.group] ? s.group : DEFAULT_SETTINGS.group,
    type: TYPE_BY_ID[s.type] ? s.type : DEFAULT_SETTINGS.type,
    topics: Array.isArray(s.topics) ? [...new Set(s.topics.filter((t) => TOPIC_BY_ID[t]))] : [],
    list: LIST_BY_ID[s.list] ? s.list : DEFAULT_SETTINGS.list,
  };
}

export function describeSettings(s) {
  const topics = s.topics.length === 0 || s.topics.length === TOPICS.length
    ? '모든 주제'
    : s.topics.map((t) => TOPIC_BY_ID[t].label).join(', ');
  return `${GROUP_BY_ID[s.group].label} · ${TYPE_BY_ID[s.type].label} · ${topics} · ${LIST_BY_ID[s.list].label}`;
}
