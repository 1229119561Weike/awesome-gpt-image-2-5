import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const categories = ['ui','typography','product','photography','illustration','editing','infographic','storytelling','other'];
export const labels = {ui:'界面设计', typography:'海报与文字', product:'产品与电商', photography:'摄影与写实', illustration:'插画与艺术', editing:'精确编辑', infographic:'信息可视化', storytelling:'角色与叙事', other:'其他'};
export const statusLabels = {curated:'社区精选',candidate:'待核验线索',reference:'参考资料'};
export const readJSON = async name => JSON.parse(await readFile(path.join(root, 'data', `${name}.json`), 'utf8'));
export const loadData = async () => {
  const [cases, templates, watchlist, models] = await Promise.all(['cases','templates','watchlist','models'].map(readJSON));
  return {cases, templates, watchlist, models};
};
export function canonicalURL(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('来源必须为 HTTPS URL 字符串');
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('来源必须为不含凭据的 HTTPS URL');
  let host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (['twitter.com','mobile.twitter.com','mobile.x.com'].includes(host)) host = 'x.com';
  if (['old.reddit.com','new.reddit.com'].includes(host)) host = 'reddit.com';
  const post = !u.port && host === 'x.com' && u.pathname.match(/^\/(?:[^/]+\/status|i\/web\/status)\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/);
  if (post) return `https://x.com/i/web/status/${post[1]}`;
  const shortReddit = !u.port && host === 'redd.it' && u.pathname.match(/^\/([a-z0-9]+)\/?$/i);
  if (shortReddit) return `https://reddit.com/comments/${shortReddit[1].toLowerCase()}`;
  const reddit = !u.port && host === 'reddit.com' && u.pathname.match(/^\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/([^/]+))?(?:\/([a-z0-9]+))?\/?$/i);
  if (reddit) {
    const comment = reddit[3];
    return `https://reddit.com/comments/${reddit[1].toLowerCase()}${comment ? `/comment/${comment.toLowerCase()}` : ''}`;
  }
  // 未识别为帖子时只删除已知跟踪字段，保留资源参数、端口、路径及示例锚点。
  u.hostname = host;
  for (const key of [...u.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|srsltid)$/i.test(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  return u.href;
}
export function platformFor(value) {
  const host = new URL(canonicalURL(value)).hostname;
  return host === 'x.com' ? 'x' : host === 'reddit.com' ? 'reddit' : host === 'github.com' ? 'github' : ['developers.openai.com','openai.com','platform.openai.com','chatgpt.com'].includes(host) ? 'official' : 'other';
}
const isText = v => typeof v === 'string' && v.trim().length > 0;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
export function validateData(data) {
  if (!isObject(data)) return ['data 必须为对象'];
  const errors = [];
  const check = (ok, msg) => { if (!ok) errors.push(msg); };
  const ids = new Set(), urls = new Set();
  check(Array.isArray(data.cases), 'cases 必须为数组');
  for (const [i,c] of (Array.isArray(data.cases) ? data.cases : []).entries()) {
    const at = c?.id || `cases[${i}]`;
    if (!isObject(c)) { errors.push(`${at}: 必须为对象`); continue; }
    check(typeof c.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id), `${at}: id 格式无效`);
    check(!ids.has(c.id), `${at}: 重复 id`); ids.add(c.id);
    for (const key of ['title','summary']) check(isText(c[key]), `${at}: 缺少 ${key}`);
    check(categories.includes(c.category), `${at}: category 无效`);
    check(['curated','candidate','reference'].includes(c.status), `${at}: status 无效`);
    check(Array.isArray(c.tags) && c.tags.every(isText), `${at}: tags 无效`);
    let sourceValid = false;
    try {
      const url = canonicalURL(c.source?.url);
      check(!urls.has(url), `${at}: 重复原帖 ${url}`); urls.add(url);
      check(c.source.platform === platformFor(c.source.url), `${at}: platform 与来源域名不符`);
      sourceValid = true;
    } catch { errors.push(`${at}: 来源 URL 无效`); }
    check(['full','search-index','secondary'].includes(c.source?.access), `${at}: source.access 无效`);
    check(isText(c.source?.author) && isText(c.source?.evidence), `${at}: 缺少作者或来源证据`);
    check(c.source?.verifiedAt === null || date(c.source?.verifiedAt), `${at}: 核验日期应为日期或 null`);
    check(c.source?.collectedAt === undefined || date(c.source.collectedAt), `${at}: 收集日期无效`);
    if (c.source?.verifiedAt === null) check(date(c.source?.collectedAt), `${at}: 未核验条目必须有收集日期`);
    if (c.source?.access === 'full') check(date(c.source?.verifiedAt), `${at}: 已读取原帖必须有实际核验日期`);
    check(c.source?.publishedAt === null || date(c.source?.publishedAt), `${at}: 发布日期应为日期或 null`);
    check(['flare','sunburst','unspecified','gpt-image-2','unknown'].includes(c.model?.variant), `${at}: model.variant 无效`);
    check(['confirmed','claimed','unknown'].includes(c.model?.status), `${at}: model.status 无效`);
    check(isText(c.model?.claimed) && isText(c.model?.evidence), `${at}: 缺少模型声明或证据`);
    check(['original','excerpt','unavailable','adaptation'].includes(c.prompt?.kind), `${at}: prompt.kind 无效`);
    check(typeof c.prompt?.text === 'string', `${at}: prompt.text 必须为字符串`);
    check(isText(c.prompt?.notes) && isText(c.prompt?.language), `${at}: 缺少 Prompt 说明或语言`);
    if (c.prompt?.kind === 'unavailable') check(c.prompt.text === '', `${at}: 未公开 Prompt 不得填写原文`);
    else check(isText(c.prompt?.text), `${at}: 空 Prompt`);
    check(Array.isArray(c.media), `${at}: media 必须为数组`);
    for (const m of Array.isArray(c.media) ? c.media : []) {
      if (!isObject(m)) { errors.push(`${at}: 图片记录必须为对象`); continue; }
      try { canonicalURL(m.url); } catch { errors.push(`${at}: 图片 URL 无效`); }
      check(isText(m.alt) && ['licensed','permission-granted'].includes(m.permission), `${at}: 图片缺少描述或授权状态`);
      check(isText(m.permissionEvidence), `${at}: 图片缺少授权出处 permissionEvidence`);
    }
    for (const key of ['likes','comments','views']) {
      const allowNegative = key === 'likes' && c.source?.platform === 'reddit';
      check(c.metrics?.[key] === null || (Number.isInteger(c.metrics?.[key]) && (allowNegative || c.metrics[key] >= 0)), `${at}: metrics.${key} 数值无效（仅 Reddit 净票数允许负数）`);
    }
    const hasMetrics = ['likes','comments','views'].some(k => c.metrics?.[k] != null);
    check(c.metrics?.observedAt === null || (typeof c.metrics?.observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(c.metrics.observedAt) && !Number.isNaN(Date.parse(c.metrics.observedAt))), `${at}: 热度时间无效`);
    check(!hasMetrics || isText(c.metrics?.observedAt), `${at}: 热度必须附时间快照`);
    check(['not-tested','passed','failed'].includes(c.reproduction?.status) && isText(c.reproduction?.notes), `${at}: 复现记录无效`);
    if (c.status === 'curated') {
      check(sourceValid && c.source?.access === 'full' && date(c.source?.verifiedAt), `${at}: 精选必须核验原帖并记录日期`);
      check(['flare','sunburst','unspecified'].includes(c.model?.variant) && ['confirmed','claimed'].includes(c.model?.status), `${at}: 精选必须有 2.5 模型证据`);
      check(c.prompt?.kind === 'original' && isText(c.prompt?.text), `${at}: 精选必须有完整作者 Prompt 和授权说明`);
      check(isText(c.outputEvidence), `${at}: 精选必须提供成图证据 outputEvidence`);
      check(isText(c.permissionEvidence), `${at}: 精选必须提供 Prompt 授权说明 permissionEvidence`);
    }
  }
  check(Array.isArray(data.templates), 'templates 必须为数组');
  for (const t of Array.isArray(data.templates) ? data.templates : []) {
    if (!isObject(t)) { errors.push('模板必须为对象'); continue; }
    check(typeof t.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id) && !ids.has(t.id), '模板 ID 重复或无效'); ids.add(t.id);
    check([t.title,t.summary,t.prompt,t.notes].every(isText) && categories.includes(t.category) && ['flare','sunburst'].includes(t.variant), `${t.id}: 模板信息无效`);
    check(Array.isArray(t.tags) && t.tags.every(isText), `${t.id}: 模板 tags 无效`);
    const variables = t.variables;
    check(Array.isArray(variables) && variables.every(v => v && isText(v.name) && isText(v.example)), `${t.id}: 模板变量无效`);
    const names = (Array.isArray(variables) ? variables : []).map(v => v?.name);
    check(new Set(names).size === names.length, `${t.id}: 重复变量名`);
    const used = [...(typeof t.prompt === 'string' ? t.prompt : '').matchAll(/\{\{([^{}]+)\}\}/g)].map(m => m[1]);
    check(used.every(n => names.includes(n)) && names.every(n => used.includes(n)), `${t.id}: 变量定义与 Prompt 不一致`);
  }
  check(date(data.models?.verifiedAt) && Array.isArray(data.models?.models) && data.models.models.length >= 2, '缺少模型核验记录');
  const modelIds = new Set();
  for (const m of Array.isArray(data.models?.models) ? data.models.models : []) {
    if (!isObject(m)) { errors.push('模型记录必须为对象'); continue; }
    check(['gpt-image-2.5-flare','gpt-image-2.5-sunburst'].includes(m.id) && [m.name,m.focus].every(isText), '模型资料无效');
    check(!modelIds.has(m.id), `模型 ID 重复：${m.id}`); modelIds.add(m.id);
    try { check(platformFor(m.url) === 'official', '模型来源必须是官方'); } catch { errors.push('模型 URL 无效'); }
  }
  check(Array.isArray(data.watchlist?.queries) && Array.isArray(data.watchlist?.communities) && Array.isArray(data.watchlist?.routine?.steps), 'watchlist 结构无效');
  for (const q of Array.isArray(data.watchlist?.queries) ? data.watchlist.queries : []) {
    if (!isObject(q)) { errors.push('检索条目必须为对象'); continue; }
    check([q.id,q.platform,q.label,q.query,q.priority].every(isText), '检索条目字段无效');
    try { canonicalURL(q.url); } catch { errors.push('检索入口 URL 无效'); }
  }
  return errors;
}
export const markdown = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\[\]\\|`*_]/g, '\\$&').replace(/\r\n|[\r\n]/g, ' ');
export const link = value => { const u = new URL(value); return u.href.replaceAll('(', '%28').replaceAll(')', '%29'); };
export function fenced(value) {
  const runs = String(value).match(/`+/g) || [];
  const marker = '`'.repeat(Math.max(3, ...runs.map(r => r.length + 1)));
  return `${marker}text\n${value}\n${marker}`;
}
