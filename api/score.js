import { HOLES, PLAYERS, MIN_STROKE, MAX_STROKE } from '../lib/config.js';
import { setScore } from '../lib/store.js';
import { send, readBody } from '../lib/http.js';

// POST /api/score { pid, idx, strokes|null }
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const { pid, idx, strokes } = await readBody(req);
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
