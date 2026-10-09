import test from 'node:test';
import assert from 'node:assert/strict';
import '../core.js';
import '../ai-core.js';
const AI = globalThis.YoushuAICore;

const valid = { date: '2026-10-08', title: '午饭', amount: 32, type: 'expense', category: '餐饮', review: false, reason: '明确金额' };

test('请求仅包含当前输入，不包含账本或密钥', () => {
  const req = AI.textRequest('昨天午饭32', '2026-10-08');
  assert.deepEqual(req, { kind: 'text', text: '昨天午饭32', today: '2026-10-08' });
  assert.throws(() => AI.textRequest(' '.repeat(5), '2026-10-08'));
  const image = AI.imageRequest('data:image/jpeg;base64,YWJj', '2026-10-08');
  assert.equal(image.kind, 'image');
  assert.throws(() => AI.imageRequest('https://unknown.example/photo.jpg', '2026-10-08'));
});
test('有效 JSON 草稿先变成预览行，不直接入账', () => {
  const result = AI.parse({ transactions: [valid], questions: [] });
  assert.equal(result.rows[0].source, 'AI 整理');
  assert.equal(result.rows[0].amount, 32);
  assert.equal(result.rows[0].type, 'expense');
});
test('拒绝模型幻觉字段与截断响应', () => {
  for (const bad of [
    { ...valid, date: '2026-02-30' },
    { ...valid, amount: '32' },
    { ...valid, category: '股票' },
    { ...valid, type: 'unknown' }
  ]) assert.throws(() => AI.parse({ transactions: [bad], questions: [] }));
  assert.throws(() => AI.parse({ transactions: Array(11).fill(valid), questions: [] }));
});
test('信息不足时返回追问而非杜撰流水', () => {
  const result = AI.parse({ transactions: [], questions: ['多少钱？'] });
  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.questions, ['多少钱？']);
});
