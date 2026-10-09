/* Client request contract and untrusted draft validation. Never stores secrets. */
(function () {
  'use strict';
  const C = globalThis.MoneyCore;
  function date(today) {
    if (!C.validDate(today)) throw new Error('当前日期无效，请检查设备时间。');
    return today;
  }
  function textRequest(text, today) {
    const value = String(text || '').trim();
    if (!value || value.length > 1000) throw new Error('请写下 1–1000 字的记账描述。');
    return { kind: 'text', text: value, today: date(today) };
  }
  function imageRequest(dataUrl, today) {
    if (typeof dataUrl !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 2800000) throw new Error('图片格式或大小不适合上传，请换一张清晰图片。');
    return { kind: 'image', image: dataUrl, today: date(today) };
  }
  function parse(body) {
    if (!body || !Array.isArray(body.transactions) || !Array.isArray(body.questions) || body.transactions.length > 10 || body.questions.length > 10) throw new Error('智能整理结果不符合记账格式。');
    const rows = body.transactions.map(t => {
      if (!t || !C.validDate(t.date) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 200 || typeof t.amount !== 'number' || !Number.isFinite(t.amount) || t.amount <= 0 || t.amount > 1e8 || !C.types.includes(t.type) || !C.categories.includes(t.category) || typeof t.review !== 'boolean' || typeof t.reason !== 'string' || t.reason.length > 200) throw new Error('智能整理结果含有无效记录，请重试或手动记账。');
      return { id: C.uid(), date: t.date, title: t.title.trim(), amount: C.round(t.amount), type: t.type, category: t.category, review: t.review, reason: t.reason, source: 'AI 整理', externalKey: '' };
    });
    const questions = body.questions.map(q => { if (typeof q !== 'string' || q.length > 200) throw new Error('智能整理问题格式有误。'); return q.trim(); }).filter(Boolean);
    return { rows, questions };
  }
  const api = { textRequest, imageRequest, parse };
  globalThis.YoushuAICore = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
