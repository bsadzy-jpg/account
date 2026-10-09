(function () {
  'use strict';
  const C = MoneyCore, A = YoushuAICore, $ = id => document.getElementById(id);
  const KEY = 'youshu-book-v4';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => `¥${Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;
  const number = n => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h15v10H6a3 3 0 0 1-3-3V7"/><path d="M21 13h-5v4h5"/><path d="M17 15h.1"/>',
    sprout: '<path d="M12 21v-9M12 14C3 14 3 6 3 6s9 0 9 8ZM12 10C12 3 21 3 21 3s0 8-9 8M7 21h10"/>',
    leaf: '<path d="M4 19C-1 8 10 2 21 3c0 13-8 21-17 16ZM4 20 16 8"/>',
    sliders: '<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h11m4 0h1"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>', arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 2M12 16h.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h3m3 0h2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3ZM20 2v4m-2-2h4"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>', download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
    food: '<path d="M5 3v7m3-7v7m-6-7v7h6m-3 0v11M17 3c-3 2-3 7-3 10h4M18 3v18"/>',
    car: '<path d="m3 11 2-6h14l2 6v8H3ZM3 11h18M6 19v2m12-2v2M6 15h2m8 0h2"/>',
    heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 7 8 14c9-7 11-11 8-14Z"/>',
    bag: '<path d="M5 8h14l1 13H4ZM9 8V6a3 3 0 0 1 6 0v2"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    coffee: '<path d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M6 2v2m5-2v2"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit: '<path d="m15 4 5 5M4 20l1-6L16 3l5 5L10 19l-6 1Z"/>', check: '<path d="m5 12 4 4L20 5"/>',
    flag: '<path d="M5 21V3m0 1c6-3 9 3 15 0v10c-6 3-9-3-15 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.more}</svg>`;
  const catIcons = ['food', 'car', 'home', 'heart', 'bag', 'phone', 'coffee', 'more'];
  const typeNames = { expense: '支出', income: '收入', refund: '退款', transfer: '转账 / 充值' };
  function categoryIcon(cat) { const ix = C.categories.indexOf(cat); return `<span class="category-icon c${(ix + 5) % 6}">${icon(catIcons[ix])}</span>`; }
  const options = (values, current, names = {}) => values.map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(names[v] || v)}</option>`).join('');
  let storeFailed = false, corrupted = false, migrated = false;
  function read(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { storeFailed = true; if (key === KEY) corrupted = true; return null; } }
  let real = read(KEY), mode = real ? 'real' : 'demo';
  if (real && !C.validateState(real)) { real = null; mode = 'demo'; corrupted = true; }
  if (!real && !corrupted) {
    const legacy = read('monthly-budget-planner-v1');
    if (legacy && typeof legacy === 'object') {
      real = C.emptyState(); real.name = '我的生活账本'; real.budgets = C.personalBudgets(legacy);
      const old = read('monthly-budget-ledger-v3');
      if (Array.isArray(old)) real.transactions = old.filter(t => t && !String(t.id).startsWith('planned:') && !String(t.source).startsWith('自动计划') && C.validDate(t.date) && Number(t.amount) > 0 && Number.isFinite(Number(t.amount))).map(t => ({ id: C.uid(), date: t.date, title: String(t.title || '旧版消费').slice(0, 200), amount: C.round(Number(t.amount)), ...C.categoryFor(String(t.title)), type: 'expense', source: '旧版迁移', externalKey: '', review: true }));
      mode = 'real'; migrated = true;
    }
  }
  let month = C.localDate().slice(0, 7), demo = C.demoState(month), view = 'overview', filter = 'all', query = '', page = 0;
  let planTab = 'budgets', expandedPlan = '', preview = null, toastTimer, undo = null, pendingText = '', aiRequestId = 0, imageTaskId = 0;
  globalThis.YoushuAI = { receive(id, ok, payload) {
    if (id !== aiRequestId) return;
    if (!ok) { modal('智能整理未完成', `<p class="dialog-intro">${esc(payload)}</p><div class="dialog-actions"><button class="secondary" data-action="quick-actions">返回输入</button>${pendingText ? '<button class="primary" data-action="local-parse">试试本地识别</button>' : ''}</div>`); return; }
    try {
      const result = A.parse(JSON.parse(payload));
      if (!result.rows.length) { modal('还需要补充一点', `<p class="dialog-intro">没有足够信息生成一笔完整流水。</p>${result.questions.map(q => `<p class="notice">${esc(q)}</p>`).join('')}<div class="dialog-actions"><button class="primary" data-action="quick-actions">继续描述</button></div>`); return; }
      pendingText = '';
      preview = { rows: result.rows, fingerprint: '', from: 'ai', rejected: result.questions, skipped: 0, page: 0 };
      preparePreview();
    } catch (error) { modal('智能整理未完成', `<p class="dialog-intro">${esc(error.message)}</p><div class="dialog-actions"><button class="primary" data-action="quick-actions">返回输入</button></div>`); }
  } };
  const state = () => mode === 'demo' ? demo : real;
  function persist() {
    if (mode === 'demo') return;
    try { localStorage.setItem(KEY, JSON.stringify(real)); storeFailed = false; }
    catch { storeFailed = true; toast('本机保存失败，请导出备份后再关闭页面。'); }
  }
  if (migrated) persist();
  function toast(text, undoFn) {
    clearTimeout(toastTimer); undo = undoFn || null;
    $('toast').innerHTML = `<span>${esc(text)}</span>${undo ? '<button data-action="undo">撤销</button>' : ''}`;
    $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; undo = null; }, undo ? 12000 : 6000);
  }
  function mutate(fn, message, reversible = false) {
    const old = reversible ? structuredClone(state()) : null, originalMode = mode;
    fn(state()); persist(); render();
    if (message) toast(mode === 'demo' ? `${message} · 仅在示例中体验` : message, old ? () => { if (originalMode !== mode) return toast('账本已切换，撤销未执行。'); if (mode === 'demo') demo = old; else real = old; persist(); render(); toast('已撤销'); } : null);
  }
  function modal(title, html, wide = false) {
    $('dialog-title').textContent = title; $('dialog-body').innerHTML = html; $('dialog').classList.toggle('wide-dialog', wide);
    $('dialog').classList.remove('action-dialog');
    if (!$('dialog').open) $('dialog').showModal(); hydrateIcons();
  }
  function close() { if ($('ai-token-input')) $('ai-token-input').value = ''; imageTaskId++; aiRequestId++; $('dialog').close(); preview = null; }
  function hydrateIcons() { document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  function enabledSaving() { return C.sum(state().budgets.map(b => { const p = C.experiment(b, state().plans[b.id]); return p.enabled ? p.saving : 0; })); }
  function render() {
    const s = state(), totals = C.summary(s, month);
    $('book-name').textContent = s.name; $('book-mode').textContent = mode === 'demo' ? '示例体验 · 不写入真实账本' : '私人账本 · 本机保存';
    $('storage-label').textContent = storeFailed ? '尚未保存，请备份' : mode === 'demo' ? '示例体验中' : '数据留在本机';
    $('nav-review').hidden = totals.review === 0; $('nav-review').textContent = totals.review;
    const banner = $('mode-banner'); banner.hidden = mode !== 'demo' && !migrated && !storeFailed;
    banner.innerHTML = mode === 'demo' ? `<span>${icon('info')} 正在体验示例账本，所有数字均为演示。${corrupted ? '原数据读取异常，已保留原存储。' : ''}</span><button data-action="${real ? 'return-real' : 'onboard'}">${real ? '返回我的账本' : '建立我的账本'} ${icon('arrow')}</button>` : storeFailed ? `<span>设置尚未可靠保存。请导出备份，避免关闭后丢失。</span><button data-action="export">导出备份 ${icon('download')}</button>` : `<span>${icon('check')} 已延续旧版预算；旧流水标记待确认，原存储保留。</span><button data-action="dismiss-migration">知道了</button>`;
    const labels = { overview: '首页', ledger: '明细', plans: '计划', settings: '我的' };
    $('view-label').textContent = labels[view];
    $('month').value = month; $('month').parentElement.hidden = view === 'settings' || view === 'plans';
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); if (b.dataset.view === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('view-content').innerHTML = view === 'overview' ? overview(totals) : view === 'ledger' ? ledger(totals) : view === 'plans' ? plans() : settings();
    if (view === 'settings') $('view-content').insertAdjacentHTML('afterbegin', `<section class="section-card ai-settings"><div><span>${icon('spark')}</span><div><strong>智能记账服务</strong><small>${globalThis.AndroidBridge?.hasAiConnection?.() ? `已连接 ${esc(globalThis.AndroidBridge.aiSite())}` : '尚未连接 Netlify · 本地规则仍可用'}</small></div></div><button class="secondary" data-action="ai-settings">设置</button></section>`);
    hydrateIcons();
  }
  function go(next) { if (!['overview', 'ledger', 'plans', 'settings'].includes(next)) return; view = next; page = 0; render(); window.scrollTo({ top: 0 }); }
  function quickActions() {
    modal('说一句，有数帮你记', `<div class="action-sheet-list">
      <form id="quick-form" class="quick-sheet-form"><label class="field">今天发生了什么<textarea id="quick-input" aria-label="一句话记账" placeholder="例如：昨天聚餐我付了238，朋友转回100" maxlength="1000" required>${esc(pendingText)}</textarea></label><button class="primary full-width" type="submit">${icon('spark')} 智能整理，先预览</button><button class="text-button" type="button" data-action="local-parse">只用本地规则识别</button></form>
      <button class="sheet-action" data-action="image-pick"><span>${icon('upload')}</span><span><strong>选账单或收据图片</strong><small>选中后会压缩并发送，返回草稿供你确认</small></span>${icon('chevron')}</button>
      <input class="native-file" id="image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
      <button class="sheet-action" data-action="transaction-add"><span>${icon('edit')}</span><span><strong>手动记账</strong><small>自己填写日期、金额和分类</small></span>${icon('chevron')}</button>
      <button class="sheet-action" data-action="import"><span>${icon('upload')}</span><span><strong>导入账单</strong><small>支持 CSV / TXT，先预览再入账</small></span>${icon('chevron')}</button>
    </div>`);
    $('dialog').classList.add('action-dialog');
    setTimeout(() => $('quick-input')?.focus(), 0);
  }
  function aiSettings() {
    const supported = !!globalThis.AndroidBridge?.saveAiConnection;
    const site = globalThis.AndroidBridge?.aiSite?.() || '';
    modal('连接智能记账', `<p class="dialog-intro">${supported ? 'DeepSeek Key 只存放在 Netlify 站点变量里。手机首次连接后，可发送主动输入的文字或选择的图片；账本、预算和历史流水仍留在本机。' : '浏览器预览只提供本地规则识别。Netlify 智能整理可在 Android APK 中连接。'}</p>${supported ? `<form id="ai-connection-form"><label class="field">有数 Netlify 站点地址<input id="ai-site-input" type="url" inputmode="url" placeholder="https://你的站点.netlify.app" value="${esc(site)}" required></label><label class="field">访问凭据<input id="ai-token-input" type="password" autocomplete="off" spellcheck="false" placeholder="Netlify 中设置的 YOUSHU_ACCESS_TOKEN" required></label><p class="notice">访问凭据由 Android Keystore 加密保存；不是 DeepSeek Key，不会进入账本备份或 GitHub。保存后首次使用时验证连接。</p><div class="dialog-actions"><button class="secondary" type="button" data-action="ai-connection-clear">断开连接</button><button class="primary">保存连接</button></div></form>` : '<button class="secondary" data-action="close">知道了</button>'}`);
  }
  function localQuick(text) {
    const parsed = C.parseQuick(text, state().learned);
    if (!parsed.rows.length) { toast('本地规则未识别；可试试“午饭32，打车28”，或手动记账。'); return; }
    preview = { rows: parsed.rows, fingerprint: '', from: 'quick', rejected: parsed.rejected, skipped: 0, page: 0 }; preparePreview();
  }
  function smartQuick(text) {
    pendingText = String(text || '').trim();
    let request;
    try { request = A.textRequest(pendingText, C.localDate()); } catch (error) { toast(error.message); return; }
    if (!globalThis.AndroidBridge?.parseAi) { localQuick(pendingText); toast('浏览器预览使用本地规则；APK 可配置 DeepSeek。'); return; }
    if (!globalThis.AndroidBridge.hasAiConnection()) { aiSettings(); toast('先连接有数 Netlify 服务。'); return; }
    const id = ++aiRequestId;
    modal('正在整理这句话', '<p class="dialog-intro">正经由 Netlify 连接 DeepSeek。不会发送完整账本；整理结果不会自动入账。</p><p class="notice">请稍候…</p>');
    globalThis.AndroidBridge.parseAi(JSON.stringify(request), id);
  }
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 12 * 1024 * 1024) return reject(new Error('请选择 12 MB 以内的 JPG、PNG、WebP 或 GIF 图片。'));
      const url = URL.createObjectURL(file), picture = new Image();
      picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片无法读取，请换一张。')); };
      picture.onload = () => {
        try {
          let scale = Math.min(1, 2200 / Math.max(picture.naturalWidth, picture.naturalHeight));
          const canvas = document.createElement('canvas'); let result = '';
          for (let attempt = 0; attempt < 5; attempt++) {
            canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
            const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('图片处理失败。');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
            result = canvas.toDataURL('image/jpeg', Math.max(.65, .84 - attempt * .05));
            if (result.length <= 2600000) break;
            scale *= .78;
          }
          URL.revokeObjectURL(url);
          if (result.length > 2600000) throw new Error('图片仍过大，请裁剪后重试。');
          resolve(result);
        } catch (error) { URL.revokeObjectURL(url); reject(error); }
      };
      picture.src = url;
    });
  }
  async function smartImage(file) {
    pendingText = '';
    if (!globalThis.AndroidBridge?.parseAi) { toast('图片智能整理目前只在 Android APK 中可用。'); return; }
    if (!globalThis.AndroidBridge.hasAiConnection()) { aiSettings(); toast('先连接有数 Netlify 服务，再重新选择图片。'); return; }
    const task = ++imageTaskId;
    modal('正在处理图片', '<p class="dialog-intro">先在本机缩小图片，再经 Netlify 发送给 DeepSeek。不会上传整本账。</p><p class="notice">请稍候…</p>');
    try {
      const request = A.imageRequest(await compressImage(file), C.localDate());
      if (task !== imageTaskId || !$('dialog').open) return;
      const id = ++aiRequestId;
      modal('正在识别图片', '<p class="dialog-intro">正在生成待确认的记账草稿。图片不会保存在有数账本中。</p><p class="notice">请稍候…</p>');
      globalThis.AndroidBridge.parseAi(JSON.stringify(request), id);
    } catch (error) { if (task === imageTaskId) modal('图片处理未完成', `<p class="dialog-intro">${esc(error.message)}</p><div class="dialog-actions"><button class="primary" data-action="quick-actions">返回记账</button></div>`); }
  }
  function overview(t) {
    const s = state(), ratio = t.budget ? Math.max(0, t.net) / t.budget * 100 : 0;
    const recent = [...t.rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    const span = new Set(t.rows.map(r => r.date)).size;
    const categorySpend = t.rows.filter(r => r.type === 'expense').reduce((sum, row) => {
      sum[row.category] = C.round((sum[row.category] || 0) + row.amount);
      return sum;
    }, {});
    const largestSpend = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0];
    const insight = largestSpend ? `本月已记录支出最多的是${esc(largestSpend[0])}，共 ${money(largestSpend[1])}。` : '开始记账后，这里会给出一条最值得关注的月度观察。';
    return `<div class="home-view">
      <section class="summary-card"><div class="summary-top"><span>本月净支出</span><span>${t.rows.length ? `${span} 天有记录` : '等待第一笔记录'}</span></div><div class="summary-amount num">${money(t.net)}</div><div class="summary-metrics"><button data-view="ledger"><span>已记录收入</span><strong class="num">${money(t.income)}</strong></button><button data-action="budget-home"><span>${t.remaining >= 0 ? '预算剩余' : '已超预算'}</span><strong class="num">${money(Math.abs(t.remaining))}</strong></button></div><div class="progress-line"><i style="width:${Math.min(100, ratio)}%"></i></div><small>${t.budget ? `预算使用 ${number(C.round(ratio))}% · 当前月预算 ${money(t.budget)}` : '还没有固定预算，去“计划”添加一项'}</small></section>
      <section class="ai-entry section-card"><span class="ai-eyebrow">${icon('spark')} 一句话或一张图</span><h2>想到什么，就说什么</h2><p>聚餐、报销、退款，也能选账单图片，先整理成待确认流水。</p><button class="primary full-width" data-action="quick-actions">开始记账 ${icon('arrow')}</button><small>只发送你主动输入的内容；完整账本仍保存在本机。</small></section>
      <section class="home-actions"><button class="primary action-main" data-action="import">${icon('upload')}<span><strong>导入账单</strong><small>CSV / TXT</small></span></button><button class="${t.review ? 'review-action urgent' : 'review-action'}" data-action="review">${icon(t.review ? 'info' : 'check')}<span><strong>${t.review ? `${t.review} 笔待确认` : '账单已确认'}</strong><small>${t.review ? '逐笔检查分类' : '查看全部明细'}</small></span></button></section>
      <section class="section-card recent-panel"><div class="section-title"><div><h2>最近明细</h2><p>点击任意一笔即可编辑</p></div><button class="text-button" data-view="ledger">全部 ${icon('arrow')}</button></div>${recent.length ? transactionGroups(recent) : empty('还没有实际流水。可以导入账单，也可以点底部“记账”。', 'quick-actions', '记一笔')}</section>
      <button class="insight-line" data-view="ledger">${icon('leaf')}<span>${insight}</span>${icon('chevron')}</button>
    </div>`;
  }
  function empty(text, action, label) { return `<div class="empty">${icon('leaf')}<p>${esc(text)}</p>${action ? `<button class="secondary" data-action="${action}">${esc(label)}</button>` : ''}</div>`; }
  function amountText(t) { return `${t.type === 'expense' ? '−' : t.type === 'transfer' ? '' : '+'}${money(t.amount)}`; }
  function dateLabel(date) {
    const [y, m, d] = date.split('-').map(Number), today = C.localDate(), yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayText = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (date === today) return '今天'; if (date === yesterdayText) return '昨天';
    return `${m}月${d}日${y !== Number(month.slice(0, 4)) ? ` · ${y}` : ''}`;
  }
  function transactionGroups(rows) {
    const groups = rows.reduce((all, row) => ((all[row.date] ||= []).push(row), all), {});
    return `<div class="transaction-groups">${Object.entries(groups).map(([date, items]) => {
      const daily = C.round(C.sum(items.filter(t => t.type === 'expense').map(t => t.amount)) - C.sum(items.filter(t => t.type === 'refund').map(t => t.amount)));
      return `<section class="date-group"><div class="date-heading"><strong>${dateLabel(date)}</strong><span>当日净支出 ${money(daily)}</span></div>${items.map(t => `<button class="transaction-row" data-action="transaction-edit" data-id="${esc(t.id)}">${categoryIcon(t.category)}<span class="transaction-copy"><strong>${esc(t.title)}</strong><small>${esc(t.category)} · ${esc(t.source)}${t.review ? ' · 待确认' : ''}</small></span><span class="amount num ${t.type}">${amountText(t)}<small>${typeNames[t.type]}</small></span>${icon('chevron')}</button>`).join('')}</section>`;
    }).join('')}</div>`;
  }
  function transactionTable(rows) {
    return `<div class="table-scroll"><table class="transaction-table"><thead><tr><th>消费 / 商户</th><th class="hide-mobile">日期</th><th>分类</th><th class="hide-mobile">状态</th><th>金额</th><th><span class="muted">编辑</span></th></tr></thead><tbody>${rows.map(t => `<tr><td><div class="merchant-cell">${categoryIcon(t.category)}<div><strong>${esc(t.title)}</strong><small>${esc(t.source)} · ${esc(t.date.slice(5))}</small></div></div></td><td class="hide-mobile muted">${esc(t.date)}</td><td><span class="tag gray">${esc(t.category)}</span></td><td class="hide-mobile"><span class="tag ${t.review ? 'amber' : 'green'}">${t.review ? '待确认' : typeNames[t.type]}</span></td><td class="amount num ${t.type}">${t.type === 'expense' ? '−' : t.type === 'transfer' ? '' : '+'}${money(t.amount)}${t.type === 'refund' ? '<small> 退款</small>' : ''}</td><td><button class="icon-button" data-action="transaction-edit" data-id="${esc(t.id)}" aria-label="编辑${esc(t.title)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function ledger(t) {
    const matches = t.rows.filter(r => (filter === 'all' || (filter === 'review' ? r.review : r.type === filter)) && `${r.title} ${r.category}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
    const pages = Math.max(1, Math.ceil(matches.length / 15)); page = Math.min(page, pages - 1);
    const pageRows = matches.slice(page * 15, page * 15 + 15);
    return `<div class="ledger-view"><div class="ledger-stats"><strong>净支出 ${money(t.net)}</strong><span>收入 ${money(t.income)}</span><span>${t.rows.length} 笔</span><span class="${t.review ? 'needs-review' : ''}">待确认 ${t.review}</span></div><section class="section-card ledger-card"><div class="ledger-toolbar"><input type="search" class="search-input" id="ledger-search" aria-label="搜索流水" placeholder="搜索商户或分类" value="${esc(query)}"><div class="filters">${[['all', '全部'], ['expense', '支出'], ['income', '收入'], ['refund', '退款'], ['transfer', '转账'], ['review', '待确认']].map(([k, v]) => `<button class="filter ${filter === k ? 'active' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${v}</button>`).join('')}</div></div>${matches.length ? `<div class="mobile-ledger">${transactionGroups(pageRows)}</div><div class="desktop-ledger">${transactionTable(pageRows)}</div>` : empty('这个月暂时没有符合条件的记录。')}<div class="pagination"><span>${matches.length} 笔 · 第 ${page + 1} / ${pages} 页</span><div><button class="text-button" data-action="page-prev" ${page === 0 ? 'disabled' : ''}>上一页</button><button class="text-button" data-action="page-next" ${page + 1 >= pages ? 'disabled' : ''}>下一页</button></div></div></section><p class="notice">转账不计消费，退款按到账月份冲减支出。预算剩余不是银行账户余额。</p></div>`;
  }
  function defaultPlan(b) { return { count: b.count > 1 ? Math.min(2, b.count) : 1, alternate: C.round(b.price * .8), enabled: false }; }
  function plans() {
    const s = state(), total = C.sum(s.budgets.map(C.monthly)), saved = enabledSaving(), goalMonths = saved ? Math.ceil(s.goal.amount / saved) : 0;
    const adjustable = s.budgets.filter(b => !b.protected), protectedItems = s.budgets.filter(b => b.protected);
    const goal = `<section class="goal-strip"><span>${icon('flag')}</span><div><small>我的心愿</small><strong>${esc(s.goal.name)} · ${money(s.goal.amount)}</strong></div><span>${saved ? `按当前试算约 ${goalMonths} 个月` : '等待加入一个实验'}</span><button class="text-button" data-action="goal">编辑</button></section>`;
    const budgetView = `<div class="plan-grid"><section class="section-card"><div class="section-title"><div><h2>固定预算</h2><p>重复开销只设一次，不会自动记成消费</p></div><button class="primary compact" data-action="budget-add">${icon('plus')} 添加</button></div><div class="budget-list">${s.budgets.map(b => `<div class="budget-list-row">${categoryIcon(b.category)}<div><strong>${esc(b.title)}</strong><small>${money(b.price)} × ${number(b.count)} 次 / ${b.frequency === 'weekly' ? '周' : '月'}</small></div><strong class="num">${money(C.monthly(b))}</strong><div class="row-tools"><button class="icon-button heart-button ${b.protected ? 'active' : ''}" data-action="protect" data-id="${esc(b.id)}" aria-label="${b.protected ? '取消保留' : '标记保留'}${esc(b.title)}" aria-pressed="${b.protected}">${icon('heart')}</button><button class="icon-button" data-action="budget-edit" data-id="${esc(b.id)}" aria-label="编辑预算${esc(b.title)}">${icon('edit')}</button></div></div>`).join('') || empty('还没有固定预算，从房租、通勤或餐饮开始。', 'budget-add', '添加预算')}</div><div class="card-foot">${icon('info')} 点亮爱心后，省钱试算会跳过这一项。</div></section><section class="plan-summary section-card"><span>当前月预算</span><strong class="big-number num">${money(total)}</strong><p>${s.budgets.length} 项固定预算 · 周频率按 52 ÷ 12 折算</p><button class="secondary full-width" data-plan-tab="experiments">去做省钱试算 ${icon('arrow')}</button></section></div>`;
    const experimentView = `<div class="experiment-layout"><section class="experiment-summary section-card"><span>预计每月净省</span><strong class="big-number num" id="lab-saving">${money(saved)}</strong><p id="lab-annual">坚持 12 个月，预计 ${money(C.round(saved * 12))}</p><div class="comparison-track"><i id="after-bar" style="width:${total ? (total - saved) / total * 100 : 0}%"></i><i class="saved" id="saved-bar" style="width:${total ? saved / total * 100 : 0}%"></i></div><div class="comparison-labels"><span id="after-label">调整后 ${money(C.round(total - saved))}</span><span>原计划 ${money(total)}</span></div><span class="sr-only" id="mobile-lab-saving">${money(saved)}</span><span class="sr-only" id="goal-duration">${saved ? `约 ${goalMonths} 个月` : '等待第一个实验'}</span></section><div class="experiment-list">${adjustable.map(b => {
      const p = s.plans[b.id] || defaultPlan(b), result = C.experiment(b, p);
      const open = expandedPlan === b.id;
      return `<section class="experiment-card ${open ? 'expanded' : ''}"><button class="experiment-head" data-action="plan-expand" data-id="${esc(b.id)}" aria-expanded="${open}">${categoryIcon(b.category)}<span><strong>${esc(b.title)}</strong><small>原预算 ${money(C.monthly(b))} / 月</small></span><span class="experiment-result"><strong class="num" id="saving-${esc(b.id)}">${money(result.saving)}</strong><small>预计月省</small></span>${icon('chevron')}</button><label class="check-label plan-check"><input type="checkbox" data-plan="enabled" data-id="${esc(b.id)}" ${p.enabled ? 'checked' : ''}>加入我的省钱计划</label>${open ? `<div class="experiment-fields"><label class="field">每${b.frequency === 'weekly' ? '周' : '月'}替换几次<input data-plan="count" data-id="${esc(b.id)}" type="number" min="0" max="${b.count}" step="0.01" value="${result.count}" aria-label="${esc(b.title)}替换次数"></label><label class="field">替代方案每次花费（元）<input data-plan="alternate" data-id="${esc(b.id)}" type="number" min="0" max="100000000" step="0.01" value="${result.alternate}" aria-label="${esc(b.title)}替代成本"></label><p class="experiment-formula" id="formula-${esc(b.id)}">${formula(b, result)}</p></div>` : ''}</section>`;
    }).join('') || `<section class="section-card">${empty('添加一项可以调整的预算，就能开始试算。', 'budget-add', '添加预算')}</section>`}${protectedItems.length ? `<section class="protected-row">${icon('heart')}<div><p>这些花费先不调整</p><small>${protectedItems.map(b => esc(b.title)).join('、')}</small></div></section>` : ''}</div></div><p class="notice">试算不会改写预算或实际流水，也不代表钱已经存下。</p>`;
    return `<div class="plans-view"><div class="segment-tabs" role="tablist"><button data-plan-tab="budgets" class="${planTab === 'budgets' ? 'active' : ''}" role="tab" aria-selected="${planTab === 'budgets'}">固定预算</button><button data-plan-tab="experiments" class="${planTab === 'experiments' ? 'active' : ''}" role="tab" aria-selected="${planTab === 'experiments'}">省钱试算</button></div>${goal}${planTab === 'budgets' ? budgetView : experimentView}</div>`;
  }
  function formula(b, r) { return `每次 ${money(b.price)} − 替代 ${money(r.alternate)}，替换 ${number(r.count)} 次${b.frequency === 'weekly' ? ' / 周，按 52 ÷ 12 折算' : ' / 月'}。预计每月省 ${money(r.saving)}。`; }
  function updateExperiment(el) {
    const s = state(), b = s.budgets.find(b => b.id === el.dataset.id);
    if (!b || !['count', 'alternate', 'enabled'].includes(el.dataset.plan)) return;
    const p = s.plans[b.id] || defaultPlan(b);
    const max = el.dataset.plan === 'count' ? b.count : 1e8;
    p[el.dataset.plan] = el.dataset.plan === 'enabled' ? el.checked : C.round(Math.max(0, Math.min(max, Number(el.value) || 0)));
    s.plans[b.id] = p; persist();
    const r = C.experiment(b, p), saved = enabledSaving(), total = C.sum(s.budgets.map(C.monthly));
    if ($(`saving-${b.id}`)) $(`saving-${b.id}`).textContent = money(r.saving);
    if ($(`formula-${b.id}`)) $(`formula-${b.id}`).textContent = formula(b, r);
    if ($('lab-saving')) $('lab-saving').textContent = money(saved);
    if ($('mobile-lab-saving')) $('mobile-lab-saving').textContent = money(saved);
    if ($('lab-annual')) $('lab-annual').textContent = `坚持 12 个月，预计 ${money(C.round(saved * 12))}`;
    if ($('goal-duration')) $('goal-duration').textContent = saved ? `约 ${Math.ceil(s.goal.amount / saved)} 个月` : '等待第一个实验';
    if ($('after-bar')) $('after-bar').style.width = `${total ? (total - saved) / total * 100 : 0}%`;
    if ($('saved-bar')) $('saved-bar').style.width = `${total ? saved / total * 100 : 0}%`;
    if ($('after-label')) $('after-label').textContent = `调整后 ${money(C.round(total - saved))}`;
    $('storage-label').textContent = storeFailed ? '尚未保存，请备份' : mode === 'demo' ? '示例体验中' : '数据留在本机';
  }
  function settings() {
    const s = state();
    return `<div class="settings-view"><section class="profile-card section-card"><span class="avatar large-avatar">数</span><div><small>当前账本</small><h2>${esc(s.name)}</h2><p>预计月收入：${s.income === null ? '未填写' : money(s.income)}</p></div><button class="secondary" data-action="profile">编辑</button></section><section class="section-card settings-list"><button data-action="budget-home"><span>${icon('wallet')}</span><span><strong>固定预算</strong><small>${s.budgets.length} 项 · 每月 ${money(C.sum(s.budgets.map(C.monthly)))}</small></span>${icon('chevron')}</button><button data-action="export"><span>${icon('download')}</span><span><strong>导出备份</strong><small>带走完整账本 JSON</small></span>${icon('chevron')}</button><button data-action="restore"><span>${icon('upload')}</span><span><strong>恢复备份</strong><small>先检查摘要，再替换账本</small></span>${icon('chevron')}</button><button data-action="help"><span>${icon('help')}</span><span><strong>使用说明</strong><small>记账、导入与数据边界</small></span>${icon('chevron')}</button></section><section class="section-card data-card"><div><span>${icon('lock')}</span><div><strong>账本只留在本机</strong><small>${Object.keys(s.learned).length} 条分类偏好已记住</small></div></div><p>智能整理只发送你主动输入的文字或选中的图片；账本不会自动上传。换设备前请导出备份。</p><button class="secondary full-width" data-action="${mode === 'demo' ? real ? 'return-real' : 'onboard' : 'demo'}">${mode === 'demo' ? real ? '返回我的账本' : '建立我的账本' : '切换到演示账本'}</button></section><p class="notice">支持图片智能整理、本地规则和 CSV / TXT 导入；尚未接入语音或支付通知读取。</p></div>`;
  }
  function onboarding() {
    modal('从你的生活开始', `<p class="dialog-intro">选一个起点。预算可以随时增减，不必一次填完。</p><form id="onboard-form"><div class="onboard-choices"><label class="choice"><input type="radio" name="template" value="blank" checked>${icon('leaf')}<strong>空白账本</strong><small>适合每个人，按需添加自己的生活开销。</small></label><label class="choice"><input type="radio" name="template" value="personal">${icon('heart')}<strong>健身通勤模板</strong><small>5 项健身、通勤与日常开销，共约 3500 元 / 月，可自由调整。</small></label></div><div class="form-grid"><label class="field">账本名称<input name="name" maxlength="100" value="我的生活账本" required></label><label class="field">预计月收入（可不填）<input name="income" type="number" min="0" max="100000000" step="0.01" placeholder="先不填也没关系"></label></div><p class="notice settings-section">${real ? '将替换当前真实账本；继续前会自动下载原账本备份。' : '从示例切换后，不会带入任何演示流水。'}</p><div class="dialog-actions"><button type="button" class="secondary" data-action="close">再看看</button><button class="primary">建立我的账本 ${icon('arrow')}</button></div></form>`);
    $('onboard-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); if (real) download(JSON.stringify(real, null, 2), `有数-建立前备份-${C.localDate()}.json`, 'application/json'); real = C.emptyState(); real.name = f.get('name').trim() || '我的生活账本'; real.income = f.get('income') === '' ? null : Number(f.get('income')); if (f.get('template') === 'personal') real.budgets = C.personalBudgets(); mode = 'real'; migrated = false; persist(); close(); go(real.budgets.length ? 'overview' : 'settings'); toast('账本已建立，从最熟悉的一项开销开始。'); };
  }
  function budgetForm(id) {
    const old = state().budgets.find(b => b.id === id);
    const b = old || { title: '', price: '', count: 1, category: '其他', frequency: 'monthly', protected: false };
    modal(old ? '调整这项生活开销' : '添加一位固定搭子', `<form id="budget-form"><div class="form-grid"><label class="field wide">开销名称<input name="title" value="${esc(b.title)}" placeholder="房租、通勤、咖啡、订阅…" maxlength="200" required></label><label class="field">每次金额（元）<input name="price" type="number" min="0" max="100000000" step="0.01" value="${b.price}" required></label><label class="field">每个周期的次数<input name="count" type="number" min="0" max="10000" step="0.01" value="${b.count}" required></label><label class="field">重复周期<select name="frequency">${options(['monthly', 'weekly'], b.frequency, { monthly: '每月', weekly: '每周（按平均月折算）' })}</select></label><label class="field">分类<select name="category">${options(C.categories, b.category)}</select></label></div><label class="check-label"><input type="checkbox" name="protected" ${b.protected ? 'checked' : ''}>值得保留，省钱计划先不动它</label><p class="notice">这是预算规则，不代表已付款。调整会用于当前模板的月度测算，不改写任何实际消费记录。</p><div class="dialog-actions">${old ? `<button class="danger" type="button" data-action="budget-delete" data-id="${esc(old.id)}">移除这项预算</button>` : ''}<button type="button" class="secondary" data-action="close">取消</button><button class="primary">保存预算</button></div></form>`);
    $('budget-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); const item = { id: old?.id || C.uid(), title: f.get('title').trim(), price: Number(f.get('price')), count: Number(f.get('count')), category: f.get('category'), frequency: f.get('frequency'), protected: f.has('protected') }; if (!item.title) return; close(); mutate(s => { const i = s.budgets.findIndex(r => r.id === item.id); if (i >= 0) s.budgets[i] = item; else s.budgets.push(item); }, '预算已保存', true); };
  }
  function transactionForm(id) {
    const old = state().transactions.find(t => t.id === id);
    const t = old || { date: C.localDate(), title: '', amount: '', type: 'expense', category: '其他' };
    modal(old ? '确认这一笔' : '记下一笔生活', `<form id="transaction-form"><div class="form-grid"><label class="field wide">消费 / 商户描述<input name="title" maxlength="200" value="${esc(t.title)}" required></label><label class="field">日期<input name="date" type="date" value="${esc(t.date)}" required></label><label class="field">金额（元，正数）<input name="amount" type="number" min="0.01" max="100000000" step="0.01" value="${t.amount}" required></label><label class="field">收支方向<select name="type">${options(C.types, t.type, typeNames)}</select></label><label class="field">分类<select name="category">${options(C.categories, t.category)}</select></label></div><label class="check-label"><input name="learn" type="checkbox" checked>记住这个描述的分类，下次帮我自动选择</label><p class="notice">充值通常是资金转移，实际消费时再记支出，避免算两次。退款请选择“退款”，保留原始支出。</p><div class="dialog-actions">${old ? `<button class="danger" type="button" data-action="transaction-delete" data-id="${esc(id)}">删除这一笔</button>` : ''}<button type="button" class="secondary" data-action="close">取消</button><button class="primary">确认并保存</button></div></form>`);
    $('transaction-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); if (!C.validDate(f.get('date')) || !f.get('title').trim()) return; const item = { ...old, id: old?.id || C.uid(), title: f.get('title').trim(), date: f.get('date'), amount: C.round(f.get('amount')), category: f.get('category'), type: f.get('type'), review: false, source: old?.source || '手动记录', externalKey: old?.externalKey || '' }; close(); mutate(s => { const ix = s.transactions.findIndex(r => r.id === item.id); if (ix >= 0) s.transactions[ix] = item; else s.transactions.push(item); if (f.has('learn')) s.learned = { ...s.learned, [item.title]: item.category }; }, '已保存并确认这一笔', true); };
  }
  function goalForm() {
    const goal = state().goal;
    modal('给节省一个小小的去处', `<form id="goal-form"><div class="form-grid"><label class="field wide">我的心愿<input name="name" maxlength="100" value="${esc(goal.name)}" placeholder="应急备用金、一次旅行、一门课程…" required></label><label class="field wide">目标金额（元）<input name="amount" type="number" min="1" max="100000000" step="0.01" value="${goal.amount}" required></label></div><p class="dialog-intro settings-section">实验室会估算从零积累需要多久，不会把预算节省当成已经存下的钱。</p><div class="dialog-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary">保存心愿</button></div></form>`);
    $('goal-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); close(); mutate(s => { s.goal = { name: f.get('name').trim() || '我的心愿', amount: Number(f.get('amount')) }; }, '心愿已保存'); };
  }
  function profileForm() {
    const s = state(); modal('调整账本信息', `<form id="profile-form"><div class="form-grid"><label class="field">账本名称<input name="name" maxlength="100" value="${esc(s.name)}" required></label><label class="field">预计月收入（可留空）<input name="income" type="number" min="0" max="100000000" step="0.01" value="${s.income ?? ''}"></label></div><div class="dialog-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary">保存</button></div></form>`);
    $('profile-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); close(); mutate(s => { s.name = f.get('name').trim() || '我的账本'; s.income = f.get('income') === '' ? null : Number(f.get('income')); }, '账本信息已保存'); };
  }
  function importDialog() {
    modal('把账单交给有数整理', `<p class="dialog-intro">选择已导出的 CSV / TXT。识别后先预览，可调整分类和方向，再统一入账。示例模式中的导入不会写进真实账本。</p><label class="field">这份账单来自<select id="import-source">${options(['通用', '支付宝', '微信', '银行卡'], '通用')}</select></label><input id="import-file" class="native-file" type="file" accept=".csv,.txt" aria-label="选择本地账单"><div class="import-options"><label>文件编码 <select id="import-encoding"><option value="utf-8">UTF-8</option><option value="gb18030">GB18030 / GBK</option></select></label><button class="text-button" data-action="sample">下载示例 CSV ${icon('download')}</button></div><div class="notice settings-section">需要日期、商户或商品描述、金额。建议有收支方向和交易单号。暂不支持 XLSX、PDF、截图；不同平台格式可能需要整理。单文件限 5 MB、5000 笔。</div><p id="import-error" class="error-message" role="alert"></p>`);
    $('import-file').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const encoding = $('import-encoding').value, source = $('import-source').value;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error('文件超过 5 MB，请拆分账单后导入。');
        const text = new TextDecoder(encoding, { fatal: true }).decode(await file.arrayBuffer());
        const result = C.parseStatement(text, state().learned);
        if (result.rows.length > 5000) throw new Error('一次最多导入 5000 笔，请拆分账单。');
        const fileKey = result.fingerprint;
        if (state().imports.includes(fileKey)) throw new Error('这份相同文件已完整导入，无需再次导入。');
        result.rows.forEach(t => { t.source = source; t.externalKey = `file:${fileKey}:${t.rowIndex}`; });
        preview = { rows: result.rows, fingerprint: fileKey, from: 'file', rejected: result.rejected, skipped: result.skipped, page: 0 };
        preparePreview();
      } catch (err) { $('import-error').textContent = err instanceof TypeError ? '文件编码无法读取，试试 GB18030 / GBK 后重新选择文件。' : err.message; }
      e.target.value = '';
    };
  }
  function preparePreview() {
    const seen = [...state().transactions];
    preview.rows.forEach(t => { t.duplicate = C.duplicateStatus(t, seen); t.selected = !t.duplicate && !t.review; seen.push(t); });
    renderPreview();
  }
  function renderPreview() {
    const p = preview, start = p.page * 30;
    modal('检查一下，确认后入账', `<p class="dialog-intro">识别出 ${p.rows.length} 笔。未确定或疑似重复的记录默认不勾选；确认无误后可选入。同日同金额不代表同一笔消费。</p><div class="import-counts"><span class="tag green">${p.rows.filter(t => !t.review && !t.duplicate).length} 笔可直接确认</span><span class="tag amber">${p.rows.filter(t => t.review).length} 笔需要核对</span><span class="tag gray">${p.rows.filter(t => t.duplicate).length} 笔重复候选</span></div>${p.rejected.length ? `<p class="notice warning">未识别内容：${esc(p.rejected.slice(0, 12).join('、'))}${p.rejected.length > 12 ? '…' : ''}${p.from === 'file' ? '（数据行序号）' : ''}，这些内容不会被加入。</p>` : ''}${p.skipped ? `<p class="notice">已跳过 ${p.skipped} 条关闭、失败或未付款记录。</p>` : ''}<div class="table-scroll"><table class="preview-table"><thead><tr><th>加入</th><th>日期</th><th>描述</th><th>金额</th><th>方向</th><th>分类</th></tr></thead><tbody>${p.rows.slice(start, start + 30).map((t, i) => `<tr><td><input type="checkbox" data-preview="selected" data-index="${i + start}" aria-label="加入第${i + start + 1}笔" ${t.selected ? 'checked' : ''} ${t.duplicate === 'exact' ? 'disabled' : ''}></td><td><input type="date" data-preview="date" data-index="${i + start}" aria-label="第${i + start + 1}笔日期" value="${esc(t.date)}"></td><td><input data-preview="title" data-index="${i + start}" aria-label="第${i + start + 1}笔描述" maxlength="200" value="${esc(t.title)}"><small>${t.duplicate === 'exact' ? '相同交易标识，已入账' : t.duplicate === 'possible' ? '与另一笔同日、同描述、同金额，请核对' : esc(t.reason || '请确认')}</small></td><td><input type="number" data-preview="amount" data-index="${i + start}" aria-label="第${i + start + 1}笔金额" min="0.01" max="100000000" step="0.01" value="${t.amount}"></td><td><select data-preview="type" data-index="${i + start}" aria-label="第${i + start + 1}笔方向">${options(C.types, t.type, typeNames)}</select></td><td><select data-preview="category" data-index="${i + start}" aria-label="第${i + start + 1}笔分类">${options(C.categories, t.category)}</select></td></tr>`).join('')}</tbody></table></div><div class="pagination"><span>第 ${p.page + 1} / ${Math.max(1, Math.ceil(p.rows.length / 30))} 页</span><div><button class="text-button" data-action="preview-prev" ${p.page === 0 ? 'disabled' : ''}>上一页</button><button class="text-button" data-action="preview-next" ${start + 30 >= p.rows.length ? 'disabled' : ''}>下一页</button></div></div><p id="preview-error" class="error-message" role="alert"></p><div class="dialog-actions"><button class="secondary" data-action="close">取消</button><button class="primary" data-action="preview-save" id="preview-save">确认加入 ${p.rows.filter(t => t.selected).length} 笔</button></div>`, true);
  }
  function savePreview() {
    const selected = preview.rows.filter(t => t.selected && t.duplicate !== 'exact');
    if (!selected.length) { $('preview-error').textContent = '请先勾选需要加入的记录。'; return; }
    if (selected.some(t => !C.validDate(t.date) || !t.title.trim() || !Number.isFinite(t.amount) || t.amount <= 0 || t.amount > 1e8)) { $('preview-error').textContent = '请检查所选记录的日期、描述和金额。'; return; }
    if (state().transactions.length + selected.length > 50000) { $('preview-error').textContent = '当前版本最多保存 50000 笔，请先导出备份。'; return; }
    const batch = selected.map(t => { const { selected: unused, duplicate, rowIndex, reason, ...record } = t; return { ...record, review: false }; });
    const fp = preview.fingerprint, full = preview.rows.every(t => t.selected || t.duplicate === 'exact');
    close(); month = batch[0].date.slice(0, 7); view = 'ledger'; filter = 'all'; query = ''; page = 0;
    mutate(s => { s.transactions.push(...batch); if (fp && full) s.imports.push(fp); }, `已加入 ${batch.length} 笔记录，可逐笔编辑`, true);
  }
  function download(content, filename, mime) {
    if (globalThis.AndroidBridge?.saveFile) {
      globalThis.AndroidBridge.saveFile(content, filename, mime);
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime })), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function restoreDialog() {
    modal('恢复本地备份', '<p class="dialog-intro">选择“有数”导出的 JSON 备份。先检查内容摘要，再决定是否替换当前账本。</p><input class="native-file" id="restore-file" type="file" accept=".json" aria-label="选择备份文件"><p class="error-message" id="restore-error" role="alert"></p>');
    $('restore-file').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 25 * 1024 * 1024) throw new Error('备份超过 25 MB。'); const incoming = JSON.parse(await file.text()); if (!C.validateState(incoming)) throw new Error('备份字段不完整或数据无效，未修改原账本。'); modal('确认恢复这个账本', `<p class="dialog-intro">${esc(incoming.name)}：${incoming.budgets.length} 项预算、${incoming.transactions.length} 笔流水。恢复将替换真实账本${real ? '，同时下载当前账本备份' : ''}。</p><div class="dialog-actions"><button class="secondary" data-action="close">取消</button><button class="primary" id="confirm-restore">确认恢复</button></div>`); $('confirm-restore').onclick = () => { if (real) download(JSON.stringify(real, null, 2), `有数-恢复前备份-${C.localDate()}.json`, 'application/json'); real = incoming; mode = 'real'; migrated = false; persist(); close(); go('overview'); toast('账本已恢复'); }; } catch (err) { $('restore-error').textContent = err.message || '无法读取备份'; } };
  }
  function help() {
    modal('每天少一点操作，每月多一点清楚', `<div class="help-copy"><p><strong>说一句或选一张图。</strong>Android 版连接你的 Netlify 服务后，可把主动输入的文字或选中的图片交给 DeepSeek 整理。结果先预览、可改可取消，不会自动入账。</p><p><strong>本地也能记。</strong>“昨天午饭32，打车28”可用本地规则离线识别；CSV / TXT 账单也在本机解析。</p><p><strong>账本留在设备。</strong>预算、历史流水、分类偏好不发送给 Netlify 或 DeepSeek。更换设备前在“我的”导出 JSON 备份。</p><p><strong>计划不是付款。</strong>固定预算不会自动记成消费；省钱试算不代表钱已经存下。</p><p><strong>仍需确认。</strong>图片可能看不清，模型也可能识别错误。尤其核对金额、日期、退款、充值与重复交易。</p></div>`);
  }
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]'); if (nav) { go(nav.dataset.view); return; }
    const tab = e.target.closest('[data-plan-tab]'); if (tab) { planTab = tab.dataset.planTab; expandedPlan = ''; render(); return; }
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; page = 0; render(); return; }
    const b = e.target.closest('[data-action]'); if (!b) return; const action = b.dataset.action, id = b.dataset.id;
    const actions = {
      close, help, onboard: onboarding, import: importDialog, goal: goalForm, profile: profileForm, restore: restoreDialog, 'quick-actions': quickActions, 'ai-settings': aiSettings,
      'ai-connection-clear': () => { globalThis.AndroidBridge?.clearAiConnection?.(); aiSettings(); toast('已断开智能记账服务'); },
      'image-pick': () => $('image-file')?.click(),
      'local-parse': () => localQuick($('quick-input')?.value || pendingText),
      'budget-add': () => budgetForm(), 'budget-edit': () => budgetForm(id),
      budgets: () => { planTab = 'budgets'; go('plans'); }, 'budget-home': () => { planTab = 'budgets'; go('plans'); },
      'plan-expand': () => { expandedPlan = expandedPlan === id ? '' : id; render(); },
      'transaction-add': () => transactionForm(), 'transaction-edit': () => transactionForm(id),
      'transaction-delete': () => { close(); mutate(s => { s.transactions = s.transactions.filter(t => t.id !== id); }, '已删除，可撤销；备份中的原记录仍保留', true); },
      'budget-delete': () => { close(); mutate(s => { s.budgets = s.budgets.filter(t => t.id !== id); delete s.plans[id]; }, '预算已移除，实际流水保留', true); },
      protect: () => mutate(s => { const item = s.budgets.find(b => b.id === id); item.protected = !item.protected; }, '保留偏好已更新', true),
      review: () => { filter = 'review'; go('ledger'); }, 'page-prev': () => { page--; render(); }, 'page-next': () => { page++; render(); },
      'preview-save': savePreview, 'preview-prev': () => { preview.page--; renderPreview(); }, 'preview-next': () => { preview.page++; renderPreview(); },
      'dismiss-migration': () => { migrated = false; render(); },
      demo: () => { mode = 'demo'; month = C.localDate().slice(0, 7); go('overview'); },
      'return-real': () => { if (real) { mode = 'real'; month = C.localDate().slice(0, 7); go('overview'); } },
      book: () => mode === 'demo' ? real ? (mode = 'real', go('overview')) : onboarding() : go('settings'),
      export: () => { download(JSON.stringify(state(), null, 2), `有数-${mode === 'demo' ? '演示-' : ''}备份-${C.localDate()}.json`, 'application/json'); toast('已生成备份下载'); },
      sample: () => { download(`\uFEFF日期,商户,金额,收支,交易单号\r\n${C.localDate()},午饭,32,支出,example-1\r\n${C.localDate()},购物退款,20,退款,example-2\r\n${C.localDate()},交通卡充值,100,转账,example-3\r\n`, '有数-导入示例.csv', 'text/csv;charset=utf-8'); },
      undo: () => { const fn = undo; undo = null; if (fn) fn(); }
    };
    actions[action]?.();
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'ai-connection-form') {
      e.preventDefault();
      if (!globalThis.AndroidBridge?.saveAiConnection?.($('ai-site-input').value, $('ai-token-input').value)) { toast('请使用 https://…netlify.app 站点和至少 32 位随机配对凭据。'); return; }
      $('ai-token-input').value = '';
      close(); toast('连接已保存，首次使用时验证');
      if (pendingText) smartQuick(pendingText);
      else render();
      return;
    }
    if (e.target.id !== 'quick-form') return; e.preventDefault();
    smartQuick($('quick-input').value);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'image-file') { const file = el.files?.[0]; if (file) smartImage(file); el.value = ''; return; }
    if (el.id === 'month') { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(el.value)) { month = el.value; page = 0; render(); } return; }
    if (el.dataset.preview) {
      const row = preview?.rows[Number(el.dataset.index)]; if (!row) return;
      row[el.dataset.preview] = el.dataset.preview === 'selected' ? el.checked : el.dataset.preview === 'amount' ? C.round(el.value) : el.value;
      $('preview-save').textContent = `确认加入 ${preview.rows.filter(t => t.selected).length} 笔`; return;
    }
    if (el.dataset.plan) updateExperiment(el);
  });
  document.addEventListener('input', e => {
    if (e.target.dataset.plan) { updateExperiment(e.target); return; }
    if (e.target.dataset.preview && ['title', 'date', 'amount'].includes(e.target.dataset.preview)) {
      const row = preview?.rows[Number(e.target.dataset.index)];
      if (row) row[e.target.dataset.preview] = e.target.dataset.preview === 'amount' ? C.round(e.target.value) : e.target.value;
      return;
    }
    if (e.target.id !== 'ledger-search') return;
    const position = e.target.selectionStart; query = e.target.value; page = 0; render(); const input = $('ledger-search'); input.focus(); if (position !== null) input.setSelectionRange(position, position);
  });
  $('close-dialog').onclick = close;
  $('dialog').addEventListener('cancel', () => { preview = null; imageTaskId++; aiRequestId++; if ($('ai-token-input')) $('ai-token-input').value = ''; });
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  hydrateIcons(); render();
})();
