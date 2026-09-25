# 두근슬롯 (Dugeun Slot)

> 돌리면 시작되는 우리들의 연애 수다

여럿이 모인 자리에서 **한 대의 휴대폰을 함께 보며** 연애 이야기를 시작하는 아이스브레이킹 웹사이트입니다.
밸런스 게임 · 대화 질문 · 선택 즉시 결과가 나오는 심리테스트를 슬롯머신처럼 돌려서 뽑아요.
회원가입, 서버, DB 없이 동작하는 **정적 사이트**입니다.

- 로고: 하트 풍선 안에 슬롯 창(●♥●)이 들어간 마크 + 손글씨풍 스티커 워드마크 `두근슬롯`
- 디자인: 모눈종이 카드, 스티커처럼 외곽선을 두른 제목, 풍선·문·우산·선물 SVG 일러스트, 빨강·분홍·노랑·파랑 포인트 컬러

**배포 주소:** https://devlee0908.github.io/dugeun-slot/ — `main`에 push하면 GitHub Actions(`.github/workflows/pages.yml`)가 테스트 후 `public/`을 자동 배포합니다.

## 빠른 실행

```bash
npm install          # E2E 테스트용 puppeteer-core만 설치됨 (사이트 실행에는 불필요)
npm run dev          # http://localhost:5173  (같은 Wi-Fi의 휴대폰에서는 http://<PC IP>:5173)
```

의존성 없는 Node 정적 서버(`scripts/serve.mjs`)를 씁니다. `public/` 폴더를 서빙할 수 있다면 `python3 -m http.server -d public`처럼 어떤 정적 서버를 써도 됩니다.
(ES 모듈과 `fetch`를 쓰기 때문에 `file://`로 `index.html`을 직접 열면 동작하지 않습니다.)

| 명령 | 설명 |
| --- | --- |
| `npm test` | 조회 로직 단위 테스트 + 콘텐츠 검증 |
| `npm run validate` | 콘텐츠 JSON 검증 (`-- --coverage`를 붙이면 유형×모임×주제별 개수표 출력) |
| `npm run review` | 톤 검수 리포트: 비슷한 질문·결과 제목, 자주 쓰인 끝맺음, 단정적인 해석, 민감 단어와 해당 모임 적합도를 보여줌 (통과/실패 없이 참고용) |
| `npm run e2e` | 실제 Chrome(headless)으로 전체 흐름 검사, 스크린샷을 `tests/screens/`에 저장 (`npm run dev` 실행 중이어야 함) |
| `npm run devices` | iPhone SE·iPhone 15 Pro·iPad mini(WebKit = Safari 엔진), Galaxy S9+·Pixel 7(Chrome) 프로필로 핵심 흐름 스모크 테스트. 처음 한 번 `npx playwright-core install webkit` 필요 |
| `npm run fonts` | 자체 호스팅 웹폰트(Jua, Pretendard)를 다시 내려받기 |
| `node scripts/build-assets.mjs` | 앱 아이콘 PNG와 OG 이미지를 다시 생성 |

> 모든 테스트 명령은 `BASE_URL=https://devlee0908.github.io/dugeun-slot`처럼 배포 주소를 대상으로도 실행할 수 있습니다.

### 실제 기기 체크리스트

자동 테스트는 기기 에뮬레이션이라, 공개 전과 큰 변경 후에는 실제 휴대폰으로 아래를 확인하세요.

- [ ] iPhone Safari / Android Chrome / 카카오톡 인앱 브라우저 / 인스타그램 인앱 브라우저에서 첫 화면 → 슬롯 → 카드까지 진행
- [ ] 아이폰 하단 홈 바와 「다음 카드」 버튼이 겹치지 않음, 가로 모드 전환 시 깨지지 않음
- [ ] 「공유」 → 공유 시트가 뜨거나(모바일) 이미지 저장이 됨, 인앱 브라우저에서는 길게 눌러 저장 가능
- [ ] 효과음 켜기 → 슬롯 소리가 남 (무음 모드에서는 iOS 정책상 나지 않을 수 있음)
- [ ] 설정의 「동작 줄이기」(iOS) / 「애니메이션 삭제」(Android) 켰을 때 슬롯 회전 없이 카드가 바로 뜸
- [ ] 카카오톡에 링크를 붙였을 때 미리보기 이미지가 뜸 (갱신이 안 되면 카카오 공유 디버거에서 캐시 초기화)

## 폴더 구조

```
public/                     ← 배포 대상은 이 폴더 전체
  index.html
  content/                  ← 콘텐츠 데이터 (운영자가 편집)
    balance.json  talk.json  psych.json
  src/
    content/                ← UI와 분리된 콘텐츠 계층
      meta.js               모임·유형·주제·목록 정의, 설정 정규화
      query.js              필터링·덱 구성·중복 방지·대안 제안 (DOM 없는 순수 함수)
      repository.js         콘텐츠 소스 (StaticContentRepository / ApiContentRepository 예시)
    state.js                브라우저 저장 (설정·진행 상태만)
    ui/                     카드 렌더링, 슬롯 애니메이션, 공유 이미지, 효과음, 일러스트
    main.js                 화면 라우팅과 이벤트
    styles.css
scripts/                    개발 서버, 콘텐츠 검증, 에셋 생성
tests/                      단위 테스트, E2E
```

UI는 `repository.listItems()`로 콘텐츠 배열만 받고, 무엇을 보여줄지는 전부 `query.js`가 정합니다.
나중에 API로 바꿀 때는 `createContentRepository()`가 `ApiContentRepository`를 반환하도록 바꾸기만 하면 됩니다.

## 콘텐츠 추가하기

### 공통 필드

| 필드 | 값 | 설명 |
| --- | --- | --- |
| `id` | `bal-027`, `talk-029`, `psy-018` … | 고유값. 한 번 공개한 ID는 바꾸지 마세요 (진행 기록·통계의 키) |
| `type` | `balance` / `talk` / `psych` | 파일과 일치해야 함 |
| `topic` | `first` 첫인상·호감 · `some` 썸·연락 · `values` 연애 가치관 · `conflict` 갈등·소통 · `date` 데이트 · `future` 미래 | |
| `audience` | `{ "couple", "some", "solo", "friends", "free" }` 각각 `0`/`1`/`2` | **2 = 우선 추천**, 1 = 가능, 0 = 해당 모임에서 제외 |
| `tags` | `[]`, `["new"]`, `["hot"]`, `["new","hot"]` | NEW/HOT 지정. 둘 다 붙일 수 있음 |
| `question` | 문자열 | 질문 본문 |

- **NEW / HOT 지정**: `tags`에 `"new"`나 `"hot"`을 넣거나 빼면 됩니다. HOT은 데모에서 *운영자 추천*을 뜻하며, 이용 통계와는 무관합니다.
  **ALL**은 태그와 상관없이 현재 조건(모임·유형·주제)에 맞는 모든 카드를 보여줍니다.
- **함께하는 사람(`audience`)**: 덱은 적합도 2인 카드를 먼저 무작위로 보여주고, 그다음 1인 카드를 보여줍니다.
  - 커플끼리만 나눌 경험 질문(“우리 첫인상…”)은 `couple: 2`, 나머지는 `0`
  - 처음 만난 사이에서 부담될 수 있는 질문은 `some`/`solo`/`free`를 0이나 1로
  - 성별이나 관계를 가정하는 표현(“이성”, “남친/여친” 등)은 쓰지 말고 “상대”, “그 사람”, “연인”을 쓰세요.

### 밸런스 게임 (`balance.json`)

```json
{
  "id": "bal-027", "type": "balance", "topic": "date", "tags": ["new"],
  "audience": { "couple": 2, "some": 1, "solo": 1, "friends": 1, "free": 1 },
  "question": "기념일 저녁, 어느 쪽?",
  "options": [
    { "id": "a", "label": "근사한 레스토랑", "visual": { "kind": "emoji", "value": "🍝" } },
    { "id": "b", "label": "집에서 함께 요리", "visual": { "kind": "emoji", "value": "🍳" } }
  ],
  "followUp": "기념일에 가장 중요하게 생각하는 건 뭐야?"
}
```

### 대화 질문 (`talk.json`)

`level`: `light`(가볍게) / `deep`(조금 깊게), `emoji`: 카드 일러스트, `followUp`: 꼬리 질문.

### 심리테스트 (`psych.json`) — 한 문항, 선택 즉시 결과

```json
{
  "id": "psy-018", "type": "psych", "topic": "first", "tags": ["new", "hot"],
  "audience": { "couple": 1, "some": 2, "solo": 2, "friends": 1, "free": 1 },
  "title": "마음 풍선 테스트",
  "question": "공원에서 … 어떤 풍선을 고를까요?",
  "options": [
    {
      "id": "red", "label": "빨간 풍선",
      "visual": { "kind": "balloon", "color": "#F2473F" },
      "result": {
        "title": "직진하는 마음의 소유자",
        "body": "2~3문장의 해석. 단정 대신 '~일지도 몰라요', '~일 수 있어요'로.",
        "talk": "함께 있는 사람과 이어서 나눌 질문 1개"
      }
    }
  ]
}
```

- 선택지 2~4개. **모든 선택지에 서로 다른 `result`가 있어야** 검증을 통과합니다.
- `visual.kind`: `emoji`(`value`) · `balloon` · `heartBalloon` · `balloonDog` · `door` · `umbrella`(`color`) · `gift`(`color`, `ribbon`, 리본 없으면 `"none"`)
- 제목이 `… 테스트`로 끝나면 앞부분이 분홍색 스티커 글씨로 강조됩니다.

편집한 뒤에는 꼭 `npm run validate`를 실행하세요. ID 중복, 누락 필드, 결과 누락, 문장 수, 중복 결과, 질문·제목 중복, 유형별 최소 개수(각 60개)를 검사하고, **유형 × 주제 × 모임의 모든 조합에 카드가 10장 이상** 있는지도 확인합니다. 이 기준을 못 맞추면 배포 워크플로가 실패합니다.

현재 콘텐츠: 밸런스 게임 60 · 대화 질문 63 · 심리테스트 60(선택지 223개, 모두 결과 연결) — NEW 90, HOT 72.

## 정적 사이트 배포

빌드 단계가 없습니다. **`public/` 폴더를 그대로 올리면 됩니다.**

- **Netlify**: 새 사이트 → Publish directory `public`, Build command는 비워 둠 (또는 `public` 폴더를 드래그 앤 드롭)
- **Vercel**: Framework `Other`, Output Directory `public`, Build Command 비움
- **Cloudflare Pages**: Build output directory `public`
- **GitHub Pages**: `public/` 내용을 `gh-pages` 브랜치에 올리거나, Actions에서 `public`을 artifact로 배포

경로는 전부 상대 경로라 하위 경로(`/dugeun/`)에 배포해도 동작합니다. 라우팅은 해시(`#/setup`, `#/play`) 방식이라 서버 리라이트 설정이 필요 없습니다.

배포 후 체크리스트
1. `index.html`의 `og:url`, `og:image`, `canonical`이 실제 도메인을 가리키는지 확인 (현재 GitHub Pages 주소로 설정됨. 커스텀 도메인을 붙이면 함께 변경)
2. HTTPS 적용 (Web Share API의 파일 공유는 HTTPS에서만 동작)
3. 콘텐츠 JSON은 `Cache-Control: max-age=300` 정도로 짧게, `src/`와 `assets/`는 길게 캐시

## 개인정보 · 저장 정책

- 서버로 보내는 데이터가 없습니다. 심리테스트 답변과 결과는 저장하지도 전송하지도 않습니다.
- `localStorage`: 마지막 설정, 효과음 on/off
- 이번 판에서 본 카드와 현재 카드는 메모리에만 두며, 새로고침하거나 처음 화면으로 돌아가면 새 판이 시작됩니다 (이어서 하기 기능 없음).
- 외부 요청이 전혀 없습니다. 웹폰트(Jua, Pretendard Variable — 둘 다 SIL OFL 1.1)는 `public/assets/fonts/`에 직접 호스팅하며, 글자 범위별로 나뉜 파일 중 화면에 필요한 것만 내려받습니다. 폰트를 갱신하려면 `node scripts/fetch-fonts.mjs`를 실행하세요 (라이선스 파일 포함).

## 앞으로: 관리자 화면 · API · DB

### 도입을 검토할 시점

- 비개발자 운영자가 콘텐츠를 자주(주 1회 이상) 추가·수정해야 할 때
- 예약 공개, 임시 저장, 검수 같은 워크플로가 필요할 때
- HOT을 실제 이용 데이터로 정하고 싶을 때
- 콘텐츠가 수백 개를 넘어 JSON 전체를 한 번에 받기 부담스러울 때

그 전까지는 JSON을 Git으로 관리하고 PR에서 `npm test`를 돌리는 방식이 가장 저렴하고 안전합니다.

### 권장 구조

```
[공개 사용자] ──GET──▶ CDN ──▶ 읽기 전용 API / 정적 JSON 스냅샷
[관리자] ──로그인(SSO/OAuth)──▶ 관리자 화면 ──▶ 쓰기 API (role=admin 확인) ──▶ DB
                                                     └─ 게시할 때 JSON 스냅샷을 다시 생성해 CDN에 배포
```

- 공개 사용자는 **읽기만** 가능: `GET /contents?status=published`. 쓰기 엔드포인트 자체를 공개 경로에 두지 않습니다.
- 추가·수정·삭제는 관리자만: 인증된 관리자 토큰 + 서버 쪽 역할 검사. Supabase/Postgres를 쓴다면 RLS로
  `select`는 `status = 'published'`인 행만 `anon`에게 허용하고, `insert/update/delete`는 `admin` 역할에만 허용합니다.
- 삭제는 소프트 삭제(`status = 'archived'`)로 처리하고, 변경 이력은 `content_revisions`에 남깁니다.

### 권장 테이블

```sql
contents (
  id            text primary key,          -- 'psy-018' (현재 JSON id 그대로)
  type          text not null check (type in ('balance','talk','psych')),
  topic         text not null,
  question      text not null,
  title         text,                      -- psych
  level         text,                      -- talk: light|deep
  emoji         text,
  follow_up     text,
  audience      jsonb not null,            -- {"couple":2,"some":1,...}
  is_new        boolean default false,
  is_featured   boolean default false,     -- 운영자 추천(HOT)
  status        text default 'draft',      -- draft | published | archived
  publish_at    timestamptz,
  created_at, updated_at, updated_by
)
content_options (
  content_id text references contents(id), option_id text, sort int,
  label text, visual jsonb,
  result_title text, result_body text, result_talk text,  -- psych
  primary key (content_id, option_id)
)
content_revisions (id, content_id, snapshot jsonb, edited_by, edited_at)
admins (user_id, role)                     -- 인증 공급자의 사용자 ID
```

JSON 스냅샷 형식을 지금 구조와 똑같이 유지하면, 프론트엔드는 repository만 바꾸면 됩니다.

## 실제 인기 통계를 도입한다면 (익명 집계 · 남용 방지)

**수집 범위를 최소화합니다.** 필요한 건 “어떤 카드가 몇 번 공개/완료됐는지”뿐입니다.

- 이벤트: `card_revealed`, `card_completed`(다음 카드로 넘어감), `card_skipped`, `card_shared` + `content_id` + 날짜
- **심리테스트에서 어떤 선택지를 골랐는지는 수집하지 않습니다.** 모임 유형 같은 조건도 꼭 필요할 때만, 거친 단위로 집계합니다.
- 사용자 ID, IP 원문, 기기 지문(fingerprint)은 저장하지 않습니다.

**중복·남용 방지**

1. 클라이언트: 같은 카드는 세션당 한 번만 보냄 (`sessionStorage`의 전송 기록). 배치로 모아서 전송하고 `navigator.sendBeacon`을 씁니다.
2. 서버 (Edge Function 등):
   - `hash(IP + UA + 일자별 회전 salt)`로 만든 **일회성 버킷 키**로 레이트 리밋 (예: 분당 30건). salt는 매일 폐기해서 다음 날에는 추적할 수 없게 합니다.
   - 같은 버킷 키 × `content_id` × 일자 조합은 한 번만 집계 (메모리/KV에서 24시간 TTL)
   - `content_id` 화이트리스트 검증, 요청 크기 제한, 봇 UA 제외, 필요하면 Turnstile 같은 비가시 챌린지
3. 집계: 원시 이벤트는 7~30일 뒤 삭제하고 `daily_card_stats(content_id, date, reveals, completes, skips, shares)`만 남깁니다.
4. HOT 산정: 최근 7일 `completes / reveals`와 공유율을 **최소 표본(예: 공개 50회 이상)** 조건과 함께 섞어 점수를 매기고, 상위 N개를 운영자가 확인한 뒤 반영합니다. 급등하면 알림을 보내 조작 여부를 검토합니다.
5. 개인정보 처리방침에 “익명 통계, 개인 식별 정보 없음, 보관 기간”을 적어 둡니다.

## 현재 한계

- 콘텐츠는 JSON 파일로만 수정할 수 있습니다 (관리자 화면 없음).
- HOT은 운영자가 직접 지정한 추천이며, 실제 인기 순위가 아닙니다.
- 공유: 파일 공유를 지원하는 브라우저(대부분의 모바일)에서는 바로 공유되고, 그 밖의 환경에서는 PNG 저장만 됩니다. 인스타 스토리에 링크를 붙이는 기능은 없습니다.
- 공유 이미지의 이모지는 기기의 이모지 폰트로 그려지므로 OS마다 모양이 다릅니다.
- 서비스 워커/오프라인 캐시는 없습니다 (처음 접속할 때는 인터넷이 필요합니다).
- 다국어는 지원하지 않습니다 (한국어 전용).
