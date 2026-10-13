// 로컬 테스트용 서버 (Vercel 배포에는 쓰이지 않음): npm run dev → http://localhost:3000
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const routes = {
  '/api/state': () => import('./api/state.js'),
  '/api/score': () => import('./api/score.js'),
  '/api/hidden': () => import('./api/hidden.js'),
  '/api/health': () => import('./api/health.js'),
  '/api/rounds': () => import('./api/rounds.js'),
};

http
  .createServer(async (req, res) => {
    const path = req.url.split('?')[0];
    if (routes[path]) return (await routes[path]()).default(req, res);
    const html = await readFile(new URL('./index.html', import.meta.url));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  })
  .listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
