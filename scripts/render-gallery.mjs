import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,markdown as md,link,fenced} from './lib.mjs';

export async function renderGallery() {
  const cases=JSON.parse(await readFile(path.join(root,'data/gallery.json'),'utf8'));
  for (const c of cases) {
    if (!c.id || !c.title || !c.images?.length || !c.source.startsWith('https://x.com/') || !c.promptSource.startsWith('https://x.com/') || !(c.excerpt || c.brief)) throw new Error(`案例缺少图片、提示词或原帖：${c.id}`);
    for (const image of c.images) if (new URL(image.url).hostname !== 'pbs.twimg.com' || !image.alt) throw new Error(`图片来源无效：${c.id}`);
  }
  let out='# Awesome GPT Image 2.5\n\n来自 X 的图像案例：**效果图 · 提示词 · 原帖**。\n\n';
  out+=cases.map(c=>`[${md(c.title)}](#${c.id})`).join(' · ')+'\n\n';
  for (const c of cases) {
    out+=`<a id="${c.id}"></a>\n\n## ${md(c.title)}\n\n[${md(c.author)} · X 原帖](${link(c.source)}) · [Prompt 原文${c.promptKind==='adaptation'?'与作者回复':''}](${link(c.promptSource)})\n\n`;
    if(c.images.length>1) {
      for(let i=0;i<c.images.length;i+=2) {
        out+='<p>\n'+c.images.slice(i,i+2).map(img=>`<a href="${link(c.source)}"><img src="${link(img.url)}" alt="${md(img.alt)}" width="48%" /></a>`).join('\n')+'\n</p>\n\n';
      }
    } else out+=`[![${md(c.images[0].alt)}](${link(c.images[0].url)})](${link(c.source)})\n\n`;
    if(c.excerpt) out+=`**${c.promptKind==='original'?'作者 Prompt':'作者 Prompt 节选'}**\n\n${fenced(c.excerpt)}\n\n`;
    if(c.brief) out+=`<details>\n<summary>中文尝试版 Prompt（项目整理，未复现）</summary>\n\n${fenced(c.brief)}\n\n</details>\n\n`;
    out+=`${md(c.note)}\n\n`;
  }
  out+='---\n\n[提交案例](https://github.com/1229119561Weike/awesome-gpt-image-2-5/issues/new?template=submit-case.yml) · [来源纠错](https://github.com/1229119561Weike/awesome-gpt-image-2-5/issues/new?template=correction.yml)\n\n效果图引用原作者在 X 发布的图片，点击图片可回到原帖。中文尝试版不代表原图的生成指令，完整原文请见各案例的 Prompt 链接。\n';
  await writeFile(path.join(root,'README.md'),out);
  console.log(`GitHub 案例页：${cases.length} 个案例，${cases.reduce((n,c)=>n+c.images.length,0)} 张效果图。`);
}
if(process.argv[1]===new URL(import.meta.url).pathname) await renderGallery();
