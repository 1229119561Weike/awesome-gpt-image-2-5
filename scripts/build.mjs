import {mkdir, writeFile, cp, readdir, unlink} from 'node:fs/promises';
import path from 'node:path';
import {root, loadData, validateData, labels, statusLabels, markdown as md, link, fenced} from './lib.mjs';

const data = await loadData();
const errors = validateData(data);
if (errors.length) throw new Error(errors.join('\n'));
await mkdir(path.join(root,'docs/cases'), {recursive:true});
// 只移除带生成标记的失效案例页面。
const activeFiles = new Set(data.cases.map(c => `${c.id}.md`));
for (const file of await readdir(path.join(root,'docs/cases'))) {
  if (!activeFiles.has(file) && file.endsWith('.md')) {
    const {readFile} = await import('node:fs/promises');
    const contents = await readFile(path.join(root,'docs/cases',file),'utf8');
    if (contents.startsWith('<!-- generated: cases -->')) await unlink(path.join(root,'docs/cases',file));
  }
}
const intro = '# GPT Image 2.5 案例索引\n\n由 `data/cases.json` 生成。候选、参考资料和社区精选分别计数；未披露 Prompt 不会被补写。\n\n';
let gallery = intro;
for (const status of ['curated','candidate','reference']) {
  const rows = data.cases.filter(c => c.status === status);
  gallery += `## ${statusLabels[status]} · ${rows.length}\n\n`;
  gallery += rows.length ? '| 案例 | 分类 | 平台 | 模型证据 | Prompt |\n| --- | --- | --- | --- | --- |\n' + rows.map(c => `| [${md(c.title)}](cases/${c.id}.md) | ${labels[c.category]} | [${md(c.source.platform)}](${link(c.source.url)}) | ${md(c.model.status)} / ${md(c.model.variant)} | ${md(c.prompt.kind)} |`).join('\n') + '\n\n' : '尚无符合收录标准的案例。\n\n';
}
for (const c of data.cases) {
  const body = `<!-- generated: cases -->\n# ${md(c.title)}\n\n${md(c.summary)}\n\n- 状态：${statusLabels[c.status]}\n- 分类：${labels[c.category]}\n- 原帖：[${md(c.source.author)} · ${md(c.source.platform)}](${link(c.source.url)})\n- 发布日期：${c.source.publishedAt || '未知'}；核验日期：${c.source.verifiedAt || '尚未核验'}；提交日期：${c.source.collectedAt || '未单独记录'}\n- 访问等级：${c.source.access}\n- 来源证据：${md(c.source.evidence)}\n- 模型声明：${md(c.model.claimed)} / ${c.model.variant} / ${c.model.status}\n- 模型证据：${md(c.model.evidence)}\n- 复现：${c.reproduction.status} — ${md(c.reproduction.notes)}\n\n## Prompt\n\n类型：${c.prompt.kind}。${md(c.prompt.notes)}\n\n${c.prompt.text ? fenced(c.prompt.text) : '原作者完整 Prompt 尚未取得，请访问原帖。'}\n\n## 成图与授权\n\n成图证据：${md(c.outputEvidence || '待补；查看原帖与来源证据说明。')}\n\n原文许可依据：${md(c.permissionEvidence || '尚未取得明确的完整转载许可；现有短引用不代表获得图片或长文授权。')}\n\n${c.media.map(m => `![${md(m.alt)}](${link(m.url)})\n\n图片状态：${md(m.permission)}；依据：${md(m.permissionEvidence || c.permissionEvidence || '待补充授权出处')}\n`).join('\n')}\n## 传播快照\n\n${c.metrics.observedAt ? `观测时间：${c.metrics.observedAt}；${c.source.platform === 'reddit' ? 'Reddit 净票数' : '点赞'}：${c.metrics.likes ?? '未取得'}；评论：${c.metrics.comments ?? '未取得'}；浏览：${c.metrics.views ?? '未取得'}。` : '未取得可靠的热度快照，不据此宣称热门。'}\n\n[返回索引](../gallery.md)\n`;
  await writeFile(path.join(root,'docs/cases',`${c.id}.md`), body);
}
await writeFile(path.join(root,'docs/gallery.md'),gallery.trimEnd()+'\n');
await writeFile(path.join(root,'docs/templates.md'),'# 原创实验模板\n\n项目编写，尚未调用模型实测。与社区原文独立维护，使用前替换 `{{变量}}`。\n\n'+data.templates.map(t=>`## ${md(t.title)}\n\n${md(t.summary)}\n\n建议尝试：gpt-image-2.5-${t.variant}。${md(t.notes)}\n\n${fenced(t.prompt)}\n\n变量示例：${t.variables.map(v=>`${md(v.name)} → ${md(v.example)}`).join('；')}\n`).join('\n'));
const json = JSON.stringify(data,null,2)+'\n';
await writeFile(path.join(root,'site/data.json'),json);
await mkdir(path.join(root,'dist'),{recursive:true});
for (const file of ['index.html','app.js','style.css']) await cp(path.join(root,'site',file),path.join(root,'dist',file));
await writeFile(path.join(root,'dist/data.json'),json);
console.log(`构建完成：${data.cases.length} 条来源记录；${data.templates.length} 个模板；静态网站位于 dist/。`);
