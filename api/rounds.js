import { listRounds } from '../lib/store.js';
import { send } from '../lib/http.js';

// GET /api/rounds → 이 골프장의 라운드 목록 (나중에 기록 조회·재활용용)
export default async function handler(req, res) {
  try {
    send(res, 200, { rounds: await listRounds() });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}
