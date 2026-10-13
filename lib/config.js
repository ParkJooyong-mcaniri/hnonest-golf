// ── 대회 설정 (여기만 고치면 전체 반영) ─────────────────────────────
export const EVENT_TITLE = '어니스트 게임';

// 운영 홀 (2·3번 홀 미운영) → 10홀 / Par 38
export const COURSE = [
  { no: 1, par: 5, course: '락' },
  { no: 4, par: 3, course: '락' },
  { no: 5, par: 4, course: '락' },
  { no: 6, par: 5, course: '락' },
  { no: 7, par: 4, course: '가든' },
  { no: 8, par: 3, course: '가든' },
  { no: 9, par: 4, course: '가든' },
  { no: 10, par: 4, course: '가든' },
  { no: 11, par: 3, course: '가든' },
  { no: 12, par: 3, course: '가든' },
];

// 전반 10홀 + 후반 10홀 = 20홀 / Par 76
export const HOLES = ['전반', '후반'].flatMap((half, h) =>
  COURSE.map((c, i) => ({
    idx: h * 10 + i,
    half,
    seq: i + 1,
    courseNo: c.no,
    course: c.course,
    par: c.par,
  }))
);

// 선언 타수 = 어니스트 게임 기준 타수
export const PLAYERS = [
  { id: 'p1', name: '곽통일', group: 1, declared: 88 },
  { id: 'p2', name: '명태우', group: 1, declared: 105 },
  { id: 'p3', name: '조정훈', group: 1, declared: 105 },
  { id: 'p4', name: '권문상', group: 1, declared: 107 },
  { id: 'p5', name: '황인율', group: 2, declared: 99 },
  { id: 'p6', name: '이범로', group: 2, declared: 109 },
  { id: 'p7', name: '손희수', group: 2, declared: 101 },
  { id: 'p8', name: '박주용', group: 2, declared: 93 },
];

// 히든홀 후보: Par4 홀 (20홀 중 8개)
export const HIDDEN_CANDIDATES = HOLES.filter((h) => h.par === 4).map((h) => h.idx);

// true면 20홀을 모두 입력한 사람만 히든홀 추첨 가능 (미리 알고 그 홀을 버리는 것 방지)
export const DRAW_REQUIRES_COMPLETE = true;

export const MIN_STROKE = 1;
export const MAX_STROKE = 15;
