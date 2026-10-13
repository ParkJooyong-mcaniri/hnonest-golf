import { randomInt } from 'node:crypto';
import { HOLES, PLAYERS, HIDDEN_CANDIDATES, DRAW_REQUIRES_COMPLETE } from '../lib/config.js';
import { getAll, drawHidden, resetHidden } from '../lib/store.js';
import { send, readBody } from '../lib/http.js';

// POST /api/hidden { pid }                 → 서버에서 Par4 홀 무작위 추첨 (1인 1회)
// POST /api/hidden { reset: true, pid?, pin } → 관리자 초기화 (ADMIN_PIN 환경변수)
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const body = await readBody(req);

    if (body.reset) {
      const pin = process.env.ADMIN_PIN;
      if (!pin || body.pin !== pin) return send(res, 403, { error: '관리자 PIN이 올바르지 않습니다' });
      await resetHidden(body.pid || null);
      return send(res, 200, { ok: true });
    }

    const { pid } = body;
    if (!PLAYERS.some((p) => p.id === pid)) return send(res, 400, { error: '알 수 없는 선수' });

    if (DRAW_REQUIRES_COMPLETE) {
      const { scores } = await getAll();
      const done = HOLES.filter((h) => scores[`${pid}:${h.idx}`] != null).length;
      if (done < HOLES.length)
        return send(res, 400, { error: `20홀 입력을 마친 뒤 뽑을 수 있어요 (현재 ${done}/20)` });
    }

    const pick = HIDDEN_CANDIDATES[randomInt(HIDDEN_CANDIDATES.length)];
    const idx = await drawHidden(pid, pick); // 이미 뽑았으면 기존 결과 반환
    send(res, 200, { ok: true, idx, alreadyDrawn: idx !== pick });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
