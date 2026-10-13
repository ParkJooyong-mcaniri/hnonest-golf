// ═══════════════════════════════════════════════════════════════════
//  데이터 구조:  골프장(COURSES) → 라운드(ROUND) → 스코어/히든홀
//  - 골프장 정보는 재사용 (다음에 락가든 가면 ROUND만 새로 정의)
//  - 다른 골프장은 COURSES에 추가하고 ROUND.courseId만 바꾸면 됨
// ═══════════════════════════════════════════════════════════════════

// ── 1. 골프장 (재사용) ─────────────────────────────────────────────
//  holes: 골프장 전체 홀. open=false 인 홀은 라운드에서 제외
export const COURSES = {
  rockgarden: {
    id: 'rockgarden',
    name: '락가든GC',
    subCourses: ['락', '가든'],
    holes: [
      { no: 1, par: 5, course: '락', open: true },
      { no: 2, par: 4, course: '락', open: false }, // 미운영
      { no: 3, par: 4, course: '락', open: false }, // 미운영
      { no: 4, par: 3, course: '락', open: true },
      { no: 5, par: 4, course: '락', open: true },
      { no: 6, par: 5, course: '락', open: true },
      { no: 7, par: 4, course: '가든', open: true },
      { no: 8, par: 3, course: '가든', open: true },
      { no: 9, par: 4, course: '가든', open: true },
      { no: 10, par: 4, course: '가든', open: true },
      { no: 11, par: 3, course: '가든', open: true },
      { no: 12, par: 3, course: '가든', open: true },
    ],
  },
};

// ── 2. 라운드 (이번 게임) ──────────────────────────────────────────
//  다음 라운드: id를 바꾸거나 Vercel 환경변수 ROUND_ID 지정 → 이전 기록은 그대로 보존
export const ROUND = {
  id: process.env.ROUND_ID || process.env.GAME_ID || 'honest-2026',
  courseId: 'rockgarden',
  title: '락가든GC-어니스트 게임',
  loops: ['전반', '후반'], // 운영 홀을 몇 바퀴 도는지
  game: {
    type: 'honest',
    hiddenPar: 4, // 히든홀 후보 Par
    drawRequiresComplete: true, // 20홀 입력 후 추첨 가능
  },
  // id는 이 라운드 안에서만 쓰는 키, name은 라운드 간 동일인 식별용
  players: [
    { id: 'p1', name: '곽통일', group: 1, declared: 88 },
    { id: 'p2', name: '명태우', group: 1, declared: 105 },
    { id: 'p3', name: '조정훈', group: 1, declared: 105 },
    { id: 'p4', name: '권문상', group: 1, declared: 107 },
    { id: 'p5', name: '황인율', group: 2, declared: 99 },
    { id: 'p6', name: '이범로', group: 2, declared: 109 },
    { id: 'p7', name: '손희수', group: 2, declared: 101 },
    { id: 'p8', name: '박주용', group: 2, declared: 93 },
  ],
};

// ── 3. 파생 값 (API/화면에서 사용, 기존 이름 유지) ─────────────────
export const COURSE = COURSES[ROUND.courseId];
const OPEN_HOLES = COURSE.holes.filter((h) => h.open);

// 라운드 홀 순서: idx 0..N-1  (예: 전반 10 + 후반 10 = 20홀)
export const HOLES = ROUND.loops.flatMap((half, l) =>
  OPEN_HOLES.map((c, i) => ({
    idx: l * OPEN_HOLES.length + i,
    half,
    loop: l + 1,
    seq: i + 1,
    courseNo: c.no,
    course: c.course,
    par: c.par,
  }))
);

export const EVENT_TITLE = ROUND.title;
export const PLAYERS = ROUND.players;
export const HIDDEN_CANDIDATES = HOLES.filter((h) => h.par === ROUND.game.hiddenPar).map((h) => h.idx);
export const DRAW_REQUIRES_COMPLETE = ROUND.game.drawRequiresComplete;

export const MIN_STROKE = 1;
export const MAX_STROKE = 15;
