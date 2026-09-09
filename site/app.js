(() => {
  'use strict';

  const categories = { ui: '界面与产品设计', typography: '文字与版式', product: '商品与品牌', photography: '摄影与人像', illustration: '插画与艺术', editing: '图像编辑', infographic: '信息图与图解', storytelling: '叙事与分镜', other: '其他创作' };
  const coverTitles = { ui: 'Interface\n& idea.', typography: 'Type\nmatters.', product: 'Objects\nof desire.', photography: 'Frame\nthe light.', illustration: 'Imagine\notherwise.', editing: 'Another\npossibility.', infographic: 'Make it\nmake sense.', storytelling: 'A story\nunfolds.', other: 'Creative\nfield notes.' };
  const platforms = { x: 'X / TWITTER', reddit: 'REDDIT', official: 'OFFICIAL', github: 'GITHUB', other: 'OTHER' };
  const statuses = { curated: '社区精选', candidate: '待核验线索', reference: '文档与版本参考' };
  const accessLabels = { full: '已读取原始来源', 'search-index': '仅搜索索引可见', secondary: '仅二手来源可见' };
  const promptLabels = { original: '作者原始提示词', excerpt: '原文短摘录 · 非完整 Prompt', unavailable: '完整提示词暂不可用', adaptation: '编辑改写 · 非作者原文' };
  const modelStatusLabels = { confirmed: '已核实', claimed: '作者自报', unknown: '待核实' };
  const reproductionLabels = { 'not-tested': '未独立复现', passed: '复现通过', failed: '复现未通过' };
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const list = value => Array.isArray(value) ? value : [];
  const text = (value, fallback = '未记录') => typeof value === 'string' && value.trim() ? value : fallback;
  const normalized = value => String(value ?? '').toLocaleLowerCase();
  const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } };
  const externalLink = (url, label, className = '') => { const safe = safeURL(url); return safe ? `<a class="${escape(className)}" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : `<span class="${escape(className)}">来源链接暂不可用</span>`; };
  const dateLabel = value => { if (!value) return '未记录'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '未记录' : date.toISOString().slice(0, 10); };
  const numberLabel = (value, signed = false) => Number.isFinite(value) && (signed || value >= 0) ? new Intl.NumberFormat('zh-CN').format(value) : '未观测';

  let data = null;
  let activeTab = 'cases';
  let currentDetail = null;
  let lastTrigger = null;
  let toastTimer;
  let loading = false;

  function announce(message) { $('toast').textContent = message; $('toast').classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('is-visible'), 2600); }

  async function copyText(value, button, label = '提示词') {
    if (!value?.trim()) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const temporary = document.createElement('textarea');
        temporary.value = value; temporary.className = 'clipboard-buffer';
        ($('detail-dialog').open ? $('detail-dialog') : document.body).appendChild(temporary);
        temporary.select(); const success = document.execCommand('copy'); temporary.remove();
        if (!success) throw new Error('Copy unavailable');
      }
      announce(`${label}已复制`);
      if (button) { const original = button.textContent; button.textContent = '已复制 ✓'; setTimeout(() => { if (button.isConnected) button.textContent = original; }, 1600); }
    } catch { announce(`复制不可用，请选中${label}后手动复制`); }
  }

  function countStatus(status) { return data.cases.filter(item => item.status === status).length; }

  async function load() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch('data.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || !Array.isArray(result.cases) || !Array.isArray(result.templates)) throw new Error('Invalid collection');
      data = { cases: result.cases.filter(item => item && typeof item.id === 'string'), templates: result.templates.filter(item => item && typeof item.id === 'string'), watchlist: result.watchlist || {}, models: result.models || {} };
      $('curated-count').textContent = countStatus('curated');
      $('candidate-count').textContent = countStatus('candidate');
      $('reference-count').textContent = countStatus('reference');
      $('template-count').textContent = data.templates.length;
      $('cases-tab-count').textContent = data.cases.length;
      $('templates-tab-count').textContent = data.templates.length;
      if (data.models.verifiedAt) $('verified-date').textContent = `模型资料核验于 ${dateLabel(data.models.verifiedAt)} · 热度以观测快照为准`;
      render();
      syncDetailFromURL();
    } catch (error) {
      $('collection-panel').innerHTML = '<div class="state-box" role="alert"><span class="state-mark" aria-hidden="true">↻</span><h3>档案暂时没能打开</h3><p>请使用项目的本地服务器访问此页，并确认已生成 site/data.json。</p><button class="button button-dark" id="retry-load" type="button">重新加载</button></div>';
      $('result-count').textContent = '数据加载失败';
      $('retry-load').addEventListener('click', load);
      console.error('Unable to load collection:', error.message);
    } finally { loading = false; }
  }

  function populateCategories() {
    const previous = $('category-filter').value;
    const collection = activeTab === 'templates' ? data.templates : data.cases;
    const present = new Set(collection.map(item => item.category));
    $('category-filter').innerHTML = '<option value="all">全部方向</option>' + Object.entries(categories).filter(([key]) => present.has(key)).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
    $('category-filter').value = [...$('category-filter').options].some(option => option.value === previous) ? previous : 'all';
  }

  function setTab(tab, focus = false) {
    if (!['cases', 'templates', 'radar'].includes(tab)) return;
    activeTab = tab;
    document.querySelectorAll('[data-tab]').forEach(button => { const selected = button.dataset.tab === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; if (selected && focus) button.focus(); });
    $('collection-panel').setAttribute('aria-labelledby', `tab-${tab}`);
    $('search').placeholder = tab === 'radar' ? '搜索平台、社区、搜索线索…' : tab === 'templates' ? '搜索原创模板、变量、创作方向…' : '搜索主题、提示词、作者…';
    $('search').setAttribute('aria-label', tab === 'radar' ? '搜索发现雷达' : '搜索档案');
    render();
  }

  function render() {
    if (!data) return;
    $('platform-filter-wrap').hidden = activeTab !== 'cases';
    $('status-filter-wrap').hidden = activeTab !== 'cases';
    $('category-filter').parentElement.hidden = activeTab === 'radar';
    populateCategories();
    const hasFilters = $('search').value || (activeTab !== 'radar' && $('category-filter').value !== 'all') || (activeTab === 'cases' && ($('platform-filter').value !== 'all' || $('status-filter').value !== 'all'));
    $('reset-filters').hidden = !hasFilters;
    if (activeTab === 'radar') { renderRadar(); return; }
    const query = normalized($('search').value.trim());
    const category = $('category-filter').value;
    const platform = $('platform-filter').value;
    const status = $('status-filter').value;
    const collection = activeTab === 'cases' ? data.cases : data.templates;
    const filtered = collection.filter(item => {
      const haystack = normalized([item.title, item.summary, ...list(item.tags), item.source?.author, item.source?.platform, categories[item.category], item.model?.claimed, typeof item.prompt === 'string' ? item.prompt : item.prompt?.text].join(' '));
      return (!query || haystack.includes(query)) && (category === 'all' || item.category === category) && (activeTab !== 'cases' || (platform === 'all' || item.source?.platform === platform) && (status === 'all' || item.status === status));
    });
    $('result-count').textContent = `${filtered.length} / ${collection.length} ${activeTab === 'cases' ? '条档案' : '份模板'}`;
    const notice = activeTab === 'templates' ? '这里是项目编写的原创模板，均待实际运行验证。它们独立于社区案例，不计入社区精选数。编辑变量即可得到可复制的提示词。' : '精选、待核验线索与版本参考分开计数。作者自报模型不等于独立确认；卡片为编辑封面，实际输出请到原帖查看。';
    $('collection-panel').innerHTML = `<div class="evidence-note"><span class="note-icon" aria-hidden="true">i</span><p>${notice}</p></div>` + (filtered.length ? `<div class="card-grid">${filtered.map((item, index) => renderCard(item, index)).join('')}</div>` : '<div class="state-box"><span class="state-mark" aria-hidden="true">∅</span><h3>这一页，留给下一个发现。</h3><p>没有符合当前条件的条目。试试其他关键词，或清除筛选。</p><button id="empty-reset" class="button" type="button">清除筛选 ↺</button></div>');
    $('empty-reset')?.addEventListener('click', resetFilters);
  }

  function renderCard(item, index) {
    const isTemplate = activeTab === 'templates';
    const category = Object.hasOwn(categories, item.category) ? item.category : 'other';
    const status = Object.hasOwn(statuses, item.status) ? item.status : 'candidate';
    const platform = Object.hasOwn(platforms, item.source?.platform) ? item.source.platform : 'other';
    const categoryLabel = categories[category];
    const id = escape(item.id);
    const type = isTemplate ? 'template' : 'case';
    const number = String(index + 1).padStart(2, '0');
    const title = escape(text(item.title, '未命名档案'));
    const label = isTemplate ? '原创模板' : platforms[platform];
    return `<article class="prompt-card"><button class="cover-button" data-open="${id}" data-kind="${type}" type="button" aria-label="查看${title}"><div class="editorial-cover cover-${category}" aria-hidden="true"><div class="cover-meta"><span>${isTemplate ? 'ORIGINAL / TEMPLATE' : 'COMMUNITY / ARCHIVE'}</span><span>2.5 FIELD NOTES</span></div><span class="cover-type">${escape(coverTitles[category])}</span><span class="cover-geometry"></span><span class="cover-label">编辑封面 · 非生成结果</span><span class="cover-index">${number} / ${escape(category.toUpperCase())}</span></div></button><div class="card-content"><div class="card-kicker"><span>${categoryLabel}</span><span class="platform-label platform-${isTemplate ? 'other' : platform}">${label}</span></div><h3><button class="card-title-button" data-open="${id}" data-kind="${type}" type="button">${title}</button></h3><p class="card-summary">${escape(text(item.summary, '打开条目查看来源与核验记录。'))}</p><div class="card-tags">${list(item.tags).slice(0, 3).map(tag => `<span class="tag">${escape(tag)}</span>`).join('')}${isTemplate && item.variant ? `<span class="tag">${escape(item.variant)}</span>` : ''}</div><div class="card-bottom"><span class="status-badge status-${isTemplate ? 'original' : status}">${isTemplate ? '原创 · 待实测' : statuses[status]}</span><button class="text-button" data-open="${id}" data-kind="${type}" type="button">${isTemplate ? '编辑模板' : '查看证据'} <span aria-hidden="true">↗</span></button></div></div></article>`;
  }

  function renderRadar() {
    const query = normalized($('search').value.trim());
    const queries = list(data.watchlist.queries).filter(item => !query || normalized([item.label, item.query, item.platform].join(' ')).includes(query));
    const communities = list(data.watchlist.communities).filter(item => !query || normalized([item.name, item.reason].join(' ')).includes(query));
    $('result-count').textContent = `${queries.length} 个检索入口 · ${communities.length} 个社区`;
    const routine = data.watchlist.routine || {};
    const radarLinks = queries.map((item, index) => externalLink(item.url, `<span class="radar-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escape(item.label)}</h3><p>${escape(item.query)}</p><span class="platform-label">${escape(platforms[item.platform] || item.platform || 'SEARCH')} · 手动检索入口</span></div><span class="radar-arrow" aria-hidden="true">↗</span>`, 'radar-row')).join('');
    const communityLinks = communities.map(item => externalLink(item.url, `<strong>${escape(item.name)} <span aria-hidden="true">↗</span></strong><p>${escape(item.reason)}</p>`, 'community')).join('');
    const modelData = data.models;
    $('collection-panel').innerHTML = `<div class="radar-intro"><div><h3>去创作发生的地方。</h3><p>预设搜索入口帮助持续发现案例。点击后将在平台检索；这里不代表实时抓取或热度排名。</p></div><span aria-hidden="true">⌁</span></div><div class="radar-layout"><div class="radar-queries">${radarLinks || '<p class="no-query">暂无匹配的检索入口，试试其他关键词。</p>'}</div><aside class="radar-aside"><h3>值得关注的社区</h3>${communityLinks || '<p class="no-query">暂无匹配社区。</p>'}<div class="routine"><h3>发现 → 核验 → 收录</h3><p>${escape(text(routine.cadence, '按项目维护节奏进行人工整理。'))}</p><ol>${list(routine.steps).map(step => `<li>${escape(step)}</li>`).join('')}</ol></div></aside></div>${modelData.note || list(modelData.models).length ? `<div class="models-note"><h3>关于模型名称与版本</h3><p>${escape(modelData.note || '以官方资料与案例证据为准。')}</p><div class="model-links">${list(modelData.models).map(model => externalLink(model.url, `${escape(model.name || model.id)} ↗`)).join('')}</div><p class="model-verified-date">资料核验日期：${dateLabel(modelData.verifiedAt)}</p></div>` : ''}`;
  }

  function resetFilters() { $('search').value = ''; $('category-filter').value = 'all'; $('platform-filter').value = 'all'; $('status-filter').value = 'all'; render(); }

  function evidencePair(label, value, full = false) { return `<div${full ? ' class="full-width"' : ''}><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`; }

  function hasEvidence(value) {
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.some(hasEvidence);
    if (value && typeof value === 'object') return Object.values(value).some(hasEvidence);
    return false;
  }

  function evidenceContent(value) {
    if (typeof value === 'string') return safeURL(value) ? externalLink(value, escape(value), 'source-url') : `<p>${escape(value)}</p>`;
    if (Array.isArray(value)) return value.filter(hasEvidence).map(evidenceContent).join('');
    if (value && typeof value === 'object') {
      const labels = { url: '证据链接', notes: '记录', evidence: '证据说明', description: '说明', status: '证据状态', type: '类型', kind: '类型', license: '许可', licenseUrl: '许可链接', verifiedAt: '核验日期', observedAt: '观测时间', sourceUrl: '来源', text: '内容' };
      return `<dl class="evidence-grid">${Object.entries(value).filter(([, entry]) => hasEvidence(entry)).map(([key, entry]) => `<div class="full-width"><dt>${escape(labels[key] || key)}</dt><dd>${evidenceContent(entry)}</dd></div>`).join('')}</dl>`;
    }
    return '';
  }

  function renderOutputEvidence(item) {
    const outputEvidence = item.outputEvidence || item.source?.outputEvidence;
    const permissionEvidence = item.permissionEvidence || item.prompt?.permissionEvidence;
    const media = list(item.media).filter(entry => entry && ['licensed', 'permission-granted'].includes(entry.permission) && safeURL(entry.url) && hasEvidence(entry.permissionEvidence));
    if (!hasEvidence(outputEvidence) && !hasEvidence(permissionEvidence) && !media.length) return '';
    return `<section class="detail-section"><h3><span class="section-number">05</span> 输出与授权记录</h3>${hasEvidence(outputEvidence) ? `<div class="evidence-block"><h4>输出证据</h4>${evidenceContent(outputEvidence)}</div>` : ''}${hasEvidence(permissionEvidence) ? `<div class="evidence-block"><h4>内容授权证据</h4>${evidenceContent(permissionEvidence)}</div>` : ''}${media.length ? `<div class="output-media">${media.map(entry => `<figure><img src="${escape(safeURL(entry.url))}" alt="${escape(text(entry.alt, '原始案例输出'))}" loading="lazy" decoding="async" referrerpolicy="no-referrer" /><figcaption>${escape(text(entry.alt, '原始案例输出'))} · ${entry.permission === 'licensed' ? '依许可展示' : '已获作者许可'}${externalLink(entry.url, '查看原图 ↗', 'source-url')}<div class="media-permission">${evidenceContent(entry.permissionEvidence)}</div></figcaption></figure>`).join('')}</div>` : ''}</section>`;
  }

  function openDetail(id, kind = 'case', trigger = null, updateURL = true) {
    if (!data) return false;
    const collection = kind === 'template' ? data.templates : data.cases;
    const item = collection.find(entry => entry.id === id);
    if (!item) { announce('没有找到这条档案'); return false; }
    lastTrigger = trigger || document.activeElement;
    currentDetail = { item, kind };
    $('detail-content').innerHTML = kind === 'template' ? renderTemplateDetail(item) : renderCaseDetail(item);
    const dialog = $('detail-dialog');
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    $('close-dialog').focus({ preventScroll: true });
    if (kind === 'template') { $('template-prompt').value = interpolateTemplate(item); document.querySelectorAll('[data-variable]').forEach(input => input.addEventListener('input', () => { $('template-prompt').value = interpolateTemplate(item); })); }
    if (updateURL) { const url = new URL(location.href); url.searchParams.delete('case'); url.searchParams.delete('template'); url.searchParams.set(kind, id); url.hash = ''; history.pushState({ detail: true }, '', url); }
    return true;
  }

  function renderCaseDetail(item) {
    const source = item.source || {}, model = item.model || {}, prompt = item.prompt || {}, reproduction = item.reproduction || {}, metrics = item.metrics || {};
    const hasPrompt = typeof prompt.text === 'string' && prompt.text.trim() && prompt.kind !== 'unavailable';
    const sourceButton = externalLink(source.url, '打开原始来源 <span aria-hidden="true">↗</span>', 'button button-dark');
    const status = Object.hasOwn(statuses, item.status) ? item.status : 'candidate';
    const hasMetricsTime = metrics.observedAt && !Number.isNaN(new Date(metrics.observedAt).getTime());
    return `<div class="detail-eyebrow"><span class="status-badge status-${status}">${statuses[status]}</span><span class="eyebrow">${escape(platforms[source.platform] || 'OTHER')} / SOURCE RECORD</span></div><h2 id="detail-title" class="detail-title">${escape(item.title)}</h2><p class="detail-summary">${escape(item.summary)}</p><div class="detail-actions">${sourceButton}<button class="button" type="button" data-copy-link>复制档案链接 ↗</button></div><section class="detail-section"><h3><span class="section-number">01</span> 原始出处</h3><dl class="evidence-grid">${evidencePair('作者', text(source.author))}${evidencePair('发布日期', dateLabel(source.publishedAt))}${evidencePair('来源读取范围', accessLabels[source.access] || '读取范围未记录')}${evidencePair('最近核验', source.verifiedAt ? dateLabel(source.verifiedAt) : '未核验')}${source.collectedAt || item.collectedAt ? evidencePair('提交日期', dateLabel(source.collectedAt || item.collectedAt)) : ''}${evidencePair('已获得的来源证据与限制', text(source.evidence), true)}</dl>${externalLink(source.url, escape(source.url || ''), 'source-url')}</section><section class="detail-section"><h3><span class="section-number">02</span> 模型与复现</h3><dl class="evidence-grid">${evidencePair('来源声称的模型', text(model.claimed))}${evidencePair('模型证据状态', modelStatusLabels[model.status] || '待核实')}${evidencePair('模型变体', text(model.variant, 'unspecified'))}${evidencePair('独立复现', reproductionLabels[reproduction.status] || '未独立复现')}${evidencePair('模型证据', text(model.evidence), true)}${evidencePair('复现记录', text(reproduction.notes, '尚未进行独立复现。'), true)}</dl></section><section class="detail-section"><div class="prompt-heading"><h3><span class="section-number">03</span> ${escape(promptLabels[prompt.kind] || '提示词记录')}</h3>${hasPrompt ? `<button class="text-button" type="button" data-copy-prompt>${prompt.kind === 'excerpt' ? '复制摘录' : '复制提示词'} ↗</button>` : ''}</div>${hasPrompt ? `<pre class="prompt-text" tabindex="0">${escape(prompt.text)}</pre>` : '<p>目前没有可用的完整原始提示词。可先查看来源，等待作者补充或进一步核验。</p>'}${prompt.notes ? `<p class="detail-note">${escape(prompt.notes)}</p>` : ''}</section><section class="detail-section"><h3><span class="section-number">04</span> 传播数据快照</h3><div class="metrics-row">${['likes', 'comments', 'views'].map((key, index) => `<div class="metric"><strong>${hasMetricsTime ? numberLabel(metrics[key], key === 'likes' && source.platform === 'reddit') : '未观测'}</strong><span>${[source.platform === 'reddit' ? '净票数' : source.platform === 'x' ? '喜欢' : '喜欢 / 点赞', '评论', '浏览'][index]}</span></div>`).join('')}</div><p class="muted metrics-note">${hasMetricsTime ? `观测时间：${escape(new Date(metrics.observedAt).toISOString())} · 非实时数据` : '没有有效的观测时间；不展示推测的热度数值。'}</p></section>${renderOutputEvidence(item)}<p class="dialog-footer">卡片封面由代码排版制作，并非模型生成结果。输出图像与完整上下文请查看原帖；原作者保留相应内容权利。</p>`;
  }

  function renderTemplateDetail(item) {
    return `<div class="detail-eyebrow"><span class="status-badge status-original">原创 · 待实测</span><span class="eyebrow">TEMPLATE / ${escape(item.variant || 'UNSPECIFIED')}</span></div><h2 id="detail-title" class="detail-title">${escape(item.title)}</h2><p class="detail-summary">${escape(item.summary)}</p><div class="detail-note">项目编写的原创模板，尚未实测。以下文本不代表社区原作者提示词或已验证的模型输出。</div><section class="detail-section"><h3><span class="section-number">01</span> 把想法填进来</h3><div class="template-fields">${list(item.variables).map((variable, index) => `<label for="variable-${index}">${escape(variable.name)}<input type="text" id="variable-${index}" data-variable="${escape(variable.name)}" value="${escape(variable.example || '')}" autocomplete="off" /></label>`).join('') || '<p class="muted">这份模板不需要额外变量，可以直接编辑下方文本。</p>'}</div></section><section class="detail-section"><div class="prompt-heading"><h3><span class="section-number">02</span> 你的提示词</h3><button class="text-button" type="button" data-copy-template>复制提示词 ↗</button></div><textarea id="template-prompt" class="template-prompt" aria-label="已填入变量的提示词，可继续编辑" spellcheck="false"></textarea><p class="muted template-edit-note">可直接编辑这份文本。修改上方变量时，将重新生成模板内容。</p></section>${item.notes ? `<section class="detail-section"><h3><span class="section-number">03</span> 使用说明</h3><p>${escape(Array.isArray(item.notes) ? item.notes.join('\n') : item.notes)}</p></section>` : ''}<div class="detail-actions template-actions"><button class="button button-orange" type="button" data-copy-template>复制我的提示词 <span aria-hidden="true">↗</span></button><button class="button" type="button" data-copy-link>复制模板链接 ↗</button></div><p class="dialog-footer">编辑仅保存在当前页面内，刷新后恢复示例值。模板独立于社区案例，不计入社区精选数。</p>`;
  }

  function interpolateTemplate(item) {
    const variables = new Map();
    document.querySelectorAll('[data-variable]').forEach(input => variables.set(input.dataset.variable, input.value));
    return String(item.prompt || '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, name) => variables.has(name.trim()) ? variables.get(name.trim()) : match);
  }

  function clearDetailURL() {
    const url = new URL(location.href);
    url.searchParams.delete('case'); url.searchParams.delete('template');
    if (/^#(?:case|template)[=:]/.test(url.hash)) url.hash = 'archive';
    history.replaceState(null, '', url);
  }

  function syncDetailFromURL() {
    if (!data) return;
    const params = new URLSearchParams(location.search);
    let kind = params.has('template') ? 'template' : 'case';
    let id = params.get(kind);
    if (!id && location.hash) {
      const match = location.hash.match(/^#(case|template)[=:](.+)$/);
      if (match) { kind = match[1]; try { id = decodeURIComponent(match[2]); } catch { id = null; } }
    }
    if (id) { if (kind === 'template') setTab('templates'); openDetail(id, kind, null, false); }
    else if ($('detail-dialog').open) $('detail-dialog').close();
  }

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = ['cases', 'templates', 'radar'];
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(activeTab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      setTab(tabs[index], true);
    });
  });
  $('search').addEventListener('input', render);
  ['category-filter', 'platform-filter', 'status-filter'].forEach(id => $(id).addEventListener('change', render));
  $('reset-filters').addEventListener('click', resetFilters);
  $('collection-panel').addEventListener('click', event => { const button = event.target.closest('[data-open]'); if (button) openDetail(button.dataset.open, button.dataset.kind, button); });
  $('close-dialog').addEventListener('click', () => $('detail-dialog').close());
  $('detail-dialog').addEventListener('click', event => { if (event.target === $('detail-dialog')) { const bounds = $('detail-dialog').getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('detail-dialog').close(); } });
  $('detail-dialog').addEventListener('close', () => { document.body.classList.remove('dialog-open'); currentDetail = null; clearDetailURL(); if (lastTrigger?.isConnected && typeof lastTrigger.focus === 'function') lastTrigger.focus({ preventScroll: true }); });
  $('detail-content').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !currentDetail) return;
    if (button.hasAttribute('data-copy-prompt')) copyText(currentDetail.item.prompt?.text, button);
    if (button.hasAttribute('data-copy-template')) copyText($('template-prompt')?.value, button);
    if (button.hasAttribute('data-copy-link')) { const url = new URL(location.href); url.searchParams.delete('case'); url.searchParams.delete('template'); url.searchParams.set(currentDetail.kind, currentDetail.item.id); url.hash = ''; copyText(url.href, button, '链接'); }
  });
  $('detail-content').addEventListener('error', event => {
    if (event.target.tagName !== 'IMG') return;
    const fallback = document.createElement('p');
    fallback.className = 'media-error';
    fallback.textContent = '图片暂时无法加载，可通过下方链接查看原图。';
    event.target.replaceWith(fallback);
  }, true);
  document.addEventListener('keydown', event => { if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !$('detail-dialog').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) && !event.target.isContentEditable) { event.preventDefault(); $('search').focus(); } });
  window.addEventListener('popstate', syncDetailFromURL);
  window.addEventListener('hashchange', syncDetailFromURL);
  load();
})();
