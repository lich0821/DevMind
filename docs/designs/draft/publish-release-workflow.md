---
milestone: v0.1
---

# publish/release 文档工作流

> 生成日期：2026-02-25

## 背景

DevMind 的 AI 辅助开发流程中，大量设计信息产生于对话和 `current-plan.md`，但缺乏将这些信息转化为人类可读项目文档的机制。开发者需要在版本演进过程中保留每个阶段的功能范围和设计决策，以便团队查阅和回溯。

此前方案（将文档存入 `.devmind/memory/designs/`）被否决，原因是 `.devmind/` 是 AI 的工作空间，不应充当项目文档库，两类读者（AI vs 人类）对文档格式的需求不同。

## 方案设计

### 整体架构

```
开发过程中：
  /dm:publish → docs/designs/draft/<slug>.md（功能文档暂存）

版本发布时：
  /dm:release → docs/releases/<version>.md（版本汇总）
             → docs/designs/draft/ 重命名为 docs/designs/<version>/
             → 新建空 docs/designs/draft/ 准备下一版本
```

### 目录结构

```
docs/
  designs/
    draft/                    ← 当前版本功能文档暂存区
      feature-xxx.md
    v0.1/                     ← release 后归档，不再修改
      feature-yyy.md
  releases/
    v0.1.md                   ← 版本汇总文档
```

### /dm:publish 工作流

1. 读取 `current-plan.md` 和相关 `memory/decisions/`
2. 确认文档 slug（kebab-case 英文）
3. 生成人类可读的功能文档，写入 `docs/designs/draft/<slug>.md`
4. 可选：在文档头部标记 `milestone: vxx`

### /dm:release 工作流

1. 读取 `docs/designs/draft/` 下所有 `.md` 文件
2. 确认版本号
3. 生成 `docs/releases/<version>.md`（含各功能简介及链接）
4. 执行：`draft/` → `designs/<version>/`，新建空 `draft/`

## 功能范围

**本次实现：**
- `/dm:publish` 命令模板（`.claude/commands/dm/publish.md`）
- `/dm:release` 命令模板（`.claude/commands/dm/release.md`）
- CLI `devmind init` 同步生成 `docs/designs/draft/.gitkeep`
- `CLAUDE.md` 命令速览表更新

**明确排除：**
- 文档内容的自动同步（内容由 AI 从对话提炼，人工确认）
- 多语言文档支持
- 与 git tag 的关联（设计上不依赖 git tag）

## 关键决策

**1. `.devmind/` 与 `docs/` 严格分层**

`.devmind/memory/` 是 AI 的结构化工作空间，格式针对检索优化；`docs/` 是人类可读的项目文档，遵循项目惯例。两者职责不重叠，DevMind 的角色是从对话生成 `docs/`，不充当文档库。

**2. `draft/` 目录即版本边界**

不引入 milestone 映射文件，不依赖 git tag。`draft/` 天然充当"当前版本暂存桶"，release 时重命名即完成归档，目录结构直接体现版本历史。选择此方案原因：零配置、操作原子、可视化强。

**3. `/dm:remember` 去掉草稿中间层**

原设计要求 AI 先写入 `memory/drafts/`，人工审核后再移入正式目录。实践发现摩擦过高，草稿会堆积成垃圾桶。改为直接写入正式目录，以"删除文件"作为撤销路径，降低日常使用摩擦。

## 已知限制 / 后续计划

- `/dm:publish` 目前依赖 AI 从对话提炼内容，文档质量取决于当前上下文完整度；长会话中上下文可能丢失
- `docs/releases/<version>.md` 中的功能链接在 release 前会指向 `draft/`（release 后重命名才正确），暂无自动修正机制
- 后续可考虑：`/dm:publish --update <slug>` 支持更新已有功能文档（当前版本只能新建）
