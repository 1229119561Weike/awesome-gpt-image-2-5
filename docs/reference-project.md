# 参考项目结构研究

观察日期：2026-09-09。研究对象为 [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) 的公开 `main` 分支；以下描述来自实际读取文件，链接内容可能随上游更新。新项目借鉴其组织方式，独立维护内容与代码。

## 已验证的结构

| 层次 | 上游文件 | 作用 |
| --- | --- | --- |
| 阅读入口 | `README.md`、中文与日文 README | 项目介绍、分类、精选及最新案例 |
| 案例正文 | `docs/gallery.md`、`gallery-part-1.md`、`gallery-part-2.md` | 分类索引、图片、提示词、来源；分册控制页面体积 |
| 风格体系 | `data/style-library.json`、`docs/templates.md` | 分类、风格、场景、模板及指导信息 |
| 生成与展示 | `scripts/`、`data/cases.json`、`src/main.jsx` | 数据提取、网页搜索筛选及复制 |
| 扩展服务 | `api/`、`supabase/migrations/`、`agents/skills/` | 生图、账户、支付与 Agent 资源 |

目录可在[仓库根目录](https://github.com/freestylefly/awesome-gpt-image-2)逐项核对；画廊拆分原因见 [gallery.md](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/docs/gallery.md)。

## 数据与构建流程

上游案例以 Markdown 为输入：脚本读取两册正文，按案例锚点切块，提取标题、首图、提示词代码块和来源，再从总目录读取分类，用关键词推断风格与场景，最终写出 JSON。流程为 `docs → generate-site-data.mjs → data/cases.json → 网页`，不能把 `cases.json` 误认成手工维护的唯一源文件。[生成脚本](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/scripts/generate-site-data.mjs)

JSON 顶层含 `repository`、`totalCases`、`categories`、`styles`、`scenes`、`cases`；单条含 ID、标题、图片及替代文本、来源名称与链接、提示词及预览、分类与标签、精选标记、GitHub 正文链接。此次读取的 `totalCases` 为 541，画廊介绍写 544；这是两个文件的观测差异，未判定原因。[案例数据](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/data/cases.json)

`predev` 和 `prebuild` 都先生成案例数据及技能参考，再启动 Vite。Vite 将 `data` 作为公开目录；React 读取两份 JSON，按文本、分类、风格、场景过滤，显示详情并复制提示词。[package.json](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/package.json)、[Vite 配置](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/vite.config.js)、[前端实现](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/src/main.jsx)

风格库同时维护中英文标签、关键词和模板关联；技能生成器验证唯一值、模板锚点及封面存在性，随后输出参考 Markdown。这种共享词表值得保留。[风格库](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/data/style-library.json)、[技能生成器](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/scripts/generate-style-skill.mjs)

## 本项目采用的方向

保留精选入口、分类浏览、来源跳转与模板提炼；优先建设搜集和核验流程。建议由结构化记录统一生成文档及网页，减少格式解析和统计漂移。为 X、Reddit 增加原帖、作者、发现日期、模型声明与验证状态；互动数据附采样时间。将线索、已核验案例和复现结果分开记录，以原帖地址去重，模型未证实的内容保留在待核验区。

审核应记录选入理由，例如文字准确、构图清晰、编辑一致性或提示词可复用性，避免只按点赞量评选。上游标签脚本使用子串匹配，短关键词可能命中普通单词，因此自动标签适合提出候选，最终分类应可由人工修订。维护检查还应覆盖重复链接、必填字段、授权状态、分类词表和生成文件是否同步，让新增案例经过同一入口进入发布流程。

## 许可边界

上游采用 MIT，复用其代码或实质性内容须保留相应声明。其免责声明另行说明第三方提示词和图片权利属于原作者；仓库许可不能代替逐条授权。本项目记录转载依据，未知时保留链接及原创分析，并提供更正、下架入口。[LICENSE](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/LICENSE)、[内容声明](https://github.com/freestylefly/awesome-gpt-image-2/blob/main/docs/disclaimer.md)
