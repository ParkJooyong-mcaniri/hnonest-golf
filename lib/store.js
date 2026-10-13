// 공통 저장소: Upstash Redis (Vercel Marketplace) / 환경변수 없으면 메모리(로컬 테스트용)
// 연결 설정이 잘못돼도 함수가 죽지 않도록 지연 로딩 + 오류 기록

// Vercel에서 Upstash 연결 시 붙는 접두어(예: STORAGE_KV_REST_API_URL)도 자동 인식
function findEnv(suffixes) {
  const keys = Object.keys(process.env);
  for (const s of suffixes) {
    const k = keys.find((k) => k === s || k.endsWith('_' + s));
    if (k && process.env[k]) return { key: k, value: process.env[k].trim() };
  }
  return null;
}

const urlEnv = findEnv(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
const tokenEnv = findEnv(['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);

let redis = null;
let initError = null;
let initPromise = null;

async function getRedis() {
  if (!urlEnv || !tokenEnv) return null;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (!/^https:\/\/|^http:\/\/localhost/.test(urlEnv.value)) throw new Error(`${urlEnv.key} 값이 https:// 로 시작하지 않습니다`);
        const { Redis } = await import('@upstash/redis');
        redis = new Redis({ url: urlEnv.value, token: tokenEnv.value });
        await bootstrap(redis);
      } catch (e) {
        initError = e.message;
        redis = null;
      }
    })();
  }
  await initPromise;
  if (initError) throw new Error('Redis 연결 실패: ' + initError);
  return redis;
}

import { COURSE, ROUND, HOLES } from './config.js';

// ── Redis 키 구조 (골프장 → 라운드) ─────────────────────────────
//  golf:courses                              hash  courseId → 골프장 정보(JSON)
//  golf:{courseId}:rounds                    hash  roundId  → 라운드 정보(JSON: 날짜, 선수, 홀 순서, 게임 룰)
//  golf:{courseId}:{roundId}:scores          hash  "p1:0"   → 타수   (idx는 라운드 정보의 holes 참고)
//  golf:{courseId}:{roundId}:hidden          hash  "p1"     → 히든홀 idx
const K_COURSES = 'golf:courses';
const K_ROUNDS = `golf:${COURSE.id}:rounds`;
const K_BASE = `golf:${COURSE.id}:${ROUND.id}`;
const K_SCORES = `${K_BASE}:scores`;
const K_HIDDEN = `${K_BASE}:hidden`;
const LEGACY = { [K_SCORES]: `${ROUND.id}:scores`, [K_HIDDEN]: `${ROUND.id}:hidden` }; // 이전 버전 키

function roundMeta() {
  return {
    id: ROUND.id,
    courseId: COURSE.id,
    courseName: COURSE.name,
    title: ROUND.title,
    game: ROUND.game,
    loops: ROUND.loops,
    players: ROUND.players,
    holes: HOLES.map(({ idx, loop, half, seq, courseNo, course, par }) => ({ idx, loop, half, seq, courseNo, course, par })),
    par: HOLES.reduce((a, h) => a + h.par, 0),
  };
}

// 최초 연결 시: 골프장/라운드 정보 기록 + 이전 키 데이터 이관
async function bootstrap(r) {
  const now = new Date().toISOString();
  await r.hset(K_COURSES, { [COURSE.id]: JSON.stringify(COURSE) });
  const prev = await r.hget(K_ROUNDS, ROUND.id);
  const createdAt = (prev && (typeof prev === 'string' ? JSON.parse(prev) : prev).createdAt) || now;
  await r.hset(K_ROUNDS, { [ROUND.id]: JSON.stringify({ ...roundMeta(), createdAt, updatedAt: now }) });
  for (const [key, legacy] of Object.entries(LEGACY)) {
    if (!(await r.exists(key)) && (await r.exists(legacy))) await r.rename(legacy, key);
  }
}

const mem = { [K_SCORES]: {}, [K_HIDDEN]: {} };

export const backend = urlEnv && tokenEnv ? 'redis' : 'memory';

export function diagnostics() {
  return {
    backend,
    urlKey: urlEnv?.key || null,
    tokenKey: tokenEnv?.key || null,
    urlLooksValid: urlEnv ? /^https:\/\//.test(urlEnv.value) : null,
    initError,
    keys: { scores: K_SCORES, hidden: K_HIDDEN, rounds: K_ROUNDS },
    // 값은 노출하지 않고 이름만
    relatedEnvNames: Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH/i.test(k)).sort(),
  };
}

export async function ping() {
  const r = await getRedis();
  if (!r) return 'memory';
  return await r.ping();
}

export async function getAll() {
  const r = await getRedis();
  if (!r) return { scores: { ...mem[K_SCORES] }, hidden: { ...mem[K_HIDDEN] } };
  const [scores, hidden] = await Promise.all([r.hgetall(K_SCORES), r.hgetall(K_HIDDEN)]);
  return { scores: scores || {}, hidden: hidden || {} };
}

// 필드 단위 저장 → 여러 명이 동시에 입력해도 서로 덮어쓰지 않음
export async function setScore(field, value) {
  const r = await getRedis();
  if (!r) {
    if (value == null) delete mem[K_SCORES][field];
    else mem[K_SCORES][field] = value;
    return;
  }
  if (value == null) await r.hdel(K_SCORES, field);
  else await r.hset(K_SCORES, { [field]: value });
}

// 최초 1회만 기록 (HSETNX) → 동시에 두 번 눌러도 결과는 하나
export async function drawHidden(pid, idx) {
  const r = await getRedis();
  if (!r) {
    if (mem[K_HIDDEN][pid] == null) mem[K_HIDDEN][pid] = idx;
    return Number(mem[K_HIDDEN][pid]);
  }
  await r.hsetnx(K_HIDDEN, pid, idx);
  return Number(await r.hget(K_HIDDEN, pid));
}

export async function resetHidden(pid) {
  const r = await getRedis();
  if (!r) {
    if (pid) delete mem[K_HIDDEN][pid];
    else mem[K_HIDDEN] = {};
    return;
  }
  if (pid) await r.hdel(K_HIDDEN, pid);
  else await r.del(K_HIDDEN);
}

// 스코어 초기화: pid 지정 시 그 사람 20홀만, 없으면 전체
export async function resetScores(pid, holeCount) {
  const r = await getRedis();
  const fields = pid ? Array.from({ length: holeCount }, (_, i) => `${pid}:${i}`) : null;
  if (!r) {
    if (fields) fields.forEach((f) => delete mem[K_SCORES][f]);
    else mem[K_SCORES] = {};
    return;
  }
  if (fields) await r.hdel(K_SCORES, ...fields);
  else await r.del(K_SCORES);
}

// 이 골프장의 지난 라운드 목록 (재활용/통계용)
export async function listRounds() {
  const r = await getRedis();
  if (!r) return [roundMeta()];
  const all = (await r.hgetall(K_ROUNDS)) || {};
  return Object.values(all).map((v) => (typeof v === 'string' ? JSON.parse(v) : v));
}
