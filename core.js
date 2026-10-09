/* Local calculations and parsers: no network or browser dependencies. */
(function () {
  'use strict';
  const categories = ['餐饮', '交通', '居住', '运动健康', '购物', '订阅通信', '休闲', '其他'];
  const types = ['expense', 'income', 'refund', 'transfer'];
  const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const sum = items => round(items.reduce((a, b) => a + b, 0));
  function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number), date = new Date(y, m - 1, d);
    return y >= 1900 && y <= 2200 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }
  function parseDate(value) {
    const match = String(value).match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    const date = match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '';
    return validDate(date) ? date : '';
  }
  function uid() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function categoryFor(title, learned = {}) {
    if (Object.hasOwn(learned, title) && categories.includes(learned[title])) return { category: learned[title], reason: '按你上次的分类', review: false };
    const rules = [ ['交通', /打车|滴滴|出租车|地铁|公交|交通卡|通勤/], ['运动健康', /健身|私教|游泳|瑜伽|医院|药店/], ['餐饮', /午饭|晚饭|早饭|午餐|晚餐|早餐|外卖|食堂|咖啡|奶茶|餐厅|面馆|饭店/], ['居住', /房租|物业|水费|电费|燃气/], ['订阅通信', /话费|宽带|流量|会员|订阅|网盘/], ['休闲', /电影|门票|游戏|演出|旅游/], ['购物', /超市|便利店|衣服|鞋子|日用品/] ];
    const hit = rules.find(([, regex]) => regex.test(title));
    return hit ? { category: hit[0], reason: '按消费描述匹配，可修改', review: false } : { category: '其他', reason: '描述不足，请确认分类', review: true };
  }
  function monthly(item) { return round(item.price * item.count * (item.frequency === 'weekly' ? 52 / 12 : 1)); }
  function summary(state, month) {
    const rows = state.transactions.filter(t => t.date.startsWith(month));
    const expenses = sum(rows.filter(t => t.type === 'expense').map(t => t.amount));
    const refunds = sum(rows.filter(t => t.type === 'refund').map(t => t.amount));
    const budget = sum(state.budgets.map(monthly)), net = round(expenses - refunds);
    return { rows, expenses, refunds, net, budget, remaining: round(budget - net), income: sum(rows.filter(t => t.type === 'income').map(t => t.amount)), review: rows.filter(t => t.review).length };
  }
  function experiment(item, plan = {}) {
    const count = Math.min(Math.max(0, Number(plan.count) || 0), item.count), alternate = Math.max(0, Number(plan.alternate) || 0);
    const saving = item.protected ? 0 : round(Math.max(0, (item.price - alternate) * count * (item.frequency === 'weekly' ? 52 / 12 : 1)));
    return { saving, annual: round(saving * 12), count, alternate, enabled: !!plan.enabled && !item.protected };
  }
  function parseQuick(text, learned = {}, reference = new Date()) {
    let date = localDate(reference); const rows = [], rejected = [];
    for (let segment of text.split(/[，,；;\n]+/).map(s => s.trim()).filter(Boolean)) {
      if (/^昨天/.test(segment)) { const d = new Date(reference); d.setDate(d.getDate() - 1); date = localDate(d); segment = segment.replace(/^昨天\s*/, ''); }
      else if (/^今天/.test(segment)) { date = localDate(reference); segment = segment.replace(/^今天\s*/, ''); }
      else if (/^\d{4}[-/.]/.test(segment)) { date = parseDate(segment); segment = segment.replace(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s*/, ''); }
      const match = segment.match(/^([^\d¥￥]+?)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块)?$/);
      if (!match || !validDate(date) || Number(match[2]) <= 0 || Number(match[2]) > 1e8) { rejected.push(segment); continue; }
      const title = match[1].trim();
      const type = /退款|退回/.test(title) ? 'refund' : /工资|收入|奖金|报销到账/.test(title) ? 'income' : /转账|还信用卡|提现|充值/.test(title) ? 'transfer' : 'expense';
      rows.push({ id: uid(), date, title, amount: round(match[2]), type, ...categoryFor(title, learned), source: '一句话', externalKey: '' });
    }
    return { rows, rejected };
  }
  function csvRows(text, delimiter = ',') {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (!quoted && char === delimiter) { row.push(cell.trim()); cell = ''; }
      else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (quoted) throw new Error('文件引号未闭合，请检查 CSV 是否完整。');
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
  }
  function fingerprint(text) {
    let a = 2166136261, b = 5381;
    for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
    return `${text.length}-${a >>> 0}-${b >>> 0}`;
  }
  function parseStatement(text, learned = {}) {
    const clean = text.replace(/^\uFEFF/, ''); let rows, headerIndex = -1;
    for (const delimiter of [',', '\t', ';']) {
      const candidate = csvRows(clean, delimiter);
      const ix = candidate.findIndex(row => row.length >= 3 && row.some(c => /日期|时间|^date$/i.test(c)) && row.some(c => /金额|^amount$/i.test(c)));
      if (ix >= 0) { rows = candidate; headerIndex = ix; break; }
    }
    if (headerIndex < 0) throw new Error('未找到日期和金额表头。可先下载示例 CSV，按相同列名整理。');
    const headers = rows[headerIndex], find = regex => headers.findIndex(c => regex.test(c));
    const di = find(/交易时间|交易日期|日期|时间|^date$/i), ai = find(/金额|^amount$/i), ti = find(/交易对方|商户|^merchant$|^title$/i), desc = find(/商品|摘要|备注|说明|^description$/i), direction = find(/收.?支|方向|^type$/i), status = find(/状态|^status$/i), external = find(/^交易单号$|^交易号$|^订单号$|^流水号$|^transaction.?id$/i);
    const explicitExpense = /支出/.test(headers[ai]);
    if (headers.some(h => /收入金额/.test(h)) && headers.some(h => /支出金额/.test(h))) throw new Error('此文件把收入和支出分成两列，请整理为“金额、收支”两列后导入，避免漏算。');
    const result = [], rejected = []; let skipped = 0;
    rows.slice(headerIndex + 1).forEach((row, idx) => {
      const state = status >= 0 ? row[status] || '' : '';
      if (/交易关闭|已关闭|失败|未支付|待支付|取消/.test(state)) { skipped++; return; }
      const date = parseDate(row[di]), money = String(row[ai] || '').replace(/[¥￥,\s元]/g, '');
      const title = [row[ti], row[desc]].filter(Boolean).filter((s, i, arr) => arr.indexOf(s) === i).join(' · ').slice(0, 200);
      if (!date || !/^\d+(\.\d{1,2})?$/.test(money) || Number(money) <= 0 || Number(money) > 1e8 || !title) { rejected.push(idx + headerIndex + 2); return; }
      const raw = direction >= 0 ? row[direction] || '' : '';
      let type = /退款|^refund$/i.test(raw) ? 'refund' : /收入|^income$/i.test(raw) ? 'income' : /不计|中性|转账|^transfer$/i.test(raw) ? 'transfer' : /支出|^expense$/i.test(raw) || explicitExpense ? 'expense' : '';
      const uncertain = !type || /退款/.test(state) || (/转账|充值|提现|信用卡还款/.test(title) && type !== 'transfer');
      if (/退款/.test(title) && type === 'income') type = 'refund';
      const classification = categoryFor(title, learned);
      result.push({ id: uid(), date, title, amount: round(money), type: type || 'expense', ...classification, review: classification.review || uncertain, reason: uncertain ? '请核对收支 / 充值 / 退款状态' : classification.reason, source: '账单导入', externalId: row[external] || '', externalKey: '', rowIndex: idx });
    });
    if (!result.length) throw new Error('未识别出完整流水。需包含有效日期、消费描述、正数金额；请检查表头与金额格式。');
    return { rows: result, rejected, skipped, headers, fingerprint: fingerprint(clean) };
  }
  function duplicateStatus(row, existing) {
    if (row.externalKey && existing.some(t => t.externalKey === row.externalKey)) return 'exact';
    // Refunds may reuse the original order ID; only identical-file rows are certain.
    if (row.externalId && row.source && ['支付宝', '微信'].includes(row.source)) {
      const matching = existing.filter(t => t.source === row.source && t.externalId === row.externalId);
      if (matching.some(t => t.type === row.type && t.amount === row.amount && t.date === row.date && t.title === row.title) && row.type !== 'refund') return 'exact';
      if (matching.some(t => t.type === row.type)) return 'possible';
    }
    if (existing.some(t => {
      if (t.externalId && row.externalId && t.source === row.source && t.externalId !== row.externalId) return false;
      return t.date === row.date && t.title === row.title && t.amount === row.amount && t.type === row.type;
    })) return 'possible';
    return '';
  }
  function emptyState() { return { version: 4, name: '我的账本', income: null, goal: { name: '给自己留一点余地', amount: 3000 }, budgets: [], transactions: [], learned: {}, plans: {}, imports: [] }; }
  function personalBudgets(v = {}) {
    const n = (key, fallback) => Number.isFinite(Number(v[key])) && Number(v[key]) >= 0 ? Number(v[key]) : fallback;
    return [
      { id: 'gym', title: '健身房', category: '运动健康', price: n('gymFee', 2100), count: 1, frequency: 'monthly', protected: true },
      { id: 'taxi', title: '健身后打车', category: '交通', price: n('taxiPrice', 30), count: n('taxiTimes', 4), frequency: 'weekly', protected: false },
      { id: 'phone', title: '手机话费', category: '订阅通信', price: n('phoneFee', 100), count: 1, frequency: 'monthly', protected: false },
      { id: 'transport', title: '公共交通', category: '交通', price: n('transportFee', 180), count: 1, frequency: 'monthly', protected: false },
      { id: 'lunch', title: '工作日午饭', category: '餐饮', price: n('lunchPrice', 30), count: n('lunchDays', 20), frequency: 'monthly', protected: false }
    ];
  }
  function demoState(month) {
    const state = emptyState(); state.name = '城市生活示例'; state.income = 12000; state.goal = { name: '周末去看海', amount: 2000 };
    state.budgets = [
      { id: 'rent', title: '房租与物业', category: '居住', price: 3200, count: 1, frequency: 'monthly', protected: true },
      { id: 'food', title: '日常三餐', category: '餐饮', price: 65, count: 30, frequency: 'monthly', protected: false },
      { id: 'gym', title: '运动与健身', category: '运动健康', price: 400, count: 1, frequency: 'monthly', protected: true },
      { id: 'taxi', title: '打车出行', category: '交通', price: 30, count: 4, frequency: 'weekly', protected: false },
      { id: 'sub', title: '会员与通信', category: '订阅通信', price: 180, count: 1, frequency: 'monthly', protected: false },
      { id: 'shop', title: '日用品与购物', category: '购物', price: 600, count: 1, frequency: 'monthly', protected: false }
    ];
    const seeds = [[1, '房租', 3200, '居住'], [2, '地铁通勤', 6, '交通'], [2, '午饭', 28, '餐饮'], [3, '健身月卡', 400, '运动健康'], [3, '午饭', 32, '餐饮'], [4, '咖啡', 22, '餐饮'], [4, '便利店日用品', 86.5, '购物'], [5, '晚饭', 48, '餐饮'], [5, '滴滴出行', 32, '交通'], [6, '音乐会员', 15, '订阅通信'], [6, '午饭', 30, '餐饮'], [7, '周末咖啡', 24, '餐饮'], [7, '城市小店', 58, '其他']];
    state.transactions = seeds.map(([d, title, amount, category], i) => ({ id: `demo-${i}`, date: `${month}-${String(d).padStart(2, '0')}`, title, amount, category, type: 'expense', review: category === '其他', source: '演示数据', externalKey: '' }));
    state.plans = { taxi: { count: 2, alternate: 6, enabled: true }, sub: { count: 1, alternate: 140, enabled: false } }; return state;
  }
  function validateState(s) {
    const positive = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e8;
    if (!s || s.version !== 4 || typeof s.name !== 'string' || s.name.length > 100 || !(s.income === null || positive(s.income)) || !s.goal || typeof s.goal.name !== 'string' || s.goal.name.length > 100 || !positive(s.goal.amount)) return false;
    if (!Array.isArray(s.budgets) || s.budgets.length > 300 || !s.budgets.every(b => b && typeof b.id === 'string' && typeof b.title === 'string' && b.title.length <= 200 && categories.includes(b.category) && positive(b.price) && positive(b.count) && ['monthly', 'weekly'].includes(b.frequency) && typeof b.protected === 'boolean')) return false;
    if (new Set(s.budgets.map(b => b.id)).size !== s.budgets.length) return false;
    if (!Array.isArray(s.transactions) || s.transactions.length > 50000 || !s.transactions.every(t => t && typeof t.id === 'string' && validDate(t.date) && typeof t.title === 'string' && t.title.length <= 200 && positive(t.amount) && t.amount > 0 && types.includes(t.type) && categories.includes(t.category) && typeof t.source === 'string' && typeof t.externalKey === 'string')) return false;
    if (new Set(s.transactions.map(t => t.id)).size !== s.transactions.length) return false;
    if (!s.learned || typeof s.learned !== 'object' || Array.isArray(s.learned) || !Object.values(s.learned).every(c => categories.includes(c))) return false;
    if (!s.plans || typeof s.plans !== 'object' || Array.isArray(s.plans) || !Object.values(s.plans).every(p => p && positive(p.count) && positive(p.alternate) && typeof p.enabled === 'boolean')) return false;
    return Array.isArray(s.imports) && s.imports.every(i => typeof i === 'string');
  }
  globalThis.MoneyCore = { categories, types, round, sum, localDate, validDate, parseDate, uid, categoryFor, monthly, summary, experiment, parseQuick, csvRows, fingerprint, parseStatement, duplicateStatus, emptyState, personalBudgets, demoState, validateState };
})();
