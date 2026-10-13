// 공통 저장소: Upstash Redis (Vercel Marketplace) / 환경변수 없으면 메모리(로컬 테스트용)
import { Redis } from '@upstash/redis';

// Vercel에서 Upstash 연결 시 붙는 접두어(예: STORAGE_KV_REST_API_URL)도 자동 인식
function findEnv(suffixes) {
  const keys = Object.keys(process.env);
  for (const s of suffixes) {
    const k = keys.find((k) => k === s || k.endsWith('_' + s));
    if (k && process.env[k]) return process.env[k];
  }
  return undefined;
}
const url = findEnv(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
const token = findEnv(['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);
const redis = url && token ? new Redis({ url, token }) : null;

const PREFIX = process.env.GAME_ID || 'honest-2026';
const K_SCORES = `${PREFIX}:scores`; // hash  field "p1:0" → 타수
const K_HIDDEN = `${PREFIX}:hidden`; // hash  field "p1"   → 홀 idx

const mem = { [K_SCORES]: {}, [K_HIDDEN]: {} };

export const backend = redis ? 'redis' : 'memory';

export async function getAll() {
  if (!redis) return { scores: { ...mem[K_SCORES] }, hidden: { ...mem[K_HIDDEN] } };
  const [scores, hidden] = await Promise.all([redis.hgetall(K_SCORES), redis.hgetall(K_HIDDEN)]);
  return { scores: scores || {}, hidden: hidden || {} };
}

// 필드 단위 저장 → 여러 명이 동시에 입력해도 서로 덮어쓰지 않음
export async function setScore(field, value) {
  if (!redis) {
    if (value == null) delete mem[K_SCORES][field];
    else mem[K_SCORES][field] = value;
    return;
  }
  if (value == null) await redis.hdel(K_SCORES, field);
  else await redis.hset(K_SCORES, { [field]: value });
}

// 최초 1회만 기록 (HSETNX) → 동시에 두 번 눌러도 결과는 하나
export async function drawHidden(pid, idx) {
  if (!redis) {
    if (mem[K_HIDDEN][pid] == null) mem[K_HIDDEN][pid] = idx;
    return Number(mem[K_HIDDEN][pid]);
  }
  await redis.hsetnx(K_HIDDEN, pid, idx);
  return Number(await redis.hget(K_HIDDEN, pid));
}

export async function resetHidden(pid) {
  if (!redis) {
    if (pid) delete mem[K_HIDDEN][pid];
    else mem[K_HIDDEN] = {};
    return;
  }
  if (pid) await redis.hdel(K_HIDDEN, pid);
  else await redis.del(K_HIDDEN);
}
