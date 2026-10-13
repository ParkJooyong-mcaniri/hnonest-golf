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
        if (!/^https:\/\//.test(urlEnv.value)) throw new Error(`${urlEnv.key} 값이 https:// 로 시작하지 않습니다`);
        const { Redis } = await import('@upstash/redis');
        redis = new Redis({ url: urlEnv.value, token: tokenEnv.value });
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

const PREFIX = process.env.GAME_ID || 'honest-2026';
const K_SCORES = `${PREFIX}:scores`; // hash  field "p1:0" → 타수
const K_HIDDEN = `${PREFIX}:hidden`; // hash  field "p1"   → 홀 idx

const mem = { [K_SCORES]: {}, [K_HIDDEN]: {} };

export const backend = urlEnv && tokenEnv ? 'redis' : 'memory';

export function diagnostics() {
  return {
    backend,
    urlKey: urlEnv?.key || null,
    tokenKey: tokenEnv?.key || null,
    urlLooksValid: urlEnv ? /^https:\/\//.test(urlEnv.value) : null,
    initError,
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
