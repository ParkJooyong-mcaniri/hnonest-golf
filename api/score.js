import { HOLES, PLAYERS, MIN_STROKE, MAX_STROKE } from '../lib/config.js';
import { setScore, resetScores } from '../lib/store.js';
import { send, readBody } from '../lib/http.js';

// POST /api/score { pid, idx, strokes|null }
// POST /api/score { reset: true, pid?, pin } → 관리자 스코어 초기화 (ADMIN_PIN)
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const body = await readBody(req);
    if (body.reset) {
      const pin = process.env.ADMIN_PIN;
      if (!pin || body.pin !== pin) return send(res, 403, { error: '관리자 PIN이 올바르지 않습니다' });
      if (body.pid && !PLAYERS.some((p) => p.id === body.pid)) return send(res, 400, { error: '알 수 없는 선수' });
      await resetScores(body.pid || null, HOLES.length);
      return send(res, 200, { ok: true });
    }
    const { pid, idx, strokes } = body;
    if (!PLAYERS.some((p) => p.id === pid)) return send(res, 400, { error: '알 수 없는 선수' });
    if (!Number.isInteger(idx) || !HOLES[idx]) return send(res, 400, { error: '잘못된 홀' });
    if (strokes !== null && (!Number.isInteger(strokes) || strokes < MIN_STROKE || strokes > MAX_STROKE))
      return send(res, 400, { error: `타수는 ${MIN_STROKE}~${MAX_STROKE}` });
    await setScore(`${pid}:${idx}`, strokes);
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
