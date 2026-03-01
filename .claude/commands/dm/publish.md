---
description: 将当前功能整理为文档写入 docs/designs/draft/
---

进入 **PUBLISH 模式**（生成功能文档）。

## 执行步骤

### 步骤1：收集信息

读取以下内容：
- `.devmind/current-plan.md`（当前或刚完成的计划）
- `.devmind/memory/decisions/`（本次任务相关的决策，按日期判断）

### 步骤2：确定文档 slug

根据计划标题生成 slug（kebab-case，英文），向开发者确认：

```
即将生成文档：docs/designs/draft/<slug>.md
文档标题：[标题]

确认？(1) 确认  (2) 修改 slug
```

### 步骤3：生成文档

写入 `docs/designs/draft/<slug>.md`，格式如下：

```markdown
# <功能标题>

> 生成日期：YYYY-MM-DD

## 背景

<为什么要做这个功能，解决什么问题>

## 方案设计

<具体实现方案，架构说明，关键设计决策>

## 功能范围

<本次实现了什么，明确排除了什么>

## 关键决策

<列出本次涉及的重要决策及理由>

## 已知限制 / 后续计划

<当前方案的限制，以及计划在未来版本中改进的点>
```

### 步骤4：提示加入 milestone（可选）

输出：

```
文档已生成：docs/designs/draft/<slug>.md

是否加入某个 milestone？
(1) 暂不归入（保留在 draft/）
(2) 输入版本号（如 v0.1），在 /dm:release 时会自动收录
```

如果用户输入版本号，在文档头部追加 frontmatter：

```markdown
---
milestone: vxx
---
```

## 注意

- 文档面向人类开发者，语言清晰可读，避免 AI 元数据语言
- 不修改 `.devmind/memory/` 下的任何文件（那是 /dm:remember 的职责）
- 如需同时沉淀 AI 记忆，执行完后提示使用 `/dm:remember`
