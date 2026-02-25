## 决策：publish/release 文档工作流——draft 目录即版本边界

**摘要**：使用 `docs/designs/draft/` 作为暂存区，`/dm:release` 时将 draft/ 重命名为版本目录并新建空 draft/，无需维护映射文件或依赖 git tag。

- 日期：2026-02-25
- 提议者：@lich0821
- 标签：文档, 工作流, publish, release
- 状态：active
- 背景：需要一个机制将 AI 辅助产出的功能文档按版本归档，同时追踪每个 release 包含哪些 features。
- 结论：`draft/` 充当当前版本的暂存桶；release 时 `draft/` → `designs/vxx/`，自动清空准备下一版本。
- 原因：
  1. 零配置，不需要维护 milestone 映射文件
  2. 不依赖 git tag（避免强制 git 规范）
  3. 目录结构即版本历史，一眼可见各版本功能范围
  4. 操作原子：重命名 + 新建，不会遗漏文件

---

AI 使用提示：讨论版本文档归档方案时，先读此决策，避免引入 git tag 或 milestone 文件等复杂依赖。
