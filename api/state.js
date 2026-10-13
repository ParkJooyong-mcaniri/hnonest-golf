import { EVENT_TITLE, HOLES, PLAYERS, HIDDEN_CANDIDATES, DRAW_REQUIRES_COMPLETE } from '../lib/config.js';
import { getAll, backend } from '../lib/store.js';
import { send } from '../lib/http.js';

// GET /api/state → 설정 + 전체 8명 스코어 + 히든홀
export default async function handler(req, res) {
  try {
    const { scores, hidden } = await getAll();
    const out = {};
    for (const p of PLAYERS) out[p.id] = Array(HOLES.length).fill(null);
    for (const [k, v] of Object.entries(scores)) {
      const [pid, idx] = k.split(':');
      if (out[pid] && HOLES[idx]) out[pid][idx] = Number(v);
    }
    const hid = {};
    for (const [pid, v] of Object.entries(hidden)) hid[pid] = Number(v);
    send(res, 200, {
      config: { title: EVENT_TITLE, holes: HOLES, players: PLAYERS, hiddenCandidates: HIDDEN_CANDIDATES, drawRequiresComplete: DRAW_REQUIRES_COMPLETE },
      scores: out,
      hidden: hid,
      backend,
      ts: Date.now(),
    });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
