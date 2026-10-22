// Local UI fixture only. Never calls DeepSeek or stores credentials.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `(() => {
  let configured = false, calls = 0, cancels = 0;
  const pending = new Map();
  const status = () => { document.getElementById('mock-stats').textContent = '模拟桥 · 请求 ' + calls + ' 次 · 取消 ' + cancels + ' 次'; };
  window.AndroidBridge = {
    hasAiKey: () => configured,
    saveAiKey: value => { configured = value === 'fake-key-for-ui-testing'; return configured; },
    clearAiKey: () => { configured = false; },
    cancelAi: id => { if (pending.has(id)) { clearTimeout(pending.get(id)); pending.delete(id); cancels++; status(); } },
    parseAi: (json, id) => {
      const request = JSON.parse(json); calls++; status();
      const timer = setTimeout(() => {
        pending.delete(id);
        if ((request.text || '').includes('失败')) { window.YoushuAI.receive(id, false, '模拟网络失败，未发出真实请求'); return; }
        const partial = (request.text || '').includes('补充');
        const rows = request.kind === 'image' ? [{ date: request.today, title: '测试收据', amount: 32, type: 'expense', category: '餐饮', review: false, reason: '模拟图片结果' }] : MoneyCore.parseQuick(request.text).rows.map(row => ({ ...row, review: false, reason: '模拟文字结果' }));
        window.YoushuAI.receive(id, true, JSON.stringify({ transactions: rows, questions: partial ? ['另一笔花了多少钱？'] : [] }));
      }, (request.text || '').includes('等待') ? 30000 : 500);
      pending.set(id, timer);
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mock-back').onclick = () => window.YoushuApp.handleBack();
    status();
  });
})();`;
const files = { 'app.js': 'text/javascript', 'core.js': 'text/javascript', 'ai-core.js': 'text/javascript', 'styles.css': 'text/css', 'favicon.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const name = new URL(req.url, 'http://127.0.0.1').pathname.slice(1);
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!name) {
      const html = (await readFile(path.join(root, 'index.html'), 'utf8'))
        .replace('<script src="./app.js"', '<script src="./bridge-fixture.js" defer></script><script src="./app.js"')
        .replace('<body>', '<body><aside style="position:relative;z-index:100;padding:8px;background:#fff3df"><strong>模拟 Android UI，非真实 API 测试</strong><p>仅接受测试字符串 fake-key-for-ui-testing，不要填写真实 Key。</p><span id="mock-stats"></span><button id="mock-back">模拟 Android 返回</button></aside>');
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
    } else if (name === 'bridge-fixture.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(fixture);
    } else if (files[name]) {
      res.setHeader('Content-Type', files[name] + '; charset=utf-8'); res.end(await readFile(path.join(root, name)));
    } else { res.writeHead(404); res.end('Not found'); }
  } catch { res.writeHead(500); res.end('Fixture unavailable'); }
}).listen(4185, '127.0.0.1', () => console.log('仅用于测试 Android 网页交互：http://127.0.0.1:4185/'));
