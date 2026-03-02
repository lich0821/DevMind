## 决策：Build 完成后的标准收尾流程

- 标签：build, workflow, remember, ux
- 日期：2026-03-01

**摘要**：Build 完成后应按固定顺序执行：输出摘要 → remember → 清理状态 → 切换 explore，确保记忆沉淀不被遗忘且状态干净。

### 背景

原来 `/dm:build` 完成后只是"建议使用 `/dm:remember`"，完全依赖开发者手动触发，容易遗忘。同时 build 结束后也没有自动归位到 explore 模式，导致模式状态残留。

### 决策

Build 完成后强制执行以下顺序：

1. **输出执行摘要**
2. **自动进入 `/dm:remember` 流程**——AI 主动判断是否有值得沉淀的内容，有则写入，无则跳过
3. **清理状态文件**（current-plan.md、session.yaml）
4. **切换回 explore 模式**

### 顺序设计理由

- remember 在清理**之前**：沉淀记忆时仍处于"build 完成"的语境，逻辑顺畅
- remember 回顾的是**对话历史**，不依赖状态文件，所以状态文件何时清理不影响 remember 的质量
- 清理在 remember **之后**：状态清理标志任务彻底结束，语义更完整

### 相关文件

- `.claude/commands/dm/build.md`（完成后章节）
- `packages/cli/src/templates-commands.ts`（CMD_BUILD 模板）
