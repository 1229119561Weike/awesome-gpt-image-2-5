import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile, spawn} from 'node:child_process';
import {once} from 'node:events';
import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {canonicalURL, fenced, link, loadData, markdown, platformFor, root, validateData} from '../scripts/lib.mjs';

const catalog = await loadData();
const fixture = () => structuredClone(catalog);
const run = promisify(execFile);

test('published catalog satisfies its collection contract', () => {
  assert.deepEqual(validateData(catalog), []);
  assert.ok(catalog.cases.every(c => c.source.platform === 'x'), '当前公开案例只包含 X');
  assert.deepEqual(catalog.watchlist.scope.platforms, ['x']);
  assert.ok(!JSON.stringify(catalog.watchlist).toLowerCase().includes('reddit'));
});

test('X aliases identify one post without collapsing malformed IDs', () => {
  const canonical = canonicalURL('https://x.com/alice/status/12345');
  for (const url of [
    'https://twitter.com/alice/status/12345?s=20',
    'https://mobile.x.com/bob/status/12345/photo/1',
    'https://x.com/i/web/status/12345',
  ]) assert.equal(canonicalURL(url), canonical);
  assert.notEqual(canonicalURL('https://x.com/alice/status/12345abc'), canonical);
});

test('Reddit short links and aliases deduplicate while comments remain distinct', () => {
  const post = 'https://reddit.com/comments/abc123';
  assert.equal(canonicalURL('https://redd.it/ABC123'), post);
  assert.equal(platformFor('https://redd.it/abc123'), 'reddit');
  assert.equal(canonicalURL('https://old.reddit.com/r/ChatGPT/comments/abc123/title/?utm_source=share'), post);
  const comment = canonicalURL('https://reddit.com/r/ChatGPT/comments/abc123/title/def456/?context=3');
  assert.equal(comment, canonicalURL('https://reddit.com/comments/abc123/comment/def456'));
  assert.notEqual(comment, post);
  assert.notEqual(comment, canonicalURL('https://reddit.com/r/ChatGPT/comments/abc123/title/ghi789/'));
});

test('ordinary sources preserve resource parameters, fragments and ports', () => {
  const first = canonicalURL('https://example.com/view?id=1&lang=zh');
  assert.equal(first, canonicalURL('https://example.com/view?utm_source=x&lang=zh&id=1&fbclid=tracking'));
  assert.notEqual(first, canonicalURL('https://example.com/view?id=2&lang=zh'));
  assert.notEqual(first, canonicalURL('https://example.com:8443/view?id=1&lang=zh'));
  assert.notEqual(canonicalURL('https://example.com/guide#a'), canonicalURL('https://example.com/guide#b'));
  for (const value of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', null]) {
    assert.throws(() => canonicalURL(value));
  }
});

test('duplicate detection uses normalized sources without conflating distinct resources', () => {
  const data = fixture();
  const first = structuredClone(data.cases[0]);
  Object.assign(first.source, {url:'https://example.com/view?id=1', platform:'other'});
  const second = structuredClone(first);
  second.id = 'distinct-resource';
  second.source.url = 'https://example.com/view?id=2';
  data.cases = [first, second];
  assert.deepEqual(validateData(data), []);
  second.source.url = 'https://example.com/view?utm_source=share&id=1';
  assert.ok(validateData(data).some(error => error.includes('重复原帖')));
});

test('malformed collection objects report errors without throwing TypeError', () => {
  for (const value of [null, [], 'invalid']) assert.ok(validateData(value).length);
  for (const mutate of [
    data => { data.cases = [null, []]; },
    data => { data.cases[0].media = [null, []]; },
    data => { data.templates = [null, []]; },
    data => { data.models.models = {}; },
    data => { data.models.models = [null, []]; },
    data => { data.watchlist.queries = {}; },
    data => { data.watchlist.queries = [null, []]; },
  ]) {
    const data = fixture();
    mutate(data);
    assert.ok(validateData(data).length);
  }
});

test('unvisited candidates retain a collection date without claiming verification', () => {
  const data = fixture();
  const item = data.cases[0];
  item.status = 'candidate';
  item.source.access = 'secondary';
  item.source.collectedAt = '2026-09-09';
  item.source.verifiedAt = null;
  assert.deepEqual(validateData(data), []);
  item.source.collectedAt = '2026-02-30';
  assert.ok(validateData(data).some(error => error.includes('收集日期')));
  delete item.source.collectedAt;
  item.source.access = 'full';
  assert.ok(validateData(data).some(error => error.includes('实际核验日期')));
  item.status = 'curated';
  item.model = {claimed:'GPT Image 2.5', variant:'unspecified', status:'claimed', evidence:'Original post names the model.'};
  item.prompt = {kind:'original', text:'Draw a blue cube.', language:'en', notes:'Author supplied the complete prompt.'};
  item.outputEvidence = 'Original post includes the output.';
  item.permissionEvidence = 'Author permitted republication.';
  assert.ok(validateData(data).some(error => error.includes('精选必须核验原帖')));
  item.source.verifiedAt = '2026-09-09';
  assert.deepEqual(validateData(data), []);
  delete item.outputEvidence;
  assert.ok(validateData(data).some(error => error.includes('成图证据')));
  delete item.permissionEvidence;
  assert.ok(validateData(data).some(error => error.includes('授权说明')));
});

test('metrics require timestamps and distinguish Reddit net scores from likes', () => {
  const data = fixture();
  const item = data.cases[0];
  item.source.platform = 'reddit';
  item.source.url = 'https://reddit.com/comments/abc123';
  item.metrics = {likes:-3,comments:null,views:null,observedAt:'2026-09-09T02:47:00Z'};
  assert.deepEqual(validateData(data),[]);
  item.metrics.observedAt = null;
  assert.ok(validateData(data).some(e => e.includes('时间快照')));
  item.metrics.observedAt = '2026-09-09T02:47:00Z';
  item.source.platform = 'x';
  item.source.url = 'https://x.com/example/status/987654321';
  assert.ok(validateData(data).some(e => e.includes('likes 数值无效')));
});

test('licensed media needs per-image evidence and template variables must match', () => {
  const data = fixture();
  data.cases[0].media = [{url:'https://example.com/image.png',alt:'Example',permission:'licensed'}];
  assert.ok(validateData(data).some(e => e.includes('图片缺少授权出处')));
  data.cases[0].media[0].permissionEvidence = 'Author license statement at https://example.com/license';
  assert.deepEqual(validateData(data),[]);
  data.templates[0].prompt += ' {{missing-variable}}';
  assert.ok(validateData(data).some(e => e.includes('变量定义')));
});

test('model IDs cannot satisfy the two-model requirement through duplication', () => {
  const data = fixture();
  data.models.models = [data.models.models[0], structuredClone(data.models.models[0])];
  assert.ok(validateData(data).some(error => error.includes('模型 ID 重复')));
});

test('Markdown rendering keeps HTML, newlines and nested fences inside text', () => {
  const escaped = markdown('<img src=x>\r# Heading\n[a] | *b*');
  assert.ok(!escaped.includes('<img'));
  assert.ok(!/[\r\n]/.test(escaped));
  assert.ok(escaped.includes('\\|'));
  assert.ok(escaped.includes('\\[a\\]'));
  assert.equal(link('https://example.com/(source)'), 'https://example.com/%28source%29');
  const prompt = 'A prompt\n```\n<script>example</script>\n````';
  const rendered = fenced(prompt);
  assert.ok(rendered.startsWith('`````text\n'));
  assert.ok(rendered.endsWith('\n`````'));
  assert.ok(rendered.includes(prompt));
});

test('add CLI creates an unverified candidate and rejects an equivalent source', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'image-prompts-add-'));
  t.after(() => rm(temporary, {recursive:true, force:true}));
  await mkdir(path.join(temporary, 'scripts'));
  await cp(path.join(root, 'data'), path.join(temporary, 'data'), {recursive:true});
  for (const file of ['add.mjs', 'lib.mjs']) await cp(path.join(root, 'scripts', file), path.join(temporary, 'scripts', file));
  const script = path.join(temporary, 'scripts/add.mjs');
  await run(process.execPath, [script, 'https://x.com/test/status/123456789', '--title', 'A submitted lead', '--id', 'submitted-lead']);
  const filename = path.join(temporary, 'data/cases.json');
  const before = await readFile(filename, 'utf8');
  const item = JSON.parse(before).at(-1);
  assert.equal(item.source.platform, 'x');
  assert.equal(item.source.verifiedAt, null);
  assert.match(item.source.collectedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(item.status, 'candidate');
  assert.equal(item.prompt.text, '');
  await assert.rejects(run(process.execPath, [script, 'https://twitter.com/test/status/123456789?s=20', '--title', 'Duplicate', '--id', 'duplicate-lead']), error => error.stderr.includes('原帖已存在'));
  await assert.rejects(run(process.execPath, [script, 'https://reddit.com/comments/test123', '--title', 'Out of scope', '--id', 'reddit-lead']), error => error.stderr.includes('当前只收集 X'));
  assert.equal(await readFile(filename, 'utf8'), before);
});

test('preview server rejects malformed request targets and remains available', {timeout:10000}, async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'image-prompts-server-'));
  t.after(() => rm(temporary, {recursive:true, force:true}));
  await mkdir(path.join(temporary, 'scripts'));
  for (const file of ['serve.mjs','lib.mjs']) await cp(path.join(root,'scripts',file),path.join(temporary,'scripts',file));
  await cp(path.join(root,'site'),path.join(temporary,'dist'),{recursive:true});
  await writeFile(path.join(temporary,'dist/data.json'),JSON.stringify(catalog));
  const child = spawn(process.execPath, [path.join(temporary, 'scripts/serve.mjs')], {env:{...process.env, PORT:'0'}, stdio:['ignore','pipe','pipe']});
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill();
      await closed;
    }
  });
  const port = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    child.stdout.setEncoding('utf8').on('data', chunk => {
      output += chunk;
      const match = output.match(/127\.0\.0\.1:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
    child.stderr.setEncoding('utf8').on('data', chunk => { errors += chunk; });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Preview exited (${code}): ${errors}`)));
  });
  const request = target => new Promise((resolve, reject) => {
    const req = http.get({hostname:'127.0.0.1', port, path:target}, res => {
      res.resume();
      res.once('end', () => resolve(res.statusCode));
    });
    req.once('error', reject);
  });
  assert.equal(await request('//'), 400);
  assert.equal(await request('/not-a-public-file'), 404);
  for (const asset of ['/','/app.js','/style.css','/data.json']) assert.equal(await request(asset), 200, `${asset} must be served`);
  assert.equal(await request('/../data/cases.json'),404);
  assert.equal(child.exitCode, null);
});
