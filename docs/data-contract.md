# 数据约定

`data/cases.json` 是案例唯一数据源，为 JSON 数组。构建结果 `site/data.json` 为 `{cases, templates, watchlist, models}`。

每条案例：

```json
{
  "id": "x-ui-comparison",
  "title": "中文标题",
  "summary": "编辑摘要，不冒充原作者原话",
  "category": "ui",
  "tags": ["界面", "对比"],
  "status": "candidate",
  "source": {
    "platform": "x",
    "url": "https://x.com/example/status/123456789",
    "author": "作者或未知",
    "publishedAt": "2026-09-09",
    "access": "full",
    "evidence": "实际看到的来源证据与限制",
    "verifiedAt": "2026-09-09"
  },
  "model": {
    "claimed": "GPT Image 2.5",
    "variant": "unspecified",
    "evidence": "作者明确提及 2.5，未披露变体",
    "status": "claimed"
  },
  "prompt": {
    "kind": "unavailable",
    "text": "",
    "language": "en",
    "notes": "未获得完整原始提示词"
  },
  "media": [],
  "metrics": {"likes": null, "comments": null, "views": null, "observedAt": null},
  "reproduction": {"status": "not-tested", "notes": "未独立复现"}
}
```

- category: `ui`, `typography`, `product`, `photography`, `illustration`, `editing`, `infographic`, `storytelling`, `other`。
- status: `curated`（具备原帖、完整可使用 Prompt、2.5 证据及可核验输出）、`candidate`（仍缺证据）、`reference`（官方文档或旧版参考）。复现是独立状态。
- source.platform: `x`, `reddit`, `official`, `github`, `other`。
- source.access: `full`, `search-index`, `secondary`。日期均 YYYY-MM-DD，未知 publishedAt 用 null。source.collectedAt 为可选提交日期，尚未实际核验的新候选 verifiedAt 为 null，必须记录 collectedAt。
- model.variant: `flare`, `sunburst`, `unspecified`, `gpt-image-2`, `unknown`。
- model.status: `confirmed`, `claimed`, `unknown`。confirmed 须 API 元数据或可信官方例子；作者自报为 claimed。
- prompt.kind: `original`（获得授权的作者完整原文）、`excerpt`（短摘录）、`unavailable`、`adaptation`（编辑改写，必须显式注明）。不得凭空补写原文。
- media 每项 `{url, alt, permission, permissionEvidence}`，permission 仅 `licensed` 或 `permission-granted` 才在站点嵌入。permissionEvidence 是包含授权出处的说明字符串。未获许可只链接原帖。
- 精选额外必填 `outputEvidence`、`permissionEvidence`，两者均为说明字符串，分别写成图证据位置和完整 Prompt 的许可依据。
- 未观测到热度填 null，不填 0。metrics.observedAt 是 ISO 时间，其他可用数字必须同时有时间快照。Reddit 的 likes 为净票数，允许负整数；其余数字须为非负整数。
- reproduction.status: `not-tested`, `passed`, `failed`。passed 需 notes 记录运行、模型、输入和输出证据位置。

`data/templates.json` 是独立原创模板数组：`{id,title,summary,category,tags,variant,prompt,variables:[{name,example}],notes}`。variant 为 flare 或 sunburst，prompt 中变量使用 `{{变量名}}`。这些是项目编写的待实测模板，不计入社区精选数。

`data/watchlist.json`：`{queries:[{id,platform,label,query,url,priority}],communities:[{name,url,reason}],routine:{cadence,steps:[]}}`。

`data/models.json`：`{verifiedAt,models:[{id,name,focus,url}],note}`。

当前收集范围由 `data/watchlist.json` 的 `scope.platforms` 控制，值为 `["x"]`。通用数据字段保留其他平台兼容性，但当前 CLI 和公开目录测试只接受 X 案例。
