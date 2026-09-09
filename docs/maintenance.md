# 维护案例集

GitHub README 是项目的主要展示页。每条案例必须同时有真实效果图、Prompt 内容或节选、X 原帖链接，以及 Prompt 所在帖子或作者回复的链接。

编辑 `data/gallery.json`，运行 `npm run build` 更新 README。只把符合条件的案例加入首页；没有 Prompt 或效果图的线索留在本地。`data/watchlist.json` 保存 X 检索入口。

原文较长时保留短节选与完整原文链接；另写的尝试版必须明确标注，不能暗示原图由该整理版生成。公开图片使用 X 原帖中的图片地址，并把图片链接回原帖，不声称取得版权或商业许可。

发布前检查：

```bash
npm run build
npm test
git diff --check
```

发布后打开 GitHub README，确认图片可见、来源正确、Prompt 链接能定位原文。无需读者在本地运行网站。
