import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, config } from '../netlify/functions/parse-expense.mjs';

const token = 'a'.repeat(43);
const env = { YOUSHU_ACCESS_TOKEN: token, DEEPSEEK_API_KEY: 'sk-test-only' };
const draft = { transactions: [{ date: '2026-10-08', title: '午饭', amount: 32, type: 'expense', category: '餐饮', review: false, reason: '金额明确' }], questions: [] };
const request = (body, auth = token) => new Request('https://test.netlify.app/api/parse-expense', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` }, body: JSON.stringify(body)
});
const provider = body => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(body) } }] });

test('无凭据不能调用 DeepSeek', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetcher: async () => { calls++; return provider(draft); } });
  const result = await handler(request({ kind: 'text', text: '午饭32', today: '2026-10-08' }, 'wrong'.repeat(10)));
  assert.equal(result.status, 401);
  assert.equal(calls, 0);
});

test('只转发主动输入，密钥只在服务端添加', async () => {
  let outbound;
  const handler = createHandler({ env, fetcher: async (url, init) => { outbound = { url, init }; return provider(draft); } });
  const result = await handler(request({ kind: 'text', text: '午饭32', today: '2026-10-08' }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), draft);
  assert.equal(outbound.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(outbound.init.headers.Authorization, 'Bearer sk-test-only');
  assert.equal(JSON.parse(outbound.init.body).messages[1].content, '午饭32');
  assert.equal(config.path, '/api/parse-expense');
});

test('图片转为视觉输入，畸形草稿不能返回客户端', async () => {
  let content;
  const good = createHandler({ env, fetcher: async (_url, init) => { content = JSON.parse(init.body).messages[1].content; return provider(draft); } });
  const result = await good(request({ kind: 'image', image: 'data:image/jpeg;base64,YWJj', today: '2026-10-08' }));
  assert.equal(result.status, 200);
  assert.equal(content[1].type, 'image_url');
  const bad = createHandler({ env, fetcher: async () => provider({ transactions: [{ ...draft.transactions[0], amount: '32' }], questions: [] }) });
  assert.equal((await bad(request({ kind: 'text', text: '午饭32', today: '2026-10-08' }))).status, 502);
});

test('拒绝无效内容和未配置的服务', async () => {
  const handler = createHandler({ env, fetcher: async () => provider(draft) });
  assert.equal((await handler(request({ kind: 'text', text: '', today: '2026-10-08' }))).status, 400);
  assert.equal((await handler(request({ kind: 'image', image: 'https://other.example/p.png', today: '2026-10-08' }))).status, 400);
  const missing = createHandler({ env: { YOUSHU_ACCESS_TOKEN: token }, fetcher: async () => provider(draft) });
  assert.equal((await missing(request({ kind: 'text', text: '午饭32', today: '2026-10-08' }))).status, 503);
});
