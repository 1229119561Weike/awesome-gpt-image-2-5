# Awesome GPT Image 2.5

**收藏好图背后的提示词，留下原始出处和可复现的条件。**

一个面向 GPT Image 2.5 的中文社区提示词项目，当前专注 X 上值得学习的创作案例。借鉴 [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) 的分类图库与模板思路，采用结构化数据驱动网站、Markdown 索引与案例页面。

当前是 X 专项首轮采集版本：1 条候选线索，原帖访问和完整 Prompt 仍待补齐；另有 6 个本项目原创、尚未实测的变量模板。**已核验社区精选目前为 0**，不将发布讨论、搜索摘要或旧版本案例充作精选。最新数字由 [案例索引](docs/gallery.md) 和网站自动计算。

## 本地使用

需要 Node.js 22 或更新版本，无运行时第三方依赖。

```bash
git clone https://github.com/1229119561Weike/awesome-gpt-image-2-5.git
cd awesome-gpt-image-2-5
npm run dev
```

浏览器打开 http://127.0.0.1:4175 。支持关键词搜索、分类与平台筛选、证据详情、原帖链接、可编辑变量模板、提示词复制和可分享的案例链接。卡片是编辑排版封面；模型成图到原帖查看。

```bash
npm run validate
npm test
npm run build
npm run digest -- --since 2026-09-09
```

构建输出在 `dist/`，可以部署到任意静态托管服务。所有链接均支持仓库子路径。`npm run dev` 在启动前构建一次；修改数据后重新运行 `npm run build` 并刷新页面。需要其他端口可运行 `PORT=4176 npm run dev`。

## 从哪里开始

- [案例索引](docs/gallery.md)：候选、精选、版本资料独立计数。
- [原创实验模板](docs/templates.md)：海报、电商、局部编辑、知识图解、自然光摄影和连续角色故事。
- [收录标准](docs/curation.md)：如何判断值得收藏、如何补齐证据。
- [参考项目研究](docs/reference-project.md)：原库结构、数据流和本项目的取舍。
- [首轮来源研究](docs/research/2026-09-09-discovery.md)：已经检查的帖子、来源限制与排除理由。
- [21 天追踪安排](docs/tracking.md)：2026-09-10 至 2026-09-30，北京时间每天 10:00。
- [贡献说明](CONTRIBUTING.md) 与 [数据约定](docs/data-contract.md)。

## 项目结构

```text
data/
  cases.json             社区案例和来源证据，唯一数据源
  templates.json         独立原创变量模板
  watchlist.json         X 查询与作者入口
  models.json            官方型号资料和核验日期
site/                    无框架静态图库与交互
scripts/
  add.mjs                新增链接为待核验候选，自动去重
  validate.mjs           字段、证据和状态约束检查
  build.mjs              JSON → 网站数据、案例页和图库文档
  digest.mjs             按日期输出本地采集简报
  serve.mjs              本地预览服务器
docs/
  cases/                 自动生成的单条案例页
  research/              每轮来源研究和缺口记录
tests/                   去重、证据门槛和输入边界检查
.github/                 投稿模板、校验和手动部署流程
```

数据只编辑 `data/*.json`；生成的 `docs/gallery.md`、`docs/templates.md`、`docs/cases/*.md`、`site/data.json` 和 `dist/` 不直接编辑。

## 模型边界

2026-09-09 已读取官方模型页：`gpt-image-2.5-flare` 面向快速日常生图；`gpt-image-2.5-sunburst` 强调精确编辑。[Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) / [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)

仅写“GPT Image 2.5”的帖子保留为未注明变体；作者自报和实际模型证据分开；是否独立复现另外记录。项目本身不调用图像生成 API。

## 新增一个发现

```bash
npm run add -- 'https://x.com/author/status/123456789' --title '案例标题' --id 'my-case' --category editing
```

上面是命令格式示例，链接不是本项目已发现的案例。替换为真实原帖链接。新增命令只登记候选，不访问平台，也不会自动判定为精选。打开原帖补全数据后，运行校验和构建。

## 发布与持续维护

项目仓库：[1229119561Weike/awesome-gpt-image-2-5](https://github.com/1229119561Weike/awesome-gpt-image-2-5)。已具备本地预览、数据校验和静态部署文件。需要在线站点时，在仓库设置中启用 GitHub Pages 的 GitHub Actions 部署来源，然后手动执行 `Deploy Pages`。CI 每次提交和 PR 都会检查数据与构建。

每天的内容搜索由当前 Codex 任务附属的 21 天自动追踪执行；静态网页本身只提供检索入口。克隆项目不会自动复制本机的定时安排。自动执行需要运行该任务的设备和应用可用，实际执行与延迟写入研究日志。

## 来源与许可

项目代码按 [MIT](LICENSE) 提供。第三方帖子、Prompt、图片的权利归各自作者，不能因项目代码使用 MIT 而推定可转载或商用。没有明确许可时保留原帖链接和简短说明；已有完整短引用的候选仍需补齐归属与授权证据。项目原创实验模板按 MIT 提供。纠错或移除请求可使用仓库 Issue 模板。

独立社区项目，与 OpenAI 没有官方隶属关系。
