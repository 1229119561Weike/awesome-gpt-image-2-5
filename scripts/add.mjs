import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,loadData,canonicalURL,platformFor,validateData} from './lib.mjs';
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('用法：npm run add -- <原帖HTTPS链接> --title "案例标题" --id "唯一英文短名" [--category ui]');
  process.exit(0);
}
const [url,...flags] = args;
const options = {};
for(let i=0;i<flags.length;i+=2) {
  if(!['--title','--id','--category'].includes(flags[i]) || !flags[i+1] || flags[i+1].startsWith('--')) throw new Error('参数无效，运行 npm run add -- --help');
  options[flags[i].slice(2)] = flags[i+1];
}
if (!options.title || !options.id) throw new Error('必须指定 --title 和 --id');
const normalized = canonicalURL(url);
const data = await loadData();
const supportedPlatforms = data.watchlist.scope?.platforms;
if (supportedPlatforms && !supportedPlatforms.includes(platformFor(url))) throw new Error('当前只收集 X 原帖，请提交 x.com 或 twitter.com 帖子链接');
if (data.cases.some(c=>canonicalURL(c.source.url)===normalized)) throw new Error('原帖已存在（已忽略平台域名别名、跟踪参数和帖子标题）');
const today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
data.cases.push({id:options.id,title:options.title,summary:'新线索：等待打开原帖、确认模型、Prompt 和成图。',category:options.category||'other',tags:[],status:'candidate',source:{platform:platformFor(url),url,author:'未知',publishedAt:null,access:'secondary',evidence:'用户提交链接；尚未访问原帖。',collectedAt:today,verifiedAt:null},model:{claimed:'未知',variant:'unknown',evidence:'尚未获得模型证据。',status:'unknown'},prompt:{kind:'unavailable',text:'',language:'unknown',notes:'尚未取得原始 Prompt。'},media:[],metrics:{likes:null,comments:null,views:null,observedAt:null},reproduction:{status:'not-tested',notes:'尚未实测。'}});
const errors = validateData(data);
if(errors.length) throw new Error(errors.join('\n'));
await writeFile(path.join(root,'data/cases.json'),JSON.stringify(data.cases,null,2)+'\n');
console.log(`已添加候选 ${options.id}；运行 npm run build 更新图库。`);
