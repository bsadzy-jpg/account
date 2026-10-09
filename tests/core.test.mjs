import test from 'node:test';
import assert from 'node:assert/strict';
import '../core.js';
const C = globalThis.MoneyCore;
test('个人预算为 3500；替代交通成本计入净节省', () => {
  const budgets = C.personalBudgets(); assert.equal(C.sum(budgets.map(C.monthly)), 3500);
  const taxi = budgets.find(b => b.id === 'taxi');
  assert.equal(C.experiment(taxi, { count: 2, alternate: 6 }).saving, 208);
  const liveEstimate = C.experiment(taxi, { count: 2, alternate: 10 }).saving;
  assert.equal(liveEstimate, 173.33); assert.equal(C.round(liveEstimate * 12), 2079.96); assert.equal(Math.ceil(2000 / liveEstimate), 12);
  assert.equal(C.experiment({ ...taxi, protected: true }, { count: 2, alternate: 6 }).saving, 0);
  assert.equal(C.experiment(taxi, { count: 99, alternate: 60 }).saving, 0);
});
test('计划不记为支出；退款冲减；收入与转账分离', () => {
  const s = C.emptyState(); s.budgets = C.personalBudgets();
  assert.equal(C.summary(s, '2026-09').net, 0);
  s.transactions = [{ date: '2026-09-01', amount: 100, type: 'expense' }, { date: '2026-09-02', amount: 30, type: 'refund' }, { date: '2026-09-02', amount: 300, type: 'transfer' }, { date: '2026-09-01', amount: 12000, type: 'income' }, { date: '2026-08-31', amount: 90, type: 'expense' }];
  assert.equal(C.summary(s, '2026-09').net, 70); assert.equal(C.summary(s, '2026-09').income, 12000);
});
test('自然语言昨天跨月、退款方向、复杂内容不猜测', () => {
  const result = C.parseQuick('昨天午饭32，健身打车28，今天购物退款12.50，交通卡充值100，买了3件衣服花300', {}, new Date(2026, 8, 1, 0, 30));
  assert.equal(result.rows.length, 4); assert.equal(result.rows[0].date, '2026-08-31'); assert.equal(result.rows[1].category, '交通');
  assert.equal(result.rows[2].date, '2026-09-01'); assert.equal(result.rows[2].type, 'refund'); assert.equal(result.rows[3].type, 'transfer'); assert.equal(result.rejected.length, 1);
  assert.equal(C.parseQuick('2026-02-30午饭30').rows.length, 0);
});
test('CSV 前言、引号、千位金额、收入退款及失败记录', () => {
  const csv = '\uFEFF账单导出\r\n日期,商户,金额,收支,交易单号,状态\r\n2026-09-01,"商户,分店","1,200.50",支出,A001,交易成功\r\n2026-09-02,购物退款,20,收入,A002,已到账\r\n2026-09-03,工资,5000,收入,A003,成功\r\n2026-09-04,午饭,32,支出,A004,交易关闭\r\n2026-02-30,午饭,20,支出,A005,成功';
  const p = C.parseStatement(csv); assert.equal(p.rows.length, 3); assert.equal(p.rows[0].title, '商户,分店'); assert.equal(p.rows[0].amount, 1200.5); assert.equal(p.rows[0].externalId, 'A001'); assert.equal(p.rows[1].type, 'refund'); assert.equal(p.rows[2].type, 'income'); assert.equal(p.skipped, 1); assert.equal(p.rejected.length, 1);
});
test('不明确收支、充值、退款状态必须核对；支持带前言的 TSV', () => {
  const p = C.parseStatement('导出说明\n日期\t商户\t金额\t收/支\t状态\n2026-09-01\t午饭\t20\t支出\t已退款\n2026-09-02\t交通卡充值\t100\t支出\t成功\n2026-09-03\t午饭\t30\t\t成功');
  assert.equal(p.rows.length, 3); assert.ok(p.rows.every(t => t.review));
});
test('同日同金额只标记候选，唯一交易号才能确定重复', () => {
  const t = { date: '2026-09-07', title: '咖啡', amount: 20, type: 'expense', externalKey: '微信:id:001' };
  assert.equal(C.duplicateStatus({ ...t, externalKey: '微信:id:002' }, [t]), 'possible');
  assert.equal(C.duplicateStatus(t, [t]), 'exact');
  assert.equal(C.duplicateStatus({ ...t, externalKey: '' }, [t]), 'possible');
});
test('分类修正按精确描述复用，备份验证拒绝畸形数据', () => {
  assert.equal(C.categoryFor('城市小店', { 城市小店: '餐饮' }).category, '餐饮');
  assert.ok(C.categoryFor('美团').review);
  const state = C.demoState('2026-09'); assert.ok(C.validateState(state));
  state.transactions[0].amount = -10; assert.equal(C.validateState(state), false);
  const altered = C.emptyState(); altered.plans.bad = { count: -5, alternate: 1, enabled: true }; assert.equal(C.validateState(altered), false);
});
test('不同交易号的同金额消费保留；退款共用订单号不会被吞掉', () => {
  const old = {date:'2026-09-07', title:'午饭', amount:30, type:'expense', externalId:'pay001', source:'微信', externalKey:'file:old:0'};
  assert.equal(C.duplicateStatus({...old, externalId:'pay002', externalKey:'file:new:0'}, [old]), '');
  assert.equal(C.duplicateStatus({...old, externalKey:'file:new:0'}, [old]), 'exact');
  assert.equal(C.duplicateStatus({...old, type:'refund', externalKey:'file:new:1'}, [old]), '');
  const refund = {...old, type:'refund', externalKey:'file:refund:0'};
  assert.equal(C.duplicateStatus({...refund, externalKey:'file:refund2:0'}, [refund]), 'possible');
  assert.equal(C.duplicateStatus(refund, [refund]), 'exact');
});
