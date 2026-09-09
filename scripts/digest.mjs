import {loadData,statusLabels} from './lib.mjs';
const data = await loadData();
const arg = process.argv.indexOf('--since');
const since = arg >= 0 ? process.argv[arg+1] : '0000-01-01';
if(!/^\d{4}-\d{2}-\d{2}$/.test(since||'')) throw new Error('--since 需要 YYYY-MM-DD');
const recordDate = c => c.source.verifiedAt || c.source.collectedAt || '';
const rows=data.cases.filter(c=>recordDate(c)>=since).sort((a,b)=>recordDate(b).localeCompare(recordDate(a)));
console.log(`# 采集简报\n\n核验或提交日期 ≥ ${since}；共 ${rows.length} 条。此命令只整理本地记录，不访问平台。\n`);
for(const c of rows) console.log(`- [${statusLabels[c.status]}] ${c.title}\n  ${c.source.url}\n  ${c.prompt.kind} · ${c.model.claimed} · 复现 ${c.reproduction.status}`);
