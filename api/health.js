import { diagnostics, ping } from '../lib/store.js';
import { send } from '../lib/http.js';

// GET /api/health → Redis 연결 진단 (환경변수 값은 노출하지 않음)
export default async function handler(req, res) {
  let pingResult = null, error = null;
  try { pingResult = await ping(); } catch (e) { error = e.message; }
  send(res, error ? 500 : 200, { ok: !error, ping: pingResult, error, node: process.version, ...diagnostics() });
}
